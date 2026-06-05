import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";

export default function Layout() {
  const location = useLocation();
  const isWhatsApp = location.pathname.startsWith("/whatsapp");
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar />
      <TopBar />
      <main
        className={`lg:pl-64 pt-14 ${
          isWhatsApp ? "" : "pb-20 lg:pb-0"
        }`}
      >
        <div className={isWhatsApp ? "" : "p-4 md:p-6 lg:p-8"}>
          <Outlet />
        </div>
        {!isWhatsApp && (
          <footer className="border-t border-[#E2E8F0] bg-white px-4 py-4 text-xs text-slate-500 md:px-6 lg:ml-0 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>Copyright © {year} Facets CRM AI. All rights reserved.</div>
              <div>
                Crafted by{" "}
                <span className="font-semibold text-[#0B1B3D]">
                  ParshWebCraft
                </span>
                {" "}
                | Gauransh Jaroli
              </div>
            </div>
          </footer>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
