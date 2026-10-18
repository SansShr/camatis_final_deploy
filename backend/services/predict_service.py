"""
Real-time single-route prediction service.

Accepts user-friendly form inputs, converts them to the normalised
feature vector the trained models expect, runs inference through the
full ML stack (DL + LightGBM + CatBoost + XGBoost meta), and returns
plain-English decisions.

Input features expected from the form (natural / un-normalised units):
  - route_id       : int   (e.g. 7)
  - hour           : int   0-23
  - day_of_week    : int   0=Mon … 6=Sun
  - is_peak        : 0/1   (1 = rush hour)
  - is_weekend     : 0/1
  - speed_kmph     : float km/h  (typical 20-80)
  - congestion     : float 0-3   (0=free, 3=gridlock)
  - passenger_count: int   actual passengers on board right now
  - bus_capacity   : int   total seats on the bus (e.g. 50)
  - weather_rain   : 0/1   (1 = raining)
"""

import os
import warnings
import numpy as np
import joblib

warnings.filterwarnings("ignore")

# Paths
MODELS_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "camatis", "models_saved"
)

# ── Lazy-load models once per process ────────────────────────────────────────
_scaler      = None
_label_enc   = None
_lgb_models  = None
_cat_models  = None
_meta_models = None
_dl_trainer  = None

def _load():
    global _scaler, _label_enc, _lgb_models, _cat_models, _meta_models, _dl_trainer
    if _scaler is not None:
        return

    _scaler    = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
    _label_enc = joblib.load(os.path.join(MODELS_DIR, "label_encoders.pkl"))
    _lgb_models  = joblib.load(os.path.join(MODELS_DIR, "lgb_models.pkl"))
    _cat_models  = joblib.load(os.path.join(MODELS_DIR, "catboost_models.pkl"))
    _meta_models = joblib.load(os.path.join(MODELS_DIR, "meta_models.pkl"))

    # Deep-learning model (optional – skip if import fails)
    try:
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
        from camatis.stage3_deep_learning import DeepLearningTrainer
        _dl_trainer = DeepLearningTrainer(input_dim=17)
        _dl_trainer.load_model()
    except Exception as e:
        print(f"[Predict] DL model not loaded (will use LGB only): {e}")
        _dl_trainer = None


# ── Feature engineering from raw form inputs ─────────────────────────────────

def _engineer_features(inp: dict) -> np.ndarray:
    """
    Convert plain user inputs into the 17-feature vector the models expect.
    Feature order must match training:
      congestion_level, speed, is_peak, capacity,
      hour, day_of_week, month, is_weekend,
      route_avg_speed, route_avg_demand, route_avg_congestion,
      SRI, demand_capacity_ratio, speed_congestion_ratio, utilization_score,
      bus_id_encoded, route_id_encoded
    """
    speed_kmph      = float(inp.get("speed_kmph", 50))
    congestion      = float(inp.get("congestion", 1.0))    # 0-3
    capacity_seats  = int(inp.get("bus_capacity", 50))
    passengers      = int(inp.get("passenger_count", 20))
    hour            = int(inp.get("hour", 9))
    dow             = int(inp.get("day_of_week", 1))
    is_peak         = int(inp.get("is_peak", 0))
    is_weekend      = int(inp.get("is_weekend", 0))
    route_id        = str(inp.get("route_id", "2"))
    weather_rain    = int(inp.get("weather_rain", 0))

    # Normalise speed to standardised form (mean≈58.5, std≈9.8 from raw data)
    speed_norm = (speed_kmph - 58.5) / 9.8

    # Capacity: dataset uses bus seat count normalised (mean≈0, std≈1)
    # Use capacity_seats / 50 - 1 as rough normalisation (50 seats ≈ median)
    capacity_norm = (capacity_seats - 50) / 20

    # Load factor (passengers / seats)
    load_factor = min(1.0, passengers / max(capacity_seats, 1))

    # Demand-capacity ratio (normalised)
    demand_cap_ratio = passengers / max(capacity_seats, 1)

    # Utilization score (0–1)
    util_score = load_factor

    # SRI – Service Reliability Index: penalise high congestion + rain
    sri = 1.0 - (congestion / 3.0) * 0.5 - (weather_rain * 0.1)

    # Speed-congestion ratio
    speed_cong_ratio = speed_kmph / max(congestion, 0.1)

    # Route averages: use sensible priors (we don't have historical data per-route)
    # These are approximate means from the dataset (standardised ≈ 0)
    route_avg_speed     = 0.0
    route_avg_demand    = 0.0
    route_avg_congestion = 0.0

    # Encode route_id using saved label encoder
    route_id_enc = 0
    if "route_id" in _label_enc:
        try:
            route_id_enc = int(_label_enc["route_id"].transform([str(route_id)])[0])
        except Exception:
            route_id_enc = 0

    # Use BUS_01 as default bus encoding
    bus_id_enc = 0
    if "bus_id" in _label_enc:
        try:
            bus_id_enc = int(_label_enc["bus_id"].transform(["BUS_01"])[0])
        except Exception:
            bus_id_enc = 0

    feature_vector = np.array([[
        congestion,          # congestion_level
        speed_norm,          # speed (normalised)
        is_peak,             # is_peak
        capacity_norm,       # capacity (normalised)
        hour,                # hour
        dow,                 # day_of_week
        1,                   # month (Jan default; user doesn't need to input month)
        is_weekend,          # is_weekend
        route_avg_speed,     # route_avg_speed
        route_avg_demand,    # route_avg_demand
        route_avg_congestion,# route_avg_congestion
        sri,                 # SRI
        demand_cap_ratio,    # demand_capacity_ratio
        speed_cong_ratio,    # speed_congestion_ratio
        util_score,          # utilization_score
        bus_id_enc,          # bus_id_encoded
        route_id_enc,        # route_id_encoded
    ]], dtype=np.float32)

    return feature_vector


