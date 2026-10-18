"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { getResults } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowRight, Bus, Users, MapPin, CheckCircle, ArrowRightLeft, Info } from "lucide-react";

interface OptimizationResult {
  route_id: number;
  demand_after: number;
  waiting_passengers: number;
  actions: string[];
  frequency_multiplier: number;
  buses_added: number;
  rerouted_to: number | null;
  anomaly: boolean;
  high_uncertainty: boolean;
}

interface Reroute {
  from_route: number;
  to_route: number;
  demand: number;
  waiting: number;
}

export default function ReroutingPage() {
  const [reroutes, setReroutes] = useState<Reroute[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getResults().then((data) => {
      const results = data as OptimizationResult[];
      const seen = new Set<string>();
      const list: Reroute[] = [];

      results.forEach(r => {
        if (r.rerouted_to) {
          const key = `${r.route_id}->${r.rerouted_to}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              from_route: r.route_id,
              to_route:   r.rerouted_to,
              demand:     r.demand_after,
              waiting:    r.waiting_passengers,
            });
          }
        }
      });

      setReroutes(list);
      setLoading(false);
    });
  }, []);

  const totalReroutes    = reroutes.length;
  const receivingRoutes  = new Set(reroutes.map(r => r.to_route)).size;
  const totalPassengers  = Math.round(reroutes.reduce((s, r) => s + r.demand * 0.15, 0));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Bus Rerouting</h1>
          <p className="text-sm text-slate-500 mt-1">
            When a route becomes too crowded, some passengers are redirected to a nearby route that has spare capacity
          </p>
        </div>

        {/* What is rerouting — plain explanation */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 mb-1">What does rerouting mean?</p>
            <p className="text-sm text-blue-700">
              When a route is too crowded, the system finds a <strong>quieter nearby route</strong> that has a spare bus.
              That spare bus is temporarily moved to the busy route to carry the extra passengers.
              For example: Route 7 is overcrowded → the system borrows a spare bus from quiet Route 60
              and sends it to Route 7. Route 7 gets less crowded, passengers wait less.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : reroutes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-green-700">No rerouting needed right now</p>
              <p className="text-xs text-slate-500 mt-1">All routes are within comfortable passenger limits</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-red-600" />
                  <p className="text-xs font-semibold text-red-700">Overcrowded Routes</p>
                </div>
                <p className="text-3xl font-bold text-red-700">{totalReroutes}</p>
                <p className="text-xs text-red-600 mt-1">
                  too busy — a spare bus was borrowed from a quieter route to help
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Bus size={18} className="text-green-600" />
                  <p className="text-xs font-semibold text-green-700">Quiet Routes That Helped</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{receivingRoutes}</p>
                <p className="text-xs text-green-600 mt-1">
                  had a spare bus available and lent it to a busier route
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Passengers Who Benefited</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{totalPassengers.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">
                  estimated passengers who got a seat instead of waiting
                </p>
              </div>
            </div>

            {/* Individual reroute cards */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRight size={16} className="text-slate-500" />
                  Each Rerouting Decision
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Click any route number to see its full details
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reroutes.map((r, i) => {
                    const urgency = r.demand > 400 ? "Very crowded" : r.demand > 250 ? "Crowded" : "Moderately crowded";
                    const urgencyColor = r.demand > 400 ? "text-red-600 bg-red-50 border-red-200" : r.demand > 250 ? "text-orange-600 bg-orange-50 border-orange-200" : "text-yellow-600 bg-yellow-50 border-yellow-200";

                    return (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">

                        {/* Route flow visual — corrected direction */}
                        <div className="flex items-center gap-3 mb-3">
                          {/* Quiet route (source of spare bus) */}
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center">
                              <span className="text-sm font-bold text-green-700">R-{r.to_route}</span>
                            </div>
                            <span className="text-xs text-green-600 mt-1 font-medium text-center">Quiet route<br/>lends a bus</span>
                          </div>

                          {/* Arrow: bus travels from quiet → busy */}
                          <div className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                              <Bus size={12} className="text-amber-600" />
                              <span className="text-xs font-semibold text-amber-700">spare bus moved</span>
                            </div>
                            <div className="flex items-center gap-1 w-full">
                              <div className="flex-1 h-0.5 bg-slate-200" />
                              <ArrowRight size={16} className="text-slate-400 shrink-0" />
                            </div>
                          </div>

                          {/* Overcrowded route (receives the spare bus) */}
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
                              <span className="text-sm font-bold text-red-700">R-{r.from_route}</span>
                            </div>
                            <span className="text-xs text-red-600 mt-1 font-medium text-center">Overcrowded<br/>gets the bus</span>
                          </div>
                        </div>

                        {/* Plain English explanation — corrected */}
                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-slate-700">
                            <span className="font-semibold">Route {r.from_route}</span> has{" "}
                            <span className="font-semibold">{Math.round(r.demand).toLocaleString()} daily passengers</span>{" "}
                            and is too crowded. The system found that{" "}
                            <span className="font-semibold">Route {r.to_route}</span> is quiet and has a spare bus.
                            That spare bus is moved to Route {r.from_route} to carry the extra passengers,
                            reducing waiting times.
                          </p>
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${urgencyColor}`}>
                            {urgency}
                          </span>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                            ~{Math.round(r.demand * 0.15).toLocaleString()} passengers helped
                          </span>
                          {r.waiting > 0 && (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-blue-50 text-blue-600 border-blue-200">
                              {Math.round(r.waiting)} still waiting after redirect
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* How it helps — bottom note */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800 mb-1">Why is this good for passengers?</p>
                <p className="text-sm text-green-700">
                  Without rerouting, passengers on an overcrowded route would have to wait for the next bus
                  or stand in a packed bus. By temporarily moving a spare bus from a quieter route to the
                  busy one, more people get a seat and waiting times go down across the whole network.
                  The quiet route loses one bus temporarily, but because it has low demand, its passengers
                  are barely affected.
                </p>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
