"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { CheckCircle, TrendingUp, Users, Clock } from "lucide-react";

export default function OperationalSummary({ results }: { results: any[] }) {
  // Calculate operational metrics
  const totalWaiting = results.reduce((sum, r) => sum + (r.waiting_passengers || 0), 0);
  const avgWaiting = totalWaiting / results.length;
  const totalBusesAdded = results.reduce((sum, r) => sum + (r.buses_added || 0), 0);
  const avgFrequency = results.reduce((sum, r) => sum + (r.frequency_multiplier || 1), 0) / results.length;
  const routesOptimized = results.filter(r => r.buses_added > 0 || r.frequency_multiplier > 1).length;

  const summaryItems = [
    {
      label: "System Status",
      value: "Running",
      subvalue: `${results.length} routes active`,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200"
    },
    {
      label: "Passengers Still Waiting",
      value: Math.round(totalWaiting).toLocaleString(),
      subvalue: `Avg ${Math.round(avgWaiting)} per route`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200"
    },
    {
      label: "Fleet Changes Made",
      value: `+${totalBusesAdded} Buses`,
      subvalue: `${routesOptimized} routes improved`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200"
    },
    {
      label: "Bus Frequency Change",
      value: `${avgFrequency.toFixed(2)}×`,
      subvalue: "How much more often buses run",
      icon: Clock,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-200"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {summaryItems.map((item) => (
        <Card key={item.label} className={`border-2 ${item.border}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${item.bg} ${item.color}`}>
                <item.icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-1">{item.value}</p>
            <p className="text-xs font-semibold text-slate-700 mb-0.5">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.subvalue}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
