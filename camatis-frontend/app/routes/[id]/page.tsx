"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { getRoute } from "@/lib/api";
import DemandChart from "@/components/routeDetail/DemandChart";
import LoadChart from "@/components/routeDetail/LoadChart";
import PredictionCard from "@/components/routeDetail/PredictionCard";
import AgentAssessments from "@/components/routeDetail/AgentAssessments";
import { ArrowLeft, MapPin, Clock, ChevronRight, Bus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const routeId = decodeURIComponent(id);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoute(routeId).then((data) => {
      setDetail(data);
      setLoading(false);
    });
  }, [routeId]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </main>
      </div>
    );
  }

  if (!detail || !detail.demand_trend.length) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <p className="text-slate-500">Route data not found.</p>
        </main>
      </div>
    );
  }

  const stops: Array<{ name: string; stop_number: number; avg_stop_time_mins: number }> =
    detail.stops || [];
  const source      = detail.source      || null;
  const destination = detail.destination || null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back to All Routes
        </button>

        {/* Route header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">{routeId}</h1>
          {source && destination && (
            <div className="flex items-center gap-2 text-slate-600 text-sm mt-1">
              <MapPin size={14} className="text-green-600 shrink-0" />
              <span className="font-medium">{source}</span>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="text-slate-500">{stops.length} stops</span>
              <ChevronRight size={14} className="text-slate-400" />
              <MapPin size={14} className="text-red-500 shrink-0" />
              <span className="font-medium">{destination}</span>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1">
            System-generated insights and recommendations for this route
          </p>
        </div>

        {/* Route map / stops section */}
        {(source || stops.length > 0) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bus size={16} className="text-blue-600" />
                Route Path — Stops Along the Way
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                The full journey from start to finish with all intermediate stops
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-slate-200" />

                <div className="space-y-0">
                  {/* Source */}
                  {source && (
                    <div className="flex items-start gap-4 pb-4 relative">
                      <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0 z-10 shadow-sm">
                        <MapPin size={16} className="text-white" />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-sm font-bold text-slate-800">{source}</p>
                        <p className="text-xs text-green-600 font-medium">Starting point</p>
                      </div>
                    </div>
                  )}

                  {/* Intermediate stops */}
                  {stops.map((stop, idx) => (
                    <div key={idx} className="flex items-start gap-4 pb-4 relative">
                      <div className="w-9 h-9 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center shrink-0 z-10">
                        <span className="text-xs font-bold text-blue-700">{stop.stop_number}</span>
                      </div>
                      <div className="pt-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">{stop.name}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={11} />
                            <span>~{stop.avg_stop_time_mins} min stop</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">Stop {stop.stop_number} of {stops.length}</p>
                      </div>
                    </div>
                  ))}

                  {/* Destination */}
                  {destination && (
                    <div className="flex items-start gap-4 relative">
                      <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shrink-0 z-10 shadow-sm">
                        <MapPin size={16} className="text-white" />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-sm font-bold text-slate-800">{destination}</p>
                        <p className="text-xs text-red-600 font-medium">Final destination</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary bar */}
                <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Total Stops</p>
                    <p className="text-lg font-bold text-slate-800">{stops.length + 2}</p>
                    <p className="text-xs text-slate-400">incl. start & end</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Avg Stop Time</p>
                    <p className="text-lg font-bold text-slate-800">
                      {stops.length > 0
                        ? (stops.reduce((s, t) => s + t.avg_stop_time_mins, 0) / stops.length).toFixed(1)
                        : "—"} min
                    </p>
                    <p className="text-xs text-slate-400">per stop</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Intermediate Stops</p>
                    <p className="text-lg font-bold text-slate-800">{stops.length}</p>
                    <p className="text-xs text-slate-400">between start & end</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <DemandChart data={detail.demand_trend} />
          <LoadChart data={detail.load_trend} />
        </div>

        <div className="mb-6">
          <PredictionCard confidence={detail.confidence} />
        </div>

        <div className="mb-6">
          <AgentAssessments routeId={routeId} />
        </div>
      </main>
    </div>
  );
}
