import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = (() => {
    if (import.meta.env.VITE_ENV === 'production') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}`;
    }
    const apiUrl = import.meta.env.VITE_API_DEV;
    return apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
})();

export const useChatSocket = (roomId, onMessage) => {
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    const connect = useCallback(() => {
        if (!roomId) return;

        const ws = new WebSocket(`${WS_BASE}/ws/chat/${roomId}/`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            if (wsRef.current !== ws) return; // superseded — ignore
            try {
                const data = JSON.parse(event.data);
                onMessageRef.current?.(data);
            } catch { }
        };

        ws.onclose = (event) => {
            if (event.code !== 1000 && event.code !== 4001 && event.code !== 4003) {
                reconnectTimer.current = setTimeout(connect, 3000);
            }
        };
    }, [roomId]);

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close(1000);
        };
    }, [connect]);

    const sendMessage = useCallback((content) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ content }));
        }
    }, []);

    return { sendMessage };
};
