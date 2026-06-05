import { NavLink } from "react-router-dom";
import { House, UsersThree, Phone, WhatsappLogo, ListChecks } from "@phosphor-icons/react";

const ITEMS = [
  { to: "/dashboard", label: "Home", icon: House, testid: "bnav-dashboard" },
  { to: "/leads", label: "Leads", icon: UsersThree, testid: "bnav-leads" },
  { to: "/calls", label: "Calls", icon: Phone, testid: "bnav-calls" },
  { to: "/whatsapp", label: "Chat", icon: WhatsappLogo, testid: "bnav-whatsapp" },
  { to: "/tasks", label: "Tasks", icon: ListChecks, testid: "bnav-tasks" },
];

export default function BottomNav() {
  return (
    <nav
      data-testid="bottom-nav"
      className="mobile-only fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-[#E2E8F0] bg-white"
    >
      <div className="grid h-full grid-cols-5">
        {ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            data-testid={it.testid}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-[#0B1B3D]" : "text-slate-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <it.icon size={22} weight={isActive ? "fill" : "regular"} />
                <span>{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
