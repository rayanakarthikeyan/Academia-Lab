import type { ActivityLog } from "./types";

type Pending = {
  id: string;
  userId: string;
  event: ActivityLog;
  rejected?: number;
};
const active = new Set<string>();
const retries = new Map<string, ReturnType<typeof setTimeout>>();
const tokens = new Map<string, string>();
const fallback = new Map<string, Pending>();
const acknowledged = new Set<string>();
let database: Promise<IDBDatabase> | undefined;

function openDatabase() {
  return (database ||= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("asterlab-activity-delivery", 1);
    request.onupgradeneeded = () =>
      request.result
        .createObjectStore("events", { keyPath: "id" })
        .createIndex("userId", "userId");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

async function write(item: Pending, remove = false) {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("events", "readwrite");
      const store = transaction.objectStore("events");
      if (remove) store.delete(item.id);
      else store.put(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    fallback.delete(item.id);
  } catch {
    if (remove) {
      fallback.delete(item.id);
      acknowledged.add(item.id);
    } else fallback.set(item.id, item);
  }
}

async function read(userId: string) {
  const items = new Map<string, Pending>();
  try {
    const db = await openDatabase();
    const rows = await new Promise<Pending[]>((resolve, reject) => {
      const request = db
        .transaction("events")
        .objectStore("events")
        .index("userId")
        .getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    rows.forEach((item) => items.set(item.id, item));
  } catch {
    /* Storage-disabled browsers retain events for this tab's lifetime. */
  }
  fallback.forEach((item) => {
    if (item.userId === userId) items.set(item.id, item);
  });
  return [...items.values()]
    .filter((item) => !acknowledged.has(item.id))
    .sort((a, b) =>
      (a.event.occurredAt || "").localeCompare(b.event.occurredAt || ""),
    );
}

export async function activityDeliveryStatus(userId: string) {
  const rows = await read(userId);
  return {
    pending: rows.filter((item) => !item.rejected).length,
    rejected: rows.filter((item) => item.rejected).length,
    memoryOnly: [...fallback.values()].some((item) => item.userId === userId),
  };
}
async function announce(userId: string) {
  window.dispatchEvent(
    new CustomEvent("activity-delivery", {
      detail: { userId, ...(await activityDeliveryStatus(userId)) },
    }),
  );
}

export async function flushActivity(userId: string, token: string) {
  tokens.set(userId, token);
  if (active.has(userId)) return;
  active.add(userId);
  try {
    // Sequential requests bound server load. Stable event IDs make retries and
    // concurrent tabs safe: the API records each event at most once.
    let rows = (await read(userId)).filter((item) => !item.rejected);
    while (rows.length) {
      const item = rows[0];
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || ""}/api/platform?entity=activity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...item.event, eventId: item.id }),
          signal: AbortSignal.timeout(12000),
          keepalive: true,
        },
      );
      if ([400, 403, 404, 413, 422].includes(response.status))
        await write({ ...item, rejected: response.status });
      else if (!response.ok)
        throw new Error(`Delivery failed (${response.status})`);
      else await write(item, true);
      await announce(userId);
      rows = (await read(userId)).filter((item) => !item.rejected);
    }
  } catch {
    if (!retries.has(userId))
      retries.set(
        userId,
        setTimeout(() => {
          retries.delete(userId);
          void flushActivity(userId, tokens.get(userId) || token);
        }, 15000),
      );
  } finally {
    active.delete(userId);
    await announce(userId);
    // An event can arrive while the previous flush is finishing.
    if ((await activityDeliveryStatus(userId)).pending && !retries.has(userId))
      retries.set(
        userId,
        setTimeout(() => {
          retries.delete(userId);
          void flushActivity(userId, tokens.get(userId) || token);
        }, 15000),
      );
  }
}

export async function enqueueActivity(token: string, event: ActivityLog) {
  await write({
    id: crypto.randomUUID(),
    userId: event.userId,
    event: {
      ...event,
      occurredAt: event.occurredAt || new Date().toISOString(),
    },
  });
  await announce(event.userId);
  void flushActivity(event.userId, token);
}
