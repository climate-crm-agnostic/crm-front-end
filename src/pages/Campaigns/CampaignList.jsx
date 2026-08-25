import { useEffect, useState } from "react";
import { Send, Trash2, Megaphone } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { getEmailTemplates } from "../../services/emailTemplateService";
import { getCampaigns, createCampaign, deleteCampaign, sendCampaignNow, previewRecipients } from "../../services/campaignService";
import Swal from 'sweetalert2';

const STATUS_COLORS = { draft: "#9b948e", sending: "#c0622a", sent: "#4a5535" };

export const CampaignList = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState(null);

    const [name, setName] = useState("");
    const [templateId, setTemplateId] = useState("");

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [c, t] = await Promise.all([getCampaigns(), getEmailTemplates()]);
            setCampaigns(Array.isArray(c) ? c : []);
            setTemplates(Array.isArray(t) ? t : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load campaigns', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim() || !templateId) return;
        try {
            await createCampaign({ name, template_id: templateId });
            setName(""); setTemplateId("");
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#5E6A43', cancelButtonColor: '#9b948e', confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteCampaign(id);
            loadAll();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete campaign', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    const handleSend = async (campaign) => {
        setSendingId(campaign.id);
        try {
            const preview = await previewRecipients(campaign.id);
            const confirm = await Swal.fire({
                title: `Send "${campaign.name}"?`,
                text: `This will email ${preview.recipient_count} recipient(s) right now. This can't be undone.`,
                icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#5E6A43', cancelButtonColor: '#9b948e', confirmButtonText: 'Send Now',
            });
            if (!confirm.isConfirmed) return;

            const result = await sendCampaignNow(campaign.id);
            Swal.fire({
                icon: 'success', title: 'Sent', text: `Sent to ${result.sent} recipient(s)${result.failed ? `, ${result.failed} failed` : ''}.`,
                toast: true, position: 'top-end', showConfirmButton: false, timer: 4000,
            });
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSendingId(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading campaigns...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                    <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-base font-semibold">Campaigns</p>
                    <p className="text-sm text-muted-foreground">One-time blasts to Contacts. Birthday templates send automatically every day.</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">New Campaign</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2 md:col-span-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Spring Sale Blast" />
                    </div>
                    <div className="space-y-2">
                        <Label>Template</Label>
                        <Select value={templateId} onValueChange={setTemplateId}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select a template" /></SelectTrigger>
                            <SelectContent>
                                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {templates.length === 0 && (
                    <p className="text-xs text-muted-foreground">No templates yet — create one under Email Templates first.</p>
                )}
                <Button type="button" onClick={handleCreate} disabled={!name.trim() || !templateId}>Create Campaign</Button>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-2">
                <h3 className="font-medium text-lg border-b pb-2">All Campaigns</h3>
                {campaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No campaigns yet.</p>
                ) : (
                    campaigns.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{c.name}</span>
                                    <span
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                                        style={{ backgroundColor: `${STATUS_COLORS[c.status]}1f`, border: `1px solid ${STATUS_COLORS[c.status]}66`, color: STATUS_COLORS[c.status] }}
                                    >
                                        {c.status}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {c.template?.name} · {c.sent_count}/{c.recipient_count || '?'} sent
                                </span>
                            </div>
                            <div className="flex gap-1">
                                {c.status !== 'sent' && (
                                    <Button
                                        variant="secondary" size="sm"
                                        onClick={() => handleSend(c)}
                                        disabled={sendingId === c.id || c.template?.campaign_type === 'birthday'}
                                        title={c.template?.campaign_type === 'birthday' ? 'Birthday campaigns send automatically every day' : 'Send now'}
                                    >
                                        <Send className="h-4 w-4 mr-1" /> {sendingId === c.id ? 'Sending...' : 'Send Now'}
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
