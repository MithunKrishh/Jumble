import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";

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
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">J</span>
            </div>
            <span className="font-bold text-xl text-foreground">JUMBLE</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={handleHowItWorks}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </button>
            <Link to="/login">
              <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">Log In</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-secondary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="px-4 py-3 space-y-1">
            <button
              onClick={handleHowItWorks}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full text-left"
            >
              How It Works
            </button>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">Log In</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};