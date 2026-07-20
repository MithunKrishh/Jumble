import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, LogOut } from "lucide-react";

export const AuthenticatedNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-950">
            <span className="text-sm font-black tracking-tight">J</span>
          </div>
          <span className="text-sm font-semibold tracking-[0.35em] text-white">JUMBLE</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/dashboard"
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              location.pathname === "/dashboard"
                ? "border-white bg-white text-slate-950"
                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-slate-200 hover:bg-white/5">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
};
