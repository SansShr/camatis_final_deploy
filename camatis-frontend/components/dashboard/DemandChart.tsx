"use client";

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Area, AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users, BarChart2 } from "lucide-react";

interface DemandPoint {
  time: string;
  demand: number;
}

interface LoadPoint {
  route: string;
  load: number;
}

// Custom tooltip for the demand chart
const DemandTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const level = val > 350 ? "Very Crowded" : val > 250 ? "Busy" : val > 150 ? "Moderate" : "Quiet";
    const color  = val > 350 ? "#ef4444" : val > 250 ? "#f97316" : val > 150 ? "#3b82f6" : "#10b981";
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs">
        <p className="font-semibold text-slate-700 mb-1">🕐 {label}</p>
        <p className="text-slate-600">Passengers waiting: <span className="font-bold text-slate-800">{Math.round(val)}</span></p>
        <p style={{ color }} className="font-semibold mt-1">{level}</p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for the load chart
const LoadTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const pct  = (val * 100).toFixed(0);
    const status = val > 0.85 ? "Overcrowded — urgent" : val > 0.65 ? "Getting full" : "Comfortable";
    const color  = val > 0.85 ? "#ef4444" : val > 0.65 ? "#f97316" : "#10b981";
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs">
        <p className="font-semibold text-slate-700 mb-1">🚌 {label}</p>
        <p className="text-slate-600">Bus fullness: <span className="font-bold text-slate-800">{pct}%</span></p>
        <p style={{ color }} className="font-semibold mt-1">{status}</p>
      </div>
    );
  }
  return null;
};

// Color each bar by load level
const loadBarColor = (load: number) => {
  if (load > 0.85) return "#ef4444";  // red — overcrowded
  if (load > 0.65) return "#f97316";  // orange — getting full
  return "#10b981";                   // green — comfortable
};

export default function DemandChart({
  demandData,
  loadData,
}: {
  demandData: DemandPoint[];
  loadData: LoadPoint[];
}) {
  // Find peak hour
  const peak = demandData.reduce((a, b) => (a.demand > b.demand ? a : b), { time: "", demand: 0 });

  // Add fill color to load data
  const coloredLoad = loadData.map((d) => ({ ...d, fill: loadBarColor(d.load) }));

  // Average load
  const avgLoad = loadData.length
    ? loadData.reduce((s, d) => s + d.load, 0) / loadData.length
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Passenger Demand Chart ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <CardTitle className="text-sm font-semibold">Passenger Demand Throughout the Day</CardTitle>
            </div>
            {peak.time && (
              <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                Peak: {peak.time}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            How many passengers need a bus at each hour — higher = more crowded buses
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={demandData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
                label={{ value: "Passengers", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#94a3b8" } }}
              />
              <Tooltip content={<DemandTooltip />} />
              {/* Reference line at high-demand threshold */}
              <ReferenceLine
                y={350}
                stroke="#f97316"
                strokeDasharray="4 4"
                label={{ value: "High demand", position: "right", fontSize: 10, fill: "#f97316" }}
              />
              <Area
                type="monotone"
                dataKey="demand"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#demandGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "#3b82f6" }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Passenger count</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded border-dashed border-t border-orange-400" /> High demand level</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Bus Fullness Chart ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-indigo-600" />
              <CardTitle className="text-sm font-semibold">How Full Are Buses on Each Route?</CardTitle>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
              Avg: {(avgLoad * 100).toFixed(0)}% full
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            100% = completely full · above 85% = overcrowded · below 65% = comfortable
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={coloredLoad} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="route"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                domain={[0, 1]}
              />
              <Tooltip content={<LoadTooltip />} />
              {/* Overcrowded threshold */}
              <ReferenceLine
                y={0.85}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: "Overcrowded", position: "right", fontSize: 10, fill: "#ef4444" }}
              />
              {/* Comfortable threshold */}
              <ReferenceLine
                y={0.65}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: "Comfortable", position: "right", fontSize: 10, fill: "#10b981" }}
              />
              <Bar dataKey="load" radius={[6, 6, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
          {/* Colour legend */}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Comfortable</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Getting full</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Overcrowded</span>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
