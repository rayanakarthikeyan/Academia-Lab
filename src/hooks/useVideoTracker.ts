import { useEffect, useRef, useState } from "react";
import type { ActivityLog } from "../platform/types";

interface YouTubePlayer {
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getPlaybackRate?(): number;
}
interface VideoTrackerOptions {
  userId: string;
  courseId: string;
  resourceId: string;
  videoId: string;
  onEvent: (event: ActivityLog) => void;
}
declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
let youtubeApiPromise: Promise<void> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => fail(), 20000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(
        new Error(
          "YouTube could not load. Check your connection or content blocker and retry.",
        ),
      );
    };
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      previous?.();
      resolve();
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error) => {
    youtubeApiPromise = null;
    throw error;
  });
  return youtubeApiPromise;
}

export function useVideoTracker({
  userId,
  courseId,
  resourceId,
  videoId,
  onEvent,
}: VideoTrackerOptions) {
  const mountRef = useRef<HTMLDivElement>(null);
  const callback = useRef(onEvent);
  callback.current = onEvent;
  const [progress, setProgress] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false,
      player: YouTubePlayer | null = null;
    let pulse = 0,
      readyTimeout = 0,
      state = -1;
    let lastTime = performance.now(),
      lastPosition = 0;
    let visible = !document.hidden,
      pending = 0,
      watched = 0,
      percent = 0;
    let covered: Array<[number, number]> = [];
    setProgress(0);
    setWatchedSeconds(0);
    setError("");
    setLoading(true);
    const sample = () => {
      const now = performance.now();
      const position = player?.getCurrentTime?.() || 0;
      const elapsed = (now - lastTime) / 1000;
      const advance = position - lastPosition;
      const rate = player?.getPlaybackRate?.() || 1;
      // A seek or a suspended timer is not evidence of time spent watching.
      if (
        state === 1 &&
        visible &&
        elapsed > 0 &&
        elapsed <= 2.5 &&
        advance > 0 &&
        advance <= elapsed * rate + 0.75
      ) {
        const seconds = Math.min(elapsed, advance / rate);
        pending += seconds;
        watched += seconds;
        const ranges: Array<[number, number]> = [
          ...covered,
          [lastPosition, position],
        ];
        ranges.sort((a, b) => a[0] - b[0]);
        covered = [];
        for (const range of ranges) {
          const previous = covered[covered.length - 1];
          if (previous && range[0] <= previous[1])
            previous[1] = Math.max(previous[1], range[1]);
          else covered.push([...range]);
        }
        const duration = player?.getDuration?.() || 0;
        const watchedContent = covered.reduce(
          (sum, [start, end]) => sum + end - start,
          0,
        );
        percent =
          duration > 0
            ? Math.min(100, Math.floor((watchedContent / duration) * 100))
            : 0;
        setWatchedSeconds(watched);
        setProgress(percent);
      }
      lastTime = now;
      lastPosition = position;
    };
    const emit = (kind: ActivityLog["kind"], always = false) => {
      // The database stores whole seconds. Carry fractions into the next flush.
      const seconds = Math.floor(pending);
      if (!always && seconds <= 0) return;
      callback.current({
        userId,
        courseId,
        resourceId,
        kind,
        durationSeconds: seconds,
        metadata: {
          positionSeconds: Math.round(lastPosition),
          completionPercent: percent,
          activeSeconds: seconds,
          tracking: "visible-playback",
        },
      });
      pending -= seconds;
    };
    const visibility = () => {
      sample();
      visible = !document.hidden;
      if (!visible) emit("video_progress");
    };
    const pagehide = () => {
      sample();
      visible = false;
      emit("video_progress");
    };
    const pageshow = () => {
      visible = !document.hidden;
      lastTime = performance.now();
      lastPosition = player?.getCurrentTime?.() || 0;
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    if (!videoId) {
      setError(
        "This YouTube link is invalid. Ask your faculty to update the resource.",
      );
      setLoading(false);
    } else
      void loadYouTubeApi()
        .then(() => {
          if (disposed || !mountRef.current || !window.YT?.Player) return;
          // YouTube replaces its target. Keep the React-owned container intact.
          const target = document.createElement("div");
          mountRef.current.replaceChildren(target);
          readyTimeout = window.setTimeout(() => {
            if (!disposed) {
              setLoading(false);
              setError(
                "The video player did not load. Check your connection and retry.",
              );
            }
          }, 20000);
          player = new window.YT.Player(target, {
            width: "100%",
            height: "100%",
            videoId,
            playerVars: {
              rel: 0,
              playsinline: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                if (!disposed) {
                  window.clearTimeout(readyTimeout);
                  setLoading(false);
                  setError("");
                }
              },
              onError: (event: { data: number }) => {
                if (disposed) return;
                sample();
                state = -1;
                emit("video_progress");
                window.clearTimeout(readyTimeout);
                setLoading(false);
                setError(
                  `YouTube cannot play this video here (error ${event.data}). It may be private, removed or restricted from embedding. Ask your faculty for an embeddable video.`,
                );
              },
              onStateChange: (event: { data: number }) => {
                if (disposed) return;
                sample();
                state = event.data;
                // Reports sum video_progress. State markers carry no time so
                // short plays are included without counting seconds twice.
                emit("video_progress");
                if (state === 1) emit("video_play", true);
                else if (state === 2) emit("video_pause", true);
                else if (state === 0 && percent >= 90)
                  emit("video_complete", true);
              },
            },
          });
          pulse = window.setInterval(() => {
            sample();
            if (pending >= 15) emit("video_progress");
          }, 1000);
        })
        .catch((e) => {
          if (!disposed) {
            setLoading(false);
            setError(e.message);
          }
        });
    return () => {
      sample();
      emit("video_progress");
      disposed = true;
      window.clearInterval(pulse);
      window.clearTimeout(readyTimeout);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      player?.destroy();
    };
  }, [userId, courseId, resourceId, videoId, revision]);
  return {
    mountRef,
    progress,
    watchedSeconds,
    error,
    loading,
    retry: () => setRevision((v) => v + 1),
  };
}
