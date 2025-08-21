import React from 'react';
import { Link } from "react-router-dom";
import { BarChart3, Database, EyeIcon, Settings, Download } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: "data", label: "Data View", icon: Database, path: "/data" },
    { id: "charts", label: "Analytics", icon: BarChart3, path: "/analytics" },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: EyeIcon,
      path: "/dashboard",
    }, // Update to /dashboard
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="w-44 bg-slate-900 text-white h-screen flex flex-col">
      <div className="p-2 py-6 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold">Analytics Hub</h1>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.path} // Use Link here to handle navigation
                  onClick={() => onTabChange(item.id)} // Handle active tab change
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <Download className="h-5 w-5" />
          <span>Export Data</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;