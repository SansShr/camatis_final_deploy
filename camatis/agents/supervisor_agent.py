"""
Agent 9: Supervisor Agent
Strategic Layer - Conflict resolution and coordination across all agents
"""

import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum


class ActionType(Enum):
    """Classification of agent actions for conflict detection"""
    EXPAND = "expand"      # Increase service (add buses, increase frequency, allocate)
    REDUCE = "reduce"      # Decrease service (remove, reduce, break)
    NEUTRAL = "neutral"    # Monitor, investigate, maintain


class SupervisorAgent:
    """
    Coordinates all 8 agents using trust-weighted conflict resolution.
    
    Implements 3 resolution strategies from specification:
    1. Safety Override - Critical safety concerns override all other decisions
    2. Weighted Voting - Calculate weighted_score = priority × trust_weight × (1.5 if has constraint)
    3. Combined Actions - When no conflicts, combine all actions by priority
    
    Trust Weights (from specification):
    - Safety agents (operational layer): 1.2-1.5 (life-critical, regulatory)
    - Tactical agents: 0.8-1.0 (operational, reversible)
    """
    
    def __init__(self):
        self.name = "Supervisor Agent"
        self.layer = "Strategic"
        
        # Trust weights from specification
        self.TRUST_WEIGHTS = {
            # Operational Layer (Safety-critical)
            'Driver Safety Agent': 1.5,
            'Vehicle Health Agent': 1.3,
            'Weather Impact Agent': 1.3,
            'Congestion Monitoring Agent': 1.2,
            # Tactical Layer (Operational)
            'Demand Agent': 1.0,
            'Fleet Agent': 0.9,
            'Scheduling Agent': 0.9,
            'Route Optimization Agent': 0.9
        }
        
        # Action classification keywords
        self.EXPAND_KEYWORDS = ['increase', 'allocate', 'add', 'extra', 'high', 'elevated', 'risk']
        self.REDUCE_KEYWORDS = ['decrease', 'remove', 'reduce', 'break', 'replace', 'maintenance', 'reroute']
        self.NEUTRAL_KEYWORDS = ['monitor', 'investigate', 'normal', 'consider', 'schedule']
        
    def resolve(self, agent_actions: List[Dict[str, Any]], route_id: str = 'unknown') -> Dict[str, Any]:
        """
        Resolve conflicts between agent recommendations using trust-weighted voting.
        
        Process (from specification):
        1. Check for safety override conditions
        2. Classify actions as Expand/Reduce/Neutral
        3. Detect conflicts (both Expand AND Reduce present)
        4. Apply appropriate resolution strategy
        5. Aggregate constraints
        
        Args:
            agent_actions: List of action dictionaries from all agents
            route_id: Route identifier for logging
            
        Returns:
            Dictionary with primary action, supporting actions, constraints, and resolution details
        """
        if not agent_actions or len(agent_actions) == 0:
            return {
                'route_id': route_id,
                'primary_action': 'No action',
                'supporting_actions': [],
                'resolution_type': 'no_actions',
                'constraints': {},
                'all_actions': []
            }
        
        # Filter out None actions
        valid_actions = [a for a in agent_actions if a is not None and a.get('action')]
        
        if not valid_actions:
            return {
                'route_id': route_id,
                'primary_action': 'No action',
                'supporting_actions': [],
                'resolution_type': 'no_valid_actions',
                'constraints': {},
                'all_actions': []
            }
        
        # Step 1: Check for Safety Override
        safety_override = self._check_safety_override(valid_actions)
        if safety_override:
            return self._apply_safety_override(safety_override, valid_actions, route_id)
        
        # Step 2: Classify actions
        classified_actions = self._classify_actions(valid_actions)
        
        # Step 3: Detect conflicts
        has_conflict = self._detect_conflict(classified_actions)
        
        # Step 4: Apply resolution strategy
        if has_conflict:
            return self._apply_weighted_voting(valid_actions, classified_actions, route_id)
        else:
            return self._apply_combined_actions(valid_actions, classified_actions, route_id)
    
    def _check_safety_override(self, actions: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Check if any safety agent has critical conditions requiring override.
        
        Safety Override Conditions (from specification):
        - Priority ≥ 7 OR
        - Emergency context flag OR
        - Safety score < 0.3
        
        Returns:
            Safety action if override required, None otherwise
        """
        for action in actions:
            agent_name = action.get('agent', '')
            priority = action.get('priority', 0)
            emergency = action.get('emergency', False)
            
            # Check if it's a safety agent
            is_safety_agent = agent_name in [
                'Driver Safety Agent',
                'Vehicle Health Agent', 
                'Weather Impact Agent',
                'Congestion Monitoring Agent'
            ]
            
            if not is_safety_agent:
                continue
            
            # Check override conditions
            if priority >= 7:
                return action
            
            if emergency:
                return action
            
            # Check safety score < 0.3
            safety_score = action.get('safety_score', 1.0)
            health_score = action.get('health_score', 1.0)
            if safety_score < 0.3 or health_score < 0.3:
                return action
        
        return None
    
    def _apply_safety_override(self, 
                               safety_action: Dict[str, Any], 
                               all_actions: List[Dict[str, Any]],
                               route_id: str) -> Dict[str, Any]:
        """
        Apply Safety Override resolution strategy.
        
        The safety action immediately wins, all others are ignored.
        Resolution type: "safety_override"
        """
        # Collect constraints from safety action
        constraints = self._aggregate_constraints([safety_action])
        
        return {
            'route_id': route_id,
            'primary_action': safety_action.get('action', 'Unknown'),
            'primary_agent': safety_action.get('agent', 'Unknown'),
            'primary_priority': safety_action.get('priority', 0),
            'primary_score': self._get_score_from_action(safety_action),
            'supporting_actions': [],  # All others ignored
            'rejected_actions': [
                {
                    'agent': a.get('agent'),
                    'action': a.get('action'),
                    'reason': 'Overridden by safety-critical decision'
                }
                for a in all_actions if a != safety_action
            ],
            'resolution_type': 'safety_override',
            'resolution_reason': f"Safety-critical condition from {safety_action.get('agent')} (priority {safety_action.get('priority')})",
            'constraints': constraints,
            'all_actions': all_actions
        }
    
    def _classify_actions(self, actions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Classify actions as Expand, Reduce, or Neutral based on keywords.
        
        From specification:
        - Expand: increase, allocate, add (more service)
        - Reduce: decrease, remove, break (less service)
        - Neutral: monitor, investigate
        """
        classified = {
            'expand': [],
            'reduce': [],
            'neutral': []
        }
        
        for action in actions:
            action_str = action.get('action', '').lower()
            
            # Check for expand keywords
            if any(keyword in action_str for keyword in self.EXPAND_KEYWORDS):
                classified['expand'].append(action)
                action['action_type'] = ActionType.EXPAND
            # Check for reduce keywords
            elif any(keyword in action_str for keyword in self.REDUCE_KEYWORDS):
                classified['reduce'].append(action)
                action['action_type'] = ActionType.REDUCE
            # Default to neutral
            else:
                classified['neutral'].append(action)
                action['action_type'] = ActionType.NEUTRAL
        
        return classified
    
    def _detect_conflict(self, classified_actions: Dict[str, List[Dict[str, Any]]]) -> bool:
        """
        Detect conflicts: both Expand AND Reduce actions present.
        
        From specification:
        Conflict exists when both Expand AND Reduce actions present.
        """
        has_expand = len(classified_actions['expand']) > 0
        has_reduce = len(classified_actions['reduce']) > 0
        
        return has_expand and has_reduce
    
    def _apply_weighted_voting(self,
                               actions: List[Dict[str, Any]],
                               classified_actions: Dict[str, List[Dict[str, Any]]],
                               route_id: str) -> Dict[str, Any]:
        """
        Apply Weighted Voting resolution strategy for conflicts.
        
        From specification:
        weighted_score = priority × trust_weight × (1.5 if has constraint else 1.0)
        
        Primary: Highest weighted_score
        Supporting: Actions compatible with primary (same type)
        Rejected: Actions contradicting primary
        
        Resolution type: "weighted_vote"
        """
        # Calculate weighted scores for all actions
        scored_actions = []
        for action in actions:
            agent_name = action.get('agent', 'Unknown')
            priority = action.get('priority', 1)
            trust_weight = self.TRUST_WEIGHTS.get(agent_name, 0.8)
            has_constraint = bool(action.get('constraints', {}))
            
            # Calculate weighted score
            constraint_multiplier = 1.5 if has_constraint else 1.0
            weighted_score = priority * trust_weight * constraint_multiplier
            
            action['weighted_score'] = weighted_score
            action['trust_weight_used'] = trust_weight
            scored_actions.append((weighted_score, action))
        
        # Sort by weighted score (descending)
        scored_actions.sort(reverse=True, key=lambda x: x[0])
        
        # Primary action = highest weighted score
        primary_action = scored_actions[0][1]
        primary_type = primary_action.get('action_type', ActionType.NEUTRAL)
        
        # Supporting actions = same type as primary
        supporting_actions = []
        rejected_actions = []
        
        for score, action in scored_actions[1:]:
            if action.get('action_type') == primary_type:
                supporting_actions.append({
                    'agent': action.get('agent'),
                    'action': action.get('action'),
                    'weighted_score': score
                })
            else:
                rejected_actions.append({
                    'agent': action.get('agent'),
                    'action': action.get('action'),
                    'reason': f"Contradicts primary action type ({primary_type.value})",
                    'weighted_score': score
                })
        
        # Aggregate constraints from primary + supporting
        relevant_actions = [primary_action] + [
            a for _, a in scored_actions[1:] if a.get('action_type') == primary_type
        ]
        constraints = self._aggregate_constraints(relevant_actions)
        
        return {
            'route_id': route_id,
            'primary_action': primary_action.get('action'),
            'primary_agent': primary_action.get('agent'),
            'primary_priority': primary_action.get('priority'),
            'primary_weighted_score': scored_actions[0][0],
            'primary_score': self._get_score_from_action(primary_action),
            'supporting_actions': supporting_actions,
            'rejected_actions': rejected_actions,
            'resolution_type': 'weighted_vote',
            'resolution_reason': f"Weighted voting: {primary_action.get('agent')} won with score {scored_actions[0][0]:.2f}",
            'constraints': constraints,
            'all_actions': actions
        }
    
    def _apply_combined_actions(self,
                                actions: List[Dict[str, Any]],
                                classified_actions: Dict[str, List[Dict[str, Any]]],
                                route_id: str) -> Dict[str, Any]:
        """
        Apply Combined Actions resolution strategy when no conflicts.
        
        From specification:
        - Sort all actions by priority
        - Primary = highest priority
        - Supporting = all others
        Resolution type: "combined"
        """
        # Sort by priority (descending)
        sorted_actions = sorted(actions, key=lambda x: x.get('priority', 0), reverse=True)
        
        # Primary = highest priority
        primary_action = sorted_actions[0]
        
        # Supporting = all others
        supporting_actions = [
            {
                'agent': a.get('agent'),
                'action': a.get('action'),
                'priority': a.get('priority')
            }
            for a in sorted_actions[1:]
        ]
        
        # Aggregate all constraints (no conflicts, so combine all)
        constraints = self._aggregate_constraints(sorted_actions)
        
        return {
            'route_id': route_id,
            'primary_action': primary_action.get('action'),
            'primary_agent': primary_action.get('agent'),
            'primary_priority': primary_action.get('priority'),
            'primary_score': self._get_score_from_action(primary_action),
            'supporting_actions': supporting_actions,
            'rejected_actions': [],
            'resolution_type': 'combined',
            'resolution_reason': f"No conflicts: combined {len(sorted_actions)} actions by priority",
            'constraints': constraints,
            'all_actions': actions
        }
    
    def _aggregate_constraints(self, actions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregate constraints from multiple actions into categories.
        
        From specification:
        - Safety: driver breaks, replacements, frequency limits
        - Vehicle: maintenance windows, max load restrictions
        - Weather: service reductions
        - Congestion: rerouting requirements
        
        These constraints sent to NSGA-III as non-negotiable requirements.
        """
        aggregated = {
            'safety': {},
            'vehicle': {},
            'weather': {},
            'congestion': {},
            'scheduling': {},
            'rerouting': {}
        }
        
        for action in actions:
            constraints = action.get('constraints', {})
            agent_name = action.get('agent', '')
            
            # Categorize constraints by agent type
            if 'Driver Safety' in agent_name:
                aggregated['safety'].update(constraints)
            elif 'Vehicle Health' in agent_name:
                aggregated['vehicle'].update(constraints)
            elif 'Weather' in agent_name:
                aggregated['weather'].update(constraints)
            elif 'Congestion' in agent_name:
                aggregated['congestion'].update(constraints)
            elif 'Scheduling' in agent_name:
                aggregated['scheduling'].update(constraints)
            elif 'Route Optimization' in agent_name:
                aggregated['rerouting'].update(constraints)
        
        # Remove empty categories
        aggregated = {k: v for k, v in aggregated.items() if v}
        
        return aggregated
    
    def _get_score_from_action(self, action: Dict[str, Any]) -> float:
        """Extract the relevant score from an action (safety_score, demand_score, etc.)"""
        for key in ['safety_score', 'health_score', 'risk_score', 'congestion_score',
                    'demand_score', 'allocation_score', 'scheduling_score', 'suitability_score']:
            if key in action:
                return action[key]
        return 0.0
    
    def batch_resolve(self, routes_actions: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, Any]]:
        """
        Resolve conflicts for multiple routes in batch.
        
        Args:
            routes_actions: Dictionary mapping route_id to list of agent actions
            
        Returns:
            Dictionary mapping route_id to resolution result
        """
        results = {}
        for route_id, actions in routes_actions.items():
            results[route_id] = self.resolve(actions, route_id)
        return results
