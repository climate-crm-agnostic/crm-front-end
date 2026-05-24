import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

const ChatNotificationContext = createContext({
    totalUnread: 0,
    toasts: [],
    clearAll: () => {},
    dismissToast: () => {},
});

const playSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch {}
};

export const ChatNotificationProvider = ({ children }) => {
    const [totalUnread, setTotalUnread] = useState(0);
    const [toasts, setToasts] = useState([]);
    const location = useLocation();
    const navigate = useNavigate();

    // Request browser notification permission once on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const handleNotification = useCallback((data) => {
        // When on /chat the page handles notifications itself
        if (location.pathname === '/chat') return;

        setTotalUnread(n => n + 1);

        // Native OS notification when tab is not focused
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            const notif = new Notification(`💬 ${data.sender_username}`, {
                body: data.content,
                icon: '/favicon.png',
                tag: 'crm-chat',         // replaces previous notif instead of stacking
                renotify: true,
            });
            notif.onclick = () => {
                window.focus();
                navigate('/chat');
                notif.close();
            };
        }

        // In-app sound + toast (only when tab is visible)
        if (!document.hidden) {
            playSound();
        }

        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, ...data }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    }, [location.pathname, navigate]);

    useNotifications(handleNotification);

    const clearAll = useCallback(() => {
        setTotalUnread(0);
        setToasts([]);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ChatNotificationContext.Provider value={{ totalUnread, toasts, clearAll, dismissToast }}>
            {children}
        </ChatNotificationContext.Provider>
    );
};

export const useChatNotifications = () => useContext(ChatNotificationContext);
