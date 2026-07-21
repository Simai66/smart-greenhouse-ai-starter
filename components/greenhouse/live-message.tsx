"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LiveMessageValue = {
  message: string;
  tone: "success" | "info" | "error";
} | null;

export function LiveMessage({ value, onClose }: { value: LiveMessageValue; onClose: () => void }) {
  if (!value) return null;
  return <div className="fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border bg-popover p-3 shadow-lg" role="status"><span className={value.tone === "error" ? "size-2 rounded-full bg-destructive" : value.tone === "info" ? "size-2 rounded-full bg-blue-600" : "size-2 rounded-full bg-primary"} aria-hidden="true" /><span className="text-sm">{value.message}</span><Button variant="ghost" size="icon" className="size-11" aria-label="ปิดข้อความ" onClick={onClose}><X aria-hidden="true" /></Button></div>;
}
