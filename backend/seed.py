"""Idempotent seed data for ParshCRM.

Generates a coherent Lead -> Customer -> Sale -> Payment dataset plus Expenses, so every
number the dashboards show is aggregated live from these records (see finance.py) instead
of being hardcoded per-screen.
"""
import random
import uuid
from datetime import datetime, timezone, timedelta

from auth import hash_password
from constants import (
    CALL_OUTCOMES,
    CUSTOMER_STATUSES,
    EXPENSE_CATEGORIES,
    LEAD_PRIORITIES,
    LEAD_STATUSES,
    PAYMENT_METHODS,
    SALE_STATUSES,
    SOURCES,
    TASK_STATUSES,
)
from finance import compute_sale_totals, derive_payment_status

# Deterministic randomness for stable demo data
RNG = random.Random(42)

TEAM = [
    {"email": "owner@demo.com", "password": "password123", "name": "Aarav Sharma", "role": "admin", "phone": "+91 98100 11111"},
    {"email": "manager@demo.com", "password": "password123", "name": "Rohit Khanna", "role": "manager", "phone": "+91 98100 33333"},
    {"email": "sales1@demo.com", "password": "password123", "name": "Rahul Mehta", "role": "sales", "phone": "+91 98200 44444", "target": 1000000},
    {"email": "sales2@demo.com", "password": "password123", "name": "Priya Nair", "role": "sales", "phone": "+91 98200 55555", "target": 800000},
    {"email": "sales3@demo.com", "password": "password123", "name": "Karan Singh", "role": "sales", "phone": "+91 98200 66666", "target": 900000},
    {"email": "sales4@demo.com", "password": "password123", "name": "Sneha Iyer", "role": "sales", "phone": "+91 98200 77777", "target": 700000},
    {"email": "sales5@demo.com", "password": "password123", "name": "Vikram Rao", "role": "sales", "phone": "+91 98200 88888", "target": 850000},
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

PRODUCTS = [
    "E-commerce Website", "Custom CRM Software", "Mobile App Development",
    "Digital Marketing Package", "SEO & Google Ads Management", "Branding & Logo Design",
    "Annual Website Maintenance", "ERP Software", "Inventory Management System",
    "WhatsApp Business Automation",
]

EXPENSE_DESCRIPTIONS = {
    "Salary": ["Monthly team salary payout", "Sales team incentives", "Support staff salary"],
    "Marketing": ["Social media campaign", "Content & design freelancer", "Influencer collaboration"],
    "Advertising": ["Google Ads spend", "Facebook Ads spend", "IndiaMART premium listing"],
    "Travel": ["Client site visit", "Team travel — Mumbai trip", "Cab & fuel reimbursement"],
    "Office": ["Office rent", "Electricity & internet bill", "Office supplies"],
    "Software": ["CRM hosting & domain", "Design tool subscription", "Accounting software license"],
    "Operations": ["Courier & logistics", "Printing & stationery", "Misc operational cost"],
    "Other": ["Bank charges", "Miscellaneous expense", "Client gifting"],
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _days_ago(days: int, hours: int = 0) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days, hours=hours)).isoformat()


def _days_ahead(days: int, hours: int = 0) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days, hours=hours)).isoformat()


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
    if lead["source"] in ("Website", "IndiaMART"):
        score += 10
    if lead["status"] in ("Proposal Sent", "Negotiation"):
        score += 25
    if lead["status"] == "Won":
        score = 100
    if lead["status"] == "Lost":
        score = max(5, score - 30)
    return max(0, min(100, score + RNG.randint(-5, 5)))


