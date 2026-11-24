// Stripe.js is always loaded from js.stripe.com (Stripe requires it; card data never touches this
// CRM). Loaded once, only when someone opens a top-up.
const STRIPE_JS = 'https://js.stripe.com/v3/';
let loading = null;
const instances = new Map();

function loadScript() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (!loading) {
        loading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = STRIPE_JS;
            script.async = true;
            script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error('Stripe.js did not load.')));
            script.onerror = () => { loading = null; reject(new Error('Stripe.js could not be loaded. Check your connection.')); };
            document.head.appendChild(script);
        });
    }
    return loading;
}

export async function getStripe(publishableKey) {
    if (!publishableKey) throw new Error('Payments are not set up for this account yet.');
    if (!instances.has(publishableKey)) instances.set(publishableKey, (await loadScript())(publishableKey));
    return instances.get(publishableKey);
}
