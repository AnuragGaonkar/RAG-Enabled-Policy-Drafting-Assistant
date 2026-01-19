import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, FileText, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeToggle } from './mode-toggle';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="h-16 border-b border-border bg-background px-6 flex items-center justify-between sticky top-0 z-50 shrink-0 transition-colors duration-300">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
          P
        </div>
        <div className="hidden md:block">
          <h1 className="font-bold text-lg leading-tight text-foreground">PolicyAI</h1>
          <p className="text-xs text-muted-foreground">Ministry of Healthcare</p>
        </div>
      </div>

      {/* Center Navigation */}
      <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border">
        <NavItem to="/" icon={MessageSquare} label="AI Chat" />
        <NavItem to="/draft" icon={FileText} label="Policy Editor" />
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <ModeToggle />
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-colors border border-transparent hover:border-border outline-none"
          >
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-medium text-sm">
              AG
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-foreground">Anurag G.</p>
              <p className="text-[10px] text-muted-foreground leading-none">Admin</p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-200 text-popover-foreground">
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors">
                  <Settings size={16} />
                  Settings
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors">
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
      isActive 
        ? "bg-background text-primary shadow-sm ring-1 ring-border" 
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )}
  >
    <Icon size={16} />
    <span>{label}</span>
  </NavLink>
);

export default Navbar;