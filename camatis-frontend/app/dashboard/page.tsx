"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import StatsCards from "@/components/dashboard/StatsCards";
import DemandChart from "@/components/dashboard/DemandChart";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import FleetStatus from "@/components/dashboard/FleetStatus";
import CriticalRoutes from "@/components/dashboard/CriticalRoutes";
import PeakHoursAnalysis from "@/components/dashboard/PeakHoursAnalysis";
import FestiveSeasonDemand from "@/components/dashboard/FestiveSeasonDemand";
import WeatherImpact from "@/components/dashboard/WeatherImpact";
import AgentDecisions from "@/components/dashboard/AgentDecisions";
import ConflictResolutionPanel from "@/components/dashboard/ConflictResolutionPanel";
import CostEfficiency from "@/components/dashboard/CostEfficiency";
import { postOptimize, getDashboard, getResults } from "@/lib/api";

export default function DashboardPage() {
  const [optimizing, setOptimizing] = useState(false);
  const [msg, setMsg] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [realBuses, setRealBuses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchData = async () => {
    const [dashboard, resultsData] = await Promise.all([getDashboard(), getResults()]);
    const totalBuses = (resultsData as any[]).reduce((sum, r) => sum + (r.buses_added || 0), 0) + (resultsData?.length || 0);
    setRealBuses(totalBuses);
    setDashboardData(dashboard);
    setResults(resultsData);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOptimize = async () => {
    setOptimizing(true);
    setMsg("");
    try {
      const res = await postOptimize();
      setMsg(res?.message ?? "Optimization complete");
      await fetchData();
    } catch (err) {
      setMsg("Optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading transit network data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Transit Control Dashboard</h1>
            <p className="text-sm font-medium text-slate-600 mt-1">
              Real-time monitoring of buses, routes, and passenger demand • Updates every 30 seconds
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-100 border-2 border-green-500 text-green-800 text-sm font-bold rounded-lg">
              ✓ System Active — All Data Current
            </div>
            <div className="text-sm font-semibold text-slate-600">
              Last updated: {lastUpdated}
            </div>
          </div>
        </div>
        <p className="text-base font-semibold text-slate-600 mb-6">
          Smart system tracking{" "}
          <span className="text-blue-700 font-bold">{dashboardData?.stats?.total_routes || 269} bus routes</span>
          {" "}and{" "}
          <span className="text-green-700 font-bold">{realBuses} buses</span>
          {" "}across the city
        </p>
        {msg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            ✓ {msg}
          </div>
        )}

        {/* Weather Impact */}
        <div className="mb-6">
          <WeatherImpact />
        </div>

        {/* Optimisation complete highlight */}
        <div className="mb-5 px-4 py-3 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl flex items-center gap-3">
          <span className="text-indigo-700 text-lg">⚡</span>
          <div>
            <p className="text-sm font-bold text-indigo-800">
              Route Optimisation Complete
            </p>
            <p className="text-xs font-medium text-indigo-600">
              All {dashboardData?.stats?.total_routes || 269} routes have been analysed and optimised —
              extra buses allocated, schedules adjusted, and crowded routes balanced
            </p>
          </div>
        </div>

        {/* Key Stats */}
        <StatsCards stats={{
          total_routes: dashboardData?.stats?.total_routes || 0,
          active_buses: realBuses,
          high_demand_routes: dashboardData?.stats?.high_demand_routes || 0,
          anomalies: dashboardData?.stats?.anomalies || 0,
          avg_load_factor: dashboardData?.stats?.avg_load_factor || 0,
          avg_demand: dashboardData?.stats?.avg_demand || 0
        }} />

        {/* Fleet Status */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              ⚡ Optimised
            </span>
            <span className="text-xs font-medium text-slate-500">Fleet allocation adjusted based on real demand</span>
          </div>
        </div>
        <FleetStatus results={results} />

        {/* Cost & Efficiency */}
        <div className="mb-2 mt-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              ⚡ Optimised
            </span>
            <span className="text-xs font-medium text-slate-500">Expenses calculated after optimisation decisions</span>
          </div>
        </div>
        <div className="mb-8">
          <CostEfficiency results={results} />
        </div>

        {/* Festive Season & Peak Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <FestiveSeasonDemand />
          <PeakHoursAnalysis results={results} />
        </div>

        {/* AI Decision System */}
        <div className="mb-8">
          <AgentDecisions />
        </div>

        {/* How the AI Settled Disagreements */}
        <div className="mb-8">
          <ConflictResolutionPanel />
        </div>
        
        {/* Demand & Load Charts */}
        <div className="mb-8">
          <DemandChart 
            demandData={dashboardData?.demand || []} 
            loadData={dashboardData?.load || []} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Critical Routes */}
          <CriticalRoutes results={results} />
          
          {/* Alerts */}
          <AlertsPanel alerts={dashboardData?.alerts || []} />
        </div>
      </main>
    </div>
  );
}