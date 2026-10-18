"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { getAlerts } from "@/lib/api";
import { AlertTriangle, Eye, Bell, CheckCircle, Info, Search, Filter, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface Alert {
  id: number;
  route: string;
  message: string;
  severity: string;
  time: string;
}

// ── Classify alert type from message ─────────────────────────────────────────
function classifyAlert(message: string): {
  type: string;
  icon: React.ElementType;
  iconColor: string;
  bg: string;
  border: string;
  pill: string;
  plainLabel: string;
  whatItMeans: string;
  whatToDo: string;
} {
  const m = message.toLowerCase();

  if (m.includes("unusual pattern") || m.includes("flagged") || m.includes("investigate")) {
    return {
      type: "unusual",
      icon: AlertTriangle,
      iconColor: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      pill: "bg-orange-100 text-orange-700",
      plainLabel: "Unusual Pattern Spotted",
      whatItMeans: "The system noticed something unexpected on this route — like a sudden surge or drop in passengers that doesn't match normal patterns.",
      whatToDo: "Check the route details to see what's different and whether any action is needed.",
    };
  }

  // Uncertainty / harder to predict
  return {
    type: "uncertain",
    icon: Eye,
    iconColor: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    pill: "bg-blue-100 text-blue-700",
    plainLabel: "Worth Keeping an Eye On",
    whatItMeans: "Passenger numbers on this route are harder than usual to predict right now. The system is less certain about its recommendations.",
    whatToDo: "No immediate action needed, but monitoring this route more closely is advised.",
  };
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("All");

  useEffect(() => {
    getAlerts().then(data => {
      setAlerts(data as Alert[]);
      setLoading(false);
    });
  }, []);

  const unusualCount   = alerts.filter(a => classifyAlert(a.message).type === "unusual").length;
  const uncertainCount = alerts.filter(a => classifyAlert(a.message).type === "uncertain").length;

  const filtered = alerts.filter(a => {
    const matchSearch = !search.trim() || a.route.toLowerCase().includes(search.toLowerCase());
    const type = classifyAlert(a.message).type;
    const matchFilter = filter === "All"
      || (filter === "Unusual" && type === "unusual")
      || (filter === "Watch"   && type === "uncertain");
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Route Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Routes that need a closer look — either something unusual was spotted, or passenger numbers are harder than normal to predict
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-green-700">No alerts right now</p>
            <p className="text-xs text-slate-500 mt-1">All routes are running as expected</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={16} className="text-slate-600" />
                  <p className="text-xs font-semibold text-slate-600">Total Alerts</p>
                </div>
                <p className="text-3xl font-bold text-slate-700">{alerts.length}</p>
                <p className="text-xs text-slate-500 mt-1">routes flagged for attention</p>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-orange-600" />
                  <p className="text-xs font-semibold text-orange-700">Unusual Patterns</p>
                </div>
                <p className="text-3xl font-bold text-orange-700">{unusualCount}</p>
                <p className="text-xs text-orange-600 mt-1">routes with unexpected behaviour</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Worth Monitoring</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{uncertainCount}</p>
                <p className="text-xs text-blue-600 mt-1">routes harder to predict than usual</p>
              </div>
            </div>

            {/* What do these mean — explainer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                <AlertTriangle size={18} className="text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-800 mb-1">What is an unusual pattern?</p>
                  <p className="text-xs text-orange-700">
                    The system noticed something that doesn&apos;t fit the normal pattern for that route — like a sudden spike or drop in passengers. It could be an event, road closure, or a real issue worth checking.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Eye size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">What does &quot;worth monitoring&quot; mean?</p>
                  <p className="text-xs text-blue-700">
                    The system is less confident than usual about its predictions for this route. No immediate problem, but it&apos;s keeping a closer eye on it in case things change.
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[180px]">
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
                {["All", "Unusual", "Watch"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      filter === f
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {f === "Unusual" ? "Unusual Patterns" : f === "Watch" ? "Worth Monitoring" : f}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400 ml-auto">
                {filtered.length} of {alerts.length} alerts
              </span>
            </div>

            {/* Alert cards */}
            <div className="space-y-3">
              {filtered.map(alert => {
                const cfg  = classifyAlert(alert.message);
                const Icon = cfg.icon;

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg bg-white bg-opacity-70 ${cfg.iconColor} shrink-0`}>
                        <Icon size={18} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-sm font-bold text-slate-800">{alert.route}</span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.pill}`}>
                            {cfg.plainLabel}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto">{alert.time}</span>
                        </div>

                        {/* What it means */}
                        <p className="text-xs text-slate-700 mb-1.5">{cfg.whatItMeans}</p>

                        {/* What to do */}
                        <p className="text-xs text-slate-500 italic">
                          <span className="font-semibold not-italic">What to do:</span> {cfg.whatToDo}
                        </p>
                      </div>

                      {/* View route button */}
                      <button
                        onClick={() => router.push(`/routes/${encodeURIComponent(alert.route)}`)}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 bg-white rounded-lg px-3 py-2 transition-colors hover:bg-blue-50"
                      >
                        View Route
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-10">
                  <CheckCircle size={36} className="text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No alerts match your filter</p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
