"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Bus, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export default function FleetStatus({ results }: { results: any[] }) {
  // Calculate fleet distribution
  const totalBusesAdded = results.reduce((sum, r) => sum + (r.buses_added || 0), 0);
  const routesWithAnomalies = results.filter(r => r.anomaly).length;
  
  // Categorize by severity of action needed
  const routesMinorChanges = results.filter(r => r.buses_added > 0 && r.buses_added <= 1).length;
  const routesModerateChanges = results.filter(r => r.buses_added > 1 && r.buses_added <= 3).length;
  const routesMajorChanges = results.filter(r => r.buses_added > 3).length;

  const fleetMetrics = [
    {
      label: "Total Buses Running",
      value: totalBusesAdded + results.length,
      icon: Bus,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Extra Buses Added",
      value: `+${totalBusesAdded}`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      label: "Routes Improved",
      value: results.length,
      icon: CheckCircle,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      label: "Critical Issues",
      value: routesWithAnomalies,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50"
    }  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
      {/* Fleet Metrics */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Bus Fleet Overview</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">How many buses are running and where improvements were made</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fleetMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`p-4 rounded-lg ${metric.bg}`}
                >
                  <div className={`mb-2 ${metric.color}`}>
                    <metric.icon size={24} />
                  </div>
                  <p className="text-2xl font-bold text-slate-800 mb-1">
                    {metric.value}
                  </p>
                  <p className="text-xs text-slate-600">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Performance Metrics */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Improvement Levels</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">How many extra buses each route needs</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Minor Changes */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-slate-700">Small Boost (1 bus)</span>
                  <span className="text-xs font-bold text-green-600">{routesMinorChanges} routes</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${(routesMinorChanges / (results.length || 1) * 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {((routesMinorChanges / (results.length || 1)) * 100).toFixed(0)}% need minor adjustment
                </p>
              </div>

              {/* Moderate Changes */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-slate-700">Medium Boost (2-3 buses)</span>
                  <span className="text-xs font-bold text-blue-600">{routesModerateChanges} routes</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${(routesModerateChanges / (results.length || 1) * 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {((routesModerateChanges / (results.length || 1)) * 100).toFixed(0)}% need moderate reinforcement
                </p>
              </div>

              {/* Major Changes */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-slate-700">Large Boost (4+ buses)</span>
                  <span className="text-xs font-bold text-orange-600">{routesMajorChanges} routes</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div 
                    className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${(routesMajorChanges / (results.length || 1) * 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {((routesMajorChanges / (results.length || 1)) * 100).toFixed(0)}% need significant expansion
                </p>
              </div>

              {/* Critical Anomalies */}
              {routesWithAnomalies > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-slate-700">Flagged for Review</span>
                    <span className="text-xs font-bold text-red-600">{routesWithAnomalies} routes</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div 
                      className="bg-red-500 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${(routesWithAnomalies / (results.length || 1) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {((routesWithAnomalies / (results.length || 1)) * 100).toFixed(0)}% showing unusual patterns
                  </p>
                </div>
              )}

              {/* Overall Summary */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">System Recommendation</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-bold text-blue-600">
                      {totalBusesAdded} buses needed
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  System reviewed {results.length} routes and recommends expanding the fleet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
