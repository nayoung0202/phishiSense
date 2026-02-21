import React from "react";
import { cn } from "@/lib/utils";

type SafeTextProps = {
  value?: string | null;
  fallback?: string;
  maxLength?: number;
  className?: string;
};

export function SafeText({ value, fallback = "", maxLength, className }: SafeTextProps) {
  if (typeof value !== "string" || value.length === 0) {
    if (!fallback) return null;
    return <span className={cn(className)}>{fallback}</span>;
  }
  let display = value;
  if (maxLength && display.length > maxLength) {
    display = `${display.slice(0, maxLength)}…`;
  }
  return <span className={cn(className)}>{display}</span>;
}
