import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Bell, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { initials, relTime, ROLE_LABELS } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function TopBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    api.get("/notifications").then((r) => setNotifs(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get("/leads", { params: { search: query, limit: 6 } })
        .then((r) => setResults(r.data))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-14 border-b border-[#E2E8F0] bg-white lg:left-64">
      <div className="flex h-full items-center justify-between gap-3 px-4 md:px-6">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[#0B1B3D] text-white font-display font-black">
            P
          </div>
          <span className="font-display font-bold text-[#0B1B3D]">ParshCRM</span>
        </div>

        {/* Search */}
        <div className="relative max-w-md flex-1 hidden md:block">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            data-testid="global-search-input"
            type="text"
            placeholder="Search leads, companies, phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] bg-[#FAFAFA] py-2 pl-10 pr-3 text-sm outline-none focus:border-[#0B1B3D] focus:bg-white focus:ring-2 focus:ring-[#0B1B3D]/15"
          />
          {results.length > 0 && (
            <div className="absolute mt-2 w-full rounded-md border border-[#E2E8F0] bg-white shadow-lg">
              {results.map((r) => (
                <button
                  key={r.id}
                  data-testid={`search-result-${r.id}`}
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    nav(`/leads/${r.id}`);
                  }}
                  className="flex w-full items-center justify-between gap-3 border-b border-[#F1F5F9] px-3 py-2 text-left text-sm hover:bg-slate-50 last:border-0"
                >
                  <div>
                    <div className="font-medium text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.company}</div>
                  </div>
                  <div className="text-xs text-slate-400">{r.phone}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                data-testid="notifications-btn"
                className="relative grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100"
              >
                <Bell size={20} weight="duotone" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {unread}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle className="font-display">Notifications</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-2">
                {notifs.length === 0 && (
                  <div className="text-sm text-slate-500">All caught up!</div>
                )}
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    data-testid={`notif-${n.id}`}
                    className={`rounded-md border p-3 ${
                      n.read
                        ? "border-[#E2E8F0] bg-white"
                        : "border-[#0B1B3D]/20 bg-[#0B1B3D]/5"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {n.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {n.message}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                      {relTime(n.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger
              data-testid="profile-menu-trigger"
              className="flex items-center gap-2 rounded-md p-1.5 pr-2.5 hover:bg-slate-100"
            >
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[#0B1B3D] text-xs font-semibold text-white">
                {initials(user?.name)}
              </div>
              <div className="hidden text-left md:block">
                <div className="text-xs font-semibold leading-tight text-slate-900">
                  {user?.name}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  {ROLE_LABELS[user?.role] || user?.role}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="logout-btn"
                onClick={logout}
                className="text-rose-600"
              >
                <SignOut size={16} className="mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
