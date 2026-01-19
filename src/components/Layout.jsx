import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

const SidebarItem = ({ icon: Icon, label, path, active }) => (
  <Link
    to={path}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group",
      active 
        ? "bg-blue-50 text-blue-700" 
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <Icon size={20} className={cn(active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            PolicyAI
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            path="/" 
            active={location.pathname === '/'} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Draft New Policy" 
            path="/draft" 
            active={location.pathname.includes('/draft')} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            path="/settings" 
            active={location.pathname === '/settings'} 
          />
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-medium w-full px-2">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
};

export default Layout;