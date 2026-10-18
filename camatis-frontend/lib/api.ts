const BASE = "/api";

// Only successful GET responses are cached. Never cache login, settings writes,
// predictions, or optimization requests as if they had succeeded.
type SavedResponse = { data: unknown; savedAt: string };
const responseCache = new Map<string, SavedResponse>();
const dataSources = new Map<string, "backend" | "saved">();
const CACHE_PREFIX = "camatis:read-v1:";

export const getDataSource = (path: string) => dataSources.get(path);

function remember(path: string, value: SavedResponse) {
  responseCache.set(path, value);
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length < 500_000) window.localStorage.setItem(CACHE_PREFIX + path, serialized);
  } catch { /* Storage can be unavailable or full; the in-memory cache still works. */ }
}

function cachedResponse(path: string): SavedResponse | undefined {
  const cached = responseCache.get(path);
  if (cached) return cached;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + path);
    if (raw) {
      const value = JSON.parse(raw) as SavedResponse;
      if (validData(path, value.data)) {
        responseCache.set(path, value);
        return value;
      }
    }
  } catch { /* Fall back to the snapshot shipped with this deployment. */ }
}

function validData(path: string, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (path === "/dashboard") {
    const stats = (value as DashboardData).stats;
    return !!stats && Number.isFinite(stats.total_routes) && stats.total_routes > 0;
  }
  if (path.startsWith("/route/")) {
    const detail = value as RouteDetail;
    return Array.isArray(detail.demand_trend) && detail.demand_trend.length > 0;
  }
  if (path === "/results" || path === "/routes") return Array.isArray(value) && value.length > 0;
  return true;
}

// An HTML cold-start page is not API data, even when Render returns HTTP 200.
async function fetchJson(path: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = path.endsWith(".gz") && res.body
      ? new Response(res.body.pipeThrough(new DecompressionStream("gzip")))
      : res;
    return await body.json();
  } finally {
    clearTimeout(timer);
  }
}

let snapshotPromise: Promise<Record<string, unknown>> | undefined;
async function savedSnapshot(): Promise<Record<string, unknown>> {
  if (!snapshotPromise) {
    snapshotPromise = fetchJson("/saved-data.json.gz", 10000)
      .then(data => data as Record<string, unknown>)
      .catch(error => { snapshotPromise = undefined; throw error; });
  }
  return snapshotPromise;
}

async function get<T>(path: string, fallback: T, throwOnError = false): Promise<T> {
  try {
    const data = await fetchJson(`${BASE}${path}`, 12000);
    if (!validData(path, data)) throw new Error("API returned no saved network results");
    remember(path, { data, savedAt: new Date().toISOString() });
    dataSources.set(path, "backend");
    return data as T;
  } catch (error) {
    const cached = cachedResponse(path);
    if (cached) {
      dataSources.set(path, "saved");
      return cached.data as T;
    }
    try {
      const snapshot = path === "/agents/conflicts"
        ? { [path]: await fetchJson("/saved-conflicts.json.gz", 15000) }
        : await savedSnapshot();
      if (validData(path, snapshot[path])) {
        dataSources.set(path, "saved");
        return snapshot[path] as T;
      }
    } catch { /* The caller can surface an error if neither source is available. */ }
    console.error(`API Error for ${path}:`, error);
    if (throwOnError) throw error;
    return fallback;
  }
}

async function post<T>(path: string, body?: any): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error(`API Error for POST ${path}:`, err);
    throw err;
  }
}

// ============== Auth ==============
export interface LoginRequest {
  email: string;
  password: string;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: { email: string; name: string; role: string };
  message: string;
}

export const postLogin = (data: LoginRequest) => post<LoginResponse>("/login", data);

// ============== Dashboard ==============
export interface DashboardStats {
  total_routes: number;
  active_buses: number;
  high_demand_routes: number;
  anomalies: number;
  avg_load_factor: number;
  avg_demand: number;
}

export interface DashboardData {
  stats: DashboardStats;
  demand: { time: string; demand: number }[];
  load: { route: string; load: number }[];
  alerts: Alert[];
}

export const getDashboard = (throwOnError = false) => get<DashboardData>("/dashboard", {
  stats: { total_routes: 0, active_buses: 0, high_demand_routes: 0, anomalies: 0, avg_load_factor: 0, avg_demand: 0 },
  demand: [],
  load: [],
  alerts: []
}, throwOnError);

// ============== Routes ==============
export interface Route {
  id: string;
  demand: number;
  load_factor: number;
  status: string;
}

export const getRoutes = (throwOnError = false) => get<Route[]>("/routes", [], throwOnError);

// ============== Route Detail ==============
export interface RouteDetail {
  demand_trend: { time: string; demand: number }[];
  load_trend: { time: string; load: number }[];
  confidence: number;
  recommendations: {
    frequency_multiplier: string;
    buses_to_add: string;
    reroute_suggestion: string;
  };
  action_badges: { label: string; color: string }[];
}

export const getRoute = (id: string) => get<RouteDetail>(`/route/${id}`, {
  demand_trend: [],
  load_trend: [],
  confidence: 0,
  recommendations: { frequency_multiplier: "1.0x", buses_to_add: "0", reroute_suggestion: "No data" },
  action_badges: []
});

