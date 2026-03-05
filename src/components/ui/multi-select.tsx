"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione...",
  allLabel = "Todos",
  className,
}: {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function clear() {
    onChange([]);
  }

  const isAll = selected.length === 0;
  const selectedLabels = selected.map((v) => options.find((o) => o.value === v)?.label ?? v);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[38px]"
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {isAll ? (
            <span className="text-gray-500">{allLabel}</span>
          ) : selectedLabels.length <= 2 ? (
            selectedLabels.map((label, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal gap-1">
                {label}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={(e) => { e.stopPropagation(); toggle(selected[i]); }}
                />
              </Badge>
            ))
          ) : (
            <Badge variant="secondary" className="text-xs font-normal">
              {selected.length} selecionados
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {!isAll && (
            <X
              className="h-3.5 w-3.5 text-gray-400 hover:text-red-500 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); clear(); }}
            />
          )}
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors",
                  checked && "bg-green-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className={cn("flex-1", checked && "font-medium text-green-800")}>
                  {opt.label}
                </span>
              </label>
            );
          })}
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">Nenhuma opção</p>
          )}
        </div>
      )}
    </div>
  );
}
