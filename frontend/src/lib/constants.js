export const STATUS_COLORS = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Contacted: "bg-blue-50 text-blue-700 border-blue-200",
  Qualified: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Follow Up": "bg-amber-50 text-amber-700 border-amber-200",
  "Proposal Sent": "bg-violet-50 text-violet-700 border-violet-200",
  Negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  Won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Lost: "bg-rose-50 text-rose-700 border-rose-200",
};

export const STATUSES = [
  "New",
  "Contacted",
  "Follow Up",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
];

export const SOURCES = [
  "Website",
  "WhatsApp",
  "Google Ads",
  "Facebook Ads",
  "Referral",
  "Cold Call",
  "IndiaMART",
  "Other",
];

export const PRIORITIES = ["Low", "Medium", "High"];
export const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Overdue"];
export const TASK_TYPES = ["Call", "Follow-up", "Meeting", "WhatsApp", "Email", "Other"];

export const CUSTOMER_STATUSES = ["Lead", "Prospect", "Customer", "Inactive"];
export const CUSTOMER_STATUS_COLORS = {
  Lead: "bg-slate-100 text-slate-700 border-slate-200",
  Prospect: "bg-amber-50 text-amber-700 border-amber-200",
  Customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-rose-50 text-rose-700 border-rose-200",
};

export const SALE_STATUSES = ["Draft", "Confirmed", "Partially Paid", "Paid", "Cancelled"];
export const SALE_STATUS_COLORS = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  "Partially Paid": "bg-amber-50 text-amber-700 border-amber-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  // sale status is also reused to render a payment-status pill (see finance.py derive_payment_status)
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Partial: "bg-amber-50 text-amber-700 border-amber-200",
  Overdue: "bg-rose-50 text-rose-700 border-rose-200",
};

export const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];
export const EXPENSE_CATEGORIES = ["Salary", "Marketing", "Advertising", "Travel", "Office", "Software", "Operations", "Other"];
export const CALL_OUTCOMES = ["Connected", "Not Connected", "Interested", "Callback Requested", "Not Interested", "Wrong Number"];

export const ROLE_LABELS = {
  admin: "OWNER",
  manager: "MANAGER",
  sales: "SALES PERSON",
};

export const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

export function formatINR(n, opts = {}) {
  const { decimals = 2 } = opts;
  if (n === null || n === undefined || Number.isNaN(n)) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(decimals)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(decimals)}L`;
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
}

export function relTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function initials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
