"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertTriangle, CheckCircle, Shield, TrendingUp, Users, GitMerge } from "lucide-react";
import { useEffect, useState } from "react";
import { getAllConflicts } from "@/lib/api";

interface ConflictResolution {
  route_id: number;
  resolution_strategy: string;
  primary_agent: string;
  supporting_agents: string[];
  rejected_agents: string[];
  final_action: string;
  reasoning: string;
  weighted_scores: Record<string, number>;
}

// Shorten technical agent names into friendly short labels
function friendlyAgent(name: string): string {
  if (!name) return "Unknown";
  if (name.includes("Demand"))      return "Passenger Demand";
  if (name.includes("Fleet"))       return "Bus Fleet";
  if (name.includes("Scheduling"))  return "Schedule";
  if (name.includes("Route Optim")) return "Route Planner";
  if (name.includes("Driver"))      return "Driver Safety";
  if (name.includes("Vehicle"))     return "Bus Health";
  if (name.includes("Weather"))     return "Weather";
  if (name.includes("Congestion"))  return "Traffic";
  if (name.includes("Supervisor"))  return "Final Decision Maker";
  return name.replace(" Agent", "");
}

// Turn the final_action field (may be raw JSON string) into a readable sentence
function friendlyAction(raw: string): string {
  if (!raw) return "Maintain current service";
  // If it's a JSON string, try to extract a readable action
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      const action = parsed?.action || parsed?.primary_action || "";
      if (action) return humaniseAction(action);
    } catch { /* fall through */ }
    // Still JSON but unparseable — strip it down
    const match = raw.match(/"action"\s*:\s*"([^"]+)"/);
    if (match) return humaniseAction(match[1]);
    return "Adjust bus service on this route";
  }
  return humaniseAction(raw);
}

function humaniseAction(action: string): string {
  if (!action) return "Maintain current service";
  const a = action.toLowerCase();
  if (a.includes("expand") || a.includes("increase") || a.includes("add"))
    return "Add more buses to reduce crowding";
  if (a.includes("reduce") || a.includes("decrease") || a.includes("cut"))
    return "Reduce bus frequency to save costs";
  if (a.includes("reroute") || a.includes("redirect"))
    return "Redirect buses through an alternative road";
  if (a.includes("maintain") || a.includes("normal") || a.includes("neutral"))
    return "Keep current service as-is";
  if (a.includes("schedule") || a.includes("frequency"))
    return "Adjust bus departure times";
  return action.charAt(0).toUpperCase() + action.slice(1);
}

const strategyMeta: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; explain: string }> = {
  safety_override: {
    label: "Safety First",
    icon: Shield,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    explain: "A safety alert overruled other suggestions"
  },
  weighted_voting: {
    label: "Best Check Won",
    icon: TrendingUp,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    explain: "The most reliable program's advice was followed"
  },
  combined_actions: {
    label: "All Agreed",
    icon: GitMerge,
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    explain: "All checks agreed and their actions were combined"
  },
};

const scoreBar = (score: number) => {
  const pct = Math.min(100, Math.round(score * 100));
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-red-400";
  return { pct, color };
};