async def seed_all(db) -> dict:
    # ----- Team (owner + manager + 5 salespersons) -----
    users = []
    for u in TEAM:
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
            "monthly_target": u.get("target", 0),
            "created_at": existing.get("created_at") if existing else _now(),
            "active": True,
        }
        await db.users.update_one({"email": u["email"]}, {"$set": doc}, upsert=True)
        users.append(doc)

    owner_id = next(u["id"] for u in users if u["role"] == "admin")
    sales_ids = [u["id"] for u in users if u["role"] == "sales"]
    assignable_ids = [u["id"] for u in users if u["role"] in ("sales", "manager")]

    # ----- Leads (250) -----
    existing_lead_count = await db.leads.count_documents({})
    leads = []
    if existing_lead_count < 250:
        await db.leads.delete_many({})
        for i in range(250):
            company = INDIAN_COMPANIES[i % len(INDIAN_COMPANIES)]
            person = _person_name()
            city, state = RNG.choice(CITIES)
            status = RNG.choice(LEAD_STATUSES)
            created_days_ago = RNG.randint(0, 175)
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
                "assigned_to": RNG.choice(assignable_ids),
                "priority": RNG.choice(LEAD_PRIORITIES),
                "product_service": RNG.choice(PRODUCTS),
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
                "created_at": _days_ago(created_days_ago),
                "updated_at": _days_ago(RNG.randint(0, min(created_days_ago, 30))),
                "last_activity": _days_ago(RNG.randint(0, min(created_days_ago, 14))),
            }
            lead["next_follow_up"] = (
                None if status in ("Won", "Lost") else _days_ahead(RNG.randint(0, 12))
            )
            lead["score"] = _score_lead(lead)
            leads.append(lead)
        await db.leads.insert_many(leads)
    else:
        leads = await db.leads.find({}, {"_id": 0}).to_list(500)

    won_leads = [l for l in leads if l["status"] == "Won"]

    # ----- Customers (80) -----
    existing_customer_count = await db.customers.count_documents({})
    customers = []
    if existing_customer_count < 80:
        await db.customers.delete_many({})
        # ~60 real paying customers seeded from Won leads (+ synthetic fill if not enough), ~20 prospects/inactive
        source_pool = won_leads[:60] if len(won_leads) >= 60 else won_leads
        for i in range(80):
            if i < len(source_pool):
                lead = source_pool[i]
                status = "Customer"
                lead_id = lead["id"]
                name, company, phone, email = lead["name"], lead["company"], lead["phone"], lead["email"]
                city, state, industry, source = lead["city"], lead["state"], lead["industry"], lead["source"]
                assigned_to = lead["assigned_to"]
                created_days_ago = RNG.randint(20, 175)
            else:
                person = _person_name()
                company = INDIAN_COMPANIES[(i * 7) % len(INDIAN_COMPANIES)]
                city, state = RNG.choice(CITIES)
                name, phone, email = person, _phone(), _email(person, company)
                industry, source = RNG.choice(INDUSTRIES), RNG.choice(SOURCES)
                assigned_to = RNG.choice(assignable_ids)
                status = RNG.choice(["Prospect", "Prospect", "Customer", "Inactive"])
                lead_id = None
                created_days_ago = RNG.randint(5, 150)
            customers.append({
                "id": str(uuid.uuid4()),
                "name": name,
                "company": company,
                "phone": phone,
                "email": email,
                "city": city,
                "state": state,
                "industry": industry,
                "source": source,
                "assigned_to": assigned_to,
                "status": status,
                "lead_id": lead_id,
                "notes": "",
                "created_at": _days_ago(created_days_ago),
                "updated_at": _days_ago(RNG.randint(0, min(created_days_ago, 20))),
                "last_activity": _days_ago(RNG.randint(0, min(created_days_ago, 10))),
            })
        await db.customers.insert_many(customers)
    else:
        customers = await db.customers.find({}, {"_id": 0}).to_list(200)

    paying_customers = [c for c in customers if c["status"] == "Customer"]

    # ----- Sales (110) -----
    existing_sale_count = await db.sales.count_documents({})
    sales = []
    if existing_sale_count < 110 and paying_customers:
        await db.sales.delete_many({})
        for i in range(110):
            cust = RNG.choice(paying_customers)
            sale_amount = RNG.choice([25000, 40000, 60000, 90000, 120000, 150000, 200000, 275000, 350000])
            cost_amount = round(sale_amount * RNG.uniform(0.45, 0.72))
            discount = round(sale_amount * RNG.uniform(0, 0.08))
            tax = round((sale_amount - discount) * 0.18)
            sale_days_ago = RNG.randint(0, 175)
            sale_date = _days_ago(sale_days_ago)
            due_date = _days_ahead(RNG.randint(7, 30), hours=-sale_days_ago * 24) if sale_days_ago else _days_ahead(15)
            totals = compute_sale_totals(sale_amount, cost_amount, discount, tax, paid_amount=0)

            # Decide how much has been paid so far (drives status distribution)
            roll = RNG.random()
            if roll < 0.55:
                paid_amount = totals["final_amount"]  # fully paid
            elif roll < 0.80:
                paid_amount = round(totals["final_amount"] * RNG.uniform(0.3, 0.75))  # partial
            else:
                paid_amount = 0  # pending

            totals = compute_sale_totals(sale_amount, cost_amount, discount, tax, paid_amount=paid_amount)
            status = derive_payment_status(totals["final_amount"], paid_amount, due_date, _now())
            if status == "Pending" and sale_days_ago < 3:
                status = "Confirmed"

            sale = {
                "id": str(uuid.uuid4()),
                "sale_no": f"INV-{1000 + i}",
                "customer_id": cust["id"],
                "assigned_to": cust["assigned_to"],
                "product_service": RNG.choice(PRODUCTS),
                "quantity": RNG.choice([1, 1, 1, 2, 3]),
                "sale_amount": sale_amount,
                "cost_amount": totals["cost_amount"],
                "discount": discount,
                "tax": tax,
                "subtotal": totals["subtotal"],
                "final_amount": totals["final_amount"],
                "paid_amount": totals["paid_amount"],
                "pending_amount": totals["pending_amount"],
                "gross_profit": totals["gross_profit"],
                "net_profit": totals["net_profit"],
                "margin_pct": totals["margin_pct"],
                "status": status,
                "sale_date": sale_date,
                "due_date": due_date,
                "notes": "",
                "created_at": sale_date,
            }
            sales.append(sale)
        await db.sales.insert_many(sales)
    else:
        sales = await db.sales.find({}, {"_id": 0}).to_list(500)

    # ----- Payments (derived from each sale's paid_amount, 1-3 installments) -----
    existing_payment_count = await db.payments.count_documents({})
    if existing_payment_count < 100 and sales:
        await db.payments.delete_many({})
        payments = []
        for sale in sales:
            remaining = sale["paid_amount"]
            if remaining <= 0:
                continue
            installments = 1 if remaining < 60000 else RNG.choice([1, 2])
            for n in range(installments):
                chunk = round(remaining / (installments - n)) if n < installments - 1 else remaining
                remaining -= chunk
                if chunk <= 0:
                    continue
                sale_dt_days_ago = max(0, (datetime.now(timezone.utc) - datetime.fromisoformat(sale["sale_date"])).days)
                pay_days_ago = RNG.randint(0, sale_dt_days_ago) if sale_dt_days_ago else 0
                payments.append({
                    "id": str(uuid.uuid4()),
                    "sale_id": sale["id"],
                    "customer_id": sale["customer_id"],
                    "assigned_to": sale["assigned_to"],
                    "amount": chunk,
                    "payment_date": _days_ago(pay_days_ago),
                    "payment_method": RNG.choice(PAYMENT_METHODS),
                    "collected_by": sale["assigned_to"],
                    "status": "Paid",
                    "notes": "",
                    "created_at": _days_ago(pay_days_ago),
                })
        if payments:
            await db.payments.insert_many(payments)

    # ----- Expenses (60, spread over 6 months) -----
    if await db.expenses.count_documents({}) < 60:
        await db.expenses.delete_many({})
        expenses = []
        for i in range(60):
            category = RNG.choice(EXPENSE_CATEGORIES)
            amount = {
                "Salary": RNG.choice([280000, 320000, 380000, 450000]),
                "Marketing": RNG.choice([15000, 25000, 40000, 60000]),
                "Advertising": RNG.choice([10000, 20000, 35000, 50000]),
                "Travel": RNG.choice([3000, 6000, 12000]),
                "Office": RNG.choice([8000, 15000, 25000]),
                "Software": RNG.choice([2000, 5000, 9000]),
                "Operations": RNG.choice([4000, 9000, 18000]),
                "Other": RNG.choice([1500, 3500, 7000]),
            }[category]
            days_ago = RNG.randint(0, 178)
            expenses.append({
                "id": str(uuid.uuid4()),
                "category": category,
                "description": RNG.choice(EXPENSE_DESCRIPTIONS[category]),
                "amount": amount,
                "date": _days_ago(days_ago),
                "added_by": owner_id,
                "payment_method": RNG.choice(PAYMENT_METHODS),
                "notes": "",
                "created_at": _days_ago(days_ago),
            })
        await db.expenses.insert_many(expenses)

    lead_ids = [l["id"] for l in leads]

    # ----- Referential integrity: drop activity/call/task/WhatsApp rows left over from a
    # previous seed generation that point at leads which no longer exist (their id-space is
    # regenerated whenever the lead count check above triggers a reseed). -----
    valid_lead_ids = set(lead_ids)
    for coll, field in (("activities", "lead_id"), ("calls", "lead_id"), ("tasks", "lead_id"), ("whatsapp_messages", "lead_id")):
        existing_ids = await db[coll].distinct(field)
        orphaned = [i for i in existing_ids if i and i not in valid_lead_ids]
        if orphaned:
            await db[coll].delete_many({field: {"$in": orphaned}})

    # ----- Tasks -----
    if await db.tasks.count_documents({}) < 60:
        await db.tasks.delete_many({})
        tasks = []
        for _ in range(60):
            tasks.append({
                "id": str(uuid.uuid4()),
                "title": RNG.choice([
                    "Send proposal", "Follow up call", "Send pricing sheet",
                    "Schedule demo", "Site visit", "Send contract", "Collect payment",
                    "Onboarding call", "Check requirements", "Send brochure"
                ]),
                "description": "Auto-generated task for follow up with lead.",
                "type": RNG.choice(["Call", "Follow-up", "Meeting", "WhatsApp", "Email", "Other"]),
                "lead_id": RNG.choice(lead_ids),
                "assigned_to": RNG.choice(assignable_ids),
                "priority": RNG.choice(LEAD_PRIORITIES),
                "due_date": _days_ahead(RNG.randint(-3, 14)),
                "status": RNG.choice(TASK_STATUSES[:3]),
                "created_at": _days_ago(RNG.randint(0, 15)),
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
                "user_id": RNG.choice(assignable_ids),
                "type": RNG.choice(types),
                "description": RNG.choice([
                    "Called lead, discussed requirements.",
                    "Sent WhatsApp follow up.",
                    "Updated lead status.",
                    "Added internal note.",
                    "Sent proposal via email.",
                ]),
                "created_at": _days_ago(RNG.randint(0, 30)),
            })
        await db.activities.insert_many(activities)

    # ----- Calls -----
    if await db.calls.count_documents({}) < 120:
        await db.calls.delete_many({})
        calls = []
        for _ in range(120):
            outcome = RNG.choice(CALL_OUTCOMES)
            duration = RNG.randint(15, 480) if outcome in ("Connected", "Interested") else RNG.randint(0, 20)
            calls.append({
                "id": str(uuid.uuid4()),
                "lead_id": RNG.choice(lead_ids),
                "user_id": RNG.choice(assignable_ids),
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
                "created_at": _days_ago(RNG.randint(0, 20)),
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
                    "user_id": RNG.choice(assignable_ids) if outbound else None,
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
        for i in range(8):
            notifs.append({
                "id": str(uuid.uuid4()),
                "user_id": owner_id,
                "type": RNG.choice(["lead_assigned", "task_due", "follow_up", "call_scheduled"]),
                "title": RNG.choice([
                    "New lead assigned to you",
                    "Task due tomorrow",
                    "Follow up reminder",
                    "Scheduled call in 1 hour",
                ]),
                "message": "Check your dashboard for details.",
                "read": False,
                "created_at": _days_ago(RNG.randint(0, 3)),
            })
        await db.notifications.insert_many(notifs)

    # ----- Settings -----
    if not await db.settings.find_one({"id": "company"}):
        await db.settings.insert_one({
            "id": "company",
            "company_name": "ParshWebCraft",
            "address": "12, MG Road, Bangalore, Karnataka 560001",
            "gst_number": "29ABCDE1234F1Z5",
            "logo_url": "",
            "integrations": {
                "whatsapp_api": "",
                "calling_api": "",
                "openai_api": "",
            },
        })

    return {"users": len(users), "leads": len(leads), "customers": len(customers), "sales": len(sales)}
