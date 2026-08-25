import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getTeam, createTeam, updateTeam,
    getEligibleMembers, addTeamMember, removeTeamMember,
} from "../services/teamService";
import { getUsers } from "../services/userService";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft } from "lucide-react";

export const TeamDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [leaderId, setLeaderId] = useState("");
    const [members, setMembers] = useState([]);

    const [allUsers, setAllUsers] = useState([]);
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [selectedNewMember, setSelectedNewMember] = useState("");

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                const users = await getUsers();
                setAllUsers(Array.isArray(users) ? users : []);

                if (!isNew) {
                    const team = await getTeam(id);
                    setName(team.name || "");
                    setDescription(team.description || "");
                    setLeaderId(team.leader?.id ? String(team.leader.id) : "");
                    setMembers(team.members || []);
                }
                await refreshEligible();
            } catch (err) {
                console.error("Initialization error", err);
                setError("Failed to load team data.");
            } finally {
                setFetching(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const refreshEligible = async () => {
        try {
            const data = await getEligibleMembers();
            setEligibleUsers(Array.isArray(data) ? data : []);
        } catch {
            // non-fatal — the add-member picker just stays empty
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError("Name is required.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const payload = {
                name,
                description,
                leader_id: leaderId || null,
            };
            if (isNew) {
                await createTeam(payload);
            } else {
                await updateTeam(id, payload);
            }
            navigate(-1);
        } catch (err) {
            console.error("Error saving team", err);
            setError(`Failed to save team. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!selectedNewMember || isNew) return;
        try {
            await addTeamMember(id, selectedNewMember);
            const team = await getTeam(id);
            setMembers(team.members || []);
            setSelectedNewMember("");
            await refreshEligible();
        } catch (err) {
            setError(`Failed to add member. ${err.message || ""}`);
        }
    };

    const handleRemoveMember = async (membershipId) => {
        if (isNew) return;
        try {
            await removeTeamMember(id, membershipId);
            setMembers(members.filter(m => m.id !== membershipId));
            await refreshEligible();
        } catch (err) {
            setError(`Failed to remove member. ${err.message || ""}`);
        }
    };

    if (fetching) {
        return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold truncate">
                            {isNew ? "New Team" : "Edit Team"}
                        </h1>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Team"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
                {error && (
                    <div className="p-4 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-lg border shadow-sm">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. East Coast Sales" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="leader">Leader</Label>
                        <Select value={leaderId} onValueChange={setLeaderId}>
                            <SelectTrigger id="leader" className="w-full">
                                <SelectValue placeholder="Select a leader" />
                            </SelectTrigger>
                            <SelectContent>
                                {allUsers.map(u => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name || u.username || u.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">A leader can lead more than one team.</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                    </div>
                </div>

                {!isNew && (
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Members</h3>

                        {members.length > 0 ? (
                            <div className="space-y-2">
                                {members.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                                        <span className="text-sm font-medium">{m.user?.name}</span>
                                        <Button
                                            variant="ghost" size="sm"
                                            onClick={() => handleRemoveMember(m.id)}
                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                        >
                                            &times;
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No members yet.</p>
                        )}

                        <div className="flex items-end gap-4 max-w-md">
                            <div className="w-full space-y-2">
                                <Label>Add Member</Label>
                                <Select value={selectedNewMember} onValueChange={setSelectedNewMember}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select an eligible user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eligibleUsers.length > 0
                                            ? eligibleUsers.map(u => (
                                                <SelectItem key={u.id} value={String(u.id)}>
                                                    {u.name}
                                                </SelectItem>
                                            ))
                                            : <SelectItem value="no-options" disabled>No eligible users</SelectItem>}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Only users with no active team membership are eligible — a user can belong to one team at a time.
                                </p>
                            </div>
                            <Button type="button" onClick={handleAddMember} disabled={!selectedNewMember} variant="secondary">
                                Add
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
