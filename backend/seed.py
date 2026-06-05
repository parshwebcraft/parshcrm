"""Idempotent seed data for Facets CRM AI."""
import random
import uuid
from datetime import datetime, timezone, timedelta

from auth import hash_password

# Deterministic randomness for stable demo data
RNG = random.Random(42)

DEMO_USERS = [
    {"email": "admin@facetscrm.com", "password": "password123", "name": "Aarav Sharma", "role": "admin", "phone": "+91 98100 11111"},
    {"email": "sales@facetscrm.com", "password": "password123", "name": "Priya Verma", "role": "sales", "phone": "+91 98100 22222"},
    {"email": "manager@facetscrm.com", "password": "password123", "name": "Rohit Khanna", "role": "manager", "phone": "+91 98100 33333"},
]

INDIAN_FIRST = ["Aarav", "Vihaan", "Ananya", "Diya", "Kabir", "Ishaan", "Rohan", "Saanvi", "Aditya", "Meera",
                "Arjun", "Riya", "Karan", "Sneha", "Vivek", "Pooja", "Amit", "Neha", "Rahul", "Shreya",
                "Vikram", "Kavya", "Sandeep", "Lakshmi", "Manish"]
INDIAN_LAST = ["Sharma", "Verma", "Patel", "Iyer", "Reddy", "Nair", "Singh", "Kumar", "Gupta", "Joshi",
               "Mehta", "Shah", "Khanna", "Bose", "Rao", "Pillai", "Kapoor", "Malhotra", "Chopra", "Jain"]

INDIAN_COMPANIES = [
    "ABC Traders", "Shree Industries", "Royal Furniture", "Anand Fashion", "Vinayak Furniture",
    "Sundaram Textiles", "Bharat Steel Works", "Lakshmi Exports", "Ganpati Trading Co", "Tirupati Electronics",
    "Saraswati Books", "Maruti Auto Parts", "Hindustan Plastics", "Bombay Threads", "Delhi Hardware",
    "Mumbai Jewellers", "Pune Logistics", "Chennai Foods", "Bangalore Tech", "Kolkata Garments",
    "Surat Diamonds", "Jaipur Handicrafts", "Ahmedabad Chemicals", "Lucknow Spices", "Indore Pharma",
    "Coimbatore Mills", "Vadodara Engineering", "Nagpur Cement", "Patna Agro", "Rajkot Ceramics",
    "Mysore Silks", "Hyderabad Pearls", "Vizag Marine", "Cochin Spices Co", "Trivandrum Coir",
    "Madurai Cotton", "Salem Steel", "Jodhpur Marble", "Udaipur Stones", "Bhopal Glassware",
    "Raipur Iron", "Nashik Wines", "Aurangabad Auto", "Goa Tourism Ltd", "Kanpur Leather",
    "Allahabad Press", "Varanasi Carpets", "Amritsar Foods", "Ludhiana Knits", "Faridabad Tools",
    "Gurgaon Realty", "Noida Software", "Meerut Sports", "Agra Marble Crafts", "Bareilly Furniture",
    "Dehradun Wellness", "Shimla Tea", "Manali Adventure", "Chandigarh Apparel", "Jalandhar Sports Goods",
    "Panipat Textiles", "Karnal Rice Mills", "Rohtak Dairy", "Hisar Steel Tubes", "Sirsa Cotton",
    "Bhilai Iron", "Durgapur Steel", "Asansol Coal", "Howrah Engineering", "Siliguri Tea Estates",
    "Guwahati Bamboo", "Imphal Handlooms", "Shillong Music", "Dimapur Crafts", "Itanagar Wood",
    "Aizawl Bamboo Co", "Gangtok Floriculture", "Port Blair Seafood", "Daman Furniture", "Puducherry Crafts",
    "Tezpur Tea Co", "Dispur Spices", "Cuttack Silver", "Bhubaneswar Granite", "Puri Handlooms",
    "Rourkela Steel Plant", "Jamshedpur Tools", "Dhanbad Coal Traders", "Ranchi Minerals", "Bokaro Iron",
    "Gaya Stones", "Muzaffarpur Litchi", "Patna Hospitals Co", "Begusarai Refinery Spares", "Bhagalpur Silk",
    "Darbhanga Sweets", "Saharanpur Wood Carving", "Aligarh Locks", "Moradabad Brass", "Firozabad Glass",
    "Mathura Tiles", "Vrindavan Crafts", "Haridwar Ayurveda", "Rishikesh Yoga Co", "Roorkee Steel"
]

