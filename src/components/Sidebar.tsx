import React from "react";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Settings2,
  History,
  SearchCheck,
} from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "rules", label: "Rule Engine", icon: Settings2 },
    { id: "processor", label: "File Processor", icon: FileSpreadsheet },
    { id: "search-term", label: "Search Term", icon: SearchCheck },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold">
          AC
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
          AutoCamp
        </span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
            DE
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-white">Top 1 Expert</span>
            <span className="text-xs text-slate-500">Amazon Ads</span>
          </div>
        </div>
      </div>
    </div>
  );
};
