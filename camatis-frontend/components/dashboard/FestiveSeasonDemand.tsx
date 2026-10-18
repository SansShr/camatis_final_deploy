"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Calendar, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";

export default function FestiveSeasonDemand() {
  // Festive season data (simulated - in real app, calculate from actual dates)
  const monthlyData = [
    { month: "Jan", demand: 180, festive: false, events: [] },
    { month: "Feb", demand: 175, festive: false, events: [] },
    { month: "Mar", demand: 185, festive: true, events: ["Holi"] },
    { month: "Apr", demand: 170, festive: false, events: [] },
    { month: "May", demand: 165, festive: false, events: [] },
    { month: "Jun", demand: 160, festive: false, events: [] },
    { month: "Jul", demand: 190, festive: true, events: ["Eid"] },
    { month: "Aug", demand: 210, festive: true, events: ["Independence Day"] },
    { month: "Sep", demand: 195, festive: true, events: ["Ganesh Chaturthi"] },
    { month: "Oct", demand: 240, festive: true, events: ["Dussehra", "Diwali"] },
    { month: "Nov", demand: 230, festive: true, events: ["Diwali Season"] },
    { month: "Dec", demand: 220, festive: true, events: ["Christmas", "New Year"] }
  ];

  const festiveMonths = monthlyData.filter(m => m.festive);
  const normalMonths = monthlyData.filter(m => !m.festive);
  const avgFestiveDemand = Math.round(festiveMonths.reduce((sum, m) => sum + m.demand, 0) / festiveMonths.length);
  const avgNormalDemand = Math.round(normalMonths.reduce((sum, m) => sum + m.demand, 0) / normalMonths.length);
  const increase = Math.round(((avgFestiveDemand - avgNormalDemand) / avgNormalDemand) * 100);

  const currentMonth = new Date().getMonth(); // 0-11
  const currentMonthData = monthlyData[currentMonth];
  const isFestiveSeason = currentMonthData.festive;

  return (
    <Card className={isFestiveSeason ? "border-2 border-orange-300 bg-orange-50" : ""}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles size={18} className="text-orange-600" />
            Festive Season Demand Pattern
          </span>
          {isFestiveSeason && (
            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
              FESTIVE SEASON ACTIVE
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Demand increases during festivals and holidays
        </p>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-white rounded-lg border-2 border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="text-orange-600" size={16} />
              <p className="text-xs font-medium text-orange-700">Festive Avg</p>
            </div>
            <p className="text-xl font-bold text-orange-700">{avgFestiveDemand}</p>
            <p className="text-xs text-orange-600">passengers/route</p>
          </div>
          <div className="p-3 bg-white rounded-lg border-2 border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="text-slate-600" size={16} />
              <p className="text-xs font-medium text-slate-700">Normal Avg</p>
            </div>
            <p className="text-xl font-bold text-slate-700">{avgNormalDemand}</p>
            <p className="text-xs text-slate-600">passengers/route</p>
          </div>
          <div className="p-3 bg-white rounded-lg border-2 border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-red-600" size={16} />
              <p className="text-xs font-medium text-red-700">Increase</p>
            </div>
            <p className="text-xl font-bold text-red-700">+{increase}%</p>
            <p className="text-xs text-red-600">during festivals</p>
          </div>
          <div className="p-3 bg-white rounded-lg border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="text-blue-600" size={16} />
              <p className="text-xs font-medium text-blue-700">Peak Month</p>
            </div>
            <p className="text-xl font-bold text-blue-700">October</p>
            <p className="text-xs text-blue-600">Dussehra+Diwali</p>
          </div>
        </div>

        {/* Current Month Alert */}
        {isFestiveSeason && currentMonthData.events.length > 0 && (
          <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-400 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-orange-700 shrink-0" size={20} />
              <div>
                <p className="text-sm font-semibold text-orange-900">
                  Active Festival Period: {currentMonthData.events.join(", ")}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Expect {increase}% higher demand. Additional buses deployed. Monitor critical routes closely.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                      <p className="font-semibold text-sm">{data.month}</p>
                      <p className="text-sm text-orange-600">Demand: {data.demand}</p>
                      {data.festive && data.events.length > 0 && (
                        <p className="text-xs text-orange-500 mt-1">🎉 {data.events.join(", ")}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="demand" 
              stroke="#f97316" 
              strokeWidth={2}
              fill="url(#demandGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Festive Months Legend */}
        <div className="mt-3 flex flex-wrap gap-2">
          <p className="text-xs font-semibold text-slate-600 w-full">Festive Periods:</p>
          {festiveMonths.map((month, idx) => (
            <span 
              key={idx}
              className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full border border-orange-300"
            >
              {month.month}: {month.events.join(", ")}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
