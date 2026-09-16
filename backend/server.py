"""ParshCRM - FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import csv
import io
import logging
import mimetypes
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, FastAPI, File, Form, Header, HTTPException, Query, Response, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from auth import (
    create_access_token,
    decode_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from ai_summary import generate_call_summary
from constants import (
    CALL_OUTCOMES,
    CUSTOMER_STATUSES,
    EXPENSE_CATEGORIES,
    LEAD_STATUSES,
    OWNER_ROLES,
    PAYMENT_METHODS,
    SALE_STATUSES,
)
from finance import achievement_pct, compute_sale_totals, derive_payment_status
from seed import seed_all
from storage import APP_NAME as STORAGE_APP, get_object, init_storage, put_object

# -------------------------------------------------------------------------
# DB & app setup
# -------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="ParshCRM")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("parshcrm")


# -------------------------------------------------------------------------
# Models
# -------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = ""
    avatar: Optional[str] = ""


class LoginOut(BaseModel):
    token: str
    user: UserOut


class LeadIn(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    company: str = ""
    website: str = ""
    city: str = ""
    state: str = ""
    industry: str = ""
    source: str = "Website"
    status: str = "New"
    priority: str = "Medium"
    product_service: str = ""
    next_follow_up: Optional[str] = None
    assigned_to: Optional[str] = None
    budget: float = 0
    requirements: str = ""
    notes: str = ""


class LeadPatch(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    industry: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    product_service: Optional[str] = None
    next_follow_up: Optional[str] = None
    assigned_to: Optional[str] = None
    budget: Optional[float] = None
    requirements: Optional[str] = None
    notes: Optional[str] = None


class CustomerIn(BaseModel):
    name: str
    company: str = ""
    phone: str = ""
    email: str = ""
    city: str = ""
    state: str = ""
    industry: str = ""
    source: str = "Website"
    status: str = "Prospect"
    assigned_to: Optional[str] = None
    lead_id: Optional[str] = None
    notes: str = ""


class CustomerPatch(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    industry: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class SaleIn(BaseModel):
    customer_id: str
    assigned_to: Optional[str] = None
    product_service: str = ""
    quantity: int = 1
    sale_amount: float = 0
    cost_amount: float = 0
    discount: float = 0
    tax: float = 0
    payment_received: float = 0
    due_date: Optional[str] = None
    sale_date: Optional[str] = None
    status: Optional[str] = None
    notes: str = ""


class SalePatch(BaseModel):
    product_service: Optional[str] = None
    quantity: Optional[int] = None
    sale_amount: Optional[float] = None
    cost_amount: Optional[float] = None
    discount: Optional[float] = None
    tax: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class PaymentIn(BaseModel):
    sale_id: str
    amount: float
    payment_date: Optional[str] = None
    payment_method: str = "Cash"
    notes: str = ""


class ExpenseIn(BaseModel):
    category: str = "Other"
    description: str = ""
    amount: float = 0
    date: Optional[str] = None
    payment_method: str = "Cash"
    notes: str = ""


class ExpensePatch(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class TaskIn(BaseModel):
    title: str
    description: str = ""
    type: str = "Follow-up"
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "Medium"
    due_date: Optional[str] = None
    status: str = "Pending"


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None


class CallIn(BaseModel):
    lead_id: str
    duration: int = 0
    outcome: str = "Connected"
    notes: str = ""


class WhatsAppIn(BaseModel):
    lead_id: str
    text: str


class EmployeeIn(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    role: str = "sales"
    password: str = "password123"


class EmployeePatch(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    monthly_target: Optional[float] = None


class SettingsPatch(BaseModel):
    company_name: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    logo_url: Optional[str] = None
    integrations: Optional[dict] = None


class AISummaryIn(BaseModel):
    call_id: Optional[str] = None
    lead_id: Optional[str] = None
    notes: str = ""
    duration: int = 0
    outcome: str = "Connected"


# -------------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------------
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _score(lead: dict) -> int:
    s = 30
    if (lead.get("budget") or 0) > 50000:
        s += 20
    if lead.get("source") in ("Website", "LinkedIn"):
        s += 10
    if lead.get("status") in ("Proposal Sent", "Negotiation"):
        s += 25
    if lead.get("status") == "Won":
        return 100
    if lead.get("status") == "Lost":
        return max(5, s - 30)
    return max(0, min(100, s))


def _clean(d: dict) -> dict:
    d.pop("_id", None)
    return d


def is_owner(user: dict) -> bool:
    """Owner-level roles (admin/manager) see the whole business; 'sales' is scoped to their own records."""
    return user.get("role") in OWNER_ROLES


def _scope(user: dict, field: str = "assigned_to") -> dict:
    """Mongo filter fragment: {} for owner-level users, {field: my_id} for a salesperson."""
    return {} if is_owner(user) else {field: user["id"]}


RANGE_DAYS = {"today": 1, "week": 7, "month": 30, "quarter": 90, "year": 365}


def _range_bounds(range_key: Optional[str], start: Optional[str], end: Optional[str]) -> tuple:
    """Returns (start_iso, end_iso) for a dashboard/report date filter. Custom range wins if given."""
    now = datetime.now(timezone.utc)
    if start or end:
        return start or "0000-01-01", end or now.isoformat()
    days = RANGE_DAYS.get(range_key or "month", 30)
    if range_key == "today":
        from_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        from_dt = now - timedelta(days=days)
    return from_dt.isoformat(), now.isoformat()


def _in_range(iso_value: Optional[str], start: str, end: str) -> bool:
    if not iso_value:
        return False
    return start <= iso_value <= end


def _month_key(iso_value: str) -> str:
    return iso_value[:7]  # "YYYY-MM"


# -------------------------------------------------------------------------
# Auth routes
# -------------------------------------------------------------------------
@api.post("/auth/login", response_model=LoginOut)
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "phone": user.get("phone", ""),
            "avatar": user.get("avatar", ""),
        },
    }


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "phone": user.get("phone", ""),
        "avatar": user.get("avatar", ""),
    }


# -------------------------------------------------------------------------
# Leads
# -------------------------------------------------------------------------
@api.get("/leads")
async def list_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    search: Optional[str] = None,
    limit: int = 300,
    user: dict = Depends(get_current_user),
):
    q: dict = {**_scope(user)}
    if status:
        q["status"] = status
    if source:
        q["source"] = source
    if priority:
        q["priority"] = priority
    if assigned_to and is_owner(user):
        q["assigned_to"] = assigned_to
    if min_value is not None or max_value is not None:
        q["budget"] = {}
        if min_value is not None:
            q["budget"]["$gte"] = min_value
        if max_value is not None:
            q["budget"]["$lte"] = max_value
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    items = await db.leads.find(q, {"_id": 0}).sort("updated_at", -1).to_list(limit)
    return items


@api.post("/leads/bulk")
async def bulk_update_leads(payload: dict = Body(...), user: dict = Depends(get_current_user)):
    """Bulk status-change or reassign a set of lead ids. Body: {ids: [...], status?: str, assigned_to?: str}."""
    ids = payload.get("ids") or []
    if not ids:
        raise HTTPException(400, "No leads selected")
    updates: dict = {"updated_at": _now(), "last_activity": _now()}
    if payload.get("status"):
        updates["status"] = payload["status"]
    if payload.get("assigned_to") and is_owner(user):
        updates["assigned_to"] = payload["assigned_to"]
    q = {"id": {"$in": ids}, **_scope(user)}
    result = await db.leads.update_many(q, {"$set": updates})
    return {"updated": result.modified_count}


@api.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, **_scope(user)}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    return lead


@api.post("/leads")
async def create_lead(payload: LeadIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "created_at": _now(),
        "updated_at": _now(),
        "last_activity": _now(),
        "assigned_to": doc.get("assigned_to") or user["id"],
    })
    doc["score"] = _score(doc)
    await db.leads.insert_one(doc)
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "lead_id": doc["id"],
        "user_id": user["id"],
        "type": "note",
        "description": f"Lead created by {user['name']}",
        "created_at": _now(),
    })
    return _clean(doc)


@api.put("/leads/{lead_id}")
async def update_lead(lead_id: str, payload: LeadPatch, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, **_scope(user)})
    if not lead:
        raise HTTPException(404, "Lead not found")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = _now()
    updates["last_activity"] = _now()
    merged = {**lead, **updates}
    updates["score"] = _score(merged)
    await db.leads.update_one({"id": lead_id}, {"$set": updates})

    if "status" in updates and updates["status"] != lead.get("status"):
        await db.activities.insert_one({
            "id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "user_id": user["id"],
            "type": "status_change",
            "description": f"Status changed from {lead.get('status')} to {updates['status']}",
            "created_at": _now(),
        })

    return _clean({**lead, **updates})


@api.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(require_role("admin", "manager"))):
    result = await db.leads.delete_one({"id": lead_id})
    if not result.deleted_count:
        raise HTTPException(404, "Lead not found")
    await db.activities.delete_many({"lead_id": lead_id})
    return {"ok": True}


@api.get("/leads/{lead_id}/timeline")
async def lead_timeline(lead_id: str, user: dict = Depends(get_current_user)):
    acts = await db.activities.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return acts


@api.post("/leads/{lead_id}/convert")
async def convert_lead(lead_id: str, user: dict = Depends(get_current_user)):
    """Convert a lead into a Customer record, preserving the link for the 360 profile."""
    lead = await db.leads.find_one({"id": lead_id, **_scope(user)})
    if not lead:
        raise HTTPException(404, "Lead not found")
    existing = await db.customers.find_one({"lead_id": lead_id})
    if existing:
        return _clean(existing)
    customer = {
        "id": str(uuid.uuid4()),
        "name": lead["name"],
        "company": lead.get("company", ""),
        "phone": lead.get("phone", ""),
        "email": lead.get("email", ""),
        "city": lead.get("city", ""),
        "state": lead.get("state", ""),
        "industry": lead.get("industry", ""),
        "source": lead.get("source", "Website"),
        "assigned_to": lead.get("assigned_to"),
        "status": "Customer" if lead.get("status") == "Won" else "Prospect",
        "lead_id": lead_id,
        "notes": "",
        "created_at": _now(),
        "updated_at": _now(),
        "last_activity": _now(),
    }
    await db.customers.insert_one(customer)
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "user_id": user["id"],
        "type": "note",
        "description": f"Converted to customer by {user['name']}",
        "created_at": _now(),
    })
    return _clean(customer)


# ---- CSV Import ----------------------------------------------------------
CSV_FIELDS = ["name", "phone", "email", "company", "website", "city", "state",
              "industry", "source", "status", "budget", "requirements"]


@api.post("/leads/import")
async def import_leads_csv(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Bulk import leads from a CSV file. Header row required."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only .csv files are accepted")
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    inserted = 0
    skipped = 0
    errors: List[str] = []
    docs = []
    for i, row in enumerate(reader, start=2):  # row 1 is header
        name = (row.get("name") or "").strip()
        if not name:
            skipped += 1
            errors.append(f"Row {i}: missing name")
            continue
        try:
            budget = float(row.get("budget") or 0)
        except ValueError:
            budget = 0
        doc = {
            "id": str(uuid.uuid4()),
            "name": name,
            "phone": (row.get("phone") or "").strip(),
            "email": (row.get("email") or "").strip(),
            "company": (row.get("company") or "").strip(),
            "website": (row.get("website") or "").strip(),
            "city": (row.get("city") or "").strip(),
            "state": (row.get("state") or "").strip(),
            "industry": (row.get("industry") or "").strip(),
            "source": (row.get("source") or "Website").strip() or "Website",
            "status": (row.get("status") or "New").strip() or "New",
            "assigned_to": user["id"],
            "budget": budget,
            "requirements": (row.get("requirements") or "").strip(),
            "notes": "",
            "score": 0,
            "created_at": _now(),
            "updated_at": _now(),
            "last_activity": _now(),
        }
        doc["score"] = _score(doc)
        docs.append(doc)

    if docs:
        await db.leads.insert_many(docs)
        inserted = len(docs)
        await db.activities.insert_one({
            "id": str(uuid.uuid4()),
            "lead_id": None,
            "user_id": user["id"],
            "type": "import",
            "description": f"Imported {inserted} leads from CSV ({file.filename})",
            "created_at": _now(),
        })

    return {"inserted": inserted, "skipped": skipped, "errors": errors[:10]}


# ---- Documents (object storage) -----------------------------------------
MAX_DOC_BYTES = 15 * 1024 * 1024  # 15 MB

MIME_FALLBACK = {
    "pdf": "application/pdf", "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "gif": "image/gif", "webp": "image/webp",
    "csv": "text/csv", "txt": "text/plain",
}


@api.post("/leads/{lead_id}/documents")
async def upload_document(
    lead_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(404, "Lead not found")
    data = await file.read()
    if len(data) > MAX_DOC_BYTES:
        raise HTTPException(413, "File too large (max 15 MB)")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin").lower()
    content_type = file.content_type or MIME_FALLBACK.get(ext) or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
    storage_path = f"{STORAGE_APP}/leads/{lead_id}/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(storage_path, data, content_type)
    except Exception as exc:  # noqa: BLE001
        logger.error("Upload failed: %s", exc)
        raise HTTPException(500, "Upload failed — object storage unavailable")

    doc = {
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "uploaded_by": user["id"],
        "filename": file.filename,
        "storage_path": result.get("path", storage_path),
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": _now(),
    }
    await db.documents.insert_one(doc)
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "user_id": user["id"],
        "type": "document",
        "description": f"Uploaded document: {file.filename}",
        "created_at": _now(),
    })
    return _clean(doc)


@api.get("/leads/{lead_id}/documents")
async def list_documents(lead_id: str, user: dict = Depends(get_current_user)):
    docs = await db.documents.find(
        {"lead_id": lead_id, "is_deleted": False}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    # enrich uploader name
    for d in docs:
        u = await db.users.find_one({"id": d.get("uploaded_by")}, {"_id": 0, "name": 1})
        d["uploader_name"] = u["name"] if u else "Unknown"
    return docs


@api.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    authorization: Optional[str] = Header(None),
    auth: Optional[str] = Query(None),
):
    """Stream a file. Supports either Authorization header or ?auth=<token> for <a> tags."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        decode_token(token)
    except Exception:
        raise HTTPException(401, "Invalid token")

    record = await db.documents.find_one({"id": doc_id, "is_deleted": False})
    if not record:
        raise HTTPException(404, "Document not found")
    try:
        data, ct = get_object(record["storage_path"])
    except Exception as exc:  # noqa: BLE001
        logger.error("Download failed: %s", exc)
        raise HTTPException(500, "Download failed")
    return Response(
        content=data,
        media_type=record.get("content_type") or ct,
        headers={
            "Content-Disposition": f'inline; filename="{record["filename"]}"',
        },
    )


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    result = await db.documents.update_one(
        {"id": doc_id}, {"$set": {"is_deleted": True}}
    )
    if not result.matched_count:
        raise HTTPException(404, "Document not found")
    return {"ok": True}


