import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const STAGE_VALIDATION_API_URL = `${API_URL}/stage-validation-rules/`;

export const getStageValidationRules = async (pipelineId) => {
  const url = pipelineId
    ? `${STAGE_VALIDATION_API_URL}?pipeline=${pipelineId}`
    : STAGE_VALIDATION_API_URL;
  return fetchAllPages(url, { headers: getHeaders() });
};

export const createStageValidationRule = async (rule) => {
  const response = await fetch(STAGE_VALIDATION_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(rule),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, "Error saving rule."));
  }
  return response.json();
};

export const updateStageValidationRule = async (id, rule) => {
  const response = await fetch(`${STAGE_VALIDATION_API_URL}${id}/`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(rule),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, "Error saving rule."));
  }
  return response.json();
};

export const deleteStageValidationRule = async (id) => {
  const response = await fetch(`${STAGE_VALIDATION_API_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete stage validation rule');
  return true;
};
