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

/** Re-fetch the credits. Never throws: on failure (e.g. 403, offline) the last known value stays. */
export const refreshAICredits = async () => {
    try {
        publishAICredits(await getAICredits());
    } catch { /* silent: the meter just stays as is (or hidden) */ }
};

/** Test helper. */
export const resetAICredits = () => { state = null; emit(); };

export const useAICredits = () => {
    const credits = useSyncExternalStore(subscribe, getSnapshot);
    useEffect(() => { refreshAICredits(); }, []);
    return { credits, refresh: refreshAICredits };
};
