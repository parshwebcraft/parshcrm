import { NavLink } from "react-router-dom";
import {
  House,
  UsersThree,
  Kanban,
  Phone,
  WhatsappLogo,
  ListChecks,
  IdentificationBadge,
  ChartBar,
  Gear,
} from "@phosphor-icons/react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: House, testid: "nav-dashboard" },
  { to: "/leads", label: "Leads", icon: UsersThree, testid: "nav-leads" },
  { to: "/pipeline", label: "Pipeline", icon: Kanban, testid: "nav-pipeline" },
  { to: "/calls", label: "Calls", icon: Phone, testid: "nav-calls" },
  { to: "/whatsapp", label: "WhatsApp", icon: WhatsappLogo, testid: "nav-whatsapp" },
  { to: "/tasks", label: "Tasks", icon: ListChecks, testid: "nav-tasks" },
  { to: "/employees", label: "Employees", icon: IdentificationBadge, testid: "nav-employees" },
  { to: "/reports", label: "Reports", icon: ChartBar, testid: "nav-reports" },
  { to: "/settings", label: "Settings", icon: Gear, testid: "nav-settings" },
];

export default function Sidebar() {
  return (
    <aside className="desktop-only fixed left-0 top-0 z-40 h-screen w-64 bg-[#0B1B3D] text-white">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-white text-[#0B1B3D] font-display font-black">
          F
        </div>
        <div className="font-display text-lg font-bold tracking-tight">
          Facets <span className="text-white/60">CRM</span>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-[#0B1B3D]"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon size={20} weight="duotone" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="absolute bottom-4 left-3 right-3 rounded-md border border-white/10 bg-white/5 p-3 text-xs text-white/60">
        <div className="font-display font-semibold text-white">
          Facets Lifestyle
        </div>
        Internal CRM — v1.0
      </div>
    </aside>
  );
}
