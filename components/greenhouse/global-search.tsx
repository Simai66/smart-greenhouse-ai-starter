"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { DashboardSearchResult } from "@/lib/dashboard-interactions";

export function GlobalSearch({
  idPrefix,
  value,
  activeIndex,
  results,
  autoFocus,
  onValueChange,
  onActiveIndexChange,
  onChoose,
}: {
  idPrefix: string;
  value: string;
  activeIndex: number;
  results: DashboardSearchResult[];
  autoFocus?: boolean;
  onValueChange: (value: string) => void;
  onActiveIndexChange: (index: number) => void;
  onChoose: (result: DashboardSearchResult) => void;
}) {
  const listId = idPrefix + "-results";
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        autoFocus={autoFocus}
        className="min-h-11 pl-9"
        role="combobox"
        aria-label="ค้นหาทั่วทั้งโรงเรือน"
        aria-controls={listId}
        aria-expanded={Boolean(value)}
        aria-autocomplete="list"
        aria-activedescendant={results[activeIndex] ? idPrefix + "-option-" + results[activeIndex].key : undefined}
        placeholder="ค้นหาพืช อุปกรณ์ หรือเหตุการณ์"
        value={value}
        onChange={(event) => { onValueChange(event.target.value); onActiveIndexChange(0); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { onValueChange(""); return; }
          if (!results.length) return;
          if (event.key === "ArrowDown") { event.preventDefault(); onActiveIndexChange((activeIndex + 1) % results.length); }
          if (event.key === "ArrowUp") { event.preventDefault(); onActiveIndexChange((activeIndex - 1 + results.length) % results.length); }
          if (event.key === "Home") { event.preventDefault(); onActiveIndexChange(0); }
          if (event.key === "End") { event.preventDefault(); onActiveIndexChange(results.length - 1); }
          if (event.key === "Enter") { event.preventDefault(); onChoose(results[activeIndex] ?? results[0]); }
        }}
      />
      {value ? (
        <div id={listId} role="listbox" aria-label="ผลการค้นหา" className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {results.length ? results.map((result, index) => (
            <button id={idPrefix + "-option-" + result.key} key={result.key} role="option" aria-selected={index === activeIndex} className="flex min-h-11 w-full flex-col justify-center rounded-md px-3 text-left hover:bg-accent aria-selected:bg-accent" onMouseDown={(event) => event.preventDefault()} onClick={() => onChoose(result)}>
              <strong className="text-sm">{result.label}</strong>
              <small className="text-muted-foreground">{result.detail}</small>
            </button>
          )) : <p className="p-4 text-center text-sm text-muted-foreground">ไม่พบผลลัพธ์</p>}
        </div>
      ) : null}
    </div>
  );
}
