import { useEffect, useState } from "react";
import { Send, Trash2, Megaphone, Users, Eye, RotateCcw, UserCheck } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { AudienceFilterBuilder } from "./AudienceFilterBuilder";
import { getEmailTemplates } from "../../services/emailTemplateService";
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaignNow, previewRecipients, getSendProgress, getCampaignRecipients, getRecipientsConfig, saveRecipientsConfig } from "../../services/campaignService";
import Swal from 'sweetalert2';

const STATUS_COLORS = { draft: "#9b948e", sending: "#c0622a", sent: "#4a5535" };

export const CampaignList = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState(null);

    const [name, setName] = useState("");
    const [templateId, setTemplateId] = useState("");
    const [audienceEntity, setAudienceEntity] = useState("");
    const [audienceFilters, setAudienceFilters] = useState([]);
    const [audienceLogic, setAudienceLogic] = useState("AND");

    const [audienceEditor, setAudienceEditor] = useState(null); // campaign being edited, or null
    const [editorEntity, setEditorEntity] = useState("contact");
    const [editorFilters, setEditorFilters] = useState([]);
    const [editorLogic, setEditorLogic] = useState("AND");
    const [savingAudience, setSavingAudience] = useState(false);

    const [sendPreviewCampaign, setSendPreviewCampaign] = useState(null); // campaign pending send confirmation, or null
    const [sendPreviewData, setSendPreviewData] = useState(null); // { recipient_count, recipients, max_send_now }
    const [sendPreviewLoading, setSendPreviewLoading] = useState(false);

    // Read-only audience inspection, decoupled from the send flow — lets an
    // admin check who matches without landing one click away from sending.
    // For a draft campaign this shows the pre-send estimate (who WOULD get
    // it); once sending/sent it shows actual per-recipient outcomes instead.
    const [detailsCampaign, setDetailsCampaign] = useState(null);
    const [detailsData, setDetailsData] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Blocking progress modal for an in-flight send, polling send-progress
    // until the background thread (see campaigns_view.py) finishes, then
    // switching the same modal to a sent/failed summary.
    const [sendProgressCampaign, setSendProgressCampaign] = useState(null);
    const [sendProgress, setSendProgressState] = useState(null); // { status, total, sent, failed }
    const [sendResults, setSendResults] = useState(null); // recipient list, fetched once status is 'sent'

    // "Configure Recipients" modal (client campaigns, A3 — mandatory before send):
    // choose which contact of each client receives the campaign.
    const [recipientsCampaign, setRecipientsCampaign] = useState(null);
    const [recipientsClients, setRecipientsClients] = useState([]);        // [{client_id, client_name, contacts, selected_contact_id}]
    const [recipientsSelections, setRecipientsSelections] = useState({});  // {client_id: contact_id}
    const [recipientsLoading, setRecipientsLoading] = useState(false);
    const [recipientsSaving, setRecipientsSaving] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    // Polls send-progress while a send is in flight. Keyed only on the
    // campaign id (not on sendProgress.status): the loop decides for itself
    // when to stop, from inside a tick, the moment the send reaches a terminal
    // state ('sent' or a dead worker's 'is_stale'). Depending on status here
    // instead let a sending->stale transition (same status) leak the interval.
    const pollCampaignId = sendProgressCampaign?.id ?? null;
    useEffect(() => {
        if (!pollCampaignId) return;

        let cancelled = false;          // set on cleanup so an in-flight await can't write stale state
        let intervalId = null;

        const stop = () => {
            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const tick = async () => {
            try {
                const progress = await getSendProgress(pollCampaignId);
                if (cancelled) return;   // modal closed / campaign changed mid-request
                // Keep the batch size from send-now as a floor: the polled
                // `total` counts recipient rows, which the worker is still
                // creating on the first ticks, so it can start below the real
                // batch size and make the denominator (and the bar) jump.
                setSendProgressState(prev => ({
                    ...progress,
                    total: Math.max(progress.total || 0, prev?.total || 0),
                }));

                if (progress.status === 'sent') {
                    stop();
                    const results = await getCampaignRecipients(pollCampaignId);
                    if (cancelled) return;
                    setSendResults(Array.isArray(results) ? results : []);
                    loadAll();
                } else if (progress.is_stale) {
                    // Worker appears dead — stop polling, refresh the list so
                    // the row shows a Resume button, let the user close.
                    stop();
                    loadAll();
                }
            } catch {
                // transient poll failure — next tick retries, no toast needed
            }
        };

        intervalId = setInterval(tick, 1500);
        return () => { cancelled = true; stop(); };
    }, [pollCampaignId]);

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

    // Selecting a template fixes the campaign's entity (inherited from the
    // template) and resets filters, since the field catalog differs per entity.
    const handleTemplateChange = (id) => {
        setTemplateId(id);
        const tpl = templates.find(t => t.id === id);
        setAudienceEntity(tpl?.entity || "client");
        setAudienceFilters([]);
        setAudienceLogic("AND");
    };

    const handleCreate = async () => {
        if (!name.trim() || !templateId) return;
        try {
            // audience_entity is derived server-side from the template; we send
            // filters/logic only.
            await createCampaign({
                name, template_id: templateId,
                audience_filters: audienceFilters, audience_logic: audienceLogic,
            });
            setName(""); setTemplateId(""); setAudienceEntity(""); setAudienceFilters([]); setAudienceLogic("AND");
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const openAudienceEditor = (campaign) => {
        setAudienceEditor(campaign);
        setEditorEntity(campaign.audience_entity || "client");
        setEditorFilters(campaign.audience_filters || []);
        setEditorLogic(campaign.audience_logic || "AND");
    };

    const handleSaveAudience = async () => {
        setSavingAudience(true);
        try {
            await updateCampaign(audienceEditor.id, {
                audience_entity: editorEntity, audience_filters: editorFilters, audience_logic: editorLogic,
            });
            setAudienceEditor(null);
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSavingAudience(false);
        }
    };

    const openRecipientsConfig = async (campaign) => {
        setRecipientsCampaign(campaign);
        setRecipientsClients([]);
        setRecipientsSelections({});
        setRecipientsLoading(true);
        try {
            const data = await getRecipientsConfig(campaign.id);
            const clients = Array.isArray(data.clients) ? data.clients : [];
            setRecipientsClients(clients);
            // Seed selections with the backend's default (primary/first) per client.
            setRecipientsSelections(
                Object.fromEntries(clients.filter(c => c.selected_contact_id).map(c => [c.client_id, c.selected_contact_id]))
            );
        } catch (err) {
            setRecipientsCampaign(null);
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setRecipientsLoading(false);
        }
    };

    const handleSaveRecipients = async () => {
        setRecipientsSaving(true);
        try {
            const res = await saveRecipientsConfig(recipientsCampaign.id, recipientsSelections);
            setRecipientsCampaign(null);
            Swal.fire({ icon: 'success', title: `${res.configured} recipient(s) configured`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setRecipientsSaving(false);
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

    const openDetails = async (campaign) => {
        setDetailsCampaign(campaign);
        setDetailsData(null);
        setDetailsLoading(true);
        try {
            if (campaign.status === 'draft') {
                const data = await previewRecipients(campaign.id);
                setDetailsData({ mode: 'preview', recipient_count: data.recipient_count, recipients: data.recipients });
            } else {
                const results = await getCampaignRecipients(campaign.id);
                const list = Array.isArray(results) ? results : [];
                setDetailsData({
                    mode: 'outcome',
                    recipient_count: list.length,
                    sent_count: list.filter(r => r.status === 'sent').length,
                    failed_count: list.filter(r => r.status === 'failed').length,
                    recipients: list,
                });
            }
        } catch (err) {
            setDetailsCampaign(null);
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setDetailsLoading(false);
        }
    };

    const openSendPreview = async (campaign) => {
        setSendPreviewCampaign(campaign);
        setSendPreviewData(null);
        setSendPreviewLoading(true);
        try {
            const preview = await previewRecipients(campaign.id);
            setSendPreviewData(preview);
        } catch (err) {
            setSendPreviewCampaign(null);
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSendPreviewLoading(false);
        }
    };

    const confirmSend = async () => {
        const campaign = sendPreviewCampaign;
        setSendingId(campaign.id);
        try {
            const { total } = await sendCampaignNow(campaign.id);
            setSendPreviewCampaign(null);
            setSendResults(null);
            setSendProgressState({ status: 'sending', total, sent: 0, failed: 0 });
            setSendProgressCampaign(campaign);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSendingId(null);
        }
    };

    const closeSendProgress = () => {
        setSendProgressCampaign(null);
        setSendProgressState(null);
        setSendResults(null);
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
                        <Select value={templateId} onValueChange={handleTemplateChange}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select a template" /></SelectTrigger>
                            <SelectContent>
                                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} · {t.entity === 'lead' ? 'Lead' : 'Client'}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {templates.length === 0 && (
                    <p className="text-xs text-muted-foreground">No templates yet — create one under Email Templates first.</p>
                )}

                {templateId && (
                    <div className="pt-2 border-t">
                        {/* Entity is inherited from the template, so the builder's
                            entity picker is locked to it. */}
                        <AudienceFilterBuilder
                            entity={audienceEntity}
                            entityLocked
                            filters={audienceFilters}
                            logic={audienceLogic}
                            onChange={({ audience_filters, audience_logic }) => {
                                setAudienceFilters(audience_filters);
                                setAudienceLogic(audience_logic);
                            }}
                        />
                    </div>
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
                                <Button variant="outline" size="sm" onClick={() => openDetails(c)}>
                                    <Eye className="h-4 w-4 mr-1" /> View Details
                                </Button>
                                {c.status === 'draft' && (
                                    <Button variant="outline" size="sm" onClick={() => openAudienceEditor(c)}>
                                        <Users className="h-4 w-4 mr-1" /> Edit Audience
                                    </Button>
                                )}
                                {c.status === 'draft' && c.template?.entity === 'client' && (
                                    // Mandatory before sending a client campaign: choose the
                                    // recipient contact for each client.
                                    <Button variant="outline" size="sm" onClick={() => openRecipientsConfig(c)}>
                                        <UserCheck className="h-4 w-4 mr-1" /> Recipients
                                    </Button>
                                )}
                                {c.status === 'sending' && c.is_send_stale && (
                                    // The send worker died mid-run (no task queue — it's a
                                    // daemon thread). Resume re-sends only the leftover
                                    // recipients; the backend skips ones already sent.
                                    <Button
                                        variant="secondary" size="sm"
                                        onClick={() => openSendPreview(c)}
                                        disabled={sendingId === c.id}
                                        title="This send was interrupted — resume it"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-1" /> {sendingId === c.id ? 'Resuming...' : 'Resume'}
                                    </Button>
                                )}
                                {c.status === 'sending' && !c.is_send_stale && (
                                    <Button variant="secondary" size="sm" disabled title="Send in progress">
                                        <Send className="h-4 w-4 mr-1" /> Sending...
                                    </Button>
                                )}
                                {(c.status === 'draft') && (
                                    <Button
                                        variant="secondary" size="sm"
                                        onClick={() => openSendPreview(c)}
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

            <Dialog open={!!audienceEditor} onOpenChange={(open) => !open && setAudienceEditor(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Audience — {audienceEditor?.name}</DialogTitle>
                    </DialogHeader>
                    <AudienceFilterBuilder
                        entity={editorEntity}
                        entityLocked
                        filters={editorFilters}
                        logic={editorLogic}
                        onChange={({ audience_filters, audience_logic }) => {
                            setEditorFilters(audience_filters);
                            setEditorLogic(audience_logic);
                        }}
                    />
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setAudienceEditor(null)}>Cancel</Button>
                        <Button onClick={handleSaveAudience} disabled={savingAudience}>
                            {savingAudience ? 'Saving...' : 'Save Audience'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!recipientsCampaign} onOpenChange={(open) => !open && setRecipientsCampaign(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Configure Recipients — {recipientsCampaign?.name}</DialogTitle>
                    </DialogHeader>
                    {recipientsLoading ? (
                        <p className="text-sm text-muted-foreground">Loading clients...</p>
                    ) : recipientsClients.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No eligible clients (a client needs at least one contact with an email).</p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            <p className="text-xs text-muted-foreground">
                                Pick which contact of each client receives this campaign. The primary contact is preselected.
                            </p>
                            {recipientsClients.map(cl => (
                                <div key={cl.client_id} className="grid grid-cols-[1fr_1.4fr] gap-3 items-center p-2 border rounded-md">
                                    <span className="text-sm font-medium truncate">{cl.client_name}</span>
                                    <Select
                                        value={recipientsSelections[cl.client_id] || ""}
                                        onValueChange={v => setRecipientsSelections(s => ({ ...s, [cl.client_id]: v }))}
                                    >
                                        <SelectTrigger className="w-full h-8"><SelectValue placeholder="Select contact" /></SelectTrigger>
                                        <SelectContent>
                                            {cl.contacts.map(ct => (
                                                <SelectItem key={ct.id} value={ct.id}>
                                                    {ct.name || ct.email}{ct.is_primary ? ' ★' : ''} — {ct.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setRecipientsCampaign(null)}>Cancel</Button>
                        <Button onClick={handleSaveRecipients} disabled={recipientsSaving || recipientsClients.length === 0}>
                            {recipientsSaving ? 'Saving...' : 'Save Recipients'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!detailsCampaign} onOpenChange={(open) => !open && setDetailsCampaign(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Recipients — {detailsCampaign?.name}</DialogTitle>
                    </DialogHeader>
                    {detailsLoading ? (
                        <p className="text-sm text-muted-foreground">Loading recipients...</p>
                    ) : detailsData && detailsData.mode === 'preview' && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                <strong>{detailsData.recipient_count}</strong> record(s) currently match this campaign's audience (not sent yet).
                            </p>
                            {detailsData.recipient_count > 0 && (
                                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                                    {detailsData.recipients.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span>{r.name || '—'}</span>
                                            <span className="text-muted-foreground">{r.email}</span>
                                        </div>
                                    ))}
                                    {detailsData.recipient_count > detailsData.recipients.length && (
                                        <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                            + {detailsData.recipient_count - detailsData.recipients.length} more not shown
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {!detailsLoading && detailsData && detailsData.mode === 'outcome' && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                <strong className="text-[#4a5535]">{detailsData.sent_count}</strong> sent
                                {detailsData.failed_count > 0 && <> · <strong className="text-red-600">{detailsData.failed_count}</strong> failed</>}
                                {' '}of {detailsData.recipient_count} total.
                            </p>
                            {detailsData.recipient_count > 0 && (
                                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                                    {detailsData.recipients.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
                                            <div className="min-w-0">
                                                <div>{r.contact_name || '—'}</div>
                                                <div className="text-muted-foreground truncate">{r.contact_email}</div>
                                                {r.status === 'failed' && r.error_message && (
                                                    <div className="text-xs text-red-600 truncate">{r.error_message}</div>
                                                )}
                                            </div>
                                            <span
                                                className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                                                style={{
                                                    backgroundColor: r.status === 'sent' ? '#4a55351f' : '#dc26261f',
                                                    color: r.status === 'sent' ? '#4a5535' : '#dc2626',
                                                }}
                                            >
                                                {r.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setDetailsCampaign(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!sendProgressCampaign} onOpenChange={(open) => !open && (sendProgress?.status === 'sent' || sendProgress?.is_stale) && closeSendProgress()}>
                <DialogContent className="sm:max-w-lg" onInteractOutside={e => !(sendProgress?.status === 'sent' || sendProgress?.is_stale) && e.preventDefault()} onEscapeKeyDown={e => !(sendProgress?.status === 'sent' || sendProgress?.is_stale) && e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>
                            {sendProgress?.status === 'sent'
                                ? 'Send complete'
                                : sendProgress?.is_stale
                                    ? 'Send interrupted'
                                    : `Sending "${sendProgressCampaign?.name}"...`}
                        </DialogTitle>
                    </DialogHeader>
                    {sendProgress && (
                        <div className="space-y-3">
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full transition-all duration-300"
                                    style={{
                                        // Guard total=0 (first tick can arrive before the worker
                                        // has created all recipient rows) and clamp to 100 so a
                                        // resume's accumulated counts can't overflow the bar.
                                        width: `${sendProgress.total > 0
                                            ? Math.min(100, Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100))
                                            : 0}%`,
                                        backgroundColor: sendProgress.status === 'sent' ? '#4a5535' : '#c0622a',
                                    }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {sendProgress.sent + sendProgress.failed} of {sendProgress.total} processed
                                {sendProgress.failed > 0 && <> — <span className="text-red-600">{sendProgress.failed} failed</span></>}
                            </p>

                            {sendProgress.status === 'sent' && sendResults && (
                                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                                    {sendResults.filter(r => r.status === 'failed').map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
                                            <div className="min-w-0">
                                                <div>{r.contact_name || '—'} <span className="text-muted-foreground">{r.contact_email}</span></div>
                                                {r.error_message && <div className="text-xs text-red-600 truncate">{r.error_message}</div>}
                                            </div>
                                            <span className="shrink-0 text-xs font-semibold text-red-600">failed</span>
                                        </div>
                                    ))}
                                    {sendResults.every(r => r.status === 'sent') && (
                                        <div className="px-3 py-2 text-sm text-muted-foreground italic">All recipients sent successfully.</div>
                                    )}
                                </div>
                            )}

                            {sendProgress.is_stale && (
                                <p className="text-xs text-amber-600">
                                    This send was interrupted before finishing. Close this and use Resume to send the remaining recipients.
                                </p>
                            )}

                            {sendProgress.status !== 'sent' && !sendProgress.is_stale && (
                                <p className="text-xs text-muted-foreground italic">Sending — please don't close this window.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={closeSendProgress}
                            disabled={sendProgress?.status !== 'sent' && !sendProgress?.is_stale}
                        >
                            {(sendProgress?.status === 'sent' || sendProgress?.is_stale) ? 'Close' : 'Sending...'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!sendPreviewCampaign} onOpenChange={(open) => !open && setSendPreviewCampaign(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Send "{sendPreviewCampaign?.name}"?</DialogTitle>
                    </DialogHeader>
                    {sendPreviewLoading ? (
                        <p className="text-sm text-muted-foreground">Loading recipients...</p>
                    ) : sendPreviewData && (
                        <div className="space-y-3">
                            {sendPreviewCampaign?.template?.entity === 'client' && sendPreviewData.recipient_count === 0 ? (
                                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                                    No recipients are configured yet. For client campaigns you must choose a contact
                                    (primary or secondary) for each client before sending. Close this dialog and use the
                                    <strong> Recipients </strong> button to configure contacts, then try again.
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    This will email <strong>{sendPreviewData.recipient_count}</strong> recipient(s) right now. This can't be undone.
                                </p>
                            )}
                            {sendPreviewData.recipient_count > 0 && (
                                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                                    {sendPreviewData.recipients.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span>{r.name || '—'}</span>
                                            <span className="text-muted-foreground">{r.email}</span>
                                        </div>
                                    ))}
                                    {sendPreviewData.recipient_count > sendPreviewData.recipients.length && (
                                        <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                            + {sendPreviewData.recipient_count - sendPreviewData.recipients.length} more not shown
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setSendPreviewCampaign(null)}>Cancel</Button>
                        <Button
                            onClick={confirmSend}
                            disabled={sendPreviewLoading || !sendPreviewData?.recipient_count || sendingId === sendPreviewCampaign?.id}
                        >
                            {sendingId === sendPreviewCampaign?.id ? 'Sending...' : 'Send Now'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
