"""Shared enums for ParshCRM, used by both server.py (API validation) and seed.py (demo data)."""

OWNER_ROLES = ("admin", "manager")

LEAD_STATUSES = ["New", "Contacted", "Follow Up", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"]
LEAD_PRIORITIES = ["Low", "Medium", "High"]
SOURCES = ["Website", "WhatsApp", "Google Ads", "Facebook Ads", "Referral", "Cold Call", "IndiaMART", "Other"]

CUSTOMER_STATUSES = ["Lead", "Prospect", "Customer", "Inactive"]

SALE_STATUSES = ["Draft", "Confirmed", "Partially Paid", "Paid", "Cancelled"]

PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"]
PAYMENT_STATUSES = ["Paid", "Partial", "Pending", "Overdue"]

EXPENSE_CATEGORIES = ["Salary", "Marketing", "Advertising", "Travel", "Office", "Software", "Operations", "Other"]

TASK_TYPES = ["Call", "Follow-up", "Meeting", "WhatsApp", "Email", "Other"]
TASK_STATUSES = ["Pending", "In Progress", "Completed", "Overdue"]

CALL_OUTCOMES = ["Connected", "Not Connected", "Interested", "Callback Requested", "Not Interested", "Wrong Number"]
