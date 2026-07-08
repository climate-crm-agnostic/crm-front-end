import { API_URL, getHeaders } from './api';

const STAGE_VALIDATION_API_URL = `${API_URL}/stage-validation-rules/`;

export const getStageValidationRules = async (pipelineId) => {
  const url = pipelineId
    ? `${STAGE_VALIDATION_API_URL}?pipeline=${pipelineId}`
    : STAGE_VALIDATION_API_URL;
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch stage validation rules');
  const data = await response.json();
  return data.results || data;
};

export const createStageValidationRule = async (rule) => {
  const response = await fetch(STAGE_VALIDATION_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(rule),
  });
  const data = await response.json();
  if (!response.ok) throw data;
  return data;
};

export const updateStageValidationRule = async (id, rule) => {
  const response = await fetch(`${STAGE_VALIDATION_API_URL}${id}/`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(rule),
  });
  const data = await response.json();
  if (!response.ok) throw data;
  return data;
};

export const deleteStageValidationRule = async (id) => {
  const response = await fetch(`${STAGE_VALIDATION_API_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete stage validation rule');
  return true;
};
