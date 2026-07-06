import React, { useState, useEffect } from "react";
import { getSales } from "../services/salesService";
import { getLeads, reassignLeads } from "../services/leadService";
import { Users } from "lucide-react";
import Swal from "sweetalert2";

const FONT = { fontFamily: '"Source Sans 3", Arial, sans-serif' };

export const LeadReassignment = () => {
    const [salesUsers, setSalesUsers] = useState([]);
    const [fromUserId, setFromUserId] = useState("");
    const [toUserId, setToUserId] = useState("");
    const [previewCount, setPreviewCount] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [reassigning, setReassigning] = useState(false);

    useEffect(() => {
        getSales().then(setSalesUsers).catch(() => setSalesUsers([]));
    }, []);

    useEffect(() => {
        if (!fromUserId) {
            setPreviewCount(null);
            return;
        }
        let cancelled = false;
        setLoadingPreview(true);
        getLeads({ responsible: fromUserId })
            .then(data => {
                if (cancelled) return;
                const count = data.count ?? (data.results || data).length;
                setPreviewCount(count);
            })
            .catch(() => { if (!cancelled) setPreviewCount(null); })
            .finally(() => { if (!cancelled) setLoadingPreview(false); });
        return () => { cancelled = true; };
    }, [fromUserId]);

    const handleFromChange = (value) => {
        setFromUserId(value);
        if (value === toUserId) setToUserId("");
    };

    const handleReassign = async () => {
        if (!fromUserId || !toUserId) return;

        const confirm = await Swal.fire({
            title: 'Reassign leads?',
            text: `This will move ${previewCount ?? 'all'} lead(s) to the selected user. This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, reassign',
        });
        if (!confirm.isConfirmed) return;

        setReassigning(true);
        try {
            const result = await reassignLeads(fromUserId, toUserId);
            await Swal.fire('Done', `${result.reassigned_count} lead(s) reassigned.`, 'success');
            setFromUserId("");
            setToUserId("");
            setPreviewCount(null);
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setReassigning(false);
        }
    };

    return (
        <div className="p-6 space-y-6" style={FONT}>
            <div className="flex items-center gap-3">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}
                >
                    <Users className="h-5 w-5" style={{ color: "#5E6A43" }} />
                </div>
                <div>
                    <p className="text-base font-semibold" style={{ color: "#2E2A26" }}>Lead Reassignment</p>
                    <p className="text-sm" style={{ color: "#9b948e" }}>
                        Move every lead owned by one user to another — e.g. after an employee leaves.
                    </p>
                </div>
            </div>

            <div className="max-w-lg rounded-xl p-6 space-y-5" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: "#9b948e" }}>From</label>
                    <select
                        value={fromUserId}
                        onChange={e => handleFromChange(e.target.value)}
                        className="w-full h-10 rounded-md border px-3 text-sm bg-white focus:outline-none"
                        style={{ borderColor: "#D8D2C4", color: "#2E2A26" }}
                    >
                        <option value="">Select a user...</option>
                        {salesUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name || u.username}</option>
                        ))}
                    </select>
                    {fromUserId && (
                        <p className="text-xs" style={{ color: "#9b948e" }}>
                            {loadingPreview ? "Checking assigned leads..." : `${previewCount ?? 0} lead(s) currently assigned`}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: "#9b948e" }}>To</label>
                    <select
                        value={toUserId}
                        onChange={e => setToUserId(e.target.value)}
                        className="w-full h-10 rounded-md border px-3 text-sm bg-white focus:outline-none"
                        style={{ borderColor: "#D8D2C4", color: "#2E2A26" }}
                    >
                        <option value="">Select a user...</option>
                        {salesUsers.filter(u => String(u.id) !== String(fromUserId)).map(u => (
                            <option key={u.id} value={u.id}>{u.name || u.username}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleReassign}
                    disabled={!fromUserId || !toUserId || reassigning || previewCount === 0}
                    className="w-full h-10 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                >
                    {reassigning ? "Reassigning..." : "Reassign Leads"}
                </button>
            </div>
        </div>
    );
};
