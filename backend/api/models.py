from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Login Models
class LoginRequest(BaseModel):
    email: str
    password: str
    role: str = "Admin"

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    message: str

# Route Models
class RouteSummary(BaseModel):
    id: str
    route_id: Optional[int] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    demand: float
    load_factor: float
    status: str
    buses_added: Optional[int] = 0
    frequency_multiplier: Optional[float] = 1.0
    rerouted_to: Optional[int] = None
    actions: Optional[List[str]] = []
    high_uncertainty: Optional[bool] = False
    anomaly: Optional[bool] = False

class DemandPoint(BaseModel):
    time: str
    demand: float

class LoadPoint(BaseModel):
    route: str
    load: float

class Alert(BaseModel):
    id: int
    route: str
    message: str
    severity: str
    time: str

class DashboardStats(BaseModel):
    total_routes: int
    active_buses: int
    high_demand_routes: int
    anomalies: int
    avg_load_factor: float
    avg_demand: float

class DashboardData(BaseModel):
    stats: DashboardStats
    demand: List[DemandPoint]
    load: List[LoadPoint]
    alerts: List[Alert]

# Results Models
class OptimizationResult(BaseModel):
    route_id: int
    demand_after: float
    waiting_passengers: float
    actions: List[str]
    frequency_multiplier: float
    buses_added: int
    rerouted_to: Optional[int]
    anomaly: bool
    high_uncertainty: bool

# Route Detail Models
class Recommendation(BaseModel):
    frequency_multiplier: str
    buses_to_add: str
    reroute_suggestion: str

class ActionBadge(BaseModel):
    label: str
    color: str

class Stop(BaseModel):
    name: str
    stop_number: int
    avg_stop_time_mins: float

class RouteDetail(BaseModel):
    demand_trend: List[Dict[str, Any]]
    load_trend: List[Dict[str, Any]]
    confidence: float
    recommendations: Recommendation
    action_badges: List[ActionBadge]
    source: Optional[str] = None
    destination: Optional[str] = None
    stops: Optional[List[Stop]] = []

# Optimization Trigger
class OptimizeResponse(BaseModel):
    success: bool
    message: str
    summary: Dict[str, Any]
    timestamp: str

# ============== Agent Decision Models ==============

class AgentScore(BaseModel):
    """Individual agent assessment for a route"""
    agent_name: str
    agent_type: str  # "operational" | "tactical"
    score: float
    priority: int
    trust_weight: float
    emergency_flag: bool
    reasoning: str
    constraints: Dict[str, Any]

class ConflictResolution(BaseModel):
    """Details of how conflicting agent decisions were resolved"""
    route_id: int
    resolution_strategy: str  # "safety_override" | "weighted_voting" | "combined_actions"
    primary_agent: str
    supporting_agents: List[str]
    rejected_agents: List[str]
    final_action: str
    reasoning: str
    weighted_scores: Dict[str, float]

class AgentDecisionDetail(BaseModel):
    """Comprehensive agent decision data for a route"""
    route_id: int
    agent_scores: List[AgentScore]
    conflict_resolution: Optional[ConflictResolution]
    final_decision: Dict[str, Any]
    blackboard_state: Dict[str, Any]

class AgentSystemStatus(BaseModel):
    """Overall agent system status"""
    operational_agents: Dict[str, Dict[str, Any]]  # Status of 4 operational agents
    tactical_agents: Dict[str, Dict[str, Any]]  # Status of 4 tactical agents
    supervisor_status: Dict[str, Any]
    total_conflicts_resolved: int
    resolution_strategy_counts: Dict[str, int]
    average_trust_weights: Dict[str, float]

class BlackboardSnapshot(BaseModel):
    """Current state of the blackboard communication system"""
    namespaces: Dict[str, List[Dict[str, Any]]]
    system_state: Dict[str, Any]
    urgent_messages: List[Dict[str, Any]]
    last_update_time: str

# ── Real-time Prediction Models ──────────────────────────────────────────────

class PredictRequest(BaseModel):
    route_id:        int   = 7
    hour:            int   = 9       # 0-23
    day_of_week:     int   = 1       # 0=Mon, 6=Sun
    is_peak:         int   = 1       # 1=rush hour, 0=off-peak
    is_weekend:      int   = 0
    speed_kmph:      float = 55.0    # actual bus speed
    congestion:      float = 1.2     # 0=free flow, 3=gridlock
    passenger_count: int   = 30      # passengers currently on the bus
    bus_capacity:    int   = 50      # total seats
    weather_rain:    int   = 0       # 1=raining

class PredictResponse(BaseModel):
    route_id:           Any
    predicted_demand:   float
    current_load_pct:   float          # actual % full from user inputs
    predicted_load:     float          # model-predicted bus fullness %
    utilization:        str
    buses_to_add:       int
    buses_per_hour:     int
    headway_mins:       int
    frequency_mult:     float
    actions:            List[str]
    high_uncertainty:   bool
    confidence:         int
    driven_by_realtime: bool           # True = decision based on current load, False = model prediction
