import { useEffect, useState, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.js';
import { notificationService } from '../services/api/notificationService';
import { useTheme } from '../context/useTheme';

export const useNotifications = (userId, token) => {
  const { preferences } = useTheme();
  const prefsRef = useRef(preferences);

  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const stompClient = useRef(null);

  const fetchInitialNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications(userId);
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !token) return;

    fetchInitialNotifications();

    const client = new Client({
      brokerURL: 'ws://localhost:8081/ws',
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: (str) => console.log('STOMP Debug:', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    const processNewNotification = (notif) => {
      // Safety filter: If broadcast, only process if intended for this user
      if (notif.userId && notif.userId !== userId) return;

      // Visual Notification (Toast)
      // Only show in-app toast if push notifications are enabled
      if (prefsRef.current?.enablePushNotifications !== false) {
        import('react-hot-toast').then(({ toast }) => {
          toast(notif.message, {
            icon: notif.severity === 'ALERT' ? '⚠️' : 
                  notif.severity === 'SUCCESS' ? '✅' : 'ℹ️',
            duration: 5000,
            position: 'top-right',
            style: {
              borderRadius: '12px',
              background: '#ffffff',
              color: '#18181b',
              border: '1px solid #e4e4e7',
              padding: '12px 16px',
            }
          });
        });
      }

      // Audio Alert based on category
      const getSoundUrl = () => {
        const type = notif.type;
        const severity = notif.severity;

        if (type === 'SECURITY_UPDATE') {
          return 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'; // Urgent Pulse
        }
        if (type === 'BOOKING_APPROVED' || severity === 'SUCCESS') {
          return 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'; // Bright Chime
        }
        if (type === 'BOOKING_REJECTED' || type === 'BOOKING_CANCELLED' || severity === 'ALERT') {
          return 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'; // Caution Tone
        }
        return 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Standard Bell
      };

      // Only play sound if user preference allows it
      if (prefsRef.current?.enableSounds !== false) {
        const audio = new Audio(getSoundUrl());
        audio.volume = 0.4; // Slightly lower volume for better UX
        audio.play().catch(() => {});
      }

      setNotifications((prev) => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    };

    client.onConnect = () => {
      console.log('✅ WEBSOCKET CONNECTED');
      setConnected(true);
      
      // Path 1: Private queue (Direct)
      client.subscribe('/user/queue/notifications', (msg) => {
        console.log('📬 Message received via PRIVATE channel');
        processNewNotification(JSON.parse(msg.body));
      });

      // Path 2: Broadcast topic (Fallback)
      client.subscribe('/topic/notifications', (msg) => {
        console.log('📢 Message received via BROADCAST channel');
        processNewNotification(JSON.parse(msg.body));
      });
    };

    client.onDisconnect = () => {
      setConnected(false);
      console.log('❌ WEBSOCKET DISCONNECTED');
    };

    client.onStompError = (frame) => {
      console.error('WebSocket Error:', frame.headers['message']);
    };

    client.activate();
    stompClient.current = client;

    return () => {
      if (stompClient.current) stompClient.current.deactivate();
      setConnected(false);
    };
  }, [userId, token, fetchInitialNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      // Optimistic Update: Instantly clear unread count in UI
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      
      // Backend synchronization
      await notificationService.markAllAsRead(userId);
      console.log('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      // Optional: Rollback if required, but for this simpler UI, re-fetch is safer
      fetchInitialNotifications();
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) { console.error(err); }
  };

  const deleteAll = async () => {
    if (!userId) return;
    try {
      setNotifications([]); // Optimistic clear
      await notificationService.deleteAllNotifications(userId);
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
      fetchInitialNotifications(); // Rollback
    }
  };

  return { notifications, loading, connected, markAsRead, markAllAsRead, deleteNotification, deleteAll, refresh: fetchInitialNotifications };
};
