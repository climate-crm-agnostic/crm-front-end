import { API_URL, getHeaders } from './api';

// The type registry lives on the backend (crm-back-end/app/attributes/registry.py)
// so the configuration form, the validators and the filter operators all come
// from one declaration. Cached at module scope: it is the same payload for the
// whole session, and several screens ask for it.
let registryPromise = null;

export const getAttributeRegistry = async () => {
    if (!registryPromise) {
        registryPromise = fetch(`${API_URL}/attribute-types/`, {
            method: 'GET',
            headers: getHeaders(),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load attribute types');
                return res.json();
            })
            .catch((err) => {
                // Don't cache a failure — the next caller should retry.
                registryPromise = null;
                throw err;
            });
    }
    return registryPromise;
};

export const clearAttributeRegistryCache = () => {
    registryPromise = null;
};
