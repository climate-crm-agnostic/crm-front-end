import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const CALL_TEMPLATES_URL = `${API_URL}/call-templates/`;

export const getCallTemplates = async () => {
  return fetchAllPages(CALL_TEMPLATES_URL, { headers: getHeaders() });
};

export const createCallTemplate = async (data) => {
  const res = await fetch(CALL_TEMPLATES_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error creating call template'));
  }
  return res.json();
};

export const updateCallTemplate = async (id, data) => {
  const res = await fetch(`${CALL_TEMPLATES_URL}${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error updating call template'));
  }
  return res.json();
};

export const deleteCallTemplate = async (id) => {
  const res = await fetch(`${CALL_TEMPLATES_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete call template');
  return true;
};

// Rewrites a draft prompt into a well-structured voice-agent system prompt
// via AI (see CallTemplateViewSet.polish / app/ai/call_prompt_architect.py)
// — a prompt-engineering rewrite, not a copy-editing one, since this text
// is read by the agent model, not by a person.
export const polishCallPrompt = async (text) => {
  const res = await fetch(`${CALL_TEMPLATES_URL}polish/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error polishing prompt'));
  }
  return res.json();
};
