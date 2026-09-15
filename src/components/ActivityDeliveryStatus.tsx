import { useEffect, useState } from "react";
import {
  activityDeliveryStatus,
  flushActivity,
} from "../platform/activity-delivery";
import type { AuthSession } from "../platform/types";

export function ActivityDeliveryStatus({ session }: { session: AuthSession }) {
  const [status, setStatus] = useState({
    pending: 0,
    rejected: 0,
    memoryOnly: false,
  });
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void activityDeliveryStatus(session.user.id).then((value) => {
        if (mounted) setStatus(value);
      });
    };
    const flush = () => {
      void flushActivity(session.user.id, session.token);
    };
    refresh();
    flush();
    window.addEventListener("activity-delivery", refresh);
    window.addEventListener("online", flush);
    return () => {
      mounted = false;
      window.removeEventListener("activity-delivery", refresh);
      window.removeEventListener("online", flush);
    };
  }, [session.token, session.user.id]);
  return (
    <div
      role="status"
      className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]"
    >
      {status.rejected
        ? `${status.rejected} activity records were rejected. Ask faculty to check access; these records are retained on this device.`
        : status.pending
          ? `${status.pending} activity records waiting to sync. Reconnect to send them to faculty.`
          : "Activity synced to faculty."}
      {status.memoryOnly && (
        <p className="mt-1 text-amber-600">
          Browser storage is unavailable. Keep this tab open until activity
          syncs.
        </p>
      )}
    </div>
  );
}
