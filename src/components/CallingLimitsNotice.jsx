// How many outbound AI calls can be active at the same time, and the state of the request to
// AWS to raise that limit (deploy-app asks for it when the account is created). Shared by the
// Call Campaigns header and Settings. AWS statuses come from Service Quotas.
const REQUEST_STATUS = {
    PENDING: { text: 'pending AWS review', tone: 'pending' },
    CASE_OPENED: { text: 'under review by AWS support', tone: 'pending' },
    APPROVED: { text: 'approved', tone: 'ok' },
    DENIED: { text: 'denied by AWS', tone: 'bad' },
    NOT_APPROVED: { text: 'not approved by AWS', tone: 'bad' },
    CASE_CLOSED: { text: 'closed by AWS support without an increase', tone: 'bad' },
    INVALID_REQUEST: { text: 'rejected as invalid', tone: 'bad' },
};
const TONE_CLASS = {
    pending: 'text-amber-700 dark:text-amber-300',
    ok: 'text-green-700 dark:text-green-400',
    bad: 'text-red-700 dark:text-red-300',
};

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

// compact: one line for page headers; otherwise a short paragraph for Settings.
export const CallingLimitsNotice = ({ limits, compact = false }) => {
    if (!limits) return null;
    const request = limits.increase_request;
    const status = request ? REQUEST_STATUS[request.status] : null;
    const requestOpen = request && status?.tone === 'pending';
    const requestFailed = request && status?.tone === 'bad';
    const limitText = limits.source === 'unavailable'
        ? 'Simultaneous calls: unknown (the calling service could not be reached)'
        : `Simultaneous calls: ${limits.max_concurrent_calls}`;

    if (compact) {
        return (
            <p className="text-xs text-muted-foreground tabular-nums">
                {limitText}
                {requestOpen && <span className={TONE_CLASS.pending}> · increase to {request.desired_value} pending</span>}
            </p>
        );
    }
    return (
        <div className="space-y-1 text-sm" aria-live="polite">
            <p className="font-medium">{limitText}</p>
            <p className="text-xs text-muted-foreground">
                Your phone line can have this many AI calls in progress at the same time; campaigns start each call as soon as one ends.
            </p>
            {request && status && (
                <p className={`text-xs ${TONE_CLASS[status.tone]}`}>
                    Increase to {request.desired_value} simultaneous calls{request.created ? ` requested on ${formatDate(request.created)}` : ''}: {status.text}.
                    {requestOpen && ' AWS usually takes from a few hours to a few weeks; nothing needs to be done here.'}
                    {requestFailed && ' Contact support to request it again.'}
                </p>
            )}
        </div>
    );
};
