"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertTriangle, Info, XCircle, Clock, Bell, CheckCircle } from "lucide-react";

interface Alert {
  id: number;
  route: string;
  message: string;
  severity: string;
  time: string;
}

// Turn raw alert messages into plain English
function friendlyMessage(msg: string): string {
  if (!msg) return msg;
  if (msg.includes("False positive risk flag"))
    return "Unusual pattern detected — likely a false alarm, being monitored";
  if (msg.includes("Agent flagged for investigation"))
    return "AI flagged this route for further review";
  if (msg.includes("Anomaly"))
    return "Something unusual detected on this route";
  if (msg.includes("High demand") || msg.includes("high demand"))
    return "Too many passengers, buses filling up fast";
  if (msg.includes("Overload"))
    return "Route is overloaded — more buses dispatched";
  if (msg.includes("spike"))
    return "Sudden surge in passengers detected";
  return msg;
}

const severityMeta: Record<string, {
  icon: typeof XCircle;
  color: string;
  bg: string;
  border: string;
  dot: string;
  label: string;
  plainLabel: string;
}> = {
  High: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    label: "High",
    plainLabel: "Urgent"
  },
  Medium: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
    label: "Medium",
    plainLabel: "Warning"
  },
  Low: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-400",
    label: "Low",
    plainLabel: "Info"
  },
};

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const urgent  = alerts.filter(a => a.severity === "High").length;
  const warning = alerts.filter(a => a.severity === "Medium").length;
  const info    = alerts.filter(a => a.severity === "Low").length;

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell size={18} className="text-slate-500" />
            System Notifications
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Latest warnings and issues from the AI system</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <CheckCircle size={40} className="text-green-400" />
            <p className="text-sm font-semibold text-green-700">No alerts right now</p>
            <p className="text-xs text-slate-500">Everything is running as expected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell size={18} className="text-slate-600" />
            System Notifications
          </CardTitle>
          {/* Summary pills */}
          <div className="flex items-center gap-1.5">
            {urgent  > 0 && <span className="text-xs px-2 py-0.5 bg-red-100    text-red-700    border border-red-200    rounded-full font-semibold">{urgent} Urgent</span>}
            {warning > 0 && <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full font-semibold">{warning} Warning</span>}
            {info    > 0 && <span className="text-xs px-2 py-0.5 bg-blue-100   text-blue-700   border border-blue-200   rounded-full font-semibold">{info} Info</span>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Latest warnings and issues detected by the AI system
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {alerts.slice(0, 10).map((alert) => {
            const meta = severityMeta[alert.severity] ?? severityMeta.Low;
            const Icon = meta.icon;
            const plainMsg = friendlyMessage(alert.message);

            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-3.5 ${meta.bg} ${meta.border} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`mt-0.5 p-1.5 rounded-lg bg-white bg-opacity-70 ${meta.color} shrink-0`}>
                    <Icon size={14} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        <p className="text-xs font-bold text-slate-800">{alert.route}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white bg-opacity-70 ${meta.color}`}>
                        {meta.plainLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{plainMsg}</p>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <Clock size={10} />
                      {alert.time}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {alerts.length > 10 && (
          <div className="mt-3 pt-3 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Showing 10 of {alerts.length} notifications
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