# -------------------------------------------------------------------------
# Customers
# -------------------------------------------------------------------------
@api.get("/customers")
async def list_customers(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 300,
    user: dict = Depends(get_current_user),
):
    q: dict = {**_scope(user)}
    if status:
        q["status"] = status
    if assigned_to and is_owner(user):
        q["assigned_to"] = assigned_to
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    customers = await db.customers.find(q, {"_id": 0}).sort("last_activity", -1).to_list(limit)
    if not customers:
        return []
    ids = [c["id"] for c in customers]
    sales = await db.sales.find({"customer_id": {"$in": ids}}, {"_id": 0}).to_list(2000)
    by_customer: dict = {}
    for s in sales:
        agg = by_customer.setdefault(s["customer_id"], {"total_sales": 0.0, "pending": 0.0})
        agg["total_sales"] += s.get("final_amount", 0)
        agg["pending"] += s.get("pending_amount", 0)
    for c in customers:
        agg = by_customer.get(c["id"], {"total_sales": 0.0, "pending": 0.0})
        c["total_sales"] = round(agg["total_sales"], 2)
        c["pending_amount"] = round(agg["pending"], 2)
    return customers


@api.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id, **_scope(user)}, {"_id": 0})
    if not customer:
        raise HTTPException(404, "Customer not found")

    sales = await db.sales.find({"customer_id": customer_id}, {"_id": 0}).sort("sale_date", -1).to_list(200)
    sale_ids = [s["id"] for s in sales]
    payments = await db.payments.find({"sale_id": {"$in": sale_ids}}, {"_id": 0}).sort("payment_date", -1).to_list(500) if sale_ids else []
    calls = await db.calls.find({"lead_id": customer.get("lead_id")}, {"_id": 0}).sort("created_at", -1).to_list(50) if customer.get("lead_id") else []
    msgs = await db.whatsapp_messages.find({"lead_id": customer.get("lead_id")}, {"_id": 0}).sort("created_at", 1).to_list(200) if customer.get("lead_id") else []
    tasks = await db.tasks.find({"customer_id": customer_id}, {"_id": 0}).sort("due_date", 1).to_list(100)
    lead_activities = await db.activities.find({"lead_id": customer.get("lead_id")}, {"_id": 0}).to_list(100) if customer.get("lead_id") else []

    total_sales = round(sum(s.get("final_amount", 0) for s in sales), 2)
    pending_amount = round(sum(s.get("pending_amount", 0) for s in sales), 2)

    timeline = []
    for a in lead_activities:
        timeline.append({"type": a["type"], "description": a["description"], "date": a["created_at"]})
    for s in sales:
        timeline.append({"type": "sale", "description": f"Sale {s['sale_no']} — {s['product_service']} ({s['status']})", "date": s["sale_date"]})
    for p in payments:
        timeline.append({"type": "payment", "description": f"Payment received via {p['payment_method']}", "date": p["payment_date"]})
    timeline.sort(key=lambda x: x["date"] or "", reverse=True)

    return {
        "customer": {**customer, "total_sales": total_sales, "pending_amount": pending_amount},
        "sales": sales,
        "payments": payments,
        "calls": calls,
        "whatsapp": msgs,
        "tasks": tasks,
        "timeline": timeline,
    }


