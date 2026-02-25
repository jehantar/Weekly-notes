"use client";

import { useState, useRef, useEffect } from "react";

type Option = {
  value: string;
  label: string;
  dotColor: string;
};

type PropertyDropdownProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function PropertyDropdown({ label, value, options, onChange }: PropertyDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      className="flex items-center justify-between py-2 text-xs"
      style={{ borderBottom: '1px solid var(--border-card)' }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-1.5 py-0.5 transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {selected && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selected.dotColor }}
            />
          )}
          {selected?.label ?? value}
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1 w-36 z-50 py-1"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-card-hover)',
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: option.value === value ? 'var(--bg-hover)' : 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: option.dotColor }}
                />
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