CITIES = [("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Bangalore", "Karnataka"), ("Chennai", "Tamil Nadu"),
          ("Kolkata", "West Bengal"), ("Hyderabad", "Telangana"), ("Pune", "Maharashtra"), ("Ahmedabad", "Gujarat"),
          ("Jaipur", "Rajasthan"), ("Surat", "Gujarat"), ("Lucknow", "Uttar Pradesh"), ("Kanpur", "Uttar Pradesh"),
          ("Nagpur", "Maharashtra"), ("Indore", "Madhya Pradesh"), ("Coimbatore", "Tamil Nadu")]

INDUSTRIES = ["Manufacturing", "Retail", "E-commerce", "Real Estate", "Healthcare", "Education",
              "FMCG", "Textiles", "Automobile", "IT Services", "Hospitality", "Logistics",
              "Agriculture", "Pharma", "Construction"]

SOURCES = ["Website", "Referral", "Cold Call", "WhatsApp", "Facebook Ads", "Google Ads", "LinkedIn", "Event"]
STATUSES = ["New", "Contacted", "Interested", "Follow Up", "Proposal Sent", "Negotiation", "Won", "Lost"]
TASK_STATUSES = ["Pending", "In Progress", "Completed"]
PRIORITIES = ["Low", "Medium", "High"]
CALL_OUTCOMES = ["Connected", "No Answer", "Voicemail", "Busy", "Wrong Number"]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _random_past(days: int = 30) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=RNG.randint(0, days), hours=RNG.randint(0, 23))).isoformat()


def _random_future(days: int = 14) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=RNG.randint(1, days), hours=RNG.randint(0, 23))).isoformat()


def _person_name() -> str:
    return f"{RNG.choice(INDIAN_FIRST)} {RNG.choice(INDIAN_LAST)}"


def _phone() -> str:
    return f"+91 {RNG.randint(70000, 99999)} {RNG.randint(10000, 99999)}"


def _email(name: str, company: str) -> str:
    handle = name.lower().replace(" ", ".")
    domain = company.lower().replace(" ", "").replace(",", "").replace(".", "") + ".in"
    return f"{handle}@{domain}"


def _score_lead(lead: dict) -> int:
    score = 30
    if lead["budget"] > 50000:
        score += 20
    if lead["source"] in ("Website", "LinkedIn"):
        score += 10
    if lead["status"] in ("Proposal Sent", "Negotiation"):
        score += 25
    if lead["status"] == "Won":
        score = 100
    if lead["status"] == "Lost":
        score = max(5, score - 30)
    return max(0, min(100, score + RNG.randint(-5, 5)))