@api.post("/customers")
async def create_customer(payload: CustomerIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "assigned_to": doc.get("assigned_to") or user["id"],
        "created_at": _now(),
        "updated_at": _now(),
        "last_activity": _now(),
    })
    await db.customers.insert_one(doc)
    return _clean(doc)


@api.put("/customers/{customer_id}")
async def update_customer(customer_id: str, payload: CustomerPatch, user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id, **_scope(user)})
    if not customer:
        raise HTTPException(404, "Customer not found")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = _now()
    updates["last_activity"] = _now()
    await db.customers.update_one({"id": customer_id}, {"$set": updates})
    return _clean({**customer, **updates})


@api.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: dict = Depends(require_role("admin", "manager"))):
    result = await db.customers.delete_one({"id": customer_id})
    if not result.deleted_count:
        raise HTTPException(404, "Customer not found")
    return {"ok": True}


# -------------------------------------------------------------------------
# Sales
# -------------------------------------------------------------------------
async def _recompute_sale(sale_id: str):
    """Recompute a sale's paid/pending/status from the sum of its actual payments."""
    sale = await db.sales.find_one({"id": sale_id})
    if not sale:
        return
    agg = await db.payments.aggregate([
        {"$match": {"sale_id": sale_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    paid_amount = agg[0]["total"] if agg else 0
    totals = compute_sale_totals(sale["sale_amount"], sale["cost_amount"], sale["discount"], sale["tax"], paid_amount)
    status = sale.get("status")
    if status not in ("Draft", "Cancelled"):
        status = derive_payment_status(totals["final_amount"], paid_amount, sale.get("due_date"), _now())
    await db.sales.update_one({"id": sale_id}, {"$set": {**totals, "status": status}})
    await db.customers.update_one({"id": sale["customer_id"]}, {"$set": {"last_activity": _now()}})


@api.get("/sales")
async def list_sales(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    customer_id: Optional[str] = None,
    limit: int = 300,
    user: dict = Depends(get_current_user),
):
    q: dict = {**_scope(user)}
    if status:
        q["status"] = status
    if customer_id:
        q["customer_id"] = customer_id
    if assigned_to and is_owner(user):
        q["assigned_to"] = assigned_to
    return await db.sales.find(q, {"_id": 0}).sort("sale_date", -1).to_list(limit)


@api.get("/sales/{sale_id}")
async def get_sale(sale_id: str, user: dict = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": sale_id, **_scope(user)}, {"_id": 0})
    if not sale:
        raise HTTPException(404, "Sale not found")
    payments = await db.payments.find({"sale_id": sale_id}, {"_id": 0}).sort("payment_date", -1).to_list(100)
    return {**sale, "payments": payments}


@api.post("/sales")
async def create_sale(payload: SaleIn, user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": payload.customer_id, **_scope(user)})
    if not customer:
        raise HTTPException(404, "Customer not found")
    totals = compute_sale_totals(payload.sale_amount, payload.cost_amount, payload.discount, payload.tax, payload.payment_received)
    sale_date = payload.sale_date or _now()
    # Default payment term: 15 days out, so a freshly created sale isn't instantly "Overdue".
    due_date = payload.due_date or (datetime.fromisoformat(sale_date) + timedelta(days=15)).isoformat()
    status = payload.status or derive_payment_status(totals["final_amount"], totals["paid_amount"], due_date, _now())
    n = await db.sales.count_documents({})
    doc = {
        "id": str(uuid.uuid4()),
        "sale_no": f"INV-{1000 + n}",
        "customer_id": payload.customer_id,
        "assigned_to": payload.assigned_to or customer.get("assigned_to") or user["id"],
        "product_service": payload.product_service,
        "quantity": payload.quantity,
        "sale_amount": payload.sale_amount,
        "discount": payload.discount,
        "tax": payload.tax,
        **totals,
        "sale_date": sale_date,
        "due_date": due_date,
        "status": status,
        "notes": payload.notes,
        "created_at": _now(),
    }
    await db.sales.insert_one(doc)
    if totals["paid_amount"] > 0:
        await db.payments.insert_one({
            "id": str(uuid.uuid4()),
            "sale_id": doc["id"],
            "customer_id": payload.customer_id,
            "assigned_to": doc["assigned_to"],
            "amount": totals["paid_amount"],
            "payment_date": sale_date,
            "payment_method": "Cash",
            "collected_by": user["id"],
            "status": "Paid",
            "notes": "Recorded at sale creation",
            "created_at": _now(),
        })
    if customer.get("status") != "Customer":
        await db.customers.update_one({"id": payload.customer_id}, {"$set": {"status": "Customer"}})
    await db.customers.update_one({"id": payload.customer_id}, {"$set": {"last_activity": _now()}})
    return _clean(doc)


@api.put("/sales/{sale_id}")
async def update_sale(sale_id: str, payload: SalePatch, user: dict = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": sale_id, **_scope(user)})
    if not sale:
        raise HTTPException(404, "Sale not found")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    merged = {**sale, **updates}
    totals = compute_sale_totals(merged["sale_amount"], merged["cost_amount"], merged["discount"], merged["tax"], sale.get("paid_amount", 0))
    updates.update(totals)
    if "status" not in updates or updates.get("status") in (None,):
        updates["status"] = derive_payment_status(totals["final_amount"], totals["paid_amount"], merged.get("due_date"), _now())
    await db.sales.update_one({"id": sale_id}, {"$set": updates})
    return _clean({**sale, **updates})


@api.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str, user: dict = Depends(require_role("admin", "manager"))):
    result = await db.sales.delete_one({"id": sale_id})
    if not result.deleted_count:
        raise HTTPException(404, "Sale not found")
    await db.payments.delete_many({"sale_id": sale_id})
    return {"ok": True}


# -------------------------------------------------------------------------
# Payments
# -------------------------------------------------------------------------
@api.get("/payments")
async def list_payments(
    sale_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 300,
    user: dict = Depends(get_current_user),
):
    q: dict = {**_scope(user)}
    if sale_id:
        q["sale_id"] = sale_id
    if customer_id:
        q["customer_id"] = customer_id
    if assigned_to and is_owner(user):
        q["assigned_to"] = assigned_to
    payments = await db.payments.find(q, {"_id": 0}).sort("payment_date", -1).to_list(limit)
    return payments


@api.post("/payments")
async def create_payment(payload: PaymentIn, user: dict = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": payload.sale_id, **_scope(user)})
    if not sale:
        raise HTTPException(404, "Sale not found")
    doc = {
        "id": str(uuid.uuid4()),
        "sale_id": payload.sale_id,
        "customer_id": sale["customer_id"],
        "assigned_to": sale["assigned_to"],
        "amount": payload.amount,
        "payment_date": payload.payment_date or _now(),
        "payment_method": payload.payment_method,
        "collected_by": user["id"],
        "status": "Paid",
        "notes": payload.notes,
        "created_at": _now(),
    }
    await db.payments.insert_one(doc)
    await _recompute_sale(payload.sale_id)
    return _clean(doc)


@api.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, user: dict = Depends(require_role("admin", "manager"))):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(404, "Payment not found")
    await db.payments.delete_one({"id": payment_id})
    await _recompute_sale(payment["sale_id"])
    return {"ok": True}


# -------------------------------------------------------------------------
# Expenses (owner-level only — salespersons don't see company costs)
# -------------------------------------------------------------------------
@api.get("/expenses")
async def list_expenses(
    category: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: dict = Depends(require_role("admin", "manager")),
):
    q: dict = {}
    if category:
        q["category"] = category
    if start or end:
        q["date"] = {}
        if start:
            q["date"]["$gte"] = start
        if end:
            q["date"]["$lte"] = end
    return await db.expenses.find(q, {"_id": 0}).sort("date", -1).to_list(500)


@api.post("/expenses")
async def create_expense(payload: ExpenseIn, user: dict = Depends(require_role("admin", "manager"))):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "date": doc.get("date") or _now(),
        "added_by": user["id"],
        "created_at": _now(),
    })
    await db.expenses.insert_one(doc)
    return _clean(doc)


@api.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, payload: ExpensePatch, user: dict = Depends(require_role("admin", "manager"))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates")
    result = await db.expenses.update_one({"id": expense_id}, {"$set": updates})
    if not result.matched_count:
        raise HTTPException(404, "Expense not found")
    return {"ok": True}


@api.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(require_role("admin", "manager"))):
    result = await db.expenses.delete_one({"id": expense_id})
    if not result.deleted_count:
        raise HTTPException(404, "Expense not found")
    return {"ok": True}


# -------------------------------------------------------------------------
# Tasks
# -------------------------------------------------------------------------
@api.get("/tasks")
async def list_tasks(
    status: Optional[str] = None,
    lead_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q: dict = {**_scope(user)}
    if status:
        q["status"] = status
    if lead_id:
        q["lead_id"] = lead_id
    if assigned_to and is_owner(user):
        q["assigned_to"] = assigned_to
    return await db.tasks.find(q, {"_id": 0}).sort("due_date", 1).to_list(500)


@api.post("/tasks")
async def create_task(payload: TaskIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "created_at": _now(),
        "assigned_to": doc.get("assigned_to") or user["id"],
    })
    await db.tasks.insert_one(doc)
    return _clean(doc)


@api.put("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskPatch, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates")
    result = await db.tasks.update_one({"id": task_id}, {"$set": updates})
    if not result.matched_count:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id})
    if not result.deleted_count:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


# -------------------------------------------------------------------------
# Calls
# -------------------------------------------------------------------------
@api.get("/calls")
async def list_calls(lead_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {**_scope(user, field="user_id")}
    if lead_id:
        q["lead_id"] = lead_id
    return await db.calls.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/calls")
async def create_call(payload: CallIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "summary": "",
        "sentiment": "neutral",
        "lead_score": 50,
        "next_action": "",
        "created_at": _now(),
    })
    await db.calls.insert_one(doc)
    await db.leads.update_one({"id": payload.lead_id}, {"$set": {"last_activity": _now()}})
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "lead_id": payload.lead_id,
        "user_id": user["id"],
        "type": "call",
        "description": f"Call logged ({payload.outcome}, {payload.duration}s)",
        "created_at": _now(),
    })
    return _clean(doc)


