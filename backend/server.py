"""Facets CRM AI - FastAPI backend."""
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
from datetime import datetime, timezone
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
from seed import seed_all
from storage import APP_NAME as STORAGE_APP, get_object, init_storage, put_object

# -------------------------------------------------------------------------
# DB & app setup
# -------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Facets CRM AI")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("facets-crm")


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
    assigned_to: Optional[str] = None
    budget: Optional[float] = None
    requirements: Optional[str] = None
    notes: Optional[str] = None


class TaskIn(BaseModel):
    title: str
    description: str = ""
    lead_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "Medium"
    due_date: Optional[str] = None
    status: str = "Pending"


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None
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
    search: Optional[str] = None,
    limit: int = 200,
    user: dict = Depends(get_current_user),
):
    q: dict = {}
    if status:
        q["status"] = status
    if source:
        q["source"] = source
    if assigned_to:
        q["assigned_to"] = assigned_to
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    items = await db.leads.find(q, {"_id": 0}).sort("updated_at", -1).to_list(limit)
    return items


@api.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
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
    lead = await db.leads.find_one({"id": lead_id})
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
# Tasks
# -------------------------------------------------------------------------
@api.get("/tasks")
async def list_tasks(
    status: Optional[str] = None,
    lead_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q: dict = {}
    if status:
        q["status"] = status
    if lead_id:
        q["lead_id"] = lead_id
    if assigned_to:
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
    q: dict = {}
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
    order = ["New", "Contacted", "Interested", "Follow Up", "Proposal Sent", "Negotiation", "Won", "Lost"]
    status_chart = [{"status": s, "count": by_status.get(s, 0)} for s in order]

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
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    return [{"source": r["_id"] or "Unknown", "count": r["count"]} for r in rows]


@api.get("/reports/status-funnel")
async def report_status_funnel(user: dict = Depends(get_current_user)):
    order = ["New", "Contacted", "Interested", "Follow Up", "Proposal Sent", "Negotiation", "Won", "Lost"]
    rows = await db.leads.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]).to_list(50)
    counts = {r["_id"]: r["count"] for r in rows}
    return [{"status": s, "count": counts.get(s, 0)} for s in order]


@api.get("/reports/weekly-leads")
async def report_weekly_leads(user: dict = Depends(get_current_user)):
    # last 8 weeks
    from collections import defaultdict
    leads = await db.leads.find({}, {"_id": 0, "created_at": 1}).to_list(2000)
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
    acts = await db.activities.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)
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
    init_storage()
    summary = await seed_all(db)
    logger.info("Seeded: %s", summary)


@app.on_event("shutdown")
async def shutdown():
    client.close()
