import { useEffect, useState } from "react";
import { getAttributeRegistry } from "../services/attributeTypeService";
import { FALLBACK_REGISTRY } from "../utils/attributeTypes";

/**
 * The attribute type registry, fetched once per session.
 *
 * Falls back to the static copy in attributeTypes.js if the request fails, so a
 * blip in the network degrades the configuration form to "the types without
 * their options" instead of an empty screen. `ready` tells callers which of the
 * two they got.
 */
export const useAttributeRegistry = () => {
    const [registry, setRegistry] = useState(FALLBACK_REGISTRY);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getAttributeRegistry()
            .then((data) => {
                if (cancelled) return;
                setRegistry(data);
                setReady(true);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Falling back to the built-in attribute types:", err);
                setError(err);
                setReady(true);
            });
        return () => { cancelled = true; };
    }, []);

    const byType = Object.fromEntries((registry.types || []).map((t) => [t.value, t]));
    return { registry, types: registry.types || [], byType, ready, error };
};
