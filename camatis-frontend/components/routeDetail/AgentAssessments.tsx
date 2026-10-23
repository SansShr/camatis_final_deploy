"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Brain, Shield, Wrench, Cloud, TrafficCone, Users, Bus, Calendar, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { getRouteAgentDetail, getDataSource } from "@/lib/api";

interface AgentScore {
  agent_name: string;
  agent_type: string;
  score: number;
  priority: number;
  trust_weight: number;
  emergency_flag: boolean;
  reasoning: string;
  constraints: Record<string, any>;
}

interface AgentDecisionDetail {
  route_id: number;
  agent_scores: AgentScore[];
  conflict_resolution: any;
  final_decision: any;
  blackboard_state: any;
}

// ── Metadata for each check ─────────────────────────────────────────────────

const CHECK_META: Record<string, {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  question: string;   // what this check asks
  good: string;       // what green means
  bad: string;        // what red/urgent means
}> = {
  "Driver Safety Agent": {
    label: "Driver Safety",
    icon: Shield,
    iconBg: "bg-red-100 text-red-600",
    question: "Is the driver safe to operate?",
    good: "Driver is operating safely",
    bad: "Driver may be fatigued or overloaded",
  },
  "Vehicle Health Agent": {
    label: "Bus Condition",
    icon: Wrench,
    iconBg: "bg-orange-100 text-orange-600",
    question: "Is the bus in good condition?",
    good: "Bus is in good working condition",
    bad: "Bus may need maintenance or is under stress",
  },
  "Weather Impact Agent": {
    label: "Weather Conditions",
    icon: Cloud,
    iconBg: "bg-cyan-100 text-cyan-600",
    question: "Is weather affecting this route?",
    good: "Weather conditions are fine",
    bad: "Bad weather may slow down service",
  },
  "Congestion Monitoring Agent": {
    label: "Road Traffic",
    icon: TrafficCone,
    iconBg: "bg-yellow-100 text-yellow-700",
    question: "Is this route stuck in traffic?",
    good: "Roads are clear",
    bad: "Heavy traffic may cause delays",
  },
  "Demand Assessment Agent": {
    label: "Passenger Numbers",
    icon: Users,
    iconBg: "bg-blue-100 text-blue-600",
    question: "How many passengers need this route?",
    good: "Demand is at a normal level",
    bad: "Too many passengers — more buses needed",
  },
  "Fleet Allocation Agent": {
    label: "Bus Availability",
    icon: Bus,
    iconBg: "bg-green-100 text-green-600",
    question: "Are enough buses available for this route?",
    good: "Enough buses are allocated",
    bad: "Not enough buses — allocation increase needed",
  },
  "Scheduling Adjustment Agent": {
    label: "Bus Timetable",
    icon: Calendar,
    iconBg: "bg-purple-100 text-purple-600",
    question: "Is the bus schedule working well?",
    good: "Schedule is running fine",
    bad: "Schedule needs adjustment to reduce waiting",
  },
};

function getMeta(agentName: string) {
  return CHECK_META[agentName] ?? {
    label: agentName.replace(" Agent", ""),
    icon: Brain,
    iconBg: "bg-slate-100 text-slate-600",
    question: "Checking route conditions...",
    good: "Looking good",
    bad: "Needs attention",
  };
}

// ── Status derived from score ────────────────────────────────────────────────

function statusFromScore(score: number, emergency: boolean) {
  if (emergency || score < 0.3) return {
    label: "Urgent Issue",
    bg: "bg-red-50 border-red-200",
    pill: "bg-red-100 text-red-700",
    bar: "bg-red-500",
    icon: AlertCircle,
    iconColor: "text-red-600",
  };
  if (score < 0.6) return {
    label: "Needs Attention",
    bg: "bg-orange-50 border-orange-200",
    pill: "bg-orange-100 text-orange-700",
    bar: "bg-orange-400",
    icon: AlertTriangle,
    iconColor: "text-orange-600",
  };
  return {
    label: "All Good",
    bg: "bg-green-50 border-green-200",
    pill: "bg-green-100 text-green-700",
    bar: "bg-green-500",
    icon: CheckCircle,
    iconColor: "text-green-600",
  };
}

