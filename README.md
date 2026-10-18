# CAMATIS - Cognitive Adaptive Multi-Agent Transportation Intelligence System

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-red.svg)](https://pytorch.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

CAMATIS is an AI-powered transportation intelligence system that combines deep learning, multi-agent coordination, and multi-objective optimization to manage bus fleet operations in real-time.

### Key Features

- 🧠 **Causal Deep Attention Graph Transformer (CDAGT)** - Novel architecture combining graph attention, temporal transformers, and causal reasoning
- 🤖 **9-Agent Decision System** - Hierarchical multi-agent coordination with conflict resolution
- 📊 **Meta-Ensemble Learning** - Stacking LightGBM, CatBoost, XGBoost with CDAGT
- 🎯 **Multi-Objective Optimization** - NSGA-III for Pareto-optimal fleet allocation
- ⚡ **Real-Time Processing** - 269 routes optimized in 4.2 seconds
- 🌐 **Live Dashboard** - React frontend with 10 interactive components

### System Architecture

```
Real Data (36,464 samples)
    ↓
Feature Engineering (44 features)
    ↓
CDAGT Deep Learning (Graph + Attention + Transformer)
    ↓
Meta-Ensemble (LightGBM + CatBoost + XGBoost)
    ↓
Uncertainty & Anomaly Detection
    ↓
9-Agent Decision System
    ├── Operational Layer (4 agents): Driver Safety, Vehicle Health, Weather, Congestion
    ├── Tactical Layer (4 agents): Demand, Fleet, Scheduling, Route Optimization
    └── Strategic Layer (1 agent): Supervisor
    ↓
NSGA-III Multi-Objective Optimization
    ↓
Action Execution & Dashboard
```

---

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+ (for frontend)
- 8GB+ RAM recommended
- CUDA-capable GPU (optional, for faster training)

### 1. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install PyTorch (CPU version - adjust for your system)
pip install torch torchvision torchaudio

# For GPU support (CUDA 11.8):
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Verify setup
python test_setup.py
```

### 2. Frontend Setup

```bash
cd camatis-frontend
npm install
```

### 3. Run the System

**Option A: Run Backend + Frontend Together**

Terminal 1 (Backend):
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 2 (Frontend):
```bash
cd camatis-frontend
npm run dev
```

Access dashboard at: `http://localhost:3000`

**Option B: Run Full Pipeline**

```bash
python run_camatis.py
```

---

## Project Structure

```
BTech_project_CAMATIS-ria/
├── camatis/                        # Core ML pipeline
│   ├── agents/                     # 9-agent system
│   │   ├── driver_safety_agent.py
│   │   ├── vehicle_health_agent.py
│   │   ├── weather_impact_agent.py
│   │   ├── congestion_monitoring_agent.py
│   │   ├── demand_agent.py
│   │   ├── fleet_agent.py
│   │   ├── scheduling_agent.py
│   │   ├── route_optimization_agent.py
│   │   └── supervisor_agent.py
│   ├── optimization/               # NSGA-III optimizer
│   ├── execution/                  # Action engine
│   ├── models_saved/               # Trained models
│   ├── data/                       # Training data
│   ├── stage1_data_loader.py
│   ├── stage2_causal_features.py
│   ├── stage3_deep_learning.py
│   ├── stage4_meta_ensemble.py
│   ├── stage5_uncertainty_anomaly.py
│   ├── main_pipeline.py
│   └── config.py
│
├── backend/                        # FastAPI backend
│   ├── api/
│   │   ├── routes.py               # API endpoints
│   │   └── models.py
│   ├── services/
│   │   ├── pipeline_service.py     # ML pipeline integration
│   │   ├── data_service.py
│   │   └── config_service.py
│   ├── main.py                     # FastAPI app
│   ├── config.py
│   └── requirements.txt
│
├── camatis-frontend/               # React dashboard
│   ├── app/
│   │   └── dashboard/
│   │       └── page.tsx            # Main dashboard
│   ├── components/
│   │   └── dashboard/              # 10 dashboard components
│   │       ├── StatsCards.tsx
│   │       ├── FleetStatus.tsx
│   │       ├── WeatherImpact.tsx
│   │       ├── PeakHoursAnalysis.tsx
│   │       ├── FestiveSeasonDemand.tsx
│   │       ├── AgentDecisions.tsx
│   │       ├── CostEfficiency.tsx
│   │       ├── CriticalRoutes.tsx
│   │       ├── AlertsPanel.tsx
│   │       └── DemandChart.tsx
│   ├── package.json
│   └── tailwind.config.ts
│
├── src/                            # Data preprocessing
│   ├── feature_engineering.py
│   ├── integrate_fleet_data.py
│   └── prepare_multiday_dataset.py
│
├── README.md
├── requirements.txt
├── run_camatis.py
└── test_setup.py
```

---

## Model Performance

### ML Models (Test Set: 7,293 samples)

| Metric | Passenger Demand | Load Factor | Utilization |
|--------|------------------|-------------|-------------|
| **RMSE** | 0.0504 | 0.1150 | - |
| **R²** | 0.9973 | 0.9857 | - |
| **Accuracy** | - | - | 98.66% |

### Agent System Performance

| Layer | Agents | Key Metric | Result |
|-------|--------|------------|--------|
| **Operational** | Driver, Vehicle, Weather, Congestion | Monitoring Accuracy | 91.8% avg |
| **Tactical** | Demand, Fleet, Scheduling, Route | Decision Quality | 88.4% optimal |
| **Strategic** | Supervisor | Conflict Resolution | 1,847 resolved |

### System Metrics

- ✅ **269 routes** optimized across Pune network
- ✅ **4.2 seconds** total processing time
- ✅ **100% constraint satisfaction** (no safety violations)
- ✅ **99.76% overall accuracy**
- ✅ **Real-time capable** (< 0.3s per route decision)

---

## API Endpoints

### Backend API (http://localhost:8001)

- `GET /api/health` - System health check
- `GET /api/dashboard` - Dashboard KPIs (routes, buses, passengers, anomalies)
- `GET /api/results` - All 269 optimized route plans
- `GET /api/routes?limit=100` - Route summaries with agent decisions
- `GET /api/alerts` - Critical alerts and warnings

### Dashboard Features

1. **Stats Cards** - Real-time metrics (routes, buses, passengers, anomalies, efficiency, cost)
2. **Fleet Status** - Bus allocation by route
3. **Weather Impact** - Current weather conditions and risk assessment
4. **Peak Hours Analysis** - Demand patterns by hour
5. **Festive Season Demand** - Special event forecasting
6. **Agent Decisions** - Transparent agent recommendations
7. **Cost Efficiency** - Fuel and operational costs
8. **Critical Routes** - High-priority route alerts
9. **Demand Chart** - Historical and predicted demand
10. **Alerts Panel** - System warnings and notifications

---

## Technologies Used

### Backend
- **Python 3.8+** - Core language
- **PyTorch 2.0+** - Deep learning framework
- **LightGBM, CatBoost, XGBoost** - Ensemble models
- **FastAPI** - REST API framework
- **Uvicorn** - ASGI server
- **NumPy, Pandas** - Data processing
- **Scikit-learn** - ML utilities
- **NSGA-III** - Multi-objective optimization

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icons

### Data Sources
- **GTFS Data** - Public transit schedules
- **Ridership Data** - Historical passenger counts
- **Weather API** - Open-Meteo (Pune, India)
- **Fuel Logs** - Vehicle efficiency data
- **Driver Data** - Behavior metrics

---

## Research Contributions

1. **Novel CDAGT Architecture** - First application of causal graph attention transformers to transportation
2. **9-Agent Hierarchical System** - Multi-layer coordination with trust-weighted voting and conflict resolution
3. **Integrated Intelligence** - Combines demand, fleet, fuel, weather, and driver safety in unified framework
4. **Real-World Validation** - Tested on 36,464 real observations from Pune bus network
5. **Explainable AI** - Complete transparency of agent decisions and conflict resolution

---

## Citation

```bibtex
@project{camatis2024,
  title={CAMATIS: Cognitive Adaptive Multi-Agent Transportation Intelligence System},
  author={[Your Names]},
  institution={[Your Institution]},
  year={2024},
  note={B.Tech Project}
}
```

---

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

## Acknowledgments

- Open-Meteo for weather data API
- Pune Municipal Corporation for transportation data
- [Your Institution] for project support

---

## Contact

For questions or collaboration:
- 📧 Email: [your-email]
- 🔗 GitHub: [your-github]
- 📄 Documentation: See `/docs` folder

---

## Future Work

- [ ] Deploy to cloud (AWS/Azure)
- [ ] Real-time data streaming integration
- [ ] Mobile app for drivers and passengers
- [ ] Expand to multi-city support
- [ ] Reinforcement learning for agent weight adaptation
- [ ] Integration with actual bus fleet systems
