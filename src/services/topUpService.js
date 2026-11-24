import { API_URL, getHeaders, extractErrorMessage } from './api';

// Top-ups from inside the CRM (voice bot minutes, AI credits), paid with Stripe through the
// Climate billing API (crm-back-end app/views/topups_view.py). The backend decides who may buy
// what; the card is only ever shown as brand + last 4.

const BASE = `${API_URL}/top-ups`;

async function call(method, path, body, idempotencyKey) {
    const headers = { ...getHeaders(), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) };
    const res = await fetch(`${BASE}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const err = new Error(extractErrorMessage(data, 'The payment service could not be reached. Try again in a moment.'));
        err.status = res.status;
        err.code = data?.code;
        throw err;
    }
    return data;
}

// { publishable_key, card: {brand, last4} | null, packs: [{price, kind, quantity, amount_cents, label}], can_change_card }
export const getTopUpOptions = () => call('GET', '/options/');
// { payment_intent_id, status, amount_cents, tax_cents, card, pack, publishable_key }
export const startTopUp = (price) => call('POST', '/', { price }, crypto.randomUUID());
// { payment_intent_id, status, client_secret? (3D Secure), error? }
export const confirmTopUp = (paymentIntentId, cvcToken) =>
    call('POST', `/${encodeURIComponent(paymentIntentId)}/confirm/`, cvcToken ? { cvc_token: cvcToken } : {});
// { status, credited, kind, quantity, amount_cents }
export const getTopUp = (paymentIntentId) => call('GET', `/${encodeURIComponent(paymentIntentId)}/`);
// { setup_intent_id, client_secret, publishable_key }
export const startCardChange = () => call('POST', '/cards/', {});
export const setTopUpCard = (setupIntentId) => call('POST', `/cards/${encodeURIComponent(setupIntentId)}/default/`, {});
