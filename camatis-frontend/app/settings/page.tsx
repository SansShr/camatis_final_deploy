"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SettingsPage() {
  const [form, setForm] = useState({
    maxBuses: "30",
    frequencyLimit: "12",
    optimizationPreference: "balanced",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setForm({
          maxBuses: data.maxBuses?.toString() || "30",
          frequencyLimit: data.frequencyLimit?.toString() || "12",
          optimizationPreference: data.optimizationPreference || "balanced",
        });
        setLoading(false);
      })
      .catch(() => {
        // Use defaults if API fails
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_buses: parseInt(form.maxBuses),
          frequency_limit: parseInt(form.frequencyLimit),
          optimization_preference: form.optimizationPreference,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8">Loading settings...</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Settings</h1>
        <p className="text-sm text-slate-500 mb-6">Adjust how the system manages buses and routes</p>

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">System Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Max Buses Per Route</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.maxBuses}
                  onChange={(e) => setForm({ ...form, maxBuses: e.target.value })}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  The most buses that can be sent to any single route at one time
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Max Bus Trips Per Hour</label>
                <input
                  type="number"
                  min="4"
                  max="20"
                  value={form.frequencyLimit}
                  onChange={(e) => setForm({ ...form, frequencyLimit: e.target.value })}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  How many times a bus can run on a route per hour (default is 4)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">What Should the System Prioritise?</label>
                <select
                  value={form.optimizationPreference}
                  onChange={(e) => setForm({ ...form, optimizationPreference: e.target.value })}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm"
                >
                  <option value="balanced">Balanced — no single priority (Default)</option>
                  <option value="cost">Save Money — reduce running costs</option>
                  <option value="demand">Serve More Passengers — cover high-demand routes</option>
                  <option value="efficiency">Use Buses Efficiently — avoid empty buses</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {form.optimizationPreference === "balanced"   && "Balances cost, passenger coverage, and bus efficiency equally"}
                  {form.optimizationPreference === "cost"       && "Focuses on keeping running costs as low as possible"}
                  {form.optimizationPreference === "demand"     && "Focuses on making sure crowded routes get enough buses"}
                  {form.optimizationPreference === "efficiency" && "Focuses on making sure buses are neither empty nor overloaded"}
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saved ? "✓ Saved!" : "Save Settings"}
              </button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}