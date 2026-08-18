import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCopyRightYearsDisplay(): string {
  const startYear = 2026;
  const currentYear = new Date().getFullYear();
  return currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;
}
