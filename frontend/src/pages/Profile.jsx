import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials, ROLE_LABELS } from "@/lib/constants";
import { Switch } from "@/components/ui/switch";
import {
  Moon,
  Sun,
  SignOut,
  Lock,
  FloppyDisk,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const ROLE_COLORS = {
  admin: "bg-[#0B1B3D]/10 text-[#0B1B3D] border-[#0B1B3D]/20",
  manager: "bg-violet-50 text-violet-700 border-violet-200",
  sales: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [form, setForm] = useState({ name: "", phone: "", avatar: "" });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || "", phone: user.phone || "", avatar: user.avatar || "" });
    }
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    setChangingPw(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pw.current_password,
        new_password: pw.new_password,
      });
      toast.success("Password changed");
      setPw({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Account
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">
          My Profile
        </h1>
      </div>

      {/* Identity card */}
      <div className="rounded-md border border-[#E2E8F0] bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          {form.avatar ? (
            <img
              src={form.avatar}
              alt={user.name}
              className="h-20 w-20 rounded-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#0B1B3D] font-display text-2xl font-black text-white">
              {initials(user.name)}
            </div>
          )}
          <div className="flex-1">
            <div className="font-display text-2xl font-bold">{user.name}</div>
            <div className="text-sm text-slate-500">{user.email}</div>
            <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.sales}`}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
          <button
            data-testid="profile-signout-btn"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <SignOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {/* Edit profile */}
      <form onSubmit={saveProfile} className="rounded-md border border-[#E2E8F0] bg-white p-6">
        <div className="font-display text-lg font-bold">Profile details</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Full name</span>
            <input
              data-testid="profile-name-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Phone</span>
            <input
              data-testid="profile-phone-input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Avatar URL</span>
            <input
              data-testid="profile-avatar-input"
              value={form.avatar}
              onChange={(e) => set("avatar", e.target.value)}
              placeholder="https://…"
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Email</span>
            <input value={user.email} disabled className="rounded-md border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-sm text-slate-500" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Role</span>
            <input value={ROLE_LABELS[user.role] || user.role} disabled className="rounded-md border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-sm capitalize text-slate-500" />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            data-testid="profile-save-btn"
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[#0B1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142D66] disabled:opacity-50"
          >
            <FloppyDisk size={14} /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Appearance */}
      <div className="rounded-md border border-[#E2E8F0] bg-white p-6">
        <div className="font-display text-lg font-bold">Appearance</div>
        <div className="mt-4 flex items-center justify-between rounded-md border border-[#F1F5F9] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-[#0B1B3D]/5 text-[#0B1B3D]">
              {isDark ? <Moon size={18} weight="duotone" /> : <Sun size={18} weight="duotone" />}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">Dark mode</div>
              <div className="text-xs text-slate-500">
                {isDark ? "Currently on — easier on the eyes at night." : "Currently off — the default light workspace."}
              </div>
            </div>
          </div>
          <Switch
            data-testid="dark-mode-toggle"
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={changePassword} className="rounded-md border border-[#E2E8F0] bg-white p-6">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <Lock size={18} /> Change password
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Current password</span>
            <input
              type="password"
              required
              value={pw.current_password}
              onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">New password</span>
            <input
              type="password"
              required
              minLength={6}
              value={pw.new_password}
              onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Confirm new password</span>
            <input
              type="password"
              required
              minLength={6}
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              className="rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={changingPw}
            className="rounded-md border border-[#E2E8F0] px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {changingPw ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
