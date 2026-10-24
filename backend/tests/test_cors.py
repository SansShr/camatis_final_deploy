import unittest

from fastapi.testclient import TestClient
from backend.main import app


class BrowserApiAccessTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.origin = "https://camatis-final-frontend.onrender.com"

    def test_frontend_can_read_health_directly(self):
        response = self.client.get("/api/health", headers={"Origin": self.origin})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], self.origin)
        self.assertIn("Retry-After", response.headers["access-control-expose-headers"])

    def test_prediction_json_preflight_is_allowed(self):
        response = self.client.options("/api/predict", headers={
            "Origin": self.origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], self.origin)

    def test_unrelated_site_is_not_added_to_browser_allowlist(self):
        response = self.client.options("/api/predict", headers={
            "Origin": "https://unrelated.example",
            "Access-Control-Request-Method": "POST",
        })
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)
