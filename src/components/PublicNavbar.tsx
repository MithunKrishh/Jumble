import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, X, Sparkles, ArrowRight } from "lucide-react";

interface PublicNavbarProps {
  onHowItWorksClick?: () => void;
}

export const PublicNavbar = ({ onHowItWorksClick }: PublicNavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleHowItWorks = () => {
    if (onHowItWorksClick) {
      onHowItWorksClick();
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-extrabold text-lg tracking-tight font-display">J</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 font-display">JUMBLE</span>
              <span className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase -mt-1">AI Study Architect</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={handleHowItWorks}
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              How It Works
            </button>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-slate-700 hover:text-indigo-600 hover:bg-slate-100 font-semibold rounded-xl">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-5 shadow-md shadow-indigo-600/20 gap-1.5">
                <Sparkles className="w-4 h-4" /> Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-3 shadow-xl">
          <button
            onClick={handleHowItWorks}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 w-full text-left"
          >
            How It Works
          </button>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full font-bold border-slate-200 text-slate-700 rounded-xl">
                Sign In
              </Button>
            </Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button size="sm" className="w-full font-bold bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};