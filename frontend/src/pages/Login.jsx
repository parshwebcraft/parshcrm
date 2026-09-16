import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Eye, EyeSlash } from "@phosphor-icons/react";

const DEMO = [
  { label: "Owner", email: "owner@demo.com" },
  { label: "Salesperson", email: "sales1@demo.com" },
  { label: "Manager", email: "manager@demo.com" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("owner@demo.com");
  const [password, setPassword] = useState("password123");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      nav("/dashboard");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Login failed";
      toast.error(typeof msg === "string" ? msg : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-[#0B1B3D] text-white font-display font-black">
                P
              </div>
              <div>
                <div className="font-display text-xl font-bold tracking-tight">
                  ParshCRM
                </div>
                <div className="text-xs text-slate-500">
                  CRM SaaS by ParshWebCraft
                </div>
              </div>
            </div>

            <h1 className="font-display text-4xl font-black tracking-tight">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Use your ParshCRM credentials to continue.
            </p>

            <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Email
                </span>
                <input
                  data-testid="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Password
                </span>
                <div className="relative">
                  <input
                    data-testid="login-password-input"
                    type={show ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2.5 pr-10 text-sm focus:border-[#0B1B3D] focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {show ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                data-testid="login-submit-button"
                disabled={loading}
                className="mt-2 rounded-md bg-[#0B1B3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#142D66] disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="mt-8 rounded-md border border-[#E2E8F0] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Demo credentials
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    data-testid={`demo-${d.label.toLowerCase()}-btn`}
                    onClick={() => {
                      setEmail(d.email);
                      setPassword("password123");
                    }}
                    className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-[#0B1B3D] hover:text-[#0B1B3D]"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Password for all demo users:{" "}
                <span className="font-mono font-semibold text-slate-900">
                  password123
                </span>
              </div>
            </div>
          </div>
        </div>
        <footer className="pt-8 text-center text-xs text-slate-500">
          <div>Copyright © {year} ParshCRM. All rights reserved.</div>
          <div className="mt-1">
            Crafted by{" "}
            <span className="font-semibold text-[#0B1B3D]">
              ParshWebCraft
            </span>
            {" "}
            | Gauransh Jaroli
          </div>
        </footer>
      </div>

      {/* Hero image side */}
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1764083267311-8a2f37838051?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBhcmNoaXRlY3R1cmUlMjBuYXZ5JTIwYmx1ZXxlbnwwfHx8fDE3ODA2MjA5OTB8MA&ixlib=rb-4.1.0&q=85"
          alt="ParshWebCraft office"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0B1B3D]/90 via-[#0B1B3D]/60 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-white/60">
            ParshWebCraft
          </div>
          <div className="mt-3 font-display text-5xl font-black leading-none">
            Sales,
            <br />
            simplified.
          </div>
          <div className="mt-4 max-w-md text-sm text-white/70">
            One workspace for leads, calls, WhatsApp, follow-ups and AI-powered
            insights. Built for growing sales teams.
          </div>
        </div>
      </div>
    </div>
  );
}
