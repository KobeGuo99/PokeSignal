import { dateKey } from "@/lib/utils/date";

export function shouldRunAutomaticSync(lastSyncAt: Date | null, now: Date): boolean {
  if (!lastSyncAt) {
    return true;
  }

  return dateKey(lastSyncAt) !== dateKey(now);
}