async def seed_all(db) -> dict:
    # ----- Users -----
    users = []
    for u in DEMO_USERS:
        existing = await db.users.find_one({"email": u["email"]})
        user_id = existing["id"] if existing else str(uuid.uuid4())
        doc = {
            "id": user_id,
            "email": u["email"],
            "password_hash": hash_password(u["password"]),
            "name": u["name"],
            "role": u["role"],
            "phone": u["phone"],
            "avatar": f"https://api.dicebear.com/9.x/initials/svg?seed={u['name'].replace(' ', '+')}",
            "created_at": existing.get("created_at") if existing else _now(),
            "active": True,
        }
        await db.users.update_one({"email": u["email"]}, {"$set": doc}, upsert=True)
        users.append(doc)

    # Additional 22 employees so we have 25 total
    for _ in range(22):
        name = _person_name()
        email = f"{name.lower().replace(' ', '.')}{RNG.randint(10, 99)}@facetscrm.com"
        existing = await db.users.find_one({"email": email})
        if existing:
            users.append(existing)
            continue
        role = RNG.choice(["sales", "sales", "sales", "manager"])
        doc = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_password("password123"),
            "name": name,
            "role": role,
            "phone": _phone(),
            "avatar": f"https://api.dicebear.com/9.x/initials/svg?seed={name.replace(' ', '+')}",
            "created_at": _random_past(180),
            "active": True,
        }
        await db.users.insert_one(doc)
        users.append(doc)

    user_ids = [u["id"] for u in users]
    sales_user_ids = [u["id"] for u in users if u["role"] in ("sales", "manager", "admin")]

    # ----- Leads (only seed if collection empty for that demo set) -----
    existing_lead_count = await db.leads.count_documents({})
    leads = []
    if existing_lead_count < 100:
        await db.leads.delete_many({})
        for i in range(100):
            company = INDIAN_COMPANIES[i % len(INDIAN_COMPANIES)]
            person = _person_name()
            city, state = RNG.choice(CITIES)
            status = RNG.choice(STATUSES)
            lead = {
                "id": str(uuid.uuid4()),
                "name": person,
                "phone": _phone(),
                "email": _email(person, company),
                "company": company,
                "website": "https://" + company.lower().replace(" ", "") + ".in",
                "city": city,
                "state": state,
                "industry": RNG.choice(INDUSTRIES),
                "source": RNG.choice(SOURCES),
                "status": status,
                "assigned_to": RNG.choice(sales_user_ids),
                "budget": RNG.choice([15000, 25000, 30000, 50000, 75000, 100000, 150000, 250000, 500000]),
                "requirements": RNG.choice([
                    "Ecommerce website with payment gateway integration.",
                    "Custom CRM for sales team of 20.",
                    "Mobile app for delivery tracking.",
                    "Inventory management with barcode support.",
                    "Branding and logo design package.",
                    "Annual website maintenance contract.",
                    "Lead generation via Facebook & Google Ads.",
                ]),
                "notes": "",
                "score": 0,
                "created_at": _random_past(45),
                "updated_at": _random_past(7),
                "last_activity": _random_past(7),
            }
            lead["score"] = _score_lead(lead)
            leads.append(lead)
        await db.leads.insert_many(leads)
    else:
        leads = await db.leads.find({}, {"_id": 0}).to_list(200)

    lead_ids = [l["id"] for l in leads]

    # ----- Tasks -----
    if await db.tasks.count_documents({}) < 50:
        await db.tasks.delete_many({})
        tasks = []
        for _ in range(50):
            tasks.append({
                "id": str(uuid.uuid4()),
                "title": RNG.choice([
                    "Send proposal", "Follow up call", "Send pricing sheet",
                    "Schedule demo", "Site visit", "Send contract", "Collect payment",
                    "Onboarding call", "Check requirements", "Send brochure"
                ]),
                "description": "Auto-generated task for follow up with lead.",
                "lead_id": RNG.choice(lead_ids),
                "assigned_to": RNG.choice(sales_user_ids),
                "priority": RNG.choice(PRIORITIES),
                "due_date": _random_future(14),
                "status": RNG.choice(TASK_STATUSES),
                "created_at": _random_past(15),
            })
        await db.tasks.insert_many(tasks)

    # ----- Activities -----
    if await db.activities.count_documents({}) < 200:
        await db.activities.delete_many({})
        activities = []
        types = ["call", "whatsapp", "note", "status_change", "email"]
        for _ in range(200):
            activities.append({
                "id": str(uuid.uuid4()),
                "lead_id": RNG.choice(lead_ids),
                "user_id": RNG.choice(sales_user_ids),
                "type": RNG.choice(types),
                "description": RNG.choice([
                    "Called lead, discussed requirements.",
                    "Sent WhatsApp follow up.",
                    "Updated lead status.",
                    "Added internal note.",
                    "Sent proposal via email.",
                ]),
                "created_at": _random_past(30),
            })
        await db.activities.insert_many(activities)

    # ----- Calls -----
    if await db.calls.count_documents({}) < 100:
        await db.calls.delete_many({})
        calls = []
        for _ in range(100):
            outcome = RNG.choice(CALL_OUTCOMES)
            duration = RNG.randint(15, 480) if outcome == "Connected" else RNG.randint(0, 20)
            calls.append({
                "id": str(uuid.uuid4()),
                "lead_id": RNG.choice(lead_ids),
                "user_id": RNG.choice(sales_user_ids),
                "duration": duration,
                "outcome": outcome,
                "notes": RNG.choice([
                    "Customer interested in ecommerce package. Budget around ₹30,000.",
                    "Asked to call back next week.",
                    "Wants detailed proposal sent by email.",
                    "Negotiating price, needs discount.",
                    "Confirmed order, sending invoice.",
                    "",
                ]),
                "summary": "",
                "sentiment": RNG.choice(["positive", "neutral", "negative"]),
                "lead_score": RNG.randint(20, 95),
                "next_action": RNG.choice(["Follow up in 3 days.", "Send proposal.", "Schedule demo.", "Close deal."]),
                "created_at": _random_past(20),
            })
        await db.calls.insert_many(calls)

    # ----- WhatsApp messages (50 conversations, ~6 msgs each) -----
    if await db.whatsapp_messages.count_documents({}) < 200:
        await db.whatsapp_messages.delete_many({})
        msgs = []
        wa_lead_sample = RNG.sample(lead_ids, k=50)
        templates_in = ["Hello, is anyone there?", "Can you share pricing?", "What is your delivery time?",
                        "We need this urgently.", "Please send the proposal.", "Thanks for the info!"]
        templates_out = ["Hi! Thanks for reaching out.", "Here is our pricing sheet.", "We deliver in 7 working days.",
                         "Sure, sharing the proposal now.", "Let me check and revert.", "Glad to help!"]
        for lid in wa_lead_sample:
            base = datetime.now(timezone.utc) - timedelta(days=RNG.randint(0, 14))
            for j in range(RNG.randint(4, 10)):
                outbound = j % 2 == 1
                msgs.append({
                    "id": str(uuid.uuid4()),
                    "lead_id": lid,
                    "user_id": RNG.choice(sales_user_ids) if outbound else None,
                    "direction": "out" if outbound else "in",
                    "text": RNG.choice(templates_out if outbound else templates_in),
                    "status": "read" if outbound else "received",
                    "created_at": (base + timedelta(minutes=j * 17)).isoformat(),
                })
        await db.whatsapp_messages.insert_many(msgs)

    # ----- Notifications -----
    if await db.notifications.count_documents({}) < 10:
        await db.notifications.delete_many({})
        notifs = []
        admin_id = next(u["id"] for u in users if u["role"] == "admin")
        for i in range(8):
            notifs.append({
                "id": str(uuid.uuid4()),
                "user_id": admin_id,
                "type": RNG.choice(["lead_assigned", "task_due", "follow_up", "call_scheduled"]),
                "title": RNG.choice([
                    "New lead assigned to you",
                    "Task due tomorrow",
                    "Follow up reminder",
                    "Scheduled call in 1 hour",
                ]),
                "message": "Check your dashboard for details.",
                "read": False,
                "created_at": _random_past(3),
            })
        await db.notifications.insert_many(notifs)

    # ----- Settings -----
    if not await db.settings.find_one({"id": "company"}):
        await db.settings.insert_one({
            "id": "company",
            "company_name": "Facets Lifestyle Private Limited",
            "address": "12, MG Road, Bangalore, Karnataka 560001",
            "gst_number": "29ABCDE1234F1Z5",
            "logo_url": "",
            "integrations": {
                "whatsapp_api": "",
                "calling_api": "",
                "openai_api": "",
            },
        })

    return {"users": len(users), "leads": len(leads)}
