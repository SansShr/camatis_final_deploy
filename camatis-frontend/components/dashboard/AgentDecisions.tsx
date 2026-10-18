"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Brain, Users, Bus, Calendar, TrendingUp, Shield, Wrench, Cloud, TrafficCone, Route, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { getAgentSystemStatus, type AgentSystemStatus } from "@/lib/api";

export default function AgentDecisions() {
  const [systemStatus, setSystemStatus] = useState<AgentSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentStatus = async () => {
      try {
        const data = await getAgentSystemStatus();
        setSystemStatus(data);
      } catch (error) {
        console.error("Failed to fetch agent status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Watchers — agents that monitor what is happening right now
  const watcherAgents = [
    {
      name: "Driver Safety Watcher",
      icon: Shield,
      color: "bg-red-500",
      what: "Checks if drivers are overworked or fatigued",
      why: "Keeps passengers and drivers safe",
      reliability: "Very High"
    },
    {
      name: "Bus Health Watcher",
      icon: Wrench,
      color: "bg-orange-500",
      what: "Checks if buses need maintenance or are too full",
      why: "Prevents breakdowns on the road",
      reliability: "Very High"
    },
    {
      name: "Weather Watcher",
      icon: Cloud,
      color: "bg-cyan-500",
      what: "Checks rain, heat, or storms that affect bus routes",
      why: "Adjusts service during bad weather",
      reliability: "High"
    },
    {
      name: "Traffic Watcher",
      icon: TrafficCone,
      color: "bg-yellow-500",
      what: "Checks congestion and delays on roads",
      why: "Helps buses avoid traffic jams",
      reliability: "High"
    }
  ];

  // Planners — agents that decide what action to take
  const plannerAgents = [
    {
      name: "Passenger Demand Planner",
      icon: Users,
      color: "bg-blue-500",
      what: "Predicts how many passengers will need a bus",
      why: "Avoids overcrowded or empty buses",
      reliability: "Standard"
    },
    {
      name: "Bus Allocation Planner",
      icon: Bus,
      color: "bg-green-500",
      what: "Decides how many buses to send to each route",
      why: "Makes sure no route is left without service",
      reliability: "Standard"
    },
    {
      name: "Schedule Planner",
      icon: Calendar,
      color: "bg-purple-500",
      what: "Adjusts how often buses run on each route",
      why: "Reduces waiting time at bus stops",
      reliability: "Standard"
    },
    {
      name: "Route Planner",
      icon: Route,
      color: "bg-pink-500",
      what: "Suggests alternate routes when roads are blocked",
      why: "Keeps service running during disruptions",
      reliability: "Standard"
    }
  ];

  const reliabilityColor: Record<string, string> = {
    "Very High": "text-green-600 bg-green-50 border-green-200",
    "High":      "text-blue-600 bg-blue-50 border-blue-200",
    "Standard":  "text-slate-600 bg-slate-50 border-slate-200"
  };

  const total = systemStatus?.total_conflicts_resolved || 0;
  const safetyOverrides  = systemStatus?.resolution_strategy_counts?.safety_override   || 0;
  const votingResolved   = systemStatus?.resolution_strategy_counts?.weighted_voting    || 0;
  const consensusActions = systemStatus?.resolution_strategy_counts?.combined_actions   || 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Top banner ── */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-xl">
                <Brain size={26} />
              </div>
              <div>
                <p className="text-base font-bold text-indigo-900">
                  Smart Bus Management System — 9 Programs Running
                </p>
                <p className="text-xs text-indigo-700 mt-0.5">
                  9 specialist programs are continuously watching and improving bus operations
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-indigo-700">{total.toLocaleString()}</p>
                <p className="text-xs text-indigo-600">Decisions Made</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">Active</p>
                <p className="text-xs text-green-600">System Status</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── How disagreements are resolved ── */}
      {total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">When Programs Disagreed — How It Was Settled</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              When different parts of the system give different recommendations, the best one is picked using these 3 rules
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Safety wins */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-red-600" />
                  <p className="text-xs font-semibold text-red-700">Safety Comes First</p>
                </div>
                <p className="text-3xl font-bold text-red-700 mb-1">{safetyOverrides.toLocaleString()}</p>
                <p className="text-xs text-red-600">
                  Times a safety warning overruled other suggestions — passenger safety is always the top priority
                </p>
              </div>
              {/* Voting */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Most Reliable Program Won</p>
                </div>
                <p className="text-3xl font-bold text-blue-700 mb-1">{votingResolved.toLocaleString()}</p>
                <p className="text-xs text-blue-600">
                  Times the most reliable program's recommendation was chosen when they disagreed
                </p>
              </div>
              {/* Consensus */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-green-600" />
                  <p className="text-xs font-semibold text-green-700">All Programs Agreed</p>
                </div>
                <p className="text-3xl font-bold text-green-700 mb-1">{consensusActions.toLocaleString()}</p>
                <p className="text-xs text-green-600">
                  Times all programs agreed on the same action — combined for the best outcome
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Watchers ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity size={18} className="text-red-500" />
            Monitoring Programs — What Is Being Watched Right Now
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            These 4 programs continuously observe real-world conditions and raise alerts when something needs attention
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {watcherAgents.map((agent, idx) => (
              <div key={idx} className="p-4 border rounded-xl hover:shadow-md transition-all bg-white">
                <div className={`inline-flex p-2 ${agent.color} text-white rounded-lg mb-3`}>
                  <agent.icon size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">{agent.name}</p>
                <p className="text-xs text-slate-600 mb-2">{agent.what}</p>
                <p className="text-xs text-slate-500 italic mb-3">Why: {agent.why}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${reliabilityColor[agent.reliability]}`}>
                    {agent.reliability} Reliability
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-600">Watching now</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Planners ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Planning Programs — What Decisions Are Being Made
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            These 4 programs use the monitoring data to plan the best bus routes, schedules, and fleet sizes
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {plannerAgents.map((agent, idx) => (
              <div key={idx} className="p-4 border rounded-xl hover:shadow-md transition-all bg-white">
                <div className={`inline-flex p-2 ${agent.color} text-white rounded-lg mb-3`}>
                  <agent.icon size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">{agent.name}</p>
                <p className="text-xs text-slate-600 mb-2">{agent.what}</p>
                <p className="text-xs text-slate-500 italic mb-3">Why: {agent.why}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${reliabilityColor[agent.reliability]}`}>
                    {agent.reliability} Reliability
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-600">Planning now</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Supervisor ── */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 text-white rounded-xl">
                <Brain size={26} />
              </div>
              <div>
                <p className="text-base font-bold text-purple-900">
                  The Coordinator — Final Decision Maker
                </p>
                <p className="text-xs text-purple-700 mt-0.5">
                  Listens to all 8 programs, settles disagreements, and issues the final instruction for each route
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-purple-700">
                  {systemStatus?.supervisor_status?.conflicts_resolved?.toLocaleString() || total.toLocaleString()}
                </p>
                <p className="text-xs text-purple-600">Final Decisions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">Active</p>
                <p className="text-xs text-green-600">Right Now</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
