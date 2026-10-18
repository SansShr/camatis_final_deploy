"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertTriangle, CheckCircle, Users, Bus, Zap, TrendingUp } from "lucide-react";

interface CriticalRoute {
  route_id: number;
  demand_after: number;
  waiting_passengers: number;
  buses_added: number;
  frequency_multiplier: number;
  actions: string[];
  anomaly: boolean;
}

// Turn raw action strings into plain English
function friendlyAction(action: string): string {
  if (!action || action === "No action") return "";
  if (action.includes("Investigate Anomaly")) return "Investigating unusual pattern";
  if (action.includes("Increase Frequency"))  return "Running buses more often";
  if (action.includes("Allocate Extra Bus"))   return "Added extra buses";
  if (action.includes("High Demand Risk"))     return "High passenger demand";
  if (action.includes("Reroute"))              return "Redirecting buses";
  return action;
}

function urgencyMeta(waiting: number, anomaly: boolean) {
  if (anomaly)       return { label: "Needs Review",   color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500", bar: "bg-purple-400" };
  if (waiting > 15)  return { label: "Very Busy",      color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500",    bar: "bg-red-400"    };
  if (waiting > 10)  return { label: "Getting Busy",   color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", bar: "bg-orange-400" };
  return               { label: "Watch Closely",       color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-500", bar: "bg-yellow-400" };
}

export default function CriticalRoutes({ results }: { results: any[] }) {
  const criticalRoutes = results
    .filter(r => r.waiting_passengers > 8 || r.anomaly || r.buses_added > 2)
    .sort((a, b) => b.waiting_passengers - a.waiting_passengers)
    .slice(0, 20);

  const maxWaiting = Math.max(...criticalRoutes.map(r => r.waiting_passengers), 1);

  if (criticalRoutes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            Routes Needing Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <CheckCircle size={40} className="text-green-400" />
            <p className="text-sm font-semibold text-green-700">All routes running smoothly!</p>
            <p className="text-xs text-slate-500">No routes need immediate attention right now</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            Routes Needing Attention
          </CardTitle>
          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
            {criticalRoutes.length} routes
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          These routes have too many passengers waiting or something unusual was spotted
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {criticalRoutes.map((route) => {
            const meta = urgencyMeta(route.waiting_passengers, route.anomaly);
            const fillPct = Math.min(100, Math.round((route.waiting_passengers / maxWaiting) * 100));
            const cleanActions = (route.actions || [])
              .map(friendlyAction)
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i); // deduplicate

            return (
              <div key={route.route_id} className={`rounded-xl border p-4 ${meta.bg} ${meta.border}`}>
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${meta.dot} animate-pulse`} />
                    <span className="text-sm font-bold text-slate-800">Route R-{route.route_id}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white bg-opacity-70 border ${meta.color} ${meta.border}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${meta.color}`}>{Math.round(route.waiting_passengers)}</p>
                    <p className="text-xs text-slate-500">still waiting after fix</p>
                  </div>
                </div>

                {/* Waiting bar */}
                <div className="mb-3">
                  <div className="w-full bg-white bg-opacity-60 rounded-full h-2">
                    <div
                      className={`${meta.bar} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {fillPct}% of today's peak waiting load
                  </p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white bg-opacity-60 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Users size={11} className="text-slate-500" />
                      <p className="text-xs text-slate-500">Daily passengers</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{Math.round(route.demand_after)}</p>
                  </div>
                  <div className="bg-white bg-opacity-60 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Bus size={11} className="text-slate-500" />
                      <p className="text-xs text-slate-500">Buses added</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700">+{route.buses_added}</p>
                  </div>
                  <div className="bg-white bg-opacity-60 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <TrendingUp size={11} className="text-slate-500" />
                      <p className="text-xs text-slate-500">More frequent</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{route.frequency_multiplier.toFixed(1)}×</p>
                  </div>
                </div>

                {/* Actions taken */}
                {cleanActions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Zap size={11} /> What is being done about it:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cleanActions.map((action, idx) => (
                        <span key={idx} className="text-xs px-2.5 py-1 bg-white bg-opacity-80 rounded-full border border-white text-slate-700 font-medium">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {criticalRoutes.length > 3 && (
          <p className="text-xs text-center text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Scroll to see all {criticalRoutes.length} routes needing attention
          </p>
        )}
      </CardContent>
    </Card>
  );
}