# ── Main predict function ─────────────────────────────────────────────────────

def predict_route(inp: dict) -> dict:
    """Run a single-route prediction from form inputs and return decisions."""
    _load()

    # Build & scale feature vector
    X_raw = _engineer_features(inp)
    X = _scaler.transform(X_raw)

    # ── DL prediction ──
    if _dl_trainer is not None:
        try:
            dl_pred = _dl_trainer.predict(X)
            dl_demand = float(dl_pred["passenger_demand"][0])
            dl_load   = float(dl_pred["load_factor"][0])
        except Exception:
            dl_demand = 0.0
            dl_load   = 0.0
    else:
        dl_demand = 0.0
        dl_load   = 0.0

    # ── LightGBM predictions ──
    lgb_demand = float(_lgb_models["demand"].predict(X)[0])
    lgb_load   = float(_lgb_models["load"].predict(X)[0])

    # ── CatBoost predictions ──
    cat_demand = float(_cat_models["demand"].predict(X)[0])
    cat_load   = float(_cat_models["load"].predict(X)[0])
    cat_util   = int(_cat_models["utilization"].predict(X)[0]) if "utilization" in _cat_models else 0

    # ── Meta predictions (XGBoost stacking) ──
    # Build meta-features the way stage4_meta_ensemble does
    meta_X = np.column_stack([
        [lgb_demand], [lgb_load],
        [cat_demand], [cat_load],
        [dl_demand],  [dl_load],
    ])

    try:
        final_demand  = float(_meta_models["demand"].predict(meta_X)[0])
        final_load    = float(_meta_models["load"].predict(meta_X)[0])
        final_util    = int(_meta_models["utilization"].predict(meta_X)[0]) if "utilization" in _meta_models else cat_util
    except Exception:
        final_demand  = lgb_demand
        final_load    = lgb_load
        final_util    = cat_util

    # ── Denormalise (same formula as run_agents_pipeline.py) ──
    demand_real = max(20.0, ((final_demand + 2) / 4) * 1950 + 50) * 0.25
    load_real   = float(np.clip((final_load + 2) / 4, 0.05, 0.95))

    # ── Derive plain-English decisions ──────────────────────────────────────
    import math

    actions           = []
    base_freq         = 4   # default 4 buses/hr = every 15 min
    bus_capacity      = int(inp.get("bus_capacity", 50))
    passenger_count   = int(inp.get("passenger_count", 0))

    # ── How many buses per hour do we actually need? ──────────────────────
    # Simple maths: ceil(predicted_demand / bus_capacity)
    # This is always the correct number regardless of current snapshot.
    buses_needed  = math.ceil(demand_real / max(bus_capacity, 1))
    buses_needed  = max(base_freq, min(buses_needed, base_freq + 6))  # clamp to base..base+6
    buses_to_add  = max(0, buses_needed - base_freq)
    headway_mins  = round(60 / buses_needed)

    # ── Current real-time load from what the user entered ─────────────────
    current_load_pct = round((passenger_count / max(bus_capacity, 1)) * 100, 1)

    # ── Plain-English actions ─────────────────────────────────────────────
    if buses_to_add > 0:
        actions.append(
            f"{round(demand_real)} passengers/hr expected, bus holds {bus_capacity} — "
            f"need {buses_needed} buses/hr (every {headway_mins} min) to serve everyone"
        )

    if current_load_pct > 85:
        actions.append(f"Bus is already {round(current_load_pct)}% full — passengers being left behind right now")
    elif current_load_pct > 65:
        actions.append(f"Bus is {round(current_load_pct)}% full — getting crowded")
    else:
        if buses_to_add == 0:
            actions.append(
                f"Bus is {round(current_load_pct)}% full and demand is manageable — "
                f"current schedule of every 15 min is sufficient"
            )

    congestion_val = float(inp.get("congestion", 1.0))
    if congestion_val > 1.8:
        actions.append("Heavy traffic on this route - consider redirecting some buses")

    if int(inp.get("weather_rain", 0)) == 1:
        actions.append("Rain detected - allow extra travel time between stops")

    util_label = {0: "Underutilised", 1: "Optimal", 2: "Overloaded"}.get(final_util, "Optimal")

    if not actions:
        actions.append("Route is running normally - no changes needed")

    high_uncertainty   = abs(lgb_demand - cat_demand) > 1.5
    driven_by_realtime = current_load_pct > 65

    return {
        "route_id":           inp.get("route_id"),
        "predicted_demand":   round(demand_real, 0),
        "current_load_pct":   current_load_pct,
        "predicted_load":     round(load_real * 100, 1),
        "utilization":        util_label,
        "buses_to_add":       buses_to_add,
        "buses_per_hour":     buses_needed,
        "headway_mins":       int(headway_mins),
        "frequency_mult":     round(buses_needed / base_freq, 2),
        "actions":            actions,
        "high_uncertainty":   high_uncertainty,
        "confidence":         75 if not high_uncertainty else 60,
        "driven_by_realtime": driven_by_realtime,
    }
