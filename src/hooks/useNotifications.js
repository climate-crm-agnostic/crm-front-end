import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = (() => {
    if (import.meta.env.VITE_ENV === 'production') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}`;
    }
    return import.meta.env.VITE_API_DEV.replace(/^http/, 'ws').replace(/\/api$/, '');
})();

export const useNotifications = (onNotification) => {
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const cbRef = useRef(onNotification);
    cbRef.current = onNotification;

    const connect = useCallback(() => {
        const ws = new WebSocket(`${WS_BASE}/ws/notifications/`);
        wsRef.current = ws;
        ws.onmessage = (event) => {
            if (wsRef.current !== ws) return; // superseded — ignore
            try { cbRef.current?.(JSON.parse(event.data)); } catch {}
        };
        ws.onclose = (event) => {
            if (event.code !== 1000 && event.code !== 4001) {
                reconnectTimer.current = setTimeout(connect, 3000);
            }
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close(1000);
        };
    }, [connect]);
};
