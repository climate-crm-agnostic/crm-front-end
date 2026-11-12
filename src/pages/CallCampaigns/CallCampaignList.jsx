import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Trash2, PhoneCall, Users, Eye, RotateCcw } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { CallAudienceFilterBuilder } from "./CallAudienceFilterBuilder";
import { getCallTemplates } from "../../services/callTemplateService";
import {
    getCallCampaigns, createCallCampaign, updateCallCampaign, deleteCallCampaign,
    sendCallCampaignNow, previewRecipients, getSendProgress, getCallCampaignRecipients,
} from "../../services/callCampaignService";
import { useClaimedNumber } from "../../hooks/useClaimedNumber";
import Swal from 'sweetalert2';
import { formatCount } from "@/lib/utils";

const STATUS_COLORS = { draft: "#9b948e", calling: "#c0622a", called: "var(--secondary-text)" };

export const CallCampaignList = () => {
    const navigate = useNavigate();
    const { claimedNumber, loading: numberLoading } = useClaimedNumber();
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState(null);

    const [name, setName] = useState("");
    const [templateId, setTemplateId] = useState("");
    const [audienceFilters, setAudienceFilters] = useState([]);
    const [audienceLogic, setAudienceLogic] = useState("AND");

    const [audienceEditor, setAudienceEditor] = useState(null); // campaign being edited, or null
    const [editorFilters, setEditorFilters] = useState([]);
    const [editorLogic, setEditorLogic] = useState("AND");
    const [savingAudience, setSavingAudience] = useState(false);

    const [sendPreviewCampaign, setSendPreviewCampaign] = useState(null);
    const [sendPreviewData, setSendPreviewData] = useState(null);
    const [sendPreviewLoading, setSendPreviewLoading] = useState(false);

    // Read-only audience inspection, decoupled from the send flow. For a
    // draft campaign this shows the pre-send estimate (who WOULD be called);
    // once calling/called it shows actual per-recipient outcomes instead.
    const [detailsCampaign, setDetailsCampaign] = useState(null);
    const [detailsData, setDetailsData] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Blocking progress modal for an in-flight batch, polling send-progress
    // until the background thread (see calling_view.py) finishes dispatching
    // every call, then switching the same modal to a called/failed summary.
    // 'completed' here only means the call ended, not that it was answered.
    const [sendProgressCampaign, setSendProgressCampaign] = useState(null);
    const [sendProgress, setSendProgressState] = useState(null);
    const [sendResults, setSendResults] = useState(null);

    useEffect(() => {
        loadAll();
    }, []);

    const pollCampaignId = sendProgressCampaign?.id ?? null;
    useEffect(() => {
        if (!pollCampaignId) return;

        let cancelled = false;
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
                if (cancelled) return;
                setSendProgressState(prev => ({
                    ...progress,
                    total: Math.max(progress.total || 0, prev?.total || 0),
                }));

                if (progress.status === 'called') {
                    stop();
                    const results = await getCallCampaignRecipients(pollCampaignId);
                    if (cancelled) return;
                    setSendResults(Array.isArray(results) ? results : []);
                    loadAll();
                } else if (progress.is_stale) {
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
            const [c, t] = await Promise.all([getCallCampaigns(), getCallTemplates()]);
            setCampaigns(Array.isArray(c) ? c : []);
            setTemplates(Array.isArray(t) ? t : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load call campaigns', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim() || !templateId) return;
        try {
            await createCallCampaign({
                name, template_id: templateId, audience_filters: audienceFilters, audience_logic: audienceLogic,
            });
            setName(""); setTemplateId(""); setAudienceFilters([]); setAudienceLogic("AND");
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const openAudienceEditor = (campaign) => {
        setAudienceEditor(campaign);
        setEditorFilters(campaign.audience_filters || []);
        setEditorLogic(campaign.audience_logic || "AND");
    };

    const handleSaveAudience = async () => {
        setSavingAudience(true);
        try {
            await updateCallCampaign(audienceEditor.id, {
                audience_filters: editorFilters, audience_logic: editorLogic,
            });
            setAudienceEditor(null);
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSavingAudience(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: 'var(--secondary)', cancelButtonColor: '#9b948e', confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteCallCampaign(id);
            loadAll();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete call campaign', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
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
                const results = await getCallCampaignRecipients(campaign.id);
                const list = Array.isArray(results) ? results : [];
                setDetailsData({
                    mode: 'outcome',
                    recipient_count: list.length,
                    completed_count: list.filter(r => r.status === 'completed').length,
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
            const { total } = await sendCallCampaignNow(campaign.id);
            setSendPreviewCampaign(null);
            setSendResults(null);
            setSendProgressState({ status: 'calling', total, completed: 0, failed: 0 });
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
        return <div className="p-8 text-center text-muted-foreground">Loading call campaigns...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                        <PhoneCall className="h-5 w-5 text-primary-text" />
                    </div>
                    <div>
                        <p className="text-base font-semibold">Call Campaigns</p>
                        <p className="text-sm text-muted-foreground">Outbound calls to Contacts by an AI agent, using a Call Template's prompt.</p>
                    </div>
                </div>
                {!numberLoading && claimedNumber && (
                    <div className="text-right shrink-0">
                        <Label className="text-xs text-muted-foreground">Calling from</Label>
                        <code className="block font-mono text-sm">{claimedNumber}</code>
                    </div>
                )}
            </div>

            {!numberLoading && !claimedNumber && (
                <div className="rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        You must claim a phone number before you can run call campaigns.
                    </p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/settings')}>Go to Settings</Button>
                </div>
            )}

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">New Call Campaign</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2 md:col-span-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Renewal Reminders" />
                    </div>
                    <div className="space-y-2">
                        <Label>Call Template</Label>
                        <Select value={templateId} onValueChange={setTemplateId}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select a template" /></SelectTrigger>
                            <SelectContent>
                                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {templates.length === 0 && (
                    <p className="text-xs text-muted-foreground">No call templates yet — create one under Call Templates first.</p>
                )}

                {templateId && (
                    <div className="pt-2 border-t">
                        <CallAudienceFilterBuilder
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
                <h3 className="font-medium text-lg border-b pb-2">All Call Campaigns</h3>
                {campaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No call campaigns yet.</p>
                ) : (
                    campaigns.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{c.name}</span>
                                    <span
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                                        style={{ backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[c.status]} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${STATUS_COLORS[c.status]} 40%, transparent)`, color: STATUS_COLORS[c.status] }}
                                    >
                                        {c.status}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {c.template?.name} · {formatCount(c.completed_count)}/{c.recipient_count ? formatCount(c.recipient_count) : '?'} completed
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
                                {c.status === 'calling' && c.is_call_stale && (
                                    <Button
                                        variant="secondary" size="sm"
                                        onClick={() => openSendPreview(c)}
                                        disabled={sendingId === c.id}
                                        title="This batch was interrupted — resume it"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-1" /> {sendingId === c.id ? 'Resuming...' : 'Resume'}
                                    </Button>
                                )}
                                {c.status === 'calling' && !c.is_call_stale && (
                                    <Button variant="secondary" size="sm" disabled title="Calls in progress">
                                        <Phone className="h-4 w-4 mr-1" /> Calling...
                                    </Button>
                                )}
                                {c.status === 'draft' && (
                                    <Button
                                        variant="secondary" size="sm"
                                        onClick={() => openSendPreview(c)}
                                        disabled={sendingId === c.id}
                                    >
                                        <Phone className="h-4 w-4 mr-1" /> {sendingId === c.id ? 'Starting...' : 'Start Calling'}
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 dark:hover:text-red-300">
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
                    <CallAudienceFilterBuilder
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
                                <strong>{formatCount(detailsData.recipient_count)}</strong> contact(s) currently match this campaign's audience (not called yet).
                            </p>
                            {detailsData.recipient_count > 0 && (
                                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                                    {detailsData.recipients.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span>{r.name || '—'}</span>
                                            <span className="text-muted-foreground">{r.phone}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {!detailsLoading && detailsData && detailsData.mode === 'outcome' && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                <strong className="text-secondary-text">{detailsData.completed_count}</strong> completed
                                {detailsData.failed_count > 0 && <> · <strong className="text-red-600">{detailsData.failed_count}</strong> failed</>}
                                {' '}of {formatCount(detailsData.recipient_count)} total.
                            </p>
                            {detailsData.recipient_count > 0 && (
                                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                                    {detailsData.recipients.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
                                            <div className="min-w-0">
                                                <div>{r.contact_name || '—'}</div>
                                                <div className="text-muted-foreground truncate">{r.contact_phone}</div>
                                                {r.status === 'failed' && r.error_message && (
                                                    <div className="text-xs text-red-600 truncate">{r.error_message}</div>
                                                )}
                                                {r.status === 'completed' && r.duration_seconds != null && (
                                                    <div className="text-xs text-muted-foreground">{r.duration_seconds}s</div>
                                                )}
                                            </div>
                                            <span
                                                className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                                                style={{
                                                    backgroundColor: r.status === 'completed' ? "rgba(37,91,1,0.12)" : r.status === 'failed' ? '#dc26261f' : 'rgba(192,98,42,0.12)',
                                                    color: r.status === 'completed' ? 'var(--secondary-text)' : r.status === 'failed' ? '#dc2626' : '#c0622a',
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

            <Dialog open={!!sendProgressCampaign} onOpenChange={(open) => !open && (sendProgress?.status === 'called' || sendProgress?.is_stale) && closeSendProgress()}>
                <DialogContent className="sm:max-w-lg" onInteractOutside={e => !(sendProgress?.status === 'called' || sendProgress?.is_stale) && e.preventDefault()} onEscapeKeyDown={e => !(sendProgress?.status === 'called' || sendProgress?.is_stale) && e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>
                            {sendProgress?.status === 'called'
                                ? 'Batch complete'
                                : sendProgress?.is_stale
                                    ? 'Batch interrupted'
                                    : `Calling for "${sendProgressCampaign?.name}"...`}
                        </DialogTitle>
                    </DialogHeader>
                    {sendProgress && (
                        <div className="space-y-3">
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full transition-all duration-300"
                                    style={{
                                        width: `${sendProgress.total > 0
                                            ? Math.min(100, Math.round(((sendProgress.completed + sendProgress.failed) / sendProgress.total) * 100))
                                            : 0}%`,
                                        backgroundColor: sendProgress.status === 'called' ? 'var(--secondary)' : '#c0622a',
                                    }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {formatCount(sendProgress.completed + sendProgress.failed)} of {formatCount(sendProgress.total)} processed
                                {sendProgress.failed > 0 && <> — <span className="text-red-600">{sendProgress.failed} failed</span></>}
                            </p>

                            {sendProgress.status === 'called' && sendResults && (
                                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                                    {sendResults.filter(r => r.status === 'failed').map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
                                            <div className="min-w-0">
                                                <div>{r.contact_name || '—'} <span className="text-muted-foreground">{r.contact_phone}</span></div>
                                                {r.error_message && <div className="text-xs text-red-600 truncate">{r.error_message}</div>}
                                            </div>
                                            <span className="shrink-0 text-xs font-semibold text-red-600">failed</span>
                                        </div>
                                    ))}
                                    {sendResults.every(r => r.status !== 'failed') && (
                                        <div className="px-3 py-2 text-sm text-muted-foreground italic">All calls dispatched successfully.</div>
                                    )}
                                </div>
                            )}

                            {sendProgress.is_stale && (
                                <p className="text-xs text-amber-600">
                                    This batch was interrupted before finishing. Close this and use Resume to call the remaining contacts.
                                </p>
                            )}

                            {sendProgress.status !== 'called' && !sendProgress.is_stale && (
                                <p className="text-xs text-muted-foreground italic">Calling — please don't close this window.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={closeSendProgress}
                            disabled={sendProgress?.status !== 'called' && !sendProgress?.is_stale}
                        >
                            {(sendProgress?.status === 'called' || sendProgress?.is_stale) ? 'Close' : 'Calling...'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!sendPreviewCampaign} onOpenChange={(open) => !open && setSendPreviewCampaign(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Start calling for "{sendPreviewCampaign?.name}"?</DialogTitle>
                    </DialogHeader>
                    {sendPreviewLoading ? (
                        <p className="text-sm text-muted-foreground">Loading recipients...</p>
                    ) : sendPreviewData && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                This will call <strong>{formatCount(sendPreviewData.recipient_count)}</strong> contact(s) in batches of {sendPreviewData.max_send_now}. This can't be undone.
                            </p>
                            {sendPreviewData.recipient_count > sendPreviewData.max_send_now && (
                                <div className="rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-3 py-3 text-sm text-amber-800 dark:text-amber-300">
                                    This will be sent in batches of {sendPreviewData.max_send_now}, with a 1-minute pause between batches — it may take a while for large audiences.
                                </div>
                            )}
                            {sendPreviewData.recipient_count > 0 && (
                                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                                    {sendPreviewData.recipients.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span>{r.name || '—'}</span>
                                            <span className="text-muted-foreground">{r.phone}</span>
                                        </div>
                                    ))}
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
                            {sendingId === sendPreviewCampaign?.id ? 'Starting...' : 'Start Calling'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