@api.post("/calls/{call_id}/ai-summary")
async def call_ai_summary(call_id: str, user: dict = Depends(get_current_user)):
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(404, "Call not found")
    lead = await db.leads.find_one({"id": call.get("lead_id")}, {"_id": 0, "name": 1, "company": 1})
    lead_name = f"{lead.get('name', '')} ({lead.get('company', '')})" if lead else ""
    result = await generate_call_summary(
        notes=call.get("notes", ""),
        duration_sec=call.get("duration", 0),
        outcome=call.get("outcome", "Connected"),
        lead_name=lead_name,
    )
    await db.calls.update_one({"id": call_id}, {"$set": result})
    return result


@api.post("/ai/summarize")
async def ai_summarize(payload: AISummaryIn, user: dict = Depends(get_current_user)):
    lead_name = ""
    if payload.lead_id:
        lead = await db.leads.find_one({"id": payload.lead_id}, {"_id": 0, "name": 1, "company": 1})
        if lead:
            lead_name = f"{lead.get('name', '')} ({lead.get('company', '')})"
    return await generate_call_summary(
        notes=payload.notes,
        duration_sec=payload.duration,
        outcome=payload.outcome,
        lead_name=lead_name,
    )


# -------------------------------------------------------------------------
# WhatsApp
# -------------------------------------------------------------------------
@api.get("/whatsapp/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    """Return one row per lead with the latest message."""
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$lead_id",
            "last_message": {"$first": "$text"},
            "last_direction": {"$first": "$direction"},
            "last_time": {"$first": "$created_at"},
            "unread": {"$sum": {"$cond": [{"$eq": ["$direction", "in"]}, 1, 0]}},
        }},
        {"$sort": {"last_time": -1}},
        {"$limit": 100},
    ]
    rows = await db.whatsapp_messages.aggregate(pipeline).to_list(200)
    result = []
    for row in rows:
        lead = await db.leads.find_one({"id": row["_id"]}, {"_id": 0, "id": 1, "name": 1, "company": 1, "phone": 1})
        if not lead:
            continue
        result.append({
            "lead_id": row["_id"],
            "lead_name": lead["name"],
            "company": lead.get("company", ""),
            "phone": lead.get("phone", ""),
            "last_message": row["last_message"],
            "last_direction": row["last_direction"],
            "last_time": row["last_time"],
            "unread": row["unread"],
        })
    return result


@api.get("/whatsapp/messages")
async def list_messages(lead_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.whatsapp_messages.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs


@api.post("/whatsapp/send")
async def send_whatsapp(payload: WhatsAppIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "lead_id": payload.lead_id,
        "user_id": user["id"],
        "direction": "out",
        "text": payload.text,
        "status": "sent",
        "created_at": _now(),
    }
    await db.whatsapp_messages.insert_one(doc)
    await db.leads.update_one({"id": payload.lead_id}, {"$set": {"last_activity": _now()}})
    return _clean(doc)


# -------------------------------------------------------------------------
# Employees
# -------------------------------------------------------------------------
@api.get("/employees")
async def list_employees(user: dict = Depends(get_current_user)):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/employees")
async def create_employee(payload: EmployeeIn, user: dict = Depends(require_role("admin", "manager"))):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "phone": payload.phone,
        "role": payload.role,
        "password_hash": hash_password(payload.password),
        "avatar": f"https://api.dicebear.com/9.x/initials/svg?seed={payload.name.replace(' ', '+')}",
        "active": True,
        "created_at": _now(),
    }
    await db.users.insert_one(doc)
    return {k: v for k, v in doc.items() if k not in ("password_hash", "_id")}


@api.put("/employees/{emp_id}")
async def update_employee(emp_id: str, payload: EmployeePatch, user: dict = Depends(require_role("admin", "manager"))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No updates")
    result = await db.users.update_one({"id": emp_id}, {"$set": updates})
    if not result.matched_count:
        raise HTTPException(404, "Employee not found")
    return {"ok": True}


@api.delete("/employees/{emp_id}")
async def delete_employee(emp_id: str, user: dict = Depends(require_role("admin"))):
    if emp_id == user["id"]:
        raise HTTPException(400, "Cannot delete self")
    result = await db.users.delete_one({"id": emp_id})
    if not result.deleted_count:
        raise HTTPException(404, "Employee not found")
    return {"ok": True}


@api.get("/employees/{emp_id}/stats")
async def employee_stats(emp_id: str, user: dict = Depends(get_current_user)):
    """Per-employee dashboard: leads owned, calls, won deals, conversion, tasks, recent activity."""
    emp = await db.users.find_one({"id": emp_id}, {"_id": 0, "password_hash": 0})
    if not emp:
        raise HTTPException(404, "Employee not found")

    # Lead counts by status
    lead_rows = await db.leads.aggregate([
        {"$match": {"assigned_to": emp_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "revenue": {"$sum": "$budget"}}},
    ]).to_list(50)
    by_status = {r["_id"]: r["count"] for r in lead_rows}
    total_leads = sum(by_status.values())
    won = by_status.get("Won", 0)
    lost = by_status.get("Lost", 0)
    revenue_won = next((r["revenue"] for r in lead_rows if r["_id"] == "Won"), 0)
    pipeline_value_agg = await db.leads.aggregate([
        {"$match": {"assigned_to": emp_id, "status": {"$nin": ["Won", "Lost"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$budget"}}},
    ]).to_list(1)
    pipeline_value = pipeline_value_agg[0]["total"] if pipeline_value_agg else 0

    # Calls
    calls_total = await db.calls.count_documents({"user_id": emp_id})
    connected = await db.calls.count_documents({"user_id": emp_id, "outcome": "Connected"})
    duration_agg = await db.calls.aggregate([
        {"$match": {"user_id": emp_id}},
        {"$group": {"_id": None, "total": {"$sum": "$duration"}}},
    ]).to_list(1)
    talk_time = duration_agg[0]["total"] if duration_agg else 0

    # Tasks
    tasks_pending = await db.tasks.count_documents({"assigned_to": emp_id, "status": {"$ne": "Completed"}})
    tasks_done = await db.tasks.count_documents({"assigned_to": emp_id, "status": "Completed"})

    # Recent activity
    recent = await db.activities.find({"user_id": emp_id}, {"_id": 0}).sort("created_at", -1).to_list(15)
    for a in recent:
        if a.get("lead_id"):
            lead = await db.leads.find_one({"id": a["lead_id"]}, {"_id": 0, "name": 1, "company": 1})
            if lead:
                a["lead_name"] = lead["name"]
                a["lead_company"] = lead.get("company", "")

    # Top leads by score
    top_leads = await db.leads.find(
        {"assigned_to": emp_id}, {"_id": 0}
    ).sort("score", -1).limit(8).to_list(8)

    # By status array for chart (preserve order)
    status_chart = [{"status": s, "count": by_status.get(s, 0)} for s in LEAD_STATUSES]

    # Sales / revenue / collections / target
    sales = await db.sales.find({"assigned_to": emp_id}, {"_id": 0}).to_list(1000)
    sales_count = len(sales)
    revenue = round(sum(s.get("final_amount", 0) for s in sales), 2)
    pending_collection = round(sum(s.get("pending_amount", 0) for s in sales), 2)
    target = emp.get("monthly_target", 0)
    achievement = achievement_pct(revenue, target)

    return {
        "employee": emp,
        "totals": {
            "total_leads": total_leads,
            "won": won,
            "lost": lost,
            "conversion": round((won / total_leads) * 100, 1) if total_leads else 0,
            "revenue_won": revenue_won,
            "pipeline_value": pipeline_value,
            "calls_total": calls_total,
            "calls_connected": connected,
            "connect_rate": round((connected / calls_total) * 100, 1) if calls_total else 0,
            "talk_time_seconds": talk_time,
            "tasks_pending": tasks_pending,
            "tasks_done": tasks_done,
            "sales_count": sales_count,
            "revenue": revenue,
            "pending_collection": pending_collection,
            "target": target,
            "achievement_pct": achievement,
        },
        "by_status": status_chart,
        "recent_activity": recent,
        "top_leads": top_leads,
    }


# -------------------------------------------------------------------------
# Notifications
# -------------------------------------------------------------------------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find(
        {"$or": [{"user_id": user["id"]}, {"user_id": None}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)


@api.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id}, {"$set": {"read": True}})
    return {"ok": True}


# -------------------------------------------------------------------------
# Settings
# -------------------------------------------------------------------------
@api.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    s = await db.settings.find_one({"id": "company"}, {"_id": 0})
    return s or {}


@api.put("/settings")
async def update_settings(payload: SettingsPatch, user: dict = Depends(require_role("admin"))):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    await db.settings.update_one({"id": "company"}, {"$set": updates}, upsert=True)
    return await db.settings.find_one({"id": "company"}, {"_id": 0})


# -------------------------------------------------------------------------
# Dashboard / Reports
# -------------------------------------------------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    total_leads = await db.leads.count_documents({})
    today_iso = datetime.now(timezone.utc).date().isoformat()
    new_today = await db.leads.count_documents({"created_at": {"$gte": today_iso}})
    calls_today = await db.calls.count_documents({"created_at": {"$gte": today_iso}})
    pending = await db.tasks.count_documents({"status": {"$ne": "Completed"}})
    won = await db.leads.count_documents({"status": "Won"})
    lost = await db.leads.count_documents({"status": "Lost"})
    # revenue pipeline = sum of budgets for non-terminal leads
    pipeline_agg = await db.leads.aggregate([
        {"$match": {"status": {"$nin": ["Won", "Lost"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$budget"}}},
    ]).to_list(1)
    revenue_pipeline = pipeline_agg[0]["total"] if pipeline_agg else 0
    won_revenue_agg = await db.leads.aggregate([
        {"$match": {"status": "Won"}},
        {"$group": {"_id": None, "total": {"$sum": "$budget"}}},
    ]).to_list(1)
    revenue_won = won_revenue_agg[0]["total"] if won_revenue_agg else 0

    return {
        "total_leads": total_leads,
        "new_today": new_today,
        "calls_today": calls_today,
        "pending_followups": pending,
        "won_deals": won,
        "lost_deals": lost,
        "revenue_pipeline": revenue_pipeline,
        "revenue_won": revenue_won,
    }


@api.get("/reports/lead-sources")
async def report_lead_sources(user: dict = Depends(get_current_user)):
    rows = await db.leads.aggregate([
        {"$match": _scope(user)},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    return [{"source": r["_id"] or "Unknown", "count": r["count"]} for r in rows]


@api.get("/reports/status-funnel")
async def report_status_funnel(user: dict = Depends(get_current_user)):
    rows = await db.leads.aggregate([
        {"$match": _scope(user)},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]).to_list(50)
    counts = {r["_id"]: r["count"] for r in rows}
    return [{"status": s, "count": counts.get(s, 0)} for s in LEAD_STATUSES]


@api.get("/reports/weekly-leads")
async def report_weekly_leads(user: dict = Depends(get_current_user)):
    # last 8 weeks
    from collections import defaultdict
    leads = await db.leads.find(_scope(user), {"_id": 0, "created_at": 1}).to_list(2000)
    buckets: dict = defaultdict(int)
    now = datetime.now(timezone.utc)
    for l in leads:
        try:
            dt = datetime.fromisoformat(l["created_at"])
        except Exception:  # noqa: BLE001
            continue
        weeks_ago = (now - dt).days // 7
        if 0 <= weeks_ago < 8:
            buckets[weeks_ago] += 1
    return [{"week": f"W-{i}", "leads": buckets.get(i, 0)} for i in range(7, -1, -1)]


@api.get("/reports/employee-performance")
async def report_employee_performance(user: dict = Depends(get_current_user)):
    rows = await db.leads.aggregate([
        {"$match": _scope(user)},
        {"$group": {
            "_id": "$assigned_to",
            "total": {"$sum": 1},
            "won": {"$sum": {"$cond": [{"$eq": ["$status", "Won"]}, 1, 0]}},
            "revenue": {"$sum": {"$cond": [{"$eq": ["$status", "Won"]}, "$budget", 0]}},
        }},
        {"$sort": {"won": -1}},
        {"$limit": 10},
    ]).to_list(50)
    result = []
    for r in rows:
        if not r["_id"]:
            continue
        u = await db.users.find_one({"id": r["_id"]}, {"_id": 0, "name": 1, "avatar": 1, "role": 1})
        if not u:
            continue
        result.append({
            "user_id": r["_id"],
            "name": u["name"],
            "avatar": u.get("avatar", ""),
            "role": u.get("role", ""),
            "total_leads": r["total"],
            "won": r["won"],
            "revenue": r["revenue"],
            "conversion": round((r["won"] / r["total"]) * 100, 1) if r["total"] else 0,
        })
    return result


@api.get("/reports/recent-activities")
async def report_recent_activities(user: dict = Depends(get_current_user)):
    q = {} if is_owner(user) else {"user_id": user["id"]}
    acts = await db.activities.find(q, {"_id": 0}).sort("created_at", -1).to_list(20)
    # Enrich with lead + user names
    for a in acts:
        if a.get("lead_id"):
            lead = await db.leads.find_one({"id": a["lead_id"]}, {"_id": 0, "name": 1, "company": 1})
            if lead:
                a["lead_name"] = lead["name"]
                a["lead_company"] = lead.get("company", "")
        if a.get("user_id"):
            u = await db.users.find_one({"id": a["user_id"]}, {"_id": 0, "name": 1})
            if u:
                a["user_name"] = u["name"]
    return acts


@api.get("/reports/outstanding-payments")
async def report_outstanding_payments(user: dict = Depends(require_role("admin", "manager"))):
    sales = await db.sales.find({"pending_amount": {"$gt": 0}, "status": {"$ne": "Cancelled"}}, {"_id": 0}).sort("due_date", 1).to_list(500)
    if not sales:
        return []
    cust_ids = list({s["customer_id"] for s in sales})
    user_ids = list({s["assigned_to"] for s in sales})
    customers = {c["id"]: c for c in await db.customers.find({"id": {"$in": cust_ids}}, {"_id": 0}).to_list(500)}
    users_map = {u["id"]: u for u in await db.users.find({"id": {"$in": user_ids}}, {"_id": 0}).to_list(50)}
    return [{
        "sale_no": s["sale_no"],
        "customer": customers.get(s["customer_id"], {}).get("name", "—"),
        "salesperson": users_map.get(s["assigned_to"], {}).get("name", "—"),
        "final_amount": s["final_amount"],
        "pending_amount": s["pending_amount"],
        "due_date": s["due_date"],
        "status": s["status"],
    } for s in sales]


@api.get("/reports/sales-by-product")
async def report_sales_by_product(user: dict = Depends(get_current_user)):
    sales = await db.sales.find({**_scope(user), "status": {"$ne": "Cancelled"}}, {"_id": 0}).to_list(2000)
    agg: dict = {}
    for s in sales:
        row = agg.setdefault(s["product_service"], {"revenue": 0.0, "deals": 0})
        row["revenue"] += s["final_amount"]
        row["deals"] += 1
    return [{"product_service": k, "revenue": round(v["revenue"], 2), "deals": v["deals"]} for k, v in sorted(agg.items(), key=lambda kv: -kv[1]["revenue"])]


# -------------------------------------------------------------------------
# Owner Dashboard — full business view (revenue, profit, team performance)
# -------------------------------------------------------------------------
def _last_n_month_keys(n: int) -> List[str]:
    now = datetime.now(timezone.utc)
    keys = []
    y, m = now.year, now.month
    for i in range(n - 1, -1, -1):
        mm, yy = m - i, y
        while mm <= 0:
            mm += 12
            yy -= 1
        keys.append(f"{yy:04d}-{mm:02d}")
    return keys


@api.get("/dashboard/owner")
async def dashboard_owner(
    range: Optional[str] = "month",
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: dict = Depends(require_role("admin", "manager")),
):
    range_start, range_end = _range_bounds(range, start, end)

    leads = await db.leads.find({}, {"_id": 0}).to_list(3000)
    sales = await db.sales.find({}, {"_id": 0}).to_list(3000)
    payments = await db.payments.find({}, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({"role": {"$in": ["sales", "manager"]}}, {"_id": 0, "password_hash": 0}).to_list(50)
    customers = await db.customers.find({}, {"_id": 0}).to_list(500)
    user_by_id = {u["id"]: u for u in users}
    cust_by_id = {c["id"]: c for c in customers}

    leads_in_range = [l for l in leads if _in_range(l.get("created_at"), range_start, range_end)]
    active_sales = [s for s in sales if s.get("status") != "Cancelled"]
    sales_in_range = [s for s in active_sales if _in_range(s.get("sale_date"), range_start, range_end)]
    expenses_in_range = [e for e in expenses if _in_range(e.get("date"), range_start, range_end)]

    total_revenue = round(sum(s["final_amount"] for s in sales_in_range), 2)
    opex_in_range = round(sum(e["amount"] for e in expenses_in_range), 2)
    cogs_in_range = round(sum(s["cost_amount"] for s in sales_in_range), 2)
    # Total Expenses = cost of the sales delivered (COGS) + operating expenses, matching a standard P&L
    total_expenses = round(opex_in_range + cogs_in_range, 2)
    gross_profit = round(sum(s["gross_profit"] for s in sales_in_range), 2)
    net_profit = round(total_revenue - total_expenses, 2)
    margin_pct = round((net_profit / total_revenue) * 100, 1) if total_revenue else 0.0

    pending_payments = round(sum(s["pending_amount"] for s in active_sales), 2)
    overdue_payments = round(sum(s["pending_amount"] for s in active_sales if s["status"] == "Overdue"), 2)
    pending_bucket = round(sum(s["pending_amount"] for s in active_sales if s["status"] in ("Pending", "Partial", "Confirmed")), 2)
    collected_total = round(sum(s["paid_amount"] for s in active_sales), 2)
    collected_in_range = round(sum(p["amount"] for p in payments if _in_range(p.get("payment_date"), range_start, range_end)), 2)

    total_leads = len(leads_in_range)
    won_deals = len([l for l in leads_in_range if l["status"] == "Won"])
    conversion_rate = round((won_deals / total_leads) * 100, 1) if total_leads else 0.0

    month_keys = _last_n_month_keys(6)
    rev_by_month = {k: 0.0 for k in month_keys}
    exp_by_month = {k: 0.0 for k in month_keys}
    for s in active_sales:
        mk = _month_key(s.get("sale_date", ""))
        if mk in rev_by_month:
            rev_by_month[mk] += s["final_amount"]
            exp_by_month[mk] += s["cost_amount"]
    for e in expenses:
        mk = _month_key(e.get("date", ""))
        if mk in exp_by_month:
            exp_by_month[mk] += e["amount"]
    revenue_trend = [
        {"month": k, "revenue": round(rev_by_month[k], 2), "expenses": round(exp_by_month[k], 2),
         "profit": round(rev_by_month[k] - exp_by_month[k], 2)}
        for k in month_keys
    ]

    by_user_sales: dict = {}
    for s in sales_in_range:
        agg = by_user_sales.setdefault(s["assigned_to"], {"amount": 0.0, "deals": 0})
        agg["amount"] += s["final_amount"]
        agg["deals"] += 1
    sales_performance = sorted(
        [{"salesperson": user_by_id.get(uid, {}).get("name", "Unknown"), "amount": round(a["amount"], 2), "deals": a["deals"]}
         for uid, a in by_user_sales.items()],
        key=lambda x: -x["amount"],
    )

    lead_funnel = [
        {"status": st, "count": (c := len([l for l in leads_in_range if l["status"] == st])),
         "pct": round((c / total_leads) * 100, 1) if total_leads else 0}
        for st in LEAD_STATUSES
    ]

    src_counts: dict = {}
    for l in leads_in_range:
        src_counts[l["source"]] = src_counts.get(l["source"], 0) + 1
    lead_sources = [{"source": k, "count": v} for k, v in src_counts.items()]

    payment_status = {"collected": collected_total, "pending": pending_bucket, "overdue": overdue_payments}

    salesperson_table = []
    for u in users:
        u_leads = [l for l in leads if l["assigned_to"] == u["id"]]
        u_sales = [s for s in active_sales if s["assigned_to"] == u["id"]]
        u_won = len([l for l in u_leads if l["status"] == "Won"])
        u_revenue = round(sum(s["final_amount"] for s in u_sales), 2)
        u_pending = round(sum(s["pending_amount"] for s in u_sales), 2)
        target = u.get("monthly_target", 0)
        salesperson_table.append({
            "user_id": u["id"], "name": u["name"], "role": u["role"],
            "leads": len(u_leads), "won": u_won, "sales_count": len(u_sales),
            "revenue": u_revenue, "target": target,
            "achievement_pct": achievement_pct(u_revenue, target),
            "pending_collection": u_pending,
        })
    salesperson_table.sort(key=lambda x: -x["revenue"])

    recent_sales_raw = sorted(sales, key=lambda s: s.get("sale_date", ""), reverse=True)[:8]
    recent_sales = [{
        "customer": cust_by_id.get(s["customer_id"], {}).get("name", "—"),
        "salesperson": user_by_id.get(s["assigned_to"], {}).get("name", "—"),
        "amount": s["final_amount"], "status": s["status"], "date": s["sale_date"],
    } for s in recent_sales_raw]

    now_iso = _now()
    upcoming_raw = sorted(
        [l for l in leads if l.get("next_follow_up") and l["next_follow_up"] >= now_iso and l["status"] not in ("Won", "Lost")],
        key=lambda l: l["next_follow_up"],
    )
    upcoming_followups = [{
        "customer": l["name"], "assigned_to": user_by_id.get(l["assigned_to"], {}).get("name", "—"),
        "follow_up_date": l["next_follow_up"], "priority": l.get("priority", "Medium"), "status": l["status"],
    } for l in upcoming_raw[:8]]

    return {
        "range": {"start": range_start, "end": range_end},
        "kpis": {
            "total_revenue": total_revenue, "total_sales": len(sales_in_range), "total_expenses": total_expenses,
            "net_profit": net_profit, "gross_profit": gross_profit, "margin_pct": margin_pct,
            "pending_payments": pending_payments, "total_leads": total_leads, "won_deals": won_deals,
            "conversion_rate": conversion_rate, "collected_in_range": collected_in_range,
        },
        "revenue_trend": revenue_trend,
        "sales_performance": sales_performance,
        "lead_funnel": lead_funnel,
        "lead_sources": lead_sources,
        "payment_status": payment_status,
        "salesperson_table": salesperson_table,
        "recent_sales": recent_sales,
        "upcoming_followups": upcoming_followups,
    }


# -------------------------------------------------------------------------
# Salesperson Dashboard — "My Performance", works for any role (scoped to self)
# -------------------------------------------------------------------------
@api.get("/dashboard/me")
async def dashboard_me(
    range: Optional[str] = "month",
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    range_start, range_end = _range_bounds(range, start, end)
    my_id = user["id"]

    leads = await db.leads.find({"assigned_to": my_id}, {"_id": 0}).to_list(1000)
    sales = await db.sales.find({"assigned_to": my_id}, {"_id": 0}).to_list(1000)
    calls = await db.calls.find({"user_id": my_id}, {"_id": 0}).to_list(1000)
    activities = await db.activities.find({"user_id": my_id}, {"_id": 0}).sort("created_at", -1).to_list(15)

    active_sales = [s for s in sales if s.get("status") != "Cancelled"]
    leads_in_range = [l for l in leads if _in_range(l.get("created_at"), range_start, range_end)]
    sales_in_range = [s for s in active_sales if _in_range(s.get("sale_date"), range_start, range_end)]

    today = datetime.now(timezone.utc).date().isoformat()
    calls_today = len([c for c in calls if (c.get("created_at") or "")[:10] == today])
    won = len([l for l in leads if l["status"] == "Won"])
    lost = len([l for l in leads if l["status"] == "Lost"])
    open_opps = len([l for l in leads if l["status"] not in ("Won", "Lost")])

    my_sales_amount = round(sum(s["final_amount"] for s in sales_in_range), 2)
    my_pending = round(sum(s["pending_amount"] for s in active_sales), 2)
    target = user.get("monthly_target", 0)

    month_keys = _last_n_month_keys(6)
    rev_by_month = {k: 0.0 for k in month_keys}
    for s in active_sales:
        mk = _month_key(s.get("sale_date", ""))
        if mk in rev_by_month:
            rev_by_month[mk] += s["final_amount"]
    revenue_trend = [{"month": k, "revenue": round(rev_by_month[k], 2)} for k in month_keys]

    my_pipeline = [{"status": st, "count": len([l for l in leads if l["status"] == st]),
                     "value": round(sum(l["budget"] for l in leads if l["status"] == st), 2)} for st in LEAD_STATUSES]
    total_leads_n = len(leads)
    my_lead_funnel = [{"status": st, "count": (c := len([l for l in leads if l["status"] == st])),
                        "pct": round((c / total_leads_n) * 100, 1) if total_leads_n else 0} for st in LEAD_STATUSES]

    todays_followups = [{"customer": l["name"], "time": l["next_follow_up"], "priority": l.get("priority", "Medium")}
                         for l in leads if l.get("next_follow_up") and l["next_follow_up"][:10] == today]

    lead_by_id = {l["id"]: l for l in leads}
    my_recent_activities = [{
        "description": a["description"], "type": a["type"], "date": a["created_at"],
        "lead_name": lead_by_id.get(a.get("lead_id"), {}).get("name"),
    } for a in activities]

    recent_sales_raw = sorted(sales, key=lambda s: s.get("sale_date", ""), reverse=True)[:8]
    cust_ids = list({s["customer_id"] for s in recent_sales_raw})
    customers = {c["id"]: c for c in (await db.customers.find({"id": {"$in": cust_ids}}, {"_id": 0}).to_list(50) if cust_ids else [])}
    my_recent_sales = [{"customer": customers.get(s["customer_id"], {}).get("name", "—"),
                         "amount": s["final_amount"], "status": s["status"], "date": s["sale_date"]} for s in recent_sales_raw]

    return {
        "range": {"start": range_start, "end": range_end},
        "kpis": {
            "my_leads": len(leads), "new_leads": len(leads_in_range),
            "my_followups": len([l for l in leads if l.get("next_follow_up")]),
            "calls_today": calls_today, "open_opportunities": open_opps,
            "won_deals": won, "lost_deals": lost,
            "my_sales": my_sales_amount, "my_revenue": my_sales_amount,
            "my_pending_collection": my_pending, "target": target,
            "achievement_pct": achievement_pct(my_sales_amount, target),
        },
        "revenue_trend": revenue_trend,
        "my_pipeline": my_pipeline,
        "my_lead_funnel": my_lead_funnel,
        "my_recent_activities": my_recent_activities,
        "todays_followups": todays_followups,
        "my_recent_sales": my_recent_sales,
    }


@api.get("/meta/options")
async def meta_options(user: dict = Depends(get_current_user)):
    """Enum option lists the frontend renders into selects/filters — single source of truth."""
    return {
        "lead_statuses": LEAD_STATUSES,
        "customer_statuses": CUSTOMER_STATUSES,
        "sale_statuses": SALE_STATUSES,
        "payment_methods": PAYMENT_METHODS,
        "expense_categories": EXPENSE_CATEGORIES,
        "call_outcomes": CALL_OUTCOMES,
    }


@api.get("/health")
async def health():
    return {"ok": True, "ts": _now()}


# -------------------------------------------------------------------------
# Mount + startup
# -------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.leads.create_index("id", unique=True)
    await db.tasks.create_index("id", unique=True)
    await db.calls.create_index("id", unique=True)
    await db.whatsapp_messages.create_index([("lead_id", 1), ("created_at", 1)])
    await db.documents.create_index([("lead_id", 1), ("is_deleted", 1)])
    await db.customers.create_index("id", unique=True)
    await db.sales.create_index("id", unique=True)
    await db.sales.create_index("customer_id")
    await db.payments.create_index("id", unique=True)
    await db.payments.create_index("sale_id")
    await db.expenses.create_index("id", unique=True)
    init_storage()
    summary = await seed_all(db)
    logger.info("Seeded: %s", summary)


@app.on_event("shutdown")
async def shutdown():
    client.close()
