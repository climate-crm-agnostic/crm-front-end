import { API_URL, getHeaders } from './api';

export const getRooms = async () => {
    const res = await fetch(`${API_URL}/chat/rooms/`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load rooms');
    const data = await res.json();
    return data.results ?? data;
};

export const createGroup = async (name, memberIds) => {
    const res = await fetch(`${API_URL}/chat/rooms/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, room_type: 'group', member_ids: memberIds }),
    });
    if (!res.ok) throw new Error('Failed to create group');
    return res.json();
};

export const createDirect = async (userId) => {
    const res = await fetch(`${API_URL}/chat/rooms/direct/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) throw new Error('Failed to create DM');
    return res.json();
};

export const getRoom = async (roomId) => {
    const res = await fetch(`${API_URL}/chat/rooms/${roomId}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load room');
    return res.json();
};

export const getMessages = async (roomId, page = 1) => {
    const res = await fetch(`${API_URL}/chat/rooms/${roomId}/messages/?page=${page}`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load messages');
    return res.json();
};

export const markRead = async (roomId) => {
    await fetch(`${API_URL}/chat/rooms/${roomId}/mark-read/`, {
        method: 'POST',
        headers: getHeaders(),
    });
};

export const deleteMessage = async (messageId) => {
    const res = await fetch(`${API_URL}/chat/messages/${messageId}/`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete message');
};
