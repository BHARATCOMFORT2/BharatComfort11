import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind classes conditionally
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount)
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string) {
  if (!text) return ""
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Generate random ID
 */
export function generateId(prefix: string = "id") {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Delay utility (async)
 */
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/* ----------------- DATE UTILITIES ----------------- */

/**
 * Format date for UI
 * Example: formatDate(new Date()) => "14 Sep 2025"
 */
export function formatDate(date: Date | string, locale: string = "en-IN") {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d)
}

/**
 * Format time for UI
 * Example: formatTime(new Date()) => "07:30 PM"
 */
export function formatTime(date: Date | string, locale: string = "en-IN") {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

/**
 * Get trip duration in days
 * Example: tripDuration("2025-09-14", "2025-09-20") => 6
 */
export function tripDuration(start: string | Date, end: string | Date) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24))
}

/**
 * Check if a date is past
 */
export function isPast(date: string | Date) {
  return new Date(date).getTime() < Date.now()
}

/**
 * Check if date is today
 */
export function isToday(date: string | Date) {
  const d = new Date(date)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}
