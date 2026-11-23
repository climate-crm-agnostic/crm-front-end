import { useEffect, useState } from "react";
import { getCallingLimits } from "../services/callCampaignService";

// Simultaneous-calls limit and the AWS request to raise it (GET /api/calling/limits/), read once
// per page. null while loading or when it can't be read.
export const useCallingLimits = () => {
    const [limits, setLimits] = useState(null);
    useEffect(() => {
        let cancelled = false;
        getCallingLimits().then(data => { if (!cancelled) setLimits(data); }).catch(() => {});
        return () => { cancelled = true; };
    }, []);
    return limits;
};
