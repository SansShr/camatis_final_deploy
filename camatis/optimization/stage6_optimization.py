"""
Stage 6: Multi-Objective Optimization
Causal-Aware NSGA-III for transport optimization
"""

import numpy as np
from pymoo.algorithms.moo.nsga3 import NSGA3
from pymoo.core.problem import Problem
from pymoo.optimize import minimize
from pymoo.util.ref_dirs import get_reference_directions
from camatis.config import *

class TransportOptimizationProblem(Problem):
    """
    Multi-objective optimization problem (from specification):
    1. Minimize waiting time
    2. Minimize fuel cost
    3. Maximize fleet utilization
    4. Maximize service fairness
    5. Maximize safety (NEW)
    6. Minimize environmental impact (NEW)
    """
    
    def __init__(self, predictions, agent_constraints=None, causal_constraints=None):
        self.predictions = predictions
        self.agent_constraints = agent_constraints or {}  # From supervisor
        self.causal_constraints = causal_constraints
        
        # Decision variables: bus frequency adjustments per route
        n_routes = len(self.predictions['passenger_demand'])
        
        super().__init__(
            n_var=n_routes,
            n_obj=6,  # Updated from 4 to 6
            n_constr=0,  # No soft constraints (agent constraints handled as penalties)
            xl=0.5,  # Min frequency multiplier
            xu=1.6   # Max frequency multiplier
        )
    
    def _evaluate(self, X, out, *args, **kwargs):
        """
        Evaluate all 6 objectives (from specification).
        Agent constraints are applied as penalties to ensure feasibility.
        """
        n_solutions = X.shape[0]
        
        # Objective 1: Waiting time (minimize)
        waiting_time = self._compute_waiting_time(X)
        
        # Objective 2: Fuel cost (minimize)
        fuel_cost = self._compute_fuel_cost(X)
        
        # Objective 3: Utilization (maximize -> minimize negative)
        utilization = -self._compute_utilization(X)
        
        # Objective 4: Fairness (maximize -> minimize negative)
        fairness = -self._compute_fairness(X)
        
        # Objective 5: Safety (maximize -> minimize negative) - NEW
        safety = -self._compute_safety(X)
        
        # Objective 6: Environmental impact (minimize) - NEW
        environmental = self._compute_environmental_impact(X)
        
        # Apply agent constraint penalties
        constraint_penalty = self._apply_agent_constraints(X)
        
        # Add penalties to all objectives proportionally
        waiting_time += constraint_penalty
        fuel_cost += constraint_penalty
        
        out["F"] = np.column_stack([
            waiting_time, 
            fuel_cost, 
            utilization, 
            fairness,
            safety,
            environmental
        ])
    
    def _compute_waiting_time(self, X):

        demand = self.predictions['passenger_demand']

        # ✅ ADD THIS LINE (uncertainty)
        uncertainty = self.predictions.get(
            'demand_std',
            np.zeros_like(demand)
        )

        # ✅ UPDATED FORMULA
        return np.mean(
            (demand / (X + 0.1)) * (1 + uncertainty),
            axis=1
        )
        

    def _compute_fuel_cost(self, X):

        demand = self.predictions['passenger_demand']

        return np.sum((X ** 2) * demand * 0.1, axis=1)
        
    def _compute_utilization(self, X):

        load = self.predictions['load_factor']

        return np.mean(load * X, axis=1)
    
    def _compute_fairness(self, X):
        """
        Compute service fairness (minimize variance).
        From spec: Prevents neglecting low-demand neighborhoods.
        """
        return -np.var(X, axis=1)
    
    def _compute_safety(self, X):
        """
        Compute safety score (maximize -> minimize negative).
        From specification: Weighted sum of driver + vehicle + weather safety scores.
        Respects all agent constraints.
        
        Formula: Σ(driver_safety_score × weight + vehicle_health_score × weight + weather_safety × weight)
        Higher frequency when safety is poor = lower safety score (penalty)
        """
        # Get safety-related scores from predictions
        driver_safety = self.predictions.get('driver_safety_score', np.ones(X.shape[1]))
        vehicle_health = self.predictions.get('vehicle_health_score', np.ones(X.shape[1]))
        weather_risk = self.predictions.get('weather_risk_score', np.zeros(X.shape[1]))
        
        # Convert weather risk to safety (1 - risk)
        weather_safety = 1.0 - weather_risk
        
        # Weighted sum (equal weights for each component)
        safety_scores = (driver_safety + vehicle_health + weather_safety) / 3.0
        
        # Penalize solutions that increase frequency when safety is poor
        # High frequency (X) + Low safety = Bad
        safety_penalty = np.zeros(X.shape[0])
        for i in range(X.shape[0]):
            # For each solution, penalize high freq when safety is low
            freq_adjustments = X[i, :]
            low_safety_mask = safety_scores < 0.7
            
            if np.any(low_safety_mask):
                # Penalty proportional to how much we're increasing freq on unsafe routes
                excess_freq = np.maximum(0, freq_adjustments[low_safety_mask] - 1.0)
                safety_penalty[i] = np.sum(excess_freq * (1.0 - safety_scores[low_safety_mask]))
        
        # Return average safety score minus penalty
        avg_safety = np.mean(safety_scores)
        return avg_safety - safety_penalty
    
    def _compute_environmental_impact(self, X):
        """
        Compute environmental impact (minimize).
        From specification: Σ emissions (function of fuel × trip count)
        Fewer/shorter trips = lower emissions.
        
        Formula: Σ(buses_allocated × fuel_per_km × route_length × emissions_factor)
        """
        demand = self.predictions['passenger_demand']
        fuel_per_km = self.predictions.get('fuel_per_km', np.full(X.shape[1], 8.0))
        
        # Estimate route length from demand patterns (proxy)
        # Higher demand routes tend to be longer urban routes
        route_length_proxy = np.log1p(demand) * 5.0  # Rough proxy in km
        
        # Emissions factor (kg CO2 per liter of fuel)
        emissions_factor = 2.68  # Diesel emissions factor
        
        # Calculate emissions for each solution
        emissions = np.zeros(X.shape[0])
        for i in range(X.shape[0]):
            freq_multipliers = X[i, :]
            
            # Buses allocated ∝ frequency multiplier
            buses_per_route = 4 * freq_multipliers  # Base 4 buses/hour
            
            # Total trips per day
            trips_per_day = buses_per_route * 16  # 16 operating hours
            
            # Fuel consumed = trips × route_length × fuel_per_km
            fuel_consumed = trips_per_day * route_length_proxy * fuel_per_km
            
            # Emissions = fuel × emissions_factor
            total_emissions = np.sum(fuel_consumed * emissions_factor)
            
            emissions[i] = total_emissions
        
        return emissions
    
    def _apply_agent_constraints(self, X):
        """
        Apply agent constraints as penalties (from specification).
        
        Agent constraints categories:
        - Safety: driver breaks, replacements, frequency limits
        - Vehicle: maintenance windows, max load restrictions
        - Weather: service reductions
        - Congestion: rerouting requirements
        
        These are non-negotiable requirements from agents.
        Solutions violating constraints receive penalty proportional to severity.
        """
        if not self.agent_constraints:
            return np.zeros(X.shape[0])
        
        penalties = np.zeros(X.shape[0])
        
        # Extract constraint categories
        safety_constraints = self.agent_constraints.get('safety', {})
        vehicle_constraints = self.agent_constraints.get('vehicle', {})
        weather_constraints = self.agent_constraints.get('weather', {})
        
        for i in range(X.shape[0]):
            freq_multipliers = X[i, :]
            penalty = 0.0
            
            # Check safety frequency constraints
            max_freq_mult = safety_constraints.get('max_frequency_multiplier', 2.0)
            if np.any(freq_multipliers > max_freq_mult):
                # Penalize violations
                violations = np.maximum(0, freq_multipliers - max_freq_mult)
                penalty += np.sum(violations) * 100.0  # Heavy penalty
            
            # Check vehicle load constraints
            max_load = vehicle_constraints.get('max_load_factor', 1.0)
            if max_load < 1.0:
                # Reduced capacity - high frequency should be penalized
                high_freq_mask = freq_multipliers > 1.2
                if np.any(high_freq_mask):
                    penalty += np.sum(freq_multipliers[high_freq_mask] - 1.0) * 50.0
            
            # Check weather frequency constraints
            weather_freq_mult = weather_constraints.get('frequency_multiplier', 1.0)
            if weather_freq_mult < 1.0:
                # Weather demands reduced service
                excessive_freq = np.maximum(0, freq_multipliers - weather_freq_mult)
                penalty += np.sum(excessive_freq) * 30.0
            
            penalties[i] = penalty
        
        return penalties

