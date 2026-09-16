"""Reusable financial calculations for ParshCRM sales, shared by the API and the demo seeder.

Every number the UI shows for a sale (subtotal, final amount, profit, pending balance)
must come from these functions rather than being computed ad-hoc in a template, so the
math is guaranteed identical everywhere it appears (sale row, customer profile, dashboard).
"""
from typing import Optional


def round2(n: float) -> float:
    return round(n + 1e-9, 2)


def compute_sale_totals(
    sale_amount: float,
    cost_amount: float = 0,
    discount: float = 0,
    tax: float = 0,
    paid_amount: float = 0,
) -> dict:
    """Sale amount -> discount -> tax -> final amount, plus cost/profit and payment balance."""
    sale_amount = float(sale_amount or 0)
    cost_amount = float(cost_amount or 0)
    discount = float(discount or 0)
    tax = float(tax or 0)
    paid_amount = float(paid_amount or 0)

    subtotal = max(0.0, sale_amount - discount)
    final_amount = max(0.0, subtotal + tax)
    pending_amount = max(0.0, round2(final_amount - paid_amount))
    gross_profit = round2(sale_amount - cost_amount)
    net_profit = round2(final_amount - cost_amount)
    margin_pct = round2((net_profit / final_amount) * 100) if final_amount else 0.0

    return {
        "subtotal": round2(subtotal),
        "final_amount": round2(final_amount),
        "cost_amount": round2(cost_amount),
        "paid_amount": round2(paid_amount),
        "pending_amount": pending_amount,
        "gross_profit": gross_profit,
        "net_profit": net_profit,
        "margin_pct": margin_pct,
    }


def derive_payment_status(final_amount: float, paid_amount: float, due_date: Optional[str], now_iso: str) -> str:
    """Payment status for a sale: Paid / Partial / Pending / Overdue (due date passed with a balance)."""
    final_amount = float(final_amount or 0)
    paid_amount = float(paid_amount or 0)
    if paid_amount >= final_amount and final_amount > 0:
        return "Paid"
    if due_date and due_date < now_iso and paid_amount < final_amount:
        return "Overdue"
    if paid_amount > 0:
        return "Partial"
    return "Pending"


def achievement_pct(actual: float, target: float) -> float:
    if not target:
        return 0.0
    return round2(min(999.0, (actual / target) * 100))
