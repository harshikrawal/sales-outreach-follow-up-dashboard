"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, UserPlus, Settings } from "lucide-react";
import clsx from "clsx";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Add Contact", href: "/contacts/new", icon: UserPlus },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold tracking-tight text-primary">SalesOutreach</h1>
        <p className="text-xs text-gray-500 mt-1">Dashboard & Follow-ups</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={clsx("w-5 h-5", isActive ? "text-primary" : "text-gray-400")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex flex-col gap-3 p-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              PK
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">Parth Kotadiya</p>
              <p className="text-xs text-gray-500">Sales Pro</p>
            </div>
          </div>
          <button 
            onClick={() => {
              document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = "/login";
            }} 
            className="text-sm text-red-500 hover:text-red-700 text-left cursor-pointer transition-colors pt-2 border-t border-gray-100"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
