import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const TEMPLATES_URL = `${API_URL}/email-templates/`;

export const getEmailTemplates = async () => {
  return fetchAllPages(TEMPLATES_URL, { headers: getHeaders() });
};

export const createEmailTemplate = async (data) => {
  const res = await fetch(TEMPLATES_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error creating template'));
  }
  return res.json();
};

export const updateEmailTemplate = async (id, data) => {
  const res = await fetch(`${TEMPLATES_URL}${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error updating template'));
  }
  return res.json();
};

export const deleteEmailTemplate = async (id) => {
  const res = await fetch(`${TEMPLATES_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete template');
  return true;
};

// Catalog of {contact.x} / {client.x} variables — fixed fields plus
// whatever custom Attributes this tenant has defined for Contact/Client.
export const getMergeFields = async () => {
  const res = await fetch(`${TEMPLATES_URL}merge-fields/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching merge fields');
  return res.json();
};

// Renders subject/html_body against a real Contact so the editor can show
// what the variables actually resolve to. contactId is optional.
export const previewEmailTemplate = async (id, contactId) => {
  const res = await fetch(`${TEMPLATES_URL}${id}/preview/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(contactId ? { contact_id: contactId } : {}),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error previewing template'));
  }
  return res.json();
};
