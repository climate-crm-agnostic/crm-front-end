import React, { useState, useEffect } from "react";
import { getSales } from "../services/salesService";
import { getLeads, reassignLeads } from "../services/leadService";
import { Users } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Card, CardHeader } from "../components/SectionCard";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";

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
        <div className="max-w-2xl mx-auto py-6 space-y-4" style={FONT}>
            <div className="px-1">
                <h1 className="text-2xl font-semibold">Lead Reassignment</h1>
                <p className="text-sm text-muted-foreground">
                    Move every lead owned by one user to another — e.g. after an employee leaves.
                </p>
            </div>

            <Card>
                <CardHeader icon={Users} title="Reassign Leads" />
                <div className="px-6 py-5 space-y-5">
                    <div className="space-y-2">
                        <Label>From</Label>
                        <Select value={fromUserId} onValueChange={handleFromChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {salesUsers.map(u => (
                                    <SelectItem key={u.id} value={String(u.id)}>{u.name || u.username}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {fromUserId && (
                            <p className="text-sm text-muted-foreground">
                                {loadingPreview ? "Checking assigned leads..." : `${previewCount ?? 0} lead(s) currently assigned`}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>To</Label>
                        <Select value={toUserId} onValueChange={setToUserId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {salesUsers.filter(u => String(u.id) !== String(fromUserId)).map(u => (
                                    <SelectItem key={u.id} value={String(u.id)}>{u.name || u.username}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleReassign}
                            disabled={!fromUserId || !toUserId || reassigning || previewCount === 0}
                        >
                            {reassigning ? "Reassigning..." : "Reassign Leads"}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
