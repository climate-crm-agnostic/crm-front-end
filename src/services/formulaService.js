import { API_URL, getHeaders } from './api';

// Formula validation and preview run on the server — the same evaluator that
// stores the value. There is deliberately no second implementation in
// JavaScript: a preview that can disagree with what gets saved is worse than
// a preview that costs a request. See ATTRIBUTES_SPEC.md §6.6.
export const evaluateFormula = async ({ formula, values, self, type }) => {
    const response = await fetch(`${API_URL}/attributes/evaluate/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ formula, values: values || {}, self: self || {}, type }),
    });
    if (!response.ok) throw new Error('Could not evaluate the formula');
    return response.json();
};

// Cached per entity: the function list is the same everywhere, but the rollup
// sources depend on which related records that entity has.
const catalogueCache = new Map();

export const getFormulaCatalogue = async (entity) => {
    const key = entity || '';
    if (!catalogueCache.has(key)) {
        const query = entity ? `?entity=${encodeURIComponent(entity)}` : '';
        catalogueCache.set(key, fetch(`${API_URL}/attributes/formula-functions/${query}`, {
            headers: getHeaders(),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Could not load the formula catalogue');
                return res.json();
            })
            .then((data) => ({
                functions: data.functions || [],
                rollupSources: data.rollup_sources || [],
            }))
            .catch((err) => {
                catalogueCache.delete(key);
                throw err;
            }));
    }
    return catalogueCache.get(key);
};