// ── Clean up raw reasoning text ───────────────────────────────────────────────

function friendlyReason(raw: string, agentName: string, score: number, emergency: boolean): string {
  if (!raw) return "";
  // Strip technical terms and rewrite in plain English
  if (agentName.includes("Driver")) {
    if (emergency || score < 0.3) return "The system detected signs of high driver workload on this route — frequency increases have been capped for safety.";
    if (score < 0.6)              return "Driver workload is moderate. The system is monitoring this route closely.";
    return "Driver conditions look normal on this route.";
  }
  if (agentName.includes("Vehicle")) {
    if (score < 0.5) return "The bus on this route is showing signs of stress from a high passenger load.";
    return "The bus is operating within a safe load range.";
  }
  if (agentName.includes("Weather")) {
    if (score < 0.5) return "Adverse weather (rain, wind) is affecting travel conditions on this route.";
    return "Weather conditions are not impacting this route.";
  }
  if (agentName.includes("Congestion")) {
    if (score < 0.5) return "This route is experiencing significant road congestion, causing potential delays.";
    return "Traffic is flowing normally on this route.";
  }
  if (agentName.includes("Demand")) {
    if (score > 0.6) return "Passenger demand is high — buses on this route are filling up fast.";
    if (score > 0.3) return "Demand is moderate. The current number of buses should be sufficient.";
    return "Demand is low on this route — no extra buses required.";
  }
  if (agentName.includes("Fleet")) {
    if (score > 0.6) return "This route needs more buses to comfortably serve all passengers.";
    if (score > 0.3) return "Bus allocation is adequate but could be improved.";
    return "The current bus allocation is sufficient for this route.";
  }
  if (agentName.includes("Scheduling")) {
    if (score > 0.3) return "Bus departure times on this route could be adjusted to reduce passenger waiting time.";
    return "The current bus schedule is working well on this route.";
  }
  return raw;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AgentAssessments({ routeId }: { routeId: string }) {
  const [detail, setDetail]   = useState<AgentDecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    setLoading(true);
    setFailed(false);
    setDetail(null);
    const fetch = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const numericId = parseInt(routeId.replace("R-", ""));
        const data = await getRouteAgentDetail(numericId, true);
        if (active) {
          setDetail(data);
          setSaved(getDataSource(`/agents/route/${numericId}`) === "saved");
          setFailed(false);
        }
      } catch (e) {
        if (active) setFailed(true);
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };
    fetch();
    const timer = setInterval(fetch, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [routeId, retry]);

  if (loading) return (
    <Card>
      <CardContent className="flex items-center justify-center h-24">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
      </CardContent>
    </Card>
  );

  if (!detail) return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-slate-600" role="alert">
        <p>Route checks could not be loaded. Retrying automatically.</p>
        <button className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white" onClick={() => setRetry(value => value + 1)}>Try again</button>
      </CardContent>
    </Card>
  );

  if (detail.final_decision?.assessment_status === "summary_only") return (
    <Card>
      <CardHeader><CardTitle>Saved Route Recommendations</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-700">
        <p>Daily passengers: {Math.round(detail.final_decision.demand).toLocaleString()}</p>
        <p>Additional buses recommended: {detail.final_decision.buses_added}</p>
        <p>Service frequency: {detail.final_decision.frequency_multiplier}×</p>
        <p>Detailed safety assessments were not recorded for this route in the saved run.</p>
      </CardContent>
    </Card>
  );

  const monitoring = detail.agent_scores.filter(a => a.agent_type === "operational");
  const planning   = detail.agent_scores.filter(a => a.agent_type === "tactical");

  const dailyPassengers = detail.final_decision?.demand?.toFixed(0) ?? null;
  const busFull = detail.final_decision?.load
    ? (detail.final_decision.load * 100).toFixed(0) + "%"
    : null;

  return (
    <div className="space-y-6">
      {(saved || failed) && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Showing saved route checks. Refreshing automatically.</p>}

      {/* ── Route summary bar ── */}
      {(dailyPassengers || busFull) && (
        <div className="grid grid-cols-2 gap-4">
          {dailyPassengers && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">Daily Passengers on This Route</p>
              <p className="text-3xl font-bold text-blue-800">{Number(dailyPassengers).toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-1">people use this route each day</p>
            </div>
          )}
          {busFull && (
            <div className={`p-4 border rounded-xl text-center ${
              parseInt(busFull) > 80 ? "bg-red-50 border-red-200" :
              parseInt(busFull) > 60 ? "bg-orange-50 border-orange-200" :
              "bg-green-50 border-green-200"
            }`}>
              <p className={`text-xs font-medium mb-1 ${
                parseInt(busFull) > 80 ? "text-red-600" :
                parseInt(busFull) > 60 ? "text-orange-600" : "text-green-600"
              }`}>How Full Are the Buses?</p>
              <p className={`text-3xl font-bold ${
                parseInt(busFull) > 80 ? "text-red-700" :
                parseInt(busFull) > 60 ? "text-orange-700" : "text-green-700"
              }`}>{busFull}</p>
              <p className={`text-xs mt-1 ${
                parseInt(busFull) > 80 ? "text-red-500" :
                parseInt(busFull) > 60 ? "text-orange-500" : "text-green-500"
              }`}>{parseInt(busFull) > 80 ? "Overcrowded" : parseInt(busFull) > 60 ? "Getting full" : "Comfortable"}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Safety & Conditions Checks ── */}
      {monitoring.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Safety &amp; Conditions — Is This Route Safe to Run?
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              4 automated checks run on every route to ensure safe and reliable service
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {monitoring.map((agent, idx) => {
                const meta   = getMeta(agent.agent_name);
                const status = statusFromScore(agent.score, agent.emergency_flag);
                const Icon   = meta.icon;
                const StatusIcon = status.icon;
                const reason = friendlyReason(agent.reasoning, agent.agent_name, agent.score, agent.emergency_flag);
                const pct    = Math.round(agent.score * 100);

                return (
                  <div key={idx} className={`rounded-xl border p-4 ${status.bg}`}>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${meta.iconBg}`}>
                          <Icon size={18} />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.pill}`}>
                        <StatusIcon size={12} className={status.iconColor} />
                        <span className="text-xs font-semibold">{status.label}</span>
                      </div>
                    </div>

                    {/* Question answered */}
                    <p className="text-xs text-slate-500 italic mb-2">{meta.question}</p>

                    {/* Plain English answer */}
                    <p className="text-xs text-slate-700 leading-relaxed mb-3">{reason}</p>

                    {/* Confidence bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Check confidence</span>
                        <span className="font-semibold text-slate-700">{pct}%</span>
                      </div>
                      <div className="w-full bg-white bg-opacity-60 rounded-full h-1.5">
                        <div
                          className={`${status.bar} h-1.5 rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Planning Decisions ── */}
      {planning.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Planning Decisions — What Changes Were Made?
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Based on the checks above, here is what the system decided to do for this route
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {planning.map((agent, idx) => {
                const meta   = getMeta(agent.agent_name);
                const status = statusFromScore(agent.score, agent.emergency_flag);
                const Icon   = meta.icon;
                const StatusIcon = status.icon;
                const reason = friendlyReason(agent.reasoning, agent.agent_name, agent.score, agent.emergency_flag);
                const pct    = Math.round(agent.score * 100);

                return (
                  <div key={idx} className={`rounded-xl border p-4 ${status.bg}`}>
                    <div className={`inline-flex p-2 rounded-lg ${meta.iconBg} mb-3`}>
                      <Icon size={20} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">{meta.label}</p>
                    <p className="text-xs text-slate-500 italic mb-2">{meta.question}</p>
                    <p className="text-xs text-slate-700 leading-relaxed mb-3">{reason}</p>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.pill}`}>
                      <StatusIcon size={11} className={status.iconColor} />
                      <span className="text-xs font-semibold">{status.label}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Confidence</span>
                        <span className="font-semibold text-slate-700">{pct}%</span>
                      </div>
                      <div className="w-full bg-white bg-opacity-60 rounded-full h-1.5">
                        <div className={`${status.bar} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