class MultiObjectiveOptimizer:
    """
    Multi-objective optimizer using NSGA-III with 6 objectives.
    
    From specification:
    - 6 competing objectives
    - Preference modes: Balanced, Cost, Demand, Safety, Efficiency
    - Agent constraints as hard requirements
    - 100 population, 50 generations
    """
    
    def __init__(self, preference_mode='balanced'):
        self.algorithm = None
        self.results = None
        self.preference_mode = preference_mode
        
        # Preference weights from specification
        self.PREFERENCE_WEIGHTS = {
            'balanced': [1/6, 1/6, 1/6, 1/6, 1/6, 1/6],  # Equal weights
            'cost': [0.25, 0.40, 0.10, 0.10, 0.10, 0.05],  # 40% fuel, 25% waiting
            'demand': [0.15, 0.10, 0.50, 0.10, 0.10, 0.05],  # 50% utilization
            'safety': [0.10, 0.10, 0.20, 0.10, 0.35, 0.15],  # 35% safety
            'efficiency': [0.15, 0.15, 0.40, 0.10, 0.10, 0.10]  # 40% utilization
        }
        
    def optimize(self, predictions, agent_constraints=None, causal_constraints=None):
        """
        Run Causal-Aware NSGA-III optimization with 6 objectives.
        
        Args:
            predictions: ML predictions dictionary
            agent_constraints: Constraints from supervisor agent
            causal_constraints: Causal relationships
            
        Returns:
            Optimized frequency multipliers for all routes
        """
        print(f"Running NSGA-III optimization (mode: {self.preference_mode})...")
        print(f"Objectives: 6 (Waiting, Fuel, Utilization, Fairness, Safety, Environmental)")
        
        # Define problem
        problem = TransportOptimizationProblem(
            predictions, 
            agent_constraints,
            causal_constraints
        )
        
        # Reference directions for NSGA-III
        ref_dirs = get_reference_directions("das-dennis", 4, n_partitions=12)
        
        # Initialize algorithm
        self.algorithm = NSGA3(
            pop_size=POPULATION_SIZE,
            ref_dirs=ref_dirs
        )
        
        # Run optimization
        self.results = minimize(
            problem,
            self.algorithm,
            ('n_gen', N_GENERATIONS),
            seed=RANDOM_SEED,
            verbose=True
        )
        
        print(f"Optimization completed!")
        print(f"Found {len(self.results.F)} Pareto-optimal solutions")
        
        return self.results
    
    def get_best_solution(self, preference_weights=None):
        """
        Get best solution based on preference weights
        Default: equal weights
        """
        if preference_weights is None:
            preference_weights = np.array([0.25, 0.25, 0.25, 0.25])
        
        # Normalize objectives
        F_norm = (self.results.F - self.results.F.min(axis=0)) / (
            self.results.F.max(axis=0) - self.results.F.min(axis=0) + 1e-8
        )
        
        # Weighted sum
        scores = F_norm @ preference_weights
        best_idx = np.argmin(scores)
        
        return {
            'solution': self.results.X[best_idx],
            'objectives': self.results.F[best_idx],
            'index': best_idx
        }
    
    def get_pareto_front(self):
        """Get all Pareto-optimal solutions"""
        return {
            'solutions': self.results.X,
            'objectives': self.results.F
        }
