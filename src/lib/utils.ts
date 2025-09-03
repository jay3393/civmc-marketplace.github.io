import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 

export function getTimestampLocalTimezone(timestamp: string) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset();
  const localTime = new Date(date.getTime() - offset * 60 * 1000);
  return localTime.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}