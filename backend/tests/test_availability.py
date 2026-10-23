import json
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from pydantic import ValidationError

from backend.api.models import PredictRequest
from backend.services import data_service as data_module
from backend.services import predict_service as prediction


class AvailabilityTests(unittest.TestCase):
    def test_saved_checks_match_original_route_60(self):
        service = data_module.DataService()
        detail = service.get_route_agent_detail(60)
        self.assertEqual(detail["route_id"], 60)
        self.assertEqual(len(detail["agent_scores"]), 7)
        self.assertEqual(detail["agent_scores"][0]["agent_name"], "Driver Safety Agent")
        summary = service.get_route_agent_detail(68)
        self.assertEqual(summary["final_decision"]["assessment_status"], "summary_only")
        self.assertEqual(summary["agent_scores"], [])

    def test_new_exports_invalidate_the_assessment_index(self):
        with tempfile.TemporaryDirectory() as temp:
            export = Path(temp) / "agent_route_details.json"
            export.write_text(json.dumps([{"route_id": 60, "agent_scores": [{"score": 0.1}]}]))
            with patch.object(data_module, "OUTPUT_FILE", str(Path(temp) / "final_output.json")):
                service = data_module.DataService()
                self.assertEqual(service.get_route_agent_detail(60)["agent_scores"][0]["score"], 0.1)
                replacement = Path(temp) / "new.json"
                replacement.write_text(json.dumps([{"route_id": 60, "agent_scores": [{"score": 0.987}]}]))
                os.replace(replacement, export)
                self.assertEqual(service.get_route_agent_detail(60)["agent_scores"][0]["score"], 0.987)

    def test_partial_model_initialization_can_be_retried(self):
        class FakeTrainer:
            def __init__(self, input_dim): pass
            def load_model(self): pass

        deep_learning = types.ModuleType("camatis.stage3_deep_learning")
        deep_learning.DeepLearningTrainer = FakeTrainer
        with patch.multiple(prediction, _loaded=False, _scaler=None, _label_enc=None,
                            _lgb_models=None, _cat_models=None, _meta_models=None, _dl_trainer=None):
            with patch.object(prediction.joblib, "load", side_effect=[{}, {}, OSError("interrupted")]):
                with self.assertRaises(OSError): prediction._load()
            self.assertFalse(prediction._loaded)
            self.assertIsNone(prediction._scaler)
            with patch.dict(sys.modules, {"camatis.stage3_deep_learning": deep_learning}):
                with patch.object(prediction.joblib, "load", return_value={}) as loader:
                    prediction._load()
                    self.assertEqual(loader.call_count, 5)
            self.assertTrue(prediction._loaded)

    def test_live_stacking_uses_the_training_feature_layout(self):
        class Constant:
            def __init__(self, value): self.value = value
            def predict(self, features): return np.array([self.value])

        class Meta(Constant):
            def __init__(self, value, expected): super().__init__(value); self.expected = expected; self.used = False
            def predict(self, features):
                self.used = True
                np.testing.assert_allclose(features[0, -3:], self.expected)
                if features.shape != (1, 20): raise AssertionError(features.shape)
                return super().predict(features)

        demand, load = Meta(0.7, [0.1, 0.3, 0.5]), Meta(0.8, [0.2, 0.4, 0.6])
        scaler = types.SimpleNamespace(transform=lambda values: values)
        dl = types.SimpleNamespace(predict=lambda values: {"passenger_demand": [0.5], "load_factor": [0.6]})
        with patch.multiple(prediction, _loaded=True, _scaler=scaler, _label_enc={},
                            _lgb_models={"demand": Constant(0.1), "load": Constant(0.2)},
                            _cat_models={"demand": Constant(0.3), "load": Constant(0.4), "utilization": Constant(1)},
                            _meta_models={"demand": demand, "load": load}, _dl_trainer=dl):
            result = prediction.predict_route(PredictRequest().model_dump())
        self.assertTrue(demand.used and load.used)
        self.assertEqual(result["current_load_pct"], 60)
        self.assertEqual(result["predicted_demand"], round(((0.7 + 2) / 4 * 1950 + 50) * 0.25))

    def test_invalid_inputs_fail_before_model_inference(self):
        for values in [{"bus_capacity": 0}, {"hour": 24}, {"congestion": -1}, {"passenger_count": -1}]:
            with self.assertRaises(ValidationError): PredictRequest(**values)


if __name__ == "__main__":
    unittest.main()
