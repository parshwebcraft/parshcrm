"""Tests for the Customer -> Sale -> Payment -> Expense business layer and role-based scoping."""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lead-pipeline-pro-21.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "owner@demo.com", "password": "password123"}
SALES1 = {"email": "sales1@demo.com", "password": "password123"}
SALES2 = {"email": "sales2@demo.com", "password": "password123"}


@pytest.fixture(scope="module")
def owner_client():
    token = requests.post(f"{API}/auth/login", json=OWNER, timeout=15).json()["token"]
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def sales1_client():
    token = requests.post(f"{API}/auth/login", json=SALES1, timeout=15).json()["token"]
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def sales2_client():
    token = requests.post(f"{API}/auth/login", json=SALES2, timeout=15).json()["token"]
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def sales1_id():
    return requests.post(f"{API}/auth/login", json=SALES1, timeout=15).json()["user"]["id"]


class TestCustomers:
    def test_owner_sees_all_customers(self, owner_client):
        r = owner_client.get(f"{API}/customers", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 50

    def test_sales_sees_only_own_customers(self, sales1_client, sales1_id):
        r = sales1_client.get(f"{API}/customers", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert all(c["assigned_to"] == sales1_id for c in rows)

    def test_create_and_fetch_customer_360(self, owner_client):
        payload = {"name": f"TEST_Cust_{uuid.uuid4().hex[:6]}", "company": "TEST Co", "phone": "+91 90000 11111"}
        r = owner_client.post(f"{API}/customers", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        cust = r.json()
        r2 = owner_client.get(f"{API}/customers/{cust['id']}", timeout=15)
        assert r2.status_code == 200
        data = r2.json()
        assert data["customer"]["id"] == cust["id"]
        assert "sales" in data and "payments" in data and "timeline" in data


class TestSalesAndPayments:
    def test_create_sale_computes_totals(self, owner_client):
        cust = owner_client.post(f"{API}/customers", json={"name": f"TEST_{uuid.uuid4().hex[:6]}"}, timeout=15).json()
        payload = {
            "customer_id": cust["id"], "product_service": "Test Package",
            "sale_amount": 100000, "cost_amount": 60000, "discount": 5000, "tax": 17100,
        }
        r = owner_client.post(f"{API}/sales", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        sale = r.json()
        # subtotal = 100000 - 5000 = 95000; final = 95000 + 17100 = 112100
        assert sale["subtotal"] == 95000
        assert sale["final_amount"] == 112100
        assert sale["gross_profit"] == 40000  # 100000 - 60000
        assert sale["pending_amount"] == 112100  # nothing paid yet
        assert sale["status"] in ("Pending", "Confirmed")

    def test_payment_updates_sale_balance(self, owner_client):
        cust = owner_client.post(f"{API}/customers", json={"name": f"TEST_{uuid.uuid4().hex[:6]}"}, timeout=15).json()
        sale = owner_client.post(f"{API}/sales", json={
            "customer_id": cust["id"], "sale_amount": 50000, "cost_amount": 20000,
        }, timeout=15).json()
        assert sale["pending_amount"] == 50000

        pay = owner_client.post(f"{API}/payments", json={
            "sale_id": sale["id"], "amount": 30000, "payment_method": "UPI",
        }, timeout=15)
        assert pay.status_code == 200, pay.text

        updated = owner_client.get(f"{API}/sales/{sale['id']}", timeout=15).json()
        assert updated["paid_amount"] == 30000
        assert updated["pending_amount"] == 20000
        assert updated["status"] == "Partially Paid" or updated["status"] == "Partial"

        pay2 = owner_client.post(f"{API}/payments", json={
            "sale_id": sale["id"], "amount": 20000, "payment_method": "Cash",
        }, timeout=15)
        assert pay2.status_code == 200
        final = owner_client.get(f"{API}/sales/{sale['id']}", timeout=15).json()
        assert final["pending_amount"] == 0
        assert final["status"] == "Paid"

    def test_sales_scoped_by_role(self, sales1_client, sales1_id):
        r = sales1_client.get(f"{API}/sales", timeout=15)
        assert r.status_code == 200
        assert all(s["assigned_to"] == sales1_id for s in r.json())


class TestExpensesOwnerOnly:
    def test_owner_can_list_expenses(self, owner_client):
        r = owner_client.get(f"{API}/expenses", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 30

    def test_salesperson_cannot_access_expenses(self, sales1_client):
        r = sales1_client.get(f"{API}/expenses", timeout=15)
        assert r.status_code == 403

    def test_create_expense_and_it_appears(self, owner_client):
        payload = {"category": "Software", "description": "TEST expense", "amount": 4321}
        r = owner_client.post(f"{API}/expenses", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["amount"] == 4321


class TestDashboards:
    def test_owner_dashboard_shape(self, owner_client):
        r = owner_client.get(f"{API}/dashboard/owner", params={"range": "year"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ("total_revenue", "total_sales", "total_expenses", "net_profit", "pending_payments", "total_leads", "won_deals", "conversion_rate"):
            assert k in data["kpis"], f"missing KPI {k}"
        assert len(data["revenue_trend"]) == 6
        assert isinstance(data["salesperson_table"], list)

    def test_salesperson_cannot_access_owner_dashboard(self, sales1_client):
        r = sales1_client.get(f"{API}/dashboard/owner", timeout=15)
        assert r.status_code == 403

    def test_dashboard_me_works_for_any_role(self, sales1_client, owner_client):
        r1 = sales1_client.get(f"{API}/dashboard/me", timeout=15)
        assert r1.status_code == 200
        assert "my_sales" in r1.json()["kpis"]
        r2 = owner_client.get(f"{API}/dashboard/me", timeout=15)
        assert r2.status_code == 200

    def test_two_salespeople_see_different_data(self, sales1_client, sales2_client):
        d1 = sales1_client.get(f"{API}/dashboard/me", params={"range": "year"}, timeout=15).json()
        d2 = sales2_client.get(f"{API}/dashboard/me", params={"range": "year"}, timeout=15).json()
        # Their own-leads counts should reflect distinct assignments (not both zero and not identical
        # unless the underlying data genuinely matches, which is not the case for this seed).
        assert d1["kpis"]["my_leads"] != d2["kpis"]["my_leads"] or d1["kpis"]["my_leads"] == 0


class TestLeadConvertAndBulk:
    def test_convert_lead_to_customer(self, owner_client):
        lead = owner_client.post(f"{API}/leads", json={"name": f"TEST_Lead_{uuid.uuid4().hex[:6]}", "company": "TEST Co"}, timeout=15).json()
        r = owner_client.post(f"{API}/leads/{lead['id']}/convert", timeout=15)
        assert r.status_code == 200, r.text
        customer = r.json()
        assert customer["lead_id"] == lead["id"]
        assert customer["name"] == lead["name"]

    def test_bulk_status_update(self, owner_client):
        ids = []
        for _ in range(3):
            lead = owner_client.post(f"{API}/leads", json={"name": f"TEST_Bulk_{uuid.uuid4().hex[:6]}"}, timeout=15).json()
            ids.append(lead["id"])
        r = owner_client.post(f"{API}/leads/bulk", json={"ids": ids, "status": "Contacted"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["updated"] == 3
        for lid in ids:
            lead = owner_client.get(f"{API}/leads/{lid}", timeout=15).json()
            assert lead["status"] == "Contacted"


class TestProfile:
    def test_get_and_update_own_profile(self, sales1_client):
        me = sales1_client.get(f"{API}/auth/me", timeout=15).json()
        original_phone = me["phone"]
        r = sales1_client.put(f"{API}/auth/me", json={"phone": "+91 90000 99999"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["phone"] == "+91 90000 99999"
        # restore
        sales1_client.put(f"{API}/auth/me", json={"phone": original_phone}, timeout=15)

    def test_salesperson_cannot_use_employee_patch_on_self(self, sales1_client, sales1_id):
        # /employees/{id} PATCH is admin/manager only — a salesperson must use /auth/me instead
        r = sales1_client.put(f"{API}/employees/{sales1_id}", json={"name": "Hacked"}, timeout=15)
        assert r.status_code == 403

    def test_change_password_wrong_current_rejected(self, sales1_client):
        r = sales1_client.post(f"{API}/auth/change-password", json={
            "current_password": "wrong-password", "new_password": "newpass123",
        }, timeout=15)
        assert r.status_code == 400

    def test_change_password_roundtrip(self):
        # Use a fresh session so we don't disturb the shared sales1 fixture's password
        login = requests.post(f"{API}/auth/login", json=SALES1, timeout=15).json()
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {login['token']}"})
        r = s.post(f"{API}/auth/change-password", json={
            "current_password": "password123", "new_password": "temppass456",
        }, timeout=15)
        assert r.status_code == 200
        relogin = requests.post(f"{API}/auth/login", json={"email": SALES1["email"], "password": "temppass456"}, timeout=15)
        assert relogin.status_code == 200
        # restore original password
        s2 = requests.Session()
        s2.headers.update({"Authorization": f"Bearer {relogin.json()['token']}"})
        s2.post(f"{API}/auth/change-password", json={
            "current_password": "temppass456", "new_password": "password123",
        }, timeout=15)
