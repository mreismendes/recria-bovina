"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Beef, Layers, Scale, Wheat, Pill, Package, Building2, Upload, ChevronRight } from "lucide-react";

const navItems = [
  { label: "Painel",         href: "/dashboard",     icon: LayoutDashboard },
  { label: "Animais",        href: "/animais",        icon: Beef },
  { label: "Lotes",          href: "/lotes",          icon: Layers },
  { label: "Pesagens",       href: "/pesagens",       icon: Scale },
  { label: "Suplementos",    href: "/suplementos",    icon: Wheat },
  { label: "Medicamentos",   href: "/medicamentos",   icon: Pill },
];

const configItems = [
  { label: "Produtos",       href: "/produtos",       icon: Package },
  { label: "Propriedades",   href: "/propriedades",   icon: Building2 },
  { label: "Importar",       href: "/importar",       icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname.startsWith(item.href);
    return (
      <Link href={item.href}
        className={cn("group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
          isActive ? "bg-green-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white")}>
        <item.icon className={cn("mr-3 flex-shrink-0 h-5 w-5", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
        {item.label}
        {isActive && <ChevronRight className="ml-auto h-4 w-4 text-green-300" />}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-gray-900 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
            <Beef className="h-8 w-8 text-green-400" />
            <div className="ml-3">
              <p className="text-white font-bold text-sm leading-tight">Recria Bovina</p>
              <p className="text-gray-400 text-xs">Gestão Individual</p>
            </div>
          </div>

          <nav className="flex-1 px-2 space-y-1">
            {navItems.map(item => <NavLink key={item.href} item={item} />)}
          </nav>

          <div className="px-2 mt-4 pt-4 border-t border-gray-700">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cadastros</p>
            <div className="space-y-1">
              {configItems.map(item => <NavLink key={item.href} item={item} />)}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