// ============== Optimization ==============
export interface OptimizeResponse {
  success: boolean;
  message: string;
  summary: {
    total_routes: number;
    routes_with_actions: number;
    total_buses_added: number;
    anomalies_detected: number;
    high_uncertainty_routes: number;
  };
  timestamp: string;
}

export const postOptimize = () => post<OptimizeResponse>("/optimize");

// ============== Results ==============
export interface OptimizationResult {
  route_id: number;
  demand_after: number;
  waiting_passengers: number;
  actions: string[];
  frequency_multiplier: number;
  buses_added: number;
  rerouted_to: number | null;
  anomaly: boolean;
  high_uncertainty: boolean;
}

export const getResults = (throwOnError = false) => get<OptimizationResult[]>("/results", [], throwOnError);

// ============== Alerts ==============
export interface Alert {
  id: number;
  route: string;
  message: string;
  severity: string;
  time: string;
}

export const getAlerts = () => get<Alert[]>("/alerts", []);

export interface SimulationSummary {
  total_routes: number;
  routes_with_actions: number;
  total_buses_added: number;
  avg_frequency: number;
  avg_waiting: number;
  critical_routes: number;
}

export const getSimulationSummary = async (): Promise<SimulationSummary> => {
  const results = await getResults();
  if (!results || results.length === 0) {
    return {
      total_routes: 0,
      routes_with_actions: 0,
      total_buses_added: 0,
      avg_frequency: 0,
      avg_waiting: 0,
      critical_routes: 0
    };
  }
  
  return {
    total_routes: results.length,
    routes_with_actions: results.filter(r => r.actions.length > 0 && !r.actions.includes("No action")).length,
    total_buses_added: results.reduce((sum, r) => sum + r.buses_added, 0),
    avg_frequency: parseFloat((results.reduce((sum, r) => sum + r.frequency_multiplier, 0) / results.length).toFixed(2)),
    avg_waiting: results.reduce((sum, r) => sum + r.waiting_passengers, 0) / results.length,
    critical_routes: results.filter(r => r.waiting_passengers > 5000).length
  };
};

// ============== Agent System ==============
export interface AgentScore {
  agent_name: string;
  agent_type: string;
  score: number;
  priority: number;
  trust_weight: number;
  emergency_flag: boolean;
  reasoning: string;
  constraints: Record<string, any>;
}

export interface ConflictResolution {
  route_id: number;
  resolution_strategy: string;
  primary_agent: string;
  supporting_agents: string[];
  rejected_agents: string[];
  final_action: string;
  reasoning: string;
  weighted_scores: Record<string, number>;
}

export interface AgentDecisionDetail {
  route_id: number;
  agent_scores: AgentScore[];
  conflict_resolution: ConflictResolution | null;
  final_decision: Record<string, any>;
  blackboard_state: Record<string, any>;
}

export interface AgentSystemStatus {
  operational_agents: Record<string, { status: string; trust_weight: number }>;
  tactical_agents: Record<string, { status: string; trust_weight: number }>;
  supervisor_status: { status?: string; conflicts_resolved?: number; last_updated?: string };
  total_conflicts_resolved: number;
  resolution_strategy_counts: {
    safety_override: number;
    weighted_voting: number;
    combined_actions: number;
  };
  average_trust_weights: Record<string, number>;
}

export interface BlackboardSnapshot {
  namespaces: Record<string, any[]>;
  system_state: Record<string, any>;
  urgent_messages: any[];
  last_update_time: string;
}

export const getAgentSystemStatus = () => get<AgentSystemStatus>("/agents/status", {
  operational_agents: {},
  tactical_agents: {},
  supervisor_status: {},
  total_conflicts_resolved: 0,
  resolution_strategy_counts: {
    safety_override: 0,
    weighted_voting: 0,
    combined_actions: 0
  },
  average_trust_weights: {}
});

export const getRouteAgentDetail = (routeId: number) => get<AgentDecisionDetail>(`/agents/route/${routeId}`, {
  route_id: routeId,
  agent_scores: [],
  conflict_resolution: null,
  final_decision: {},
  blackboard_state: {}
});

export const getAllConflicts = () => get<ConflictResolution[]>("/agents/conflicts", []);

export const getBlackboardSnapshot = () => get<BlackboardSnapshot>("/agents/blackboard", {
  namespaces: {},
  system_state: {},
  urgent_messages: [],
  last_update_time: new Date().toISOString()
});

export const getAgentScoresForRoute = (routeId: number) => get<AgentScore[]>(`/agents/scores/${routeId}`, []);

// ============== Real-time Prediction ==============

export interface PredictRequest {
  route_id:        number;
  hour:            number;
  day_of_week:     number;
  is_peak:         number;
  is_weekend:      number;
  speed_kmph:      number;
  congestion:      number;
  passenger_count: number;
  bus_capacity:    number;
  weather_rain:    number;
}

export interface PredictResponse {
  route_id:           number;
  predicted_demand:   number;
  current_load_pct:   number;
  predicted_load:     number;
  utilization:        string;
  buses_to_add:       number;
  buses_per_hour:     number;
  headway_mins:       number;
  frequency_mult:     number;
  actions:            string[];
  high_uncertainty:   boolean;
  confidence:         number;
  driven_by_realtime: boolean;
}

export const postPredict = (data: PredictRequest) =>
  post<PredictResponse>("/predict", data);
