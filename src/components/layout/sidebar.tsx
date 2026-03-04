"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Beef,
  Layers,
  Scale,
  Wheat,
  Pill,
  Package,
  Settings,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { label: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { label: "Animais", href: "/animais", icon: Beef },
  { label: "Lotes", href: "/lotes", icon: Layers },
  { label: "Pesagens", href: "/pesagens", icon: Scale },
  { label: "Suplementos", href: "/suplementos", icon: Wheat },
  { label: "Medicamentos", href: "/medicamentos", icon: Pill },
  { label: "Produtos", href: "/produtos", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-gray-900 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
            <Beef className="h-8 w-8 text-green-400" />
            <div className="ml-3">
              <p className="text-white font-bold text-sm leading-tight">Recria Bovina</p>
              <p className="text-gray-400 text-xs">Gestão Individual</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-green-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5",
                      isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  {item.label}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4 text-green-300" />}
                </Link>
              );
            })}
          </nav>

          {/* Settings */}
          <div className="flex-shrink-0 px-2 pb-2">
            <Link
              href="/configuracoes"
              className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Settings className="mr-3 h-5 w-5 text-gray-400 group-hover:text-white" />
              Configurações
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
