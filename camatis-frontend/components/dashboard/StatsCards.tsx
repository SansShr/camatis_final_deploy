import { Card, CardContent } from "@/components/ui/Card";
import { Bus, Route, TrendingUp, AlertTriangle, Users, Gauge } from "lucide-react";

export default function StatsCards({ stats }: { stats?: any }) {
  const statItems = [
    {
      title: "Total Routes",
      value: stats?.total_routes ?? 0,
      icon: Route,
      color: "text-blue-600",
      bg: "bg-blue-50",
      subtitle: "Bus routes in the network"
    },
    {
      title: "Buses Running",
      value: stats?.active_buses ?? 0,
      icon: Bus,
      color: "text-green-600",
      bg: "bg-green-50",
      subtitle: "Currently operating"
    },
    {
      title: "Avg Passengers",
      value: stats?.avg_demand ? stats.avg_demand.toFixed(0) : "0",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      subtitle: "Per route daily"
    },
    {
      title: "Bus Fullness",
      value: stats?.avg_load_factor ? `${(stats.avg_load_factor * 100).toFixed(1)}%` : "0%",
      icon: Gauge,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      subtitle: "How full buses are on average"
    },
    {
      title: "Crowded Routes",
      value: stats?.high_demand_routes ?? 0,
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-50",
      subtitle: "Need more buses"
    },
    {
      title: "Issues Found",
      value: stats?.anomalies ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      subtitle: "Unusual patterns detected"
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {statItems.map(({ title, value, icon: Icon, color, bg, subtitle }) => (
        <Card key={title} className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${bg}`}>
                <Icon size={22} className={color} />
              </div>
            </div>
            <div>
              {/* Larger, darker value */}
              <p className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              {/* Larger, darker title */}
              <p className="text-sm font-bold text-slate-700 mb-0.5">{title}</p>
              {/* Slightly larger subtitle */}
              <p className="text-xs font-medium text-slate-500">{subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
