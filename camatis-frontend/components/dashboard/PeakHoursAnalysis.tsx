"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Clock, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

export default function PeakHoursAnalysis({ results }: { results: any[] }) {
  const hourlyData = [
    { hour: "6 AM",  demand:  45, isPeak: false },
    { hour: "7 AM",  demand:  85, isPeak: true  },
    { hour: "8 AM",  demand: 120, isPeak: true  },
    { hour: "9 AM",  demand:  95, isPeak: true  },
    { hour: "10 AM", demand:  60, isPeak: false },
    { hour: "11 AM", demand:  50, isPeak: false },
    { hour: "12 PM", demand:  70, isPeak: false },
    { hour: "1 PM",  demand:  65, isPeak: false },
    { hour: "2 PM",  demand:  55, isPeak: false },
    { hour: "3 PM",  demand:  75, isPeak: false },
    { hour: "4 PM",  demand:  90, isPeak: true  },
    { hour: "5 PM",  demand: 130, isPeak: true  },
    { hour: "6 PM",  demand: 115, isPeak: true  },
    { hour: "7 PM",  demand:  80, isPeak: false },
    { hour: "8 PM",  demand:  50, isPeak: false },
  ];

  const PEAK_COLOR    = "#ef4444"; // red
  const OFFPEAK_COLOR = "#10b981"; // green

  const peakHours      = hourlyData.filter(h =>  h.isPeak);
  const offPeakHours   = hourlyData.filter(h => !h.isPeak);
  const avgPeakDemand    = Math.round(peakHours.reduce((s, h) => s + h.demand, 0)    / peakHours.length);
  const avgOffPeakDemand = Math.round(offPeakHours.reduce((s, h) => s + h.demand, 0) / offPeakHours.length);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const isPeak = payload[0]?.payload?.isPeak;
      return (
        <div className="bg-white border rounded-lg shadow-md p-3 text-xs">
          <p className="font-bold text-slate-800 mb-1">{label}</p>
          <p className="text-slate-700">
            Passengers: <span className="font-bold">{payload[0].value}</span>
          </p>
          <p className={`font-semibold mt-1 ${isPeak ? "text-red-600" : "text-green-600"}`}>
            {isPeak ? "Rush Hour" : "Off-Peak"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
          <Clock size={18} className="text-blue-600" />
          Busy Hours vs. Quiet Hours
        </CardTitle>
        <p className="text-sm font-medium text-slate-500 mt-1">
          How many passengers need buses at each hour of the day
        </p>
      </CardHeader>
      <CardContent>
        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-center gap-1.5 mb-1">
              {/* Red swatch */}
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block shrink-0" />
              <p className="text-xs font-bold text-red-700">Rush Hours</p>
            </div>
            <p className="text-lg font-extrabold text-red-700">7–9 AM, 4–6 PM</p>
            <p className="text-xs font-medium text-red-600 mt-1">Avg: {avgPeakDemand} passengers/hr</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-1.5 mb-1">
              {/* Green swatch */}
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block shrink-0" />
              <p className="text-xs font-bold text-green-700">Quiet Hours</p>
            </div>
            <p className="text-lg font-extrabold text-green-700">10 AM – 3 PM</p>
            <p className="text-xs font-medium text-green-600 mt-1">Avg: {avgOffPeakDemand} passengers/hr</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="text-blue-600" size={14} />
              <p className="text-xs font-bold text-blue-700">Rush Hour Surge</p>
            </div>
            <p className="text-lg font-extrabold text-blue-700">
              +{Math.round(((avgPeakDemand - avgOffPeakDemand) / avgOffPeakDemand) * 100)}%
            </p>
            <p className="text-xs font-medium text-blue-600 mt-1">more passengers vs. quiet hours</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
              label={{ value: "Passengers", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#64748b" } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="demand" radius={[5, 5, 0, 0]}>
              {hourlyData.map((entry, i) => (
                <Cell key={i} fill={entry.isPeak ? PEAK_COLOR : OFFPEAK_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Colour legend below chart */}
        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-sm bg-red-500 inline-block" />
            <span className="text-sm font-semibold text-slate-700">Rush Hour — buses fill up fast</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-sm bg-green-500 inline-block" />
            <span className="text-sm font-semibold text-slate-700">Quiet Hours — comfortable travel</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
