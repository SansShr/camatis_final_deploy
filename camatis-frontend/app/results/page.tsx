"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { getResults } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Bus, Users, ArrowRight, CheckCircle, AlertTriangle, TrendingUp, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/Input";

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

// ── Plain English action translation ─────────────────────────────────────────
function friendlyActions(actions: string[]): { label: string; color: string }[] {
  const out: { label: string; color: string }[] = [];
  const clean = actions.filter(a => a && a !== "No action");
  clean.forEach(a => {
    if (a.includes("Increase Frequency"))  out.push({ label: "Buses run more often",    color: "bg-blue-100 text-blue-700" });
    if (a.includes("Allocate Extra Bus"))  out.push({ label: "Extra bus added",          color: "bg-green-100 text-green-700" });
    if (a.includes("High Demand Risk"))    out.push({ label: "Very busy route",           color: "bg-orange-100 text-orange-700" });
    if (a.includes("Investigate Anomaly"))out.push({ label: "Being monitored",           color: "bg-purple-100 text-purple-700" });
  });
  return out;
}

// ── Row status ────────────────────────────────────────────────────────────────
function rowStatus(r: OptimizationResult): { label: string; style: string } {
  if (r.rerouted_to)       return { label: "Redirected",   style: "bg-orange-100 text-orange-700" };
  if (r.high_uncertainty)  return { label: "Watch Closely", style: "bg-yellow-100 text-yellow-700" };
  if (r.buses_added > 0)   return { label: "Improved",      style: "bg-green-100 text-green-700" };
  return                          { label: "Running Fine",   style: "bg-slate-100 text-slate-600" };
}

export default function ResultsPage() {
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("All");

  useEffect(() => {
    getResults().then(data => {
      setResults(data as OptimizationResult[]);
      setLoading(false);
    });
  }, []);

  // Summary stats
  const totalBusesAdded  = results.reduce((s, r) => s + (r.buses_added || 0), 0);
  const routesImproved   = results.filter(r => r.buses_added > 0).length;
  const routesRerouted   = results.filter(r => r.rerouted_to).length;
  const routesMonitored  = results.filter(r => r.high_uncertainty).length;

  const filtered = useMemo(() => {
    let out = results;
    if (search.trim()) {
      out = out.filter(r => `R-${r.route_id}`.includes(search) || String(r.route_id).includes(search));
    }
    if (filter === "Improved")    out = out.filter(r => r.buses_added > 0 && !r.rerouted_to);
    if (filter === "Redirected")  out = out.filter(r => !!r.rerouted_to);
    if (filter === "Watch")       out = out.filter(r => r.high_uncertainty);
    if (filter === "Running Fine")out = out.filter(r => !r.buses_added && !r.rerouted_to && !r.high_uncertainty);
    return out;
  }, [results, search, filter]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">What Was Done for Each Route</h1>
          <p className="text-sm text-slate-500 mt-1">
            A summary of every change the system made across all {results.length} routes — extra buses, schedule changes, and redirections
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Bus size={18} className="text-green-600" />
                  <p className="text-xs font-semibold text-green-700">Extra Buses Added</p>
                </div>
                <p className="text-3xl font-bold text-green-700">+{totalBusesAdded}</p>
                <p className="text-xs text-green-600 mt-1">across all routes combined</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Routes Improved</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{routesImproved}</p>
                <p className="text-xs text-blue-600 mt-1">routes got extra buses or more frequent service</p>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight size={18} className="text-orange-600" />
                  <p className="text-xs font-semibold text-orange-700">Buses Redirected</p>
                </div>
                <p className="text-3xl font-bold text-orange-700">{routesRerouted}</p>
                <p className="text-xs text-orange-600 mt-1">overcrowded routes had passengers redirected</p>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-yellow-600" />
                  <p className="text-xs font-semibold text-yellow-700">Being Monitored</p>
                </div>
                <p className="text-3xl font-bold text-yellow-700">{routesMonitored}</p>
                <p className="text-xs text-yellow-600 mt-1">routes with harder-to-predict passenger numbers</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search route..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-500" />
                {["All", "Improved", "Redirected", "Watch", "Running Fine"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      filter === f
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400 ml-auto">Showing {filtered.length} of {results.length} routes</span>
            </div>

            {/* Route cards */}
            <div className="space-y-2">
              {filtered.map((r) => {
                const actions = friendlyActions(r.actions || []);
                const status  = rowStatus(r);
                const demand  = Math.round(r.demand_after || 0);
                const waiting = Math.round(r.waiting_passengers || 0);

                return (
                  <div
                    key={r.route_id}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow"
                  >
                    {/* Route badge */}
                    <div className="shrink-0 w-16 text-center">
                      <span className="text-sm font-bold text-blue-600">R-{r.route_id}</span>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.style}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* What was done */}
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {actions.length > 0
                        ? actions.map((a, i) => (
                            <span key={i} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${a.color}`}>
                              {a.label}
                            </span>
                          ))
                        : <span className="text-xs text-slate-400">No changes needed</span>
                      }
                    </div>

                    {/* Key numbers */}
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-xs text-slate-400">Passengers</p>
                        <p className="text-sm font-semibold text-slate-700">{demand.toLocaleString()}</p>
                      </div>
                      {r.buses_added > 0 && (
                        <div>
                          <p className="text-xs text-slate-400">Buses added</p>
                          <p className="text-sm font-semibold text-green-600">+{r.buses_added}</p>
                        </div>
                      )}
                      {r.rerouted_to && (
                        <div>
                          <p className="text-xs text-slate-400">Overflow to</p>
                          <p className="text-sm font-semibold text-orange-600">R-{r.rerouted_to}</p>
                        </div>
                      )}
                      {waiting > 0 && (
                        <div>
                          <p className="text-xs text-slate-400">Still waiting</p>
                          <p className="text-sm font-semibold text-slate-600">{waiting}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle size={40} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No routes match your filter</p>
              </div>
            )}

            {/* Footer note */}
            <p className="text-xs text-slate-400 text-center pt-2">
              Showing all {results.length} routes. &quot;Still waiting&quot; is an estimate of passengers with a short wait after improvements were applied.
            </p>

          </div>
        )}
      </main>
    </div>
  );
}
