import { useEffect, useState } from "react";
import { getClaimedNumber } from "../services/connectNumberService";

/**
 * Shared by Settings, CallTemplates and CallCampaignList — the number is
 * claimed once per organization and never changes, so every screen that
 * needs it just reads the same value (see ConnectNumberView.post, which
 * enforces the immutability this hook relies on).
 */
export const useClaimedNumber = () => {
    const [claimedNumber, setClaimedNumber] = useState("");
    const [loading, setLoading] = useState(true);
    const [configError, setConfigError] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getClaimedNumber();
                setClaimedNumber(data.claimed_phone_number || "");
            } catch {
                setConfigError(true);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Exposed so Settings.jsx can set it optimistically right after a
    // successful claim, instead of re-fetching.
    return { claimedNumber, setClaimedNumber, loading, configError };
};
