import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const TEAMS_URL = `${API_URL}/teams/`;

export const getTeams = async () => {
  return fetchAllPages(TEAMS_URL, { headers: getHeaders() });
};

export const getTeam = async (id) => {
  const res = await fetch(`${TEAMS_URL}${id}/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching team');
  return res.json();
};

export const createTeam = async (data) => {
  const res = await fetch(TEAMS_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error creating team'));
  }
  return res.json();
};

export const updateTeam = async (id, data) => {
  const res = await fetch(`${TEAMS_URL}${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error updating team'));
  }
  return res.json();
};

export const deleteTeam = async (id) => {
  const res = await fetch(`${TEAMS_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete team');
  return true;
};

export const getEligibleMembers = async () => {
  const res = await fetch(`${TEAMS_URL}eligible-members/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching eligible members');
  return res.json();
};

export const getMyLedMemberIds = async () => {
  const res = await fetch(`${TEAMS_URL}my-led-members/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching led members');
  return res.json();
};

export const addTeamMember = async (teamId, userId) => {
  const res = await fetch(`${TEAMS_URL}${teamId}/members/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error adding member'));
  }
  return res.json();
};

export const removeTeamMember = async (teamId, membershipId) => {
  const res = await fetch(`${TEAMS_URL}${teamId}/members/${membershipId}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to remove member');
  return true;
};
