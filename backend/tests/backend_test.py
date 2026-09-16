"""Backend integration tests for ParshCRM."""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lead-pipeline-pro-21.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "owner@demo.com", "password": "password123"}
SALES = {"email": "sales1@demo.com", "password": "password123"}


# -------------------- Fixtures --------------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s


# -------------------- Auth --------------------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == ADMIN["email"]
        assert data["user"]["role"] == "admin"

    def test_login_sales(self):
        r = requests.post(f"{API}/auth/login", json=SALES, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["role"] in ("sales", "manager", "admin")

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_login_unknown_user(self):
        r = requests.post(f"{API}/auth/login", json={"email": "nope@x.com", "password": "x"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, admin_client):
        r = admin_client.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)


# -------------------- Leads --------------------
class TestLeads:
    def test_list_leads(self, admin_client):
        r = admin_client.get(f"{API}/leads", timeout=15)
        assert r.status_code == 200
        leads = r.json()
        assert isinstance(leads, list)
        assert len(leads) >= 50, f"Expected seeded leads, got {len(leads)}"
        # check no Mongo _id leak
        assert "_id" not in leads[0]

    def test_create_and_get_lead(self, admin_client):
        payload = {"name": f"TEST_Lead_{uuid.uuid4().hex[:6]}", "company": "TEST Co", "phone": "+91 99999 12345"}
        r = admin_client.post(f"{API}/leads", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["name"] == payload["name"]
        assert created["company"] == "TEST Co"
        assert "id" in created
        assert "_id" not in created
        lead_id = created["id"]

        # GET back
        g = admin_client.get(f"{API}/leads/{lead_id}", timeout=15)
        assert g.status_code == 200
        assert g.json()["name"] == payload["name"]

        # update status
        u = admin_client.put(f"{API}/leads/{lead_id}", json={"status": "Won", "budget": 75000}, timeout=15)
        assert u.status_code == 200
        assert u.json()["status"] == "Won"
        assert u.json()["score"] == 100

        # timeline includes status change
        t = admin_client.get(f"{API}/leads/{lead_id}/timeline", timeout=15)
        assert t.status_code == 200
        types = [a["type"] for a in t.json()]
        assert "status_change" in types

        # cleanup
        admin_client.delete(f"{API}/leads/{lead_id}", timeout=15)


# -------------------- Dashboard / Reports --------------------
class TestDashboardReports:
    def test_dashboard_stats(self, admin_client):
        r = admin_client.get(f"{API}/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_leads", "new_today", "calls_today", "pending_followups",
                  "won_deals", "lost_deals", "revenue_pipeline", "revenue_won"):
            assert k in d, f"missing key {k}"
        assert d["total_leads"] >= 50

    def test_lead_sources(self, admin_client):
        r = admin_client.get(f"{API}/reports/lead-sources", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) > 0

    def test_status_funnel(self, admin_client):
        r = admin_client.get(f"{API}/reports/status-funnel", timeout=15)
        assert r.status_code == 200
        statuses = [x["status"] for x in r.json()]
        assert "New" in statuses and "Won" in statuses

    def test_weekly_leads(self, admin_client):
        r = admin_client.get(f"{API}/reports/weekly-leads", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) == 8

    def test_employee_performance(self, admin_client):
        r = admin_client.get(f"{API}/reports/employee-performance", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# -------------------- Tasks --------------------
class TestTasks:
    def test_list_tasks(self, admin_client):
        r = admin_client.get(f"{API}/tasks", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_task_crud(self, admin_client):
        c = admin_client.post(f"{API}/tasks", json={"title": "TEST_Task", "priority": "High"}, timeout=15)
        assert c.status_code == 200
        tid = c.json()["id"]

        u = admin_client.put(f"{API}/tasks/{tid}", json={"status": "Completed"}, timeout=15)
        assert u.status_code == 200

        d = admin_client.delete(f"{API}/tasks/{tid}", timeout=15)
        assert d.status_code == 200


# -------------------- Calls + AI --------------------
class TestCallsAI:
    def test_calls_list(self, admin_client):
        r = admin_client.get(f"{API}/calls", timeout=15)
        assert r.status_code == 200

    def test_call_create_and_ai_summary(self, admin_client):
        leads = admin_client.get(f"{API}/leads?limit=1", timeout=15).json()
        assert leads, "No leads to associate call with"
        lead_id = leads[0]["id"]

        c = admin_client.post(f"{API}/calls", json={
            "lead_id": lead_id, "duration": 120, "outcome": "Connected",
            "notes": "Discussed pricing and timeline. Customer is interested in premium package.",
        }, timeout=15)
        assert c.status_code == 200, c.text
        call_id = c.json()["id"]

        # AI summary — uses real Claude, can take a while
        s = admin_client.post(f"{API}/calls/{call_id}/ai-summary", json={}, timeout=60)
        assert s.status_code == 200, f"AI summary failed: {s.status_code} {s.text}"
        data = s.json()
        # The AI summary endpoint should set summary, sentiment, score, next_action
        # Accept either flat or nested as long as not failed
        assert isinstance(data, dict)
        # At least one of these fields should be populated
        assert any(k in data for k in ("summary", "sentiment", "lead_score", "next_action"))


# -------------------- WhatsApp --------------------
class TestWhatsApp:
    def test_conversations(self, admin_client):
        r = admin_client.get(f"{API}/whatsapp/conversations", timeout=20)
        assert r.status_code == 200
        convos = r.json()
        assert isinstance(convos, list)
        assert len(convos) > 0

    def test_send_and_fetch(self, admin_client):
        convos = admin_client.get(f"{API}/whatsapp/conversations", timeout=20).json()
        assert convos
        lead_id = convos[0]["lead_id"]
        send = admin_client.post(f"{API}/whatsapp/send", json={"lead_id": lead_id, "text": "TEST_outbound"}, timeout=15)
        assert send.status_code == 200
        msgs = admin_client.get(f"{API}/whatsapp/messages?lead_id={lead_id}", timeout=15)
        assert msgs.status_code == 200
        assert any(m["text"] == "TEST_outbound" for m in msgs.json())


# -------------------- Employees --------------------
class TestEmployees:
    def test_list_employees(self, admin_client):
        r = admin_client.get(f"{API}/employees", timeout=15)
        assert r.status_code == 200
        emps = r.json()
        assert len(emps) >= 3
        assert all("password_hash" not in e for e in emps)

    def test_create_employee_admin(self, admin_client):
        email = f"test_{uuid.uuid4().hex[:8]}@demo.com"
        r = admin_client.post(f"{API}/employees", json={
            "name": "TEST_Employee", "email": email, "role": "sales", "password": "password123",
        }, timeout=15)
        assert r.status_code == 200, r.text
        emp = r.json()
        assert emp["email"] == email
        assert "password_hash" not in emp
        # cleanup
        admin_client.delete(f"{API}/employees/{emp['id']}", timeout=15)

    def test_sales_cannot_create_employee(self):
        login = requests.post(f"{API}/auth/login", json=SALES, timeout=15).json()
        h = {"Authorization": f"Bearer {login['token']}", "Content-Type": "application/json"}
        r = requests.post(f"{API}/employees", json={
            "name": "X", "email": f"x_{uuid.uuid4().hex[:6]}@x.com", "role": "sales",
        }, headers=h, timeout=15)
        assert r.status_code == 403


# -------------------- Notifications / Settings --------------------
class TestMisc:
    def test_notifications(self, admin_client):
        r = admin_client.get(f"{API}/notifications", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_settings_get(self, admin_client):
        r = admin_client.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200

    def test_settings_update_admin(self, admin_client):
        r = admin_client.put(f"{API}/settings", json={"company_name": "ParshWebCraft"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("company_name") == "ParshWebCraft"

    def test_settings_update_non_admin(self):
        login = requests.post(f"{API}/auth/login", json=SALES, timeout=15).json()
        h = {"Authorization": f"Bearer {login['token']}", "Content-Type": "application/json"}
        r = requests.put(f"{API}/settings", json={"company_name": "Hack"}, headers=h, timeout=15)
        assert r.status_code == 403
