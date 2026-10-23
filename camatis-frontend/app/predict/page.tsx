"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { postPredict, preparePrediction, PredictRequest, PredictResponse } from "@/lib/api";
import {
  Bus, Clock, Users, CloudRain, AlertTriangle,
  CheckCircle, TrendingUp, Zap, Info, ChevronRight, BarChart2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

// ── Field helpers ────────────────────────────────────────────────────────────

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-semibold text-slate-700">{children}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function SelectField({
  value, onChange, options
}: {
  value: number | string;
  onChange: (v: string) => void;
  options: { value: number | string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function NumberField({
  value, onChange, min, max, step = 1, unit
}: {
  value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
}

function Toggle({ value, onChange, yesLabel, noLabel }: {
  value: number; onChange: (v: number) => void;
  yesLabel: string; noLabel: string;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
      <button
        type="button"
        onClick={() => onChange(1)}
        className={`flex-1 py-2.5 transition-colors ${value === 1 ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(0)}
        className={`flex-1 py-2.5 transition-colors ${value === 0 ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
      >
        {noLabel}
      </button>
    </div>
  );
}

// ── Congestion slider ─────────────────────────────────────────────────────────
const CONGESTION_LABELS = [
  { v: 0,   label: "Free flowing", color: "text-green-600"  },
  { v: 0.5, label: "Light",        color: "text-green-500"  },
  { v: 1.0, label: "Moderate",     color: "text-yellow-600" },
  { v: 1.5, label: "Heavy",        color: "text-orange-600" },
  { v: 2.0, label: "Very heavy",   color: "text-red-500"    },
  { v: 3.0, label: "Gridlock",     color: "text-red-700"    },
];
function congestionLabel(v: number) {
  return CONGESTION_LABELS.slice().reverse().find(c => v >= c.v) ?? CONGESTION_LABELS[0];
}

// ── Result display ────────────────────────────────────────────────────────────
function ResultCard({ result }: { result: PredictResponse }) {
  // Show ACTUAL current fullness (from user input) as the primary metric
  const loadPct     = result.current_load_pct;
  const loadColor   = loadPct > 85 ? "text-red-700"    : loadPct > 65 ? "text-orange-600" : "text-green-600";
  const loadBg      = loadPct > 85 ? "bg-red-50 border-red-200" : loadPct > 65 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200";
  const loadBar     = loadPct > 85 ? "bg-red-500"      : loadPct > 65 ? "bg-orange-400"   : "bg-green-500";
  const loadLabel   = loadPct > 85 ? "Overcrowded"     : loadPct > 65 ? "Getting full"    : "Comfortable";
  const confColor   = result.confidence >= 75 ? "text-green-600" : "text-yellow-600";

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
        <div className="p-2 bg-indigo-600 text-white rounded-lg">
          <Zap size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-900">
            Results for Route R-{result.route_id}
          </p>
          <p className="text-xs text-indigo-600">
            System confidence: <span className={`font-semibold ${confColor}`}>{result.confidence}%</span>
            {result.high_uncertainty && " — predictions are less certain than usual"}
          </p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        {/* Demand */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <Users size={15} className="text-blue-600" />
            <p className="text-xs font-semibold text-blue-700">Expected Passengers</p>
          </div>
          <p className="text-3xl font-bold text-blue-800">{result.predicted_demand.toLocaleString()}</p>
          <p className="text-xs text-blue-500 mt-1">per hour on this route</p>
        </div>

        {/* Bus fullness */}
        <div className={`p-4 border rounded-xl ${loadBg}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <BarChart2 size={15} className={loadColor} />
            <p className={`text-xs font-semibold ${loadColor}`}>Bus Fullness Right Now</p>
          </div>
          <p className={`text-3xl font-bold ${loadColor}`}>{loadPct.toFixed(0)}%</p>
          <div className="mt-2 w-full bg-white bg-opacity-60 rounded-full h-2">
            <div className={`${loadBar} h-2 rounded-full`} style={{ width: `${Math.min(100, loadPct)}%` }} />
          </div>
          <p className={`text-xs mt-1.5 ${loadColor}`}>{loadLabel}</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Bus size={15} className="text-green-600" />
            <p className="text-xs font-semibold text-green-700">Extra Buses Needed</p>
          </div>
          <p className="text-3xl font-bold text-green-700">
            {result.buses_to_add > 0 ? `+${result.buses_to_add}` : "None"}
          </p>
          <p className="text-xs text-green-500 mt-1">
            {result.buses_to_add > 0
              ? `to handle ~${result.predicted_demand.toLocaleString()} passengers/hr`
              : "current schedule is sufficient"}
          </p>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={15} className="text-purple-600" />
            <p className="text-xs font-semibold text-purple-700">How Often Should Buses Run?</p>
          </div>
          <p className="text-3xl font-bold text-purple-700">
            Every {result.headway_mins} min
          </p>
          <p className="text-xs text-purple-500 mt-1">
            {result.buses_per_hour} bus {result.buses_per_hour === 1 ? "trip" : "trips"} per hour
          </p>
        </div>
      </div>

      {/* Why buses are added — explanation */}
      {result.buses_to_add > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
          <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600">
            {result.driven_by_realtime ? (
              <>
                <span className="font-semibold">Why add buses?</span>{" "}
                The bus is currently <strong>{result.current_load_pct.toFixed(0)}% full</strong>.
                As more passengers board at upcoming stops, the bus will become overcrowded.
                Adding a bus now prevents passengers from being left behind.
              </>
            ) : (
              <>
                <span className="font-semibold">Why add a bus even though the bus is comfortable now?</span>{" "}
                The bus is only <strong>{result.current_load_pct.toFixed(0)}% full right now</strong>, which is fine.
                However, historical data shows this route typically sees{" "}
                <strong>{result.predicted_demand.toLocaleString()} passengers/hr</strong> at this time.
                A proactive extra trip is suggested to stay ahead of demand peaks.
              </>
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap size={15} className="text-slate-600" />
            What Should Be Done
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.actions.map((action, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <ChevronRight size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">{action}</p>
            </div>
          ))}
          {result.high_uncertainty && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">
                Passenger numbers on this route are harder than usual to predict. Consider checking again soon.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ROUTE_IDS = [2,3,5,7,8,9,10,11,12,13,14,17,19,20,21,22,24,26,27,28,29,
  30,31,33,36,37,38,39,41,42,43,46,47,49,50,51,52,53,55,56,57,58,59,60,61,63,
  64,66,67,68,69,70,71,76,77,78,80,81,82,84,85,87,88,89,90,91,93,94,97,100,
  101,102,103,104,105,106,107,108,109,110,111,113,114,115,116,117,118,119,120,
  121,122,123,125,126,127,128,129,130,131,132,133,135,136,139,140,142,143,144,
  145,146,147,148,149,150,151,152,154,155,158,159,161,162,163,164,165,166,167,
  168,169,170,172,174,175,177,179,180,181,183,185,186,187,188,189,190,191,192,
  193,194,195,196,197,198,200,201,202,203,204,205,206,207,208,209,213,214,215,
  216,217,227,230,233,234,235,236,237,252,253,255,256,257,264,275,276,277,279,
  281,282,283,284,291,292,293,294,295,296,297,298,299,301,302,303,304,305,306,
  307,308,309,310,311,312,313,314,315,316,317,318,319,320,322,323,324,325,326,
  327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,
  346,347,348,350,351,354,355,357,358,360,361,362,363,365,366,367,368,369,371,
  372,374,376,377,378,379,380,401];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00 ${i < 12 ? "AM" : "PM"}`
}));

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const DEFAULT: PredictRequest = {
  route_id: 7, hour: 9, day_of_week: 1, is_peak: 1, is_weekend: 0,
  speed_kmph: 45, congestion: 1.2, passenger_count: 30, bus_capacity: 50, weather_rain: 0,
};

export default function PredictPage() {
  const [form,    setForm]    = useState<PredictRequest>(DEFAULT);
  const [result,  setResult]  = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [serviceState, setServiceState] = useState("Preparing prediction service… You can fill in the form while it starts.");
  const [progress, setProgress] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    preparePrediction().then(() => { if (active) setServiceState("Prediction service ready"); })
      .catch(() => { if (active) setServiceState("The service is starting. Submitting the form will reconnect automatically."); });
    return () => { active = false; };
  }, []);

  const set = (key: keyof PredictRequest, value: number) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await postPredict(form, setProgress);
      setServiceState("Prediction service ready");
      setResult(res);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Prediction is temporarily unavailable. Please try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const cong = congestionLabel(form.congestion);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Live Route Prediction</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter the current conditions for any route and the system will predict
            passenger demand, how full the bus will be, and what changes to make
          </p>
        </div>

        <p role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          {loading ? progress : serviceState}
          {serviceState !== "Prediction service ready" && !result && " After inactivity, startup can take a few minutes."}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Route */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bus size={16} className="text-blue-600" /> Which Route?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label hint="Select the route number you want to predict">Route Number</Label>
                <SelectField
                  value={form.route_id}
                  onChange={v => set("route_id", Number(v))}
                  options={ROUTE_IDS.map(r => ({ value: r, label: `Route R-${r}` }))}
                />
              </CardContent>
            </Card>

            {/* Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock size={16} className="text-purple-600" /> When Is This?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label hint="Hour of the day">Time of Day</Label>
                    <SelectField
                      value={form.hour}
                      onChange={v => set("hour", Number(v))}
                      options={HOURS}
                    />
                  </div>
                  <div>
                    <Label hint="Day of the week">Day</Label>
                    <SelectField
                      value={form.day_of_week}
                      onChange={v => set("day_of_week", Number(v))}
                      options={DAYS}
                    />
                  </div>
                </div>

                <div>
                  <Label hint="Rush hour = 8-10 AM or 5-8 PM">Is It Rush Hour?</Label>
                  <Toggle value={form.is_peak} onChange={v => set("is_peak", v)}
                    yesLabel="Yes — Rush Hour" noLabel="No — Off Peak" />
                </div>

                <div>
                  <Label>Is It a Weekend?</Label>
                  <Toggle value={form.is_weekend} onChange={v => set("is_weekend", v)}
                    yesLabel="Yes" noLabel="No" />
                </div>
              </CardContent>
            </Card>

            {/* Road Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp size={16} className="text-orange-600" /> Road Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label hint="How fast is the bus moving right now?">Bus Speed</Label>
                  <NumberField value={form.speed_kmph} onChange={v => set("speed_kmph", v)}
                    min={5} max={120} step={5} unit="km/h" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Traffic Congestion</p>
                      <p className="text-xs text-slate-400">How bad is the traffic on this route?</p>
                    </div>
                    <span className={`text-xs font-bold ${cong.color}`}>{cong.label}</span>
                  </div>
                  <input
                    type="range" min={0} max={3} step={0.1}
                    value={form.congestion}
                    onChange={e => set("congestion", Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Free flowing</span>
                    <span>Gridlock</span>
                  </div>
                </div>

                <div>
                  <Label hint="Is it raining or snowing?">
                    <span className="flex items-center gap-1.5">
                      <CloudRain size={14} /> Weather
                    </span>
                  </Label>
                  <Toggle value={form.weather_rain} onChange={v => set("weather_rain", v)}
                    yesLabel="🌧 Raining" noLabel="☀ Clear" />
                </div>
              </CardContent>
            </Card>

            {/* Passengers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users size={16} className="text-green-600" /> Passengers Right Now
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label hint="How many people are on the bus right now?">Passengers on Board</Label>
                    <NumberField value={form.passenger_count} onChange={v => set("passenger_count", v)}
                      min={0} max={200} unit="people" />
                  </div>
                  <div>
                    <Label hint="Total seats on the bus">Bus Capacity</Label>
                    <NumberField value={form.bus_capacity} onChange={v => set("bus_capacity", v)}
                      min={20} max={120} unit="seats" />
                  </div>
                </div>

                {/* Live fullness indicator */}
                {form.bus_capacity > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Current bus fullness</span>
                      <span className="font-semibold text-slate-700">
                        {Math.round((form.passenger_count / form.bus_capacity) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          form.passenger_count / form.bus_capacity > 0.85 ? "bg-red-500" :
                          form.passenger_count / form.bus_capacity > 0.65 ? "bg-orange-400" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(100, (form.passenger_count / form.bus_capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info box */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
              <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                The system will use your inputs along with patterns learned from{" "}
                <strong>36,000+ real bus journeys</strong> to predict what will happen
                and what changes to make.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                loading
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {progress || "Running prediction…"}
                </span>
              ) : (
                "Get Prediction →"
              )}
            </button>
          </form>

          {/* ── Results panel ── */}
          <div>
            {result ? (
              <ResultCard result={result} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-8">
                <Zap size={40} className="mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500 mb-1">
                  Fill in the form and click &quot;Get Prediction&quot;
                </p>
                <p className="text-xs text-slate-400">
                  Results will appear here after the prediction completes
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
