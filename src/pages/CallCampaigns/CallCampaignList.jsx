import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Trash2, PhoneCall, Users, Eye, Search, Download, Square, History } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { CallAudienceFilterBuilder } from "./CallAudienceFilterBuilder";
import { getCallTemplates } from "../../services/callTemplateService";
import {
    getCallCampaigns, createCallCampaign, updateCallCampaign, deleteCallCampaign,
    sendCallCampaignNow, previewRecipients, getSendProgress, getCallCampaignRecipients, stopCallCampaign,
    getCallingBalance, getCallingLedger, getCampaignSpend,
} from "../../services/callCampaignService";
import { useClaimedNumber } from "../../hooks/useClaimedNumber";
import { CallingLimitsNotice } from "../../components/CallingLimitsNotice";
import { useCallingLimits } from "../../hooks/useCallingLimits";
import Swal from 'sweetalert2';
import { formatCount } from "@/lib/utils";

const STATUS_COLORS = { draft: "#9b948e", calling: "#c0622a", called: "var(--secondary-text)" };

// Calling balance: $1 per minute, every started minute charged, at most the campaign's duration.
const CALL_MINUTE_OPTIONS = [1, 2, 3, 4, 5];
const DEFAULT_CALL_MINUTES = 5;
const formatMoney = (cents) => `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value) => EMAIL_PATTERN.test((value || '').trim());
const formatDuration = (minutes) => {
    const m = Math.max(Math.round(minutes || 0), 1);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), rest = m % 60;
    return rest ? `${h} h ${rest} min` : `${h} h`;
};
// Best-effort: on failure the header keeps the last balance it showed.
const loadBalance = (setBalance) => getCallingBalance().then(setBalance).catch(() => {});

// Balance history: what each kind of movement means and how it changes the money.
// sign: +1 adds to the balance, -1 takes from it; 'reserve'/'release' only move money between
// "available" and "reserved", the total balance does not change.
const LEDGER_KINDS = {
    opening_balance: { label: 'Opening balance', sign: 1 },
    topup: { label: 'Top-up', sign: 1 },
    reserve: { label: 'Reserved for campaign', sign: -1, reservation: true },
    release: { label: 'Returned (not used)', sign: 1, reservation: true },
    call_release: { label: 'Returned (call without result)', sign: 1, reservation: true },
    charge: { label: 'Call charged', sign: -1 },
};
const ledgerLabel = (entry) => (entry.kind === 'charge' && !entry.amount_cents
    ? 'Call not answered (free)' : (LEDGER_KINDS[entry.kind]?.label || entry.kind));
const ledgerAmount = (entry) => {
    const kind = LEDGER_KINDS[entry.kind];
    if (!entry.amount_cents) return formatMoney(0);
    return `${kind?.sign < 0 ? '−' : '+'}${formatMoney(entry.amount_cents)}`;
};

// A campaign reaches 'called' as soon as every call has been DIALED (seconds), but each call's
// outcome (duration, disconnect reason, recording) only arrives when the call ends, through the
// call-status webhook that deploy-app's CTR reconciler sends after hang-up. So polling has two
// phases: fast while dispatching, then slower until no recipient is still 'calling'. The cap covers
// the 5-minute per-call limit plus the CTR delivery delay; after it, Recipients still shows the
// latest data whenever it is reopened.
const DISPATCH_POLL_MS = 1500;
const RESULT_POLL_MS = 5000;
const RESULT_POLL_MAX_MS = 10 * 60 * 1000;
const IN_FLIGHT_STATUSES = ['pending', 'calling'];

const outcomeDetails = (results) => {
    const list = Array.isArray(results) ? results : [];
    return {
        mode: 'outcome',
        recipient_count: list.length,
        completed_count: list.filter(r => r.status === 'completed').length,
        failed_count: list.filter(r => r.status === 'failed').length,
        cancelled_count: list.filter(r => r.status === 'cancelled').length,
        voicemail_count: list.filter(r => r.status === 'voicemail').length,
        no_answer_count: list.filter(r => r.status === 'no_answer').length,
        in_progress_count: list.filter(r => IN_FLIGHT_STATUSES.includes(r.status)).length,
        recipients: list,
    };
};

// Per-recipient outcome status (distinct from campaign-level status above).
// cancelled = never called (campaign stopped or batch interrupted); failed = a call attempt failed;
// voicemail = the call connected but a machine answered (the AI agent hung up without leaving a message);
// no_answer = dialed but nobody picked up (rang out, busy, or the carrier cancelled it).
const RECIPIENT_STATUS_COLORS = { pending: "#9b948e", calling: "#c0622a", completed: "var(--secondary-text)", failed: "#dc2626", cancelled: "#6b7280", voicemail: "#7c3aed", no_answer: "#b45309" };
const statusLabel = (status) => (status || '').replace(/_/g, ' ');
// Result of a conversation (only on completed calls): what the AI agent reported when it ended the
// call, or hung_up when the person hung up first. Matches CallCampaignRecipient.RESULT_CHOICES.
const RESULT_LABELS = {
    interested: 'Interested',
    not_interested: 'Not interested',
    callback_requested: 'Callback requested',
    do_not_call: 'Do not call',
    wrong_person: 'Wrong person',
    no_response: 'No response',
    hung_up: 'Hung up',
};
const recipientBadgeStyle = (status) => ({
    backgroundColor: `color-mix(in srgb, ${RECIPIENT_STATUS_COLORS[status] || '#9b948e'} 12%, transparent)`,
    color: RECIPIENT_STATUS_COLORS[status] || '#9b948e',
});

export const CallCampaignList = () => {
    const navigate = useNavigate();
    const { claimedNumber, loading: numberLoading } = useClaimedNumber();
    const callingLimits = useCallingLimits();
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState(null);
    const [stoppingId, setStoppingId] = useState(null);
    const [confirmingStop, setConfirmingStop] = useState(false);   // inline confirm in the progress modal

    const [name, setName] = useState("");
    const [templateId, setTemplateId] = useState("");
    const [audienceFilters, setAudienceFilters] = useState([]);
    const [audienceLogic, setAudienceLogic] = useState("AND");
    const [maxCallMinutes, setMaxCallMinutes] = useState(String(DEFAULT_CALL_MINUTES));
    const [escalationEmail, setEscalationEmail] = useState("");
    const [balance, setBalance] = useState(null);

    const [audienceEditor, setAudienceEditor] = useState(null); // campaign being edited, or null
    const [editorFilters, setEditorFilters] = useState([]);
    const [editorLogic, setEditorLogic] = useState("AND");
    const [editorMinutes, setEditorMinutes] = useState(String(DEFAULT_CALL_MINUTES));
    const [editorEmail, setEditorEmail] = useState("");
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
    const [detailsSpend, setDetailsSpend] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyEntries, setHistoryEntries] = useState([]);
    const [historyCursor, setHistoryCursor] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [detailsSearch, setDetailsSearch] = useState("");
    const [detailsStatusFilter, setDetailsStatusFilter] = useState("all");
    const [detailsResultFilter, setDetailsResultFilter] = useState("all");
    const [selectedRecipientId, setSelectedRecipientId] = useState(null);

    // Blocking progress modal for an in-flight batch, polling send-progress
    // until the background thread (see calling_view.py) finishes dispatching
    // every call, then switching the same modal to a called/failed summary.
    // 'completed' here only means the call ended, not that it was answered.
    const [sendProgressCampaign, setSendProgressCampaign] = useState(null);
    const [sendProgress, setSendProgressState] = useState(null);
    const [sendResults, setSendResults] = useState(null);
    const [sendResultsTimedOut, setSendResultsTimedOut] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    // Phase 1 (dispatching): send-progress every DISPATCH_POLL_MS until status is 'called'.
    // Phase 2 (calls in progress): every RESULT_POLL_MS until no recipient is 'calling',
    // capped at RESULT_POLL_MAX_MS. The previous version stopped at 'called', when the calls
    // were still ringing, so the modal stayed at "0 of N" until the page was reloaded.
    const pollCampaignId = sendProgressCampaign?.id ?? null;
    useEffect(() => {
        if (!pollCampaignId) return;

        let cancelled = false;
        let timerId = null;
        let resultsDeadline = null;   // set when dispatching ends

        const schedule = (ms) => {
            if (!cancelled) timerId = setTimeout(tick, ms);
        };

        const tick = async () => {
            let progress;
            try {
                progress = await getSendProgress(pollCampaignId);
            } catch {
                // transient poll failure: retry on the next tick, no toast needed
                schedule(resultsDeadline === null ? DISPATCH_POLL_MS : RESULT_POLL_MS);
                return;
            }
            if (cancelled) return;
            setSendProgressState(prev => ({
                ...progress,
                total: Math.max(progress.total || 0, prev?.total || 0),
            }));

            if (progress.is_stale) {
                refreshCampaigns();
                return;
            }
            if (progress.status !== 'called') {
                schedule(DISPATCH_POLL_MS);
                return;
            }

            if (resultsDeadline === null) {
                resultsDeadline = Date.now() + RESULT_POLL_MAX_MS;
                refreshCampaigns();   // the list row flips to 'called' right away
            }
            try {
                const results = await getCallCampaignRecipients(pollCampaignId);
                if (cancelled) return;
                setSendResults(Array.isArray(results) ? results : []);
            } catch {
                // keep the previous results; the next tick retries
            }
            if ((progress.calling || 0) === 0) return;   // every call has ended
            if (Date.now() < resultsDeadline) {
                schedule(RESULT_POLL_MS);
            } else {
                setSendResultsTimedOut(true);
            }
        };

        tick();
        return () => {
            cancelled = true;
            if (timerId !== null) clearTimeout(timerId);
        };
    }, [pollCampaignId]);

    // Recipients dialog: while any recipient is still pending/calling, refresh it every
    // RESULT_POLL_MS so duration, disconnect reason and the recording player appear on their own.
    const detailsPollId = detailsCampaign?.id ?? null;
    const detailsInFlight = detailsData?.mode === 'outcome'
        && detailsData.recipients.some(r => IN_FLIGHT_STATUSES.includes(r.status));
    useEffect(() => {
        if (!detailsPollId || !detailsInFlight) return;

        let cancelled = false;
        const deadline = Date.now() + RESULT_POLL_MAX_MS;
        const intervalId = setInterval(async () => {
            if (Date.now() > deadline) {
                clearInterval(intervalId);
                return;
            }
            try {
                const results = await getCallCampaignRecipients(detailsPollId);
                if (!cancelled) setDetailsData(outcomeDetails(results));
            } catch {
                // keep showing the last data; the next tick retries
            }
        }, RESULT_POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [detailsPollId, detailsInFlight]);

    // Silent list refresh for background updates. loadAll() toggles `loading`, which swaps the
    // whole page (including any open dialog) for the loading placeholder.
    const refreshCampaigns = async () => {
        try {
            const c = await getCallCampaigns();
            setCampaigns(Array.isArray(c) ? c : []);
        } catch {
            // keep the current list; the next refresh or a reload will catch up
        }
        loadBalance(setBalance);
    };

    const loadAll = async () => {
        setLoading(true);
        try {
            const [c, t] = await Promise.all([getCallCampaigns(), getCallTemplates()]);
            setCampaigns(Array.isArray(c) ? c : []);
            setTemplates(Array.isArray(t) ? t : []);
            loadBalance(setBalance);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load call campaigns', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim() || !templateId || !isValidEmail(escalationEmail)) return;
        try {
            await createCallCampaign({
                name, template_id: templateId, audience_filters: audienceFilters, audience_logic: audienceLogic,
                max_call_minutes: Number(maxCallMinutes), escalation_email: escalationEmail.trim(),
            });
            setName(""); setTemplateId(""); setAudienceFilters([]); setAudienceLogic("AND");
            setMaxCallMinutes(String(DEFAULT_CALL_MINUTES)); setEscalationEmail("");
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const openAudienceEditor = (campaign) => {
        setAudienceEditor(campaign);
        setEditorFilters(campaign.audience_filters || []);
        setEditorLogic(campaign.audience_logic || "AND");
        setEditorMinutes(String(campaign.max_call_minutes || DEFAULT_CALL_MINUTES));
        setEditorEmail(campaign.escalation_email || "");
    };

    const handleSaveAudience = async () => {
        setSavingAudience(true);
        try {
            await updateCallCampaign(audienceEditor.id, {
                audience_filters: editorFilters, audience_logic: editorLogic,
                max_call_minutes: Number(editorMinutes), escalation_email: editorEmail.trim(),
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
        setDetailsSearch("");
        setDetailsStatusFilter("all");
        setDetailsResultFilter("all");
        setSelectedRecipientId(null);
        setDetailsSpend(null);
        setDetailsLoading(true);
        try {
            if (campaign.status === 'draft') {
                const data = await previewRecipients(campaign.id);
                setDetailsData({ mode: 'preview', recipient_count: data.recipient_count, recipients: data.recipients });
            } else {
                const results = await getCallCampaignRecipients(campaign.id);
                const details = outcomeDetails(results);
                const list = details.recipients;
                setDetailsData(details);
                // Land on a recipient that already has a recording when one exists,
                // so opening the dialog shows the player right away instead of a
                // blank detail pane the user has to click into first.
                const landingRecipient = list.find(r => r.recording_url) || list[0];
                setSelectedRecipientId(landingRecipient?.id ?? null);
                // Best-effort: the history in DynamoDB is the source of truth for what was spent.
                getCampaignSpend(campaign.id).then(setDetailsSpend).catch(() => setDetailsSpend({ error: true }));
            }
        } catch (err) {
            setDetailsCampaign(null);
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setDetailsLoading(false);
        }
    };

    const loadHistory = async (cursor = null) => {
        setHistoryLoading(true);
        setHistoryError("");
        try {
            const page = await getCallingLedger({ cursor });
            setHistoryEntries(prev => (cursor ? [...prev, ...page.entries] : page.entries));
            setHistoryCursor(page.next_cursor);
            if (!page.ledger_enabled) setHistoryError('The balance history starts after the next calling setup update of this account.');
        } catch (err) {
            setHistoryError(err.message);
        } finally {
            setHistoryLoading(false);
        }
    };

    const openHistory = () => {
        setHistoryOpen(true);
        setHistoryEntries([]);
        setHistoryCursor(null);
        loadHistory();
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
            setSendResultsTimedOut(false);
            setSendProgressState({ status: 'calling', total, completed: 0, failed: 0, calling: 0 });
            setSendProgressCampaign(campaign);
            loadBalance(setBalance);
        } catch (err) {
            // e.g. the balance changed since the preview (another campaign reserved it): the message
            // says how many calls it covers now.
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 9000 });
        } finally {
            setSendingId(null);
        }
    };

    // alreadyConfirmed: the progress modal confirms inline (a SweetAlert opened over a modal
    // Radix dialog can't be clicked), the campaign list confirms with SweetAlert.
    const handleStop = async (campaign, alreadyConfirmed = false) => {
        if (!alreadyConfirmed) {
            const result = await Swal.fire({
                title: `Stop calling for "${campaign.name}"?`,
                text: "Nobody else will be called. Calls already in progress will finish normally. A stopped campaign can't be sent again.",
                icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#dc2626', cancelButtonColor: '#9b948e', confirmButtonText: 'Stop calling',
            });
            if (!result.isConfirmed) return;
        }
        setConfirmingStop(false);
        setStoppingId(campaign.id);
        try {
            const { not_called, in_progress } = await stopCallCampaign(campaign.id);
            Swal.fire({
                icon: 'success', title: 'Campaign stopped', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000,
                text: `${not_called} contact(s) won't be called. ${in_progress} call(s) still in progress will finish normally.`,
            });
            refreshCampaigns();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setStoppingId(null);
        }
    };

    const closeSendProgress = () => {
        setConfirmingStop(false);
        setSendProgressCampaign(null);
        setSendProgressState(null);
        setSendResults(null);
        setSendResultsTimedOut(false);
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
                <div className="flex items-start gap-6 shrink-0">
                    {balance && (
                        <div className="text-right" title={`${formatMoney(balance.price_cents_per_minute)} per minute. Reserved: calls of campaigns still in progress.`}>
                            <Label className="text-xs text-muted-foreground">Calling balance</Label>
                            <p className="text-sm font-semibold tabular-nums">{formatMoney(balance.available_cents)} available</p>
                            {balance.reserved_cents > 0 && (
                                <p className="text-xs text-muted-foreground tabular-nums">{formatMoney(balance.reserved_cents)} reserved · {formatMoney(balance.balance_cents)} total</p>
                            )}
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs cursor-pointer" onClick={openHistory}>
                                <History className="h-3 w-3 mr-1" aria-hidden="true" /> Balance history
                            </Button>
                        </div>
                    )}
                    {!numberLoading && claimedNumber && (
                        <div className="text-right">
                            <Label className="text-xs text-muted-foreground">Calling from</Label>
                            <code className="block font-mono text-sm">{claimedNumber}</code>
                            <CallingLimitsNotice limits={callingLimits} compact />
                        </div>
                    )}
                </div>
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
                <CallLimitFields
                    idPrefix="new-campaign"
                    minutes={maxCallMinutes} onMinutesChange={setMaxCallMinutes}
                    email={escalationEmail} onEmailChange={setEscalationEmail}
                />

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

                <Button type="button" onClick={handleCreate} disabled={!name.trim() || !templateId || !isValidEmail(escalationEmail)}>Create Campaign</Button>
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
                                    {c.template?.name}
                                    {' · '}{c.max_call_minutes} min per call
                                    {c.status !== 'draft' && (
                                        <>
                                            {' · '}{formatCount(c.completed_count)}/{formatCount(c.recipient_count || 0)} completed
                                            {c.failed_count > 0 && <> · <span className="text-red-600">{formatCount(c.failed_count)} failed</span></>}
                                            {c.voicemail_count > 0 && <> · {formatCount(c.voicemail_count)} voicemail</>}
                                            {c.no_answer_count > 0 && <> · {formatCount(c.no_answer_count)} no answer</>}
                                            {c.cancelled_count > 0 && <> · {formatCount(c.cancelled_count)} cancelled</>}
                                            {' · '}{formatMoney(c.spent_cents)} spent
                                        </>
                                    )}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={() => openDetails(c)}>
                                    <Eye className="h-4 w-4 mr-1" /> View Details
                                </Button>
                                {c.status === 'draft' && (
                                    <Button variant="outline" size="sm" onClick={() => openAudienceEditor(c)}>
                                        <Users className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                )}
                                {/* Campaigns are sent once: no Resume. An interrupted batch is closed
                                    by the backend and its details show who was not called. */}
                                {c.status === 'calling' && (
                                    <>
                                        <Button variant="secondary" size="sm" disabled title="Calls in progress">
                                            <Phone className="h-4 w-4 mr-1" /> Calling...
                                        </Button>
                                        <Button
                                            variant="outline" size="sm"
                                            onClick={() => handleStop(c)}
                                            disabled={stoppingId === c.id}
                                            className="text-red-600 hover:text-red-700"
                                            title="Stop calling the contacts not called yet"
                                        >
                                            <Square className="h-4 w-4 mr-1" /> {stoppingId === c.id ? 'Stopping...' : 'Stop'}
                                        </Button>
                                    </>
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
                        <DialogTitle>Edit Campaign — {audienceEditor?.name}</DialogTitle>
                    </DialogHeader>
                    <CallLimitFields
                        idPrefix="edit-campaign"
                        minutes={editorMinutes} onMinutesChange={setEditorMinutes}
                        email={editorEmail} onEmailChange={setEditorEmail}
                    />
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
                        <Button onClick={handleSaveAudience} disabled={savingAudience || !isValidEmail(editorEmail)}>
                            {savingAudience ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!detailsCampaign} onOpenChange={(open) => !open && setDetailsCampaign(null)}>
                <DialogContent className="sm:max-w-3xl">
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
                    {!detailsLoading && detailsData && detailsData.mode === 'outcome' && (() => {
                        const filtered = detailsData.recipients.filter(r => {
                            if (detailsStatusFilter !== 'all' && r.status !== detailsStatusFilter) return false;
                            if (detailsResultFilter !== 'all' && r.result !== detailsResultFilter) return false;
                            const q = detailsSearch.trim().toLowerCase();
                            if (!q) return true;
                            return (r.contact_name || '').toLowerCase().includes(q) || (r.contact_phone || '').toLowerCase().includes(q);
                        });
                        const selected = filtered.find(r => r.id === selectedRecipientId) || filtered[0] || null;

                        return (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-secondary-text">{detailsData.completed_count}</strong> completed
                                        {detailsData.failed_count > 0 && <> · <strong className="text-red-600">{detailsData.failed_count}</strong> failed</>}
                                        {detailsData.voicemail_count > 0 && <> · <strong>{detailsData.voicemail_count}</strong> voicemail</>}
                                        {detailsData.no_answer_count > 0 && <> · <strong>{detailsData.no_answer_count}</strong> no answer</>}
                                        {detailsData.cancelled_count > 0 && <> · <strong>{detailsData.cancelled_count}</strong> cancelled</>}
                                        {detailsData.in_progress_count > 0 && <> · <strong>{detailsData.in_progress_count}</strong> in progress</>}
                                        {' '}of {formatCount(detailsData.recipient_count)} total.
                                    </p>
                                    <div className="flex items-center gap-2">
                                    <Select value={detailsResultFilter} onValueChange={setDetailsResultFilter}>
                                        <SelectTrigger className="w-40 h-8 text-xs" aria-label="Filter by result"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All results</SelectItem>
                                            {Object.entries(RESULT_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={detailsStatusFilter} onValueChange={setDetailsStatusFilter}>
                                        <SelectTrigger className="w-36 h-8 text-xs" aria-label="Filter by status"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All statuses</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="failed">Failed</SelectItem>
                                            <SelectItem value="voicemail">Voicemail</SelectItem>
                                            <SelectItem value="no_answer">No answer</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                            <SelectItem value="calling">Calling</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    </div>
                                </div>

                                {detailsSpend && (
                                    <p className="text-sm text-muted-foreground" aria-live="polite">
                                        {detailsSpend.error ? 'The spend of this campaign could not be read right now.' : (
                                            <>
                                                Spent <strong className="text-secondary-text tabular-nums">{formatMoney(detailsSpend.charged_cents)}</strong>
                                                {' '}({formatCount(detailsSpend.charged_minutes)} min, {formatCount(detailsSpend.answered_calls)} answered call(s)
                                                {detailsSpend.unanswered_calls > 0 && <>, {formatCount(detailsSpend.unanswered_calls)} not answered, free</>})
                                                {' · '}reserved {formatMoney(detailsSpend.reserved_cents)} · returned {formatMoney(detailsSpend.released_cents)}
                                            </>
                                        )}
                                    </p>
                                )}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        value={detailsSearch}
                                        onChange={e => setDetailsSearch(e.target.value)}
                                        placeholder="Search by name or phone..."
                                        className="h-8 pl-8 text-sm"
                                    />
                                </div>

                                {filtered.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic py-6 text-center">No recipients match this filter.</p>
                                ) : (
                                    <div className="flex flex-col md:flex-row border rounded-md overflow-hidden">
                                        <div className="md:w-56 shrink-0 max-h-80 overflow-y-auto divide-y border-b md:border-b-0 md:border-r">
                                            {filtered.map(r => (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => setSelectedRecipientId(r.id)}
                                                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${selected?.id === r.id ? 'bg-primary/10' : 'hover:bg-muted/40'}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium truncate">{r.contact_name || '—'}</span>
                                                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={recipientBadgeStyle(r.status)}>
                                                            {statusLabel(r.status)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {r.contact_phone || '—'}
                                                        {r.result && RESULT_LABELS[r.result] && <> · {RESULT_LABELS[r.result]}</>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex-1 p-4 max-h-80 overflow-y-auto">
                                            {selected ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-base font-semibold">{selected.contact_name || '—'}</p>
                                                            <p className="text-sm text-muted-foreground">{selected.contact_phone || '—'}</p>
                                                        </div>
                                                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={recipientBadgeStyle(selected.status)}>
                                                            {statusLabel(selected.status)}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        {selected.result && RESULT_LABELS[selected.result] && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Result</p>
                                                                <p className="font-medium">{RESULT_LABELS[selected.result]}</p>
                                                            </div>
                                                        )}
                                                        {selected.duration_seconds != null && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Duration</p>
                                                                <p>{selected.duration_seconds}s</p>
                                                            </div>
                                                        )}
                                                        {selected.disconnect_reason && (
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-muted-foreground">Disconnect reason</p>
                                                                <p className="truncate" title={selected.disconnect_reason}>{selected.disconnect_reason}</p>
                                                            </div>
                                                        )}
                                                        {selected.billed_minutes != null && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Charged</p>
                                                                <p className="tabular-nums">
                                                                    {selected.billed_minutes > 0
                                                                        ? `${selected.billed_minutes} min · ${formatMoney(selected.charged_cents)}`
                                                                        : 'Not charged (not answered)'}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {selected.escalated_at && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Escalated</p>
                                                                <p>{new Date(selected.escalated_at).toLocaleString()}</p>
                                                            </div>
                                                        )}
                                                        {selected.called_at && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Called at</p>
                                                                <p>{new Date(selected.called_at).toLocaleString()}</p>
                                                            </div>
                                                        )}
                                                        {selected.completed_at && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Completed at</p>
                                                                <p>{new Date(selected.completed_at).toLocaleString()}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {selected.status === 'voicemail' && (
                                                        <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                                                            A voicemail or automated system answered. The AI agent hung up without leaving a message.
                                                        </div>
                                                    )}
                                                    {selected.status === 'no_answer' && (
                                                        <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                                                            Nobody picked up: the call rang out, the line was busy, or the carrier cancelled it.
                                                        </div>
                                                    )}
                                                    {selected.outcome_reason && (
                                                        <div className="text-sm">
                                                            <p className="text-xs text-muted-foreground">Why the call ended</p>
                                                            <p>{selected.outcome_reason}</p>
                                                        </div>
                                                    )}
                                                    {selected.status === 'failed' && selected.error_message && (
                                                        <div className="rounded-md border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                                                            {selected.error_message}
                                                        </div>
                                                    )}

                                                    {selected.recording_url ? (
                                                        <div className="space-y-1.5 pt-2 border-t">
                                                            <p className="text-xs text-muted-foreground">Recording</p>
                                                            <audio controls src={selected.recording_url} className="w-full h-10" />
                                                            <a
                                                                href={selected.recording_url}
                                                                download
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-primary-text hover:underline"
                                                            >
                                                                <Download className="h-3 w-3" /> Download recording
                                                            </a>
                                                        </div>
                                                    ) : (selected.status === 'completed' || selected.status === 'voicemail') && (
                                                        <p className="text-xs text-muted-foreground italic pt-2 border-t">No recording available for this call.</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">Select a recipient to see its details.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setDetailsCampaign(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!sendProgressCampaign} onOpenChange={(open) => !open && (sendProgress?.status === 'called' || sendProgress?.is_stale) && closeSendProgress()}>
                <DialogContent className="sm:max-w-lg" onInteractOutside={e => !(sendProgress?.status === 'called' || sendProgress?.is_stale) && e.preventDefault()} onEscapeKeyDown={e => !(sendProgress?.status === 'called' || sendProgress?.is_stale) && e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>
                            {sendProgress?.is_stopped && (sendProgress.calling || 0) === 0
                                ? 'Calling stopped'
                                : sendProgress?.is_stale
                                ? 'Batch interrupted'
                                : sendProgress?.status === 'called'
                                    ? ((sendProgress.calling || 0) > 0 ? 'Calls in progress' : 'Batch complete')
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
                                            ? Math.min(100, Math.round(((sendProgress.completed + sendProgress.failed + (sendProgress.cancelled || 0) + (sendProgress.voicemail || 0) + (sendProgress.no_answer || 0)) / sendProgress.total) * 100))
                                            : 0}%`,
                                        backgroundColor: sendProgress.status === 'called' ? 'var(--secondary)' : '#c0622a',
                                    }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {formatCount(sendProgress.completed + sendProgress.failed + (sendProgress.cancelled || 0) + (sendProgress.voicemail || 0) + (sendProgress.no_answer || 0))} of {formatCount(sendProgress.total)} finished
                                {(sendProgress.voicemail || 0) > 0 && <> · {formatCount(sendProgress.voicemail)} voicemail</>}
                                {(sendProgress.no_answer || 0) > 0 && <> · {formatCount(sendProgress.no_answer)} no answer</>}
                                {(sendProgress.calling || 0) > 0 && <> · {formatCount(sendProgress.calling)} in progress</>}
                                {sendProgress.failed > 0 && <> — <span className="text-red-600">{sendProgress.failed} failed</span></>}
                            </p>

                            {sendProgress.is_stopped && (
                                <p className="text-xs text-amber-600">
                                    Calling was stopped. The contacts not called yet are listed as cancelled in the campaign's details
                                    {(sendProgress.calling || 0) > 0 ? '; the calls already in progress will finish normally.' : '.'}
                                </p>
                            )}
                            {!sendProgress.is_stopped && sendProgress.status === 'called' && (sendProgress.calling || 0) > 0 && !sendResultsTimedOut && (
                                <p className="text-xs text-muted-foreground italic">
                                    Every call has been dialed. Results appear here as each call ends. You can close this window; the campaign's Recipients view keeps updating too.
                                </p>
                            )}
                            {sendResultsTimedOut && (
                                <p className="text-xs text-amber-600">
                                    Some calls are taking longer than expected to report back. Check the campaign's Recipients later.
                                </p>
                            )}

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
                                    {sendResults.some(r => r.status === 'cancelled') && (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            {formatCount(sendResults.filter(r => r.status === 'cancelled').length)} contact(s) were not called (cancelled). See the campaign's details.
                                        </div>
                                    )}
                                    {sendResults.every(r => r.status !== 'failed' && r.status !== 'cancelled') && (
                                        <div className="px-3 py-2 text-sm text-muted-foreground italic">All calls dispatched successfully.</div>
                                    )}
                                </div>
                            )}

                            {sendProgress.is_stale && (
                                <p className="text-xs text-amber-600">
                                    This batch was interrupted before finishing. Campaigns are sent only once, so it won't be resumed: the contacts it didn't reach are listed as cancelled in the campaign's details.
                                </p>
                            )}

                            {sendProgress.status !== 'called' && !sendProgress.is_stale && (
                                <p className="text-xs text-muted-foreground italic">Calling — please don't close this window.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {sendProgress && sendProgress.status !== 'called' && !sendProgress.is_stale && sendProgressCampaign && (
                            confirmingStop ? (
                                <div className="flex flex-wrap items-center gap-2 mr-auto">
                                    <span className="text-xs text-muted-foreground">Stop calling the rest? Calls in progress will finish.</span>
                                    <Button variant="ghost" size="sm" onClick={() => setConfirmingStop(false)}>Cancel</Button>
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => handleStop(sendProgressCampaign, true)}
                                        disabled={stoppingId === sendProgressCampaign.id}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        {stoppingId === sendProgressCampaign.id ? 'Stopping...' : 'Yes, stop'}
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="outline" onClick={() => setConfirmingStop(true)} className="text-red-600 hover:text-red-700">
                                    <Square className="h-4 w-4 mr-1" /> Stop calling
                                </Button>
                            )
                        )}
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

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Balance history</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Every movement of the calling balance, newest first. Reservations and returns only move money between
                        available and reserved; charges are what answered calls cost ($1 per started minute).
                    </p>
                    {historyError && (
                        <div role="alert" className="rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                            {historyError}
                        </div>
                    )}
                    <div className="max-h-96 overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-xs text-muted-foreground sticky top-0">
                                <tr>
                                    <th scope="col" className="text-left font-medium px-3 py-2">Date</th>
                                    <th scope="col" className="text-left font-medium px-3 py-2">Movement</th>
                                    <th scope="col" className="text-left font-medium px-3 py-2">Campaign / call</th>
                                    <th scope="col" className="text-right font-medium px-3 py-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {historyEntries.map(e => (
                                    <tr key={e.id || `${e.kind}-${e.created_at}`}>
                                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                            {e.kind === 'opening_balance' || !e.created_at ? '—' : new Date(e.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-3 py-2">
                                            {ledgerLabel(e)}
                                            {e.kind === 'charge' && e.minutes > 0 && <span className="text-muted-foreground"> · {e.minutes} min</span>}
                                        </td>
                                        <td className="px-3 py-2 min-w-0">
                                            <div className="truncate">{e.campaign_name || (e.campaign_id ? 'Deleted campaign' : '—')}</div>
                                            {(e.contact_name || e.contact_phone) && (
                                                <div className="text-xs text-muted-foreground truncate">{[e.contact_name, e.contact_phone].filter(Boolean).join(' · ')}</div>
                                            )}
                                        </td>
                                        <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${LEDGER_KINDS[e.kind]?.reservation ? 'text-muted-foreground' : ''}`}>
                                            {ledgerAmount(e)}
                                        </td>
                                    </tr>
                                ))}
                                {!historyLoading && historyEntries.length === 0 && !historyError && (
                                    <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground italic">No movements yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <DialogFooter>
                        {historyCursor && (
                            <Button variant="outline" onClick={() => loadHistory(historyCursor)} disabled={historyLoading}>
                                {historyLoading ? 'Loading...' : 'Load more'}
                            </Button>
                        )}
                        <Button variant="secondary" onClick={() => setHistoryOpen(false)}>Close</Button>
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
                            {sendPreviewData.cost && <SendCostSummary cost={sendPreviewData.cost} escalationEmail={sendPreviewData.escalation_email} />}
                            <p className="text-sm text-muted-foreground">
                                This will call <strong>{formatCount(sendPreviewData.recipient_count)}</strong> contact(s), up to {formatCount(sendPreviewData.max_concurrent_calls)} at the same time. A call campaign can only be sent once: calls that fail are not retried, they are listed in the campaign's details.
                            </p>
                            {sendPreviewData.recipient_count > sendPreviewData.max_concurrent_calls && (
                                <div className="rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-3 py-3 text-sm text-amber-800 dark:text-amber-300">
                                    Your phone line allows {formatCount(sendPreviewData.max_concurrent_calls)} call(s) at the same time, so each call starts when one ends.
                                    {' '}This campaign may take about <strong>{formatDuration(sendPreviewData.estimated_minutes)}</strong>.
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
                            disabled={sendPreviewLoading || !sendPreviewData?.recipient_count || sendingId === sendPreviewCampaign?.id
                                || !sendPreviewData?.cost?.sufficient || !sendPreviewData?.escalation_email}
                        >
                            {sendingId === sendPreviewCampaign?.id ? 'Starting...' : 'Start Calling'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Duration per call and escalation email, shared by the create form and the edit dialog.
const CallLimitFields = ({ idPrefix, minutes, onMinutesChange, email, onEmailChange }) => {
    const emailInvalid = email.trim() !== '' && !isValidEmail(email);
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-minutes`}>Max call duration</Label>
                <Select value={minutes} onValueChange={onMinutesChange}>
                    <SelectTrigger id={`${idPrefix}-minutes`} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {CALL_MINUTE_OPTIONS.map(m => <SelectItem key={m} value={String(m)}>{m} min ({formatMoney(m * 100)} max per call)</SelectItem>)}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The call is ended when it reaches this time. $1 per minute of answered calls (a voicemail counts); every started minute is charged. Unanswered calls are free.</p>
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`${idPrefix}-email`}>Escalation email</Label>
                <Input
                    id={`${idPrefix}-email`} type="email" value={email} onChange={e => onEmailChange(e.target.value)}
                    placeholder="e.g. sales-team@company.com" aria-invalid={emailInvalid}
                />
                <p className={`text-xs ${emailInvalid ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {emailInvalid ? 'Enter a valid email address.' : 'Calls ended at the time limit are sent here for a person to follow up.'}
                </p>
            </div>
        </div>
    );
};

// Cost check of the send dialog: the campaign can only be sent when the available balance covers
// every call at its maximum duration.
const SendCostSummary = ({ cost, escalationEmail }) => (
    <div className="space-y-2">
        <div className="rounded-md border px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                    {formatCount(cost.recipient_count)} call(s) × {cost.max_call_minutes} min × {formatMoney(cost.price_cents_per_minute)}/min
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(cost.required_cents)} max</span>
            </div>
            <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Available balance</span>
                <span className="tabular-nums">{cost.available_cents == null ? '—' : formatMoney(cost.available_cents)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
                The maximum is reserved now. Each answered call is charged when it ends; unanswered calls are free and the rest is released.
                {escalationEmail && <> Calls ended at the time limit go to <strong>{escalationEmail}</strong>.</>}
            </p>
        </div>
        {!escalationEmail && (
            <div role="alert" className="rounded-md border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                Set an escalation email (Edit) before sending this campaign.
            </div>
        )}
        {cost.balance_error && (
            <div role="alert" className="rounded-md border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {cost.balance_error}
            </div>
        )}
        {!cost.sufficient && !cost.balance_error && (
            <div role="alert" className="rounded-md border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                Not enough balance to call everyone: it covers {formatCount(cost.affordable_calls)} of {formatCount(cost.recipient_count)} call(s)
                {' '}at {cost.max_call_minutes} min. Narrow the audience with a filter, lower the call duration, or top up the balance.
            </div>
        )}
    </div>
);
