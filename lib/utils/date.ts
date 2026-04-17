import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";

export function toStartOfDay(date: Date): Date {
  return startOfDay(date);
}

export function dateKey(date: Date): string {
  return format(toStartOfDay(date), "yyyy-MM-dd");
}

export function daysBetween(left: Date, right: Date): number {
  return differenceInCalendarDays(toStartOfDay(left), toStartOfDay(right));
}

export function addCalendarDays(date: Date, days: number): Date {
  return addDays(toStartOfDay(date), days);
}
