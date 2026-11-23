import { useEffect, useSyncExternalStore } from "react";
import { getAICredits } from "@/services/aiService";
// Tiny shared store so every credits meter on screen updates together after any AI action.
// state: the last `credits` object, or null when there is nothing to show (not loaded yet,
// plan without AI, no permission after a 401/403). Meters hide on null and on enabled=false.
let state = null;
let fetchedAt = 0;          // when `state` was last set (ms)
let generation = 0;         // bumped by every publish/reset: older in-flight answers are discarded
let inflight = null;        // the pending request, shared by every caller
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
// A meter that mounts right after another one (or after a chat answer) reuses what is there.
export const FRESH_MS = 10_000;
const set = (next) => { state = next; fetchedAt = Date.now(); generation += 1; emit(); };
/** Use the `credits` object an /api/ai/ response already carries (null/invalid values are ignored). */
export const publishAICredits = (credits) => {
    if (credits && typeof credits === "object") set(credits);
};
const isUnavailable = (err) => err?.status === 401 || err?.status === 403;
/**
 * Re-fetch the credits. Never throws. Concurrent callers share ONE request (the pending
 * promise). A result that arrives after a newer publish (a chat answer carries fresher
 * numbers) is dropped. A 401/403 (plan lost AI, no permission) clears the value so the
 * widgets hide instead of showing stale numbers; other failures (offline, 5xx) keep the last value.
 */
export const refreshAICredits = () => {
    if (inflight) return inflight;
    const started = generation;
    inflight = (async () => {
        try {
            const credits = await getAICredits();
            if (generation === started) publishAICredits(credits);
        } catch (err) {
            if (isUnavailable(err) && generation === started) set(null);
        } finally {
            inflight = null;
        }
    })();
    return inflight;
};
/** Mount-time load: skipped when the data is already fresh or a request is pending. */
export const ensureAICredits = () => {
    if (inflight) return inflight;
    if (state && Date.now() - fetchedAt < FRESH_MS) return Promise.resolve();
    return refreshAICredits();
};
/** Test helper. */
export const resetAICredits = () => {
    inflight = null;
    fetchedAt = 0;
    set(null);
};
export const useAICredits = (enabled = true) => {
    const credits = useSyncExternalStore(subscribe, getSnapshot);
    useEffect(() => { if (enabled) ensureAICredits(); }, [enabled]);
    return { credits, refresh: refreshAICredits };
};
