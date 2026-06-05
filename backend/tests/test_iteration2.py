"""Iteration 2: CSV import, documents (object storage), employee stats."""
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lead-pipeline-pro-21.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@facetscrm.com", "password": "password123"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}"})
    return s


# -------------------- CSV Import --------------------
class TestCSVImport:
    def test_import_csv_valid_and_invalid(self, admin_client):
        marker = uuid.uuid4().hex[:6]
        csv_content = (
            "name,phone,email,company,city,source,status,budget\n"
            f"TEST_Imp_{marker}_1,+91 91111 11111,t1@imp.in,Imp Co A,Mumbai,Website,New,50000\n"
            ",no name row,bad@imp.in,Bad Co,Delhi,Website,New,1000\n"
            f"TEST_Imp_{marker}_2,+91 92222 22222,t2@imp.in,Imp Co B,Pune,LinkedIn,Contacted,75000\n"
        )
        files = {"file": ("leads.csv", io.BytesIO(csv_content.encode()), "text/csv")}
        r = admin_client.post(f"{API}/leads/import", files=files, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["inserted"] == 2
        assert data["skipped"] == 1
        assert isinstance(data["errors"], list) and len(data["errors"]) >= 1
        assert "missing name" in data["errors"][0].lower()

        # Verify inserted leads appear in GET /api/leads
        leads = admin_client.get(f"{API}/leads?search=TEST_Imp_{marker}", timeout=15).json()
        names = [l["name"] for l in leads]
        assert f"TEST_Imp_{marker}_1" in names
        assert f"TEST_Imp_{marker}_2" in names
        # cleanup
        for l in leads:
            admin_client.delete(f"{API}/leads/{l['id']}", timeout=10)

    def test_import_rejects_non_csv(self, admin_client):
        files = {"file": ("not.txt", io.BytesIO(b"hello"), "text/plain")}
        r = admin_client.post(f"{API}/leads/import", files=files, timeout=15)
        assert r.status_code == 400

    def test_import_requires_auth(self):
        files = {"file": ("x.csv", io.BytesIO(b"name\nTEST"), "text/csv")}
        r = requests.post(f"{API}/leads/import", files=files, timeout=15)
        assert r.status_code in (401, 403)


# -------------------- Documents --------------------
class TestDocuments:
    @pytest.fixture(scope="class")
    def test_lead_id(self, admin_client):
        # Pick an existing seeded lead
        leads = admin_client.get(f"{API}/leads?limit=1", timeout=15).json()
        assert leads
        return leads[0]["id"]

    def test_upload_list_download_delete(self, admin_client, admin_token, test_lead_id):
        body = b"PDFDATA_" + uuid.uuid4().hex.encode()
        files = {"file": ("test_doc.pdf", io.BytesIO(body), "application/pdf")}
        r = admin_client.post(f"{API}/leads/{test_lead_id}/documents", files=files, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()
        for k in ("id", "storage_path", "filename", "size", "content_type"):
            assert k in doc, f"missing key {k}"
        assert doc["filename"] == "test_doc.pdf"
        assert doc["size"] == len(body)
        assert "_id" not in doc
        doc_id = doc["id"]

        # LIST
        lst = admin_client.get(f"{API}/leads/{test_lead_id}/documents", timeout=15)
        assert lst.status_code == 200
        ids = [d["id"] for d in lst.json()]
        assert doc_id in ids
        # uploader_name should be enriched
        target = next(d for d in lst.json() if d["id"] == doc_id)
        assert target.get("uploader_name")

        # DOWNLOAD via ?auth= query
        dl = requests.get(f"{API}/documents/{doc_id}/download?auth={admin_token}", timeout=30)
        assert dl.status_code == 200, dl.text
        assert dl.content == body
        assert "pdf" in dl.headers.get("content-type", "").lower()

        # DOWNLOAD via Authorization header
        dl2 = requests.get(
            f"{API}/documents/{doc_id}/download",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert dl2.status_code == 200
        assert dl2.content == body

        # DOWNLOAD without auth fails
        dl3 = requests.get(f"{API}/documents/{doc_id}/download", timeout=15)
        assert dl3.status_code == 401

        # DELETE soft-deletes
        d = admin_client.delete(f"{API}/documents/{doc_id}", timeout=15)
        assert d.status_code == 200

        # LIST should no longer show it
        lst2 = admin_client.get(f"{API}/leads/{test_lead_id}/documents", timeout=15)
        assert doc_id not in [x["id"] for x in lst2.json()]

        # download after delete → 404
        dl4 = requests.get(f"{API}/documents/{doc_id}/download?auth={admin_token}", timeout=15)
        assert dl4.status_code == 404

    def test_upload_to_unknown_lead_404(self, admin_client):
        files = {"file": ("x.txt", io.BytesIO(b"hi"), "text/plain")}
        r = admin_client.post(f"{API}/leads/nonexistent-id/documents", files=files, timeout=15)
        assert r.status_code == 404


# -------------------- Employee Stats --------------------
class TestEmployeeStats:
    def test_employee_stats_shape(self, admin_client):
        emps = admin_client.get(f"{API}/employees", timeout=15).json()
        assert emps
        # Pick an emp that owns leads from the performance report if possible
        perf = admin_client.get(f"{API}/reports/employee-performance", timeout=15).json()
        emp_id = perf[0]["user_id"] if perf else emps[0]["id"]

        r = admin_client.get(f"{API}/employees/{emp_id}/stats", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()

        assert "employee" in data and data["employee"]["id"] == emp_id
        assert "password_hash" not in data["employee"]

        totals = data["totals"]
        required = [
            "total_leads", "won", "lost", "conversion", "revenue_won",
            "pipeline_value", "calls_total", "calls_connected", "connect_rate",
            "talk_time_seconds", "tasks_pending", "tasks_done",
        ]
        for k in required:
            assert k in totals, f"missing totals key {k}"

        # by_status preserves 8 stages
        by_status = data["by_status"]
        assert isinstance(by_status, list) and len(by_status) == 8
        statuses = [b["status"] for b in by_status]
        assert statuses == ["New", "Contacted", "Interested", "Follow Up",
                            "Proposal Sent", "Negotiation", "Won", "Lost"]

        assert isinstance(data["recent_activity"], list)
        assert isinstance(data["top_leads"], list)

    def test_employee_stats_404(self, admin_client):
        r = admin_client.get(f"{API}/employees/nonexistent/stats", timeout=10)
        assert r.status_code == 404
