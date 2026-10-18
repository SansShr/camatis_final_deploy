"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Cloud, CloudRain, CloudSnow, Sun, Wind, TrendingUp, AlertTriangle } from "lucide-react";

export default function WeatherImpact() {
  // Simulated weather data (in real app, get from API)
  const weather = {
    condition: "Rainy", // "Clear", "Rainy", "Snowy", "Cloudy"
    temp: 22,
    precipitation: 15, // mm
    impact: {
      demandIncrease: 18, // %
      delayRisk: "Medium",
      recommendation: "Add 2-3 buses per high-demand route"
    }
  };

  const getWeatherIcon = () => {
    switch (weather.condition) {
      case "Rainy":
        return <CloudRain size={32} className="text-blue-600" />;
      case "Snowy":
        return <CloudSnow size={32} className="text-blue-400" />;
      case "Cloudy":
        return <Cloud size={32} className="text-slate-500" />;
      default:
        return <Sun size={32} className="text-yellow-500" />;
    }
  };

  const getImpactColor = () => {
    if (weather.impact.demandIncrease > 15) return "border-red-300 bg-red-50";
    if (weather.impact.demandIncrease > 10) return "border-orange-300 bg-orange-50";
    return "border-green-300 bg-green-50";
  };

  return (
    <Card className={`border-2 ${getImpactColor()}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              {getWeatherIcon()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                Current Weather Impact
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-800">
                  {weather.condition} • {weather.temp}°C
                </span>
                {weather.precipitation > 0 && (
                  <span className="text-sm text-blue-600">
                    {weather.precipitation}mm rain
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 justify-center mb-1">
                <TrendingUp className="text-red-600" size={18} />
                <p className="text-2xl font-bold text-red-600">
                  +{weather.impact.demandIncrease}%
                </p>
              </div>
              <p className="text-xs text-slate-600">Demand Increase</p>
            </div>

            <div className="text-center p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 justify-center mb-1">
                <AlertTriangle className="text-orange-600" size={18} />
                <p className="text-lg font-bold text-orange-600">
                  {weather.impact.delayRisk}
                </p>
              </div>
              <p className="text-xs text-slate-600">Delay Risk</p>
            </div>

            <div className="p-3 bg-blue-500 text-white rounded-lg max-w-xs">
              <p className="text-xs font-semibold mb-1">💡 Recommendation:</p>
              <p className="text-sm">{weather.impact.recommendation}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
