import { useEffect, useSyncExternalStore } from "react";
import { getAICredits } from "@/services/aiService";

// Tiny shared store so every credits meter on screen updates together after any AI action.
let state = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;

/** Use the `credits` object an /api/ai/ response already carries. */
export const publishAICredits = (credits) => {
    if (credits && typeof credits === "object") { state = credits; emit(); }
};

let inflight = null;

/**
 * Re-fetch the credits. Never throws. Concurrent callers share one request.
 * A 401/403 (plan lost AI, no permission) clears the value so the widgets hide
 * instead of showing stale numbers; transient failures keep the last value.
 */
export const refreshAICredits = () => {
    if (inflight) return inflight;
    inflight = (async () => {
        try {
            publishAICredits(await getAICredits());
        } catch (err) {
            if (err?.status === 403 || err?.status === 401) { state = null; emit(); }
        } finally {
            inflight = null;
        }
    })();
    return inflight;
};

/** Test helper. */
export const resetAICredits = () => { state = null; emit(); };

export const useAICredits = (enabled = true) => {
    const credits = useSyncExternalStore(subscribe, getSnapshot);
    useEffect(() => { if (enabled) refreshAICredits(); }, [enabled]);
    return { credits, refresh: refreshAICredits };
};
