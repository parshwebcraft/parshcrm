export const STATUS_COLORS = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Contacted: "bg-blue-50 text-blue-700 border-blue-200",
  Interested: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Follow Up": "bg-amber-50 text-amber-700 border-amber-200",
  "Proposal Sent": "bg-violet-50 text-violet-700 border-violet-200",
  Negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  Won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Lost: "bg-rose-50 text-rose-700 border-rose-200",
};

export const STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Follow Up",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
];

export const SOURCES = [
  "Website",
  "Referral",
  "Cold Call",
  "WhatsApp",
  "Facebook Ads",
  "Google Ads",
  "LinkedIn",
  "Event",
];

export const PRIORITIES = ["Low", "Medium", "High"];
export const TASK_STATUSES = ["Pending", "In Progress", "Completed"];

export function formatINR(n) {
  if (!n && n !== 0) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
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
