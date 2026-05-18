import { API_URL, getHeaders } from './api';

const BASE = `${API_URL}/audit-logs/`;

export const getAuditLogs = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.model)     query.set('model',     params.model);
    if (params.actor_id)  query.set('actor_id',  params.actor_id);
    if (params.date_from) query.set('date_from', params.date_from);
    if (params.date_to)   query.set('date_to',   params.date_to);
    if (params.page)      query.set('page',      params.page);
    if (params.page_size) query.set('page_size', params.page_size);

    const url = query.toString() ? `${BASE}?${query}` : BASE;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
};
