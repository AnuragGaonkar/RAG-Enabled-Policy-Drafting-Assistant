import React from "react"
import { Button } from "@/components/ui/button"
import { Plus, Settings, LogOut } from "lucide-react"

export function Sidebar({ isOpen, onNewChat }) {
  return (
    <div
      className={`${
        isOpen ? "w-64" : "w-0"
      } hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden`}
    >
      {/* New Chat Button */}
      <div className="p-4 border-b border-sidebar-border">
        <Button
          onClick={onNewChat}
          className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground gap-2"
        >
          <Plus size={18} />
          New Policy Draft
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wide mb-3">
          Recent Drafts
        </div>
        {[
          "Vaccination Policy 2024",
          "Patient Privacy Guidelines",
          "Emergency Response Protocol",
          "Healthcare Worker Safety",
        ].map((item, i) => (
          <button
            key={i}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm text-sidebar-foreground transition-colors truncate"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 space-y-2">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm text-sidebar-foreground transition-colors">
          <Settings size={16} />
          Settings
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm text-sidebar-foreground transition-colors">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )
}