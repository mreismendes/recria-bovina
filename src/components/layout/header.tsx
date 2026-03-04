"use client";

import { Bell, User } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div />
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
          <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">Usuário</span>
        </div>
      </div>
    </header>
  );
}