export default function ConflictResolutionPanel() {
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<number | null>(null);

  useEffect(() => {
    getAllConflicts()
      .then(setConflicts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Summary counts
  const safetyCount  = conflicts.filter(c => c.resolution_strategy === "safety_override").length;
  const votingCount  = conflicts.filter(c => c.resolution_strategy === "weighted_voting").length;
  const mergeCount   = conflicts.filter(c => c.resolution_strategy === "combined_actions").length;

  if (loading) return (
    <Card>
      <CardContent className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </CardContent>
    </Card>
  );

  if (conflicts.length === 0) return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" />
          AI Disagreements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">All checks agreed!</p>
          <p className="text-xs text-slate-500 mt-1">No disagreements needed resolving</p>
        </div>
      </CardContent>
    </Card>
  );

  const visible = conflicts.slice(0, 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle size={18} className="text-orange-500" />
          When the AI Had Different Opinions — How It Was Resolved
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Sometimes different parts of the AI recommend different actions for the same route.
          Here is how the system settled each disagreement.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── Summary pills ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Safety overruled others",      count: safetyCount,  icon: Shield,     color: "text-red-600",   bg: "bg-red-50 border-red-200" },
            { label: "Most reliable check won",       count: votingCount,  icon: TrendingUp, color: "text-blue-600",  bg: "bg-blue-50 border-blue-200" },
            { label: "All checks agreed",             count: mergeCount,   icon: GitMerge,   color: "text-green-600", bg: "bg-green-50 border-green-200" },
          ].map(({ label, count, icon: Icon, color, bg }) => (
            <div key={label} className={`p-3 rounded-xl border flex items-center gap-3 ${bg}`}>
              <Icon size={20} className={color} />
              <div>
                <p className={`text-xl font-bold ${color}`}>{count.toLocaleString()}</p>
                <p className="text-xs text-slate-600 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Per-route cards ── */}
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {visible.map((conflict, idx) => {
            const meta    = strategyMeta[conflict.resolution_strategy] ?? strategyMeta.weighted_voting;
            const Icon    = meta.icon;
            const isOpen  = expanded === idx;
            const action  = friendlyAction(conflict.final_action);
            const scores  = conflict.weighted_scores ?? {};
            const hasScores = Object.keys(scores).length > 0;

            return (
              <div
                key={idx}
                className="border rounded-xl overflow-hidden"
              >
                {/* Row header — always visible */}
                <button
                  className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    {/* Route badge */}
                    <span className="text-xs font-bold bg-slate-800 text-white px-2 py-0.5 rounded">
                      Route {conflict.route_id}
                    </span>
                    {/* Strategy pill */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${meta.bg} ${meta.color}`}>
                      <Icon size={11} />
                      {meta.label}
                    </span>
                    {/* Final action summary */}
                    <span className="text-xs text-slate-600 hidden sm:inline truncate max-w-xs">
                      {action}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs">{isOpen ? "▲ hide" : "▼ details"}</span>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50 border-t space-y-3">

                    {/* What was decided */}
                    <div className="p-3 bg-white border border-indigo-200 rounded-lg">
                      <p className="text-xs font-semibold text-indigo-700 mb-0.5">What the AI decided to do</p>
                      <p className="text-sm text-slate-800">{action}</p>
                    </div>

                    {/* Why */}
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-0.5">Why this method was used</p>
                      <p className="text-xs text-slate-700">{meta.explain}</p>
                    </div>

                    {/* Who led + who supported */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-semibold text-green-700 mb-1">Main check used</p>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={12} className="text-green-600" />
                          <span className="text-xs text-slate-700">{friendlyAgent(conflict.primary_agent)}</span>
                        </div>
                        {conflict.supporting_agents?.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-slate-500">Also supported by:</p>
                            {conflict.supporting_agents.map((a, i) => (
                              <span key={i} className="text-xs text-slate-600 block">• {friendlyAgent(a)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {conflict.rejected_agents?.length > 0 && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-semibold text-red-700 mb-1">Overruled checks</p>
                          {conflict.rejected_agents.map((a, i) => (
                            <span key={i} className="text-xs text-slate-600 block">• {friendlyAgent(a)}</span>
                          ))}
                          <p className="text-xs text-red-500 mt-1">Their suggestions were set aside</p>
                        </div>
                      )}
                    </div>

                    {/* Agent confidence bars */}
                    {hasScores && (
                      <div className="p-3 bg-white border border-slate-200 rounded-lg">
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          How certain was each check? (higher = more confident)
                        </p>
                        <div className="space-y-2">
                          {Object.entries(scores).map(([agent, score]) => {
                            const { pct, color } = scoreBar(score as number);
                            return (
                              <div key={agent}>
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="text-slate-600">{friendlyAgent(agent)}</span>
                                  <span className="font-semibold text-slate-700">{pct}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                  <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {conflicts.length > 30 && (
          <p className="text-center text-xs text-slate-500 pt-1">
            Showing 30 of {conflicts.length.toLocaleString()} resolved disagreements
          </p>
        )}
      </CardContent>
    </Card>
  );
}
