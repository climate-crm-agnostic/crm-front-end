import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const GOALS_URL = `${API_URL}/goals/`;

export const getGoals = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  return fetchAllPages(`${GOALS_URL}?${query}`, { headers: getHeaders() });
};

export const updateGoal = async (id, data) => {
  const res = await fetch(`${GOALS_URL}${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error updating goal'));
  }
  return res.json();
};

export const bulkSetTeamGoal = async ({ periodId, teamId, metricLabel, targetValue }) => {
  const res = await fetch(`${GOALS_URL}bulk-set-team-goal/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      period_id: periodId, team_id: teamId, metric_label: metricLabel, target_value: targetValue,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error setting team goal'));
  }
  return res.json();
};
