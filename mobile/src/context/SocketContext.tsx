import React, { createContext, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../storage/authStorage';
import { NotificationBanner, NotificationPayload } from '../notifications/NotificationBanner';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace('/api', '');

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  showNotification: (payload: NotificationPayload) => void;
};

const SocketContext = createContext<SocketContextType>({ 
  socket: null, 
  isConnected: false,
  showNotification: () => {}
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    let newSocket: Socket;

    const connectSocket = async () => {
      const token = await getAccessToken();
      
      console.log('[Socket] Attempting to connect to URL:', SOCKET_URL);

      newSocket = io(SOCKET_URL, {
        auth: { token },
      });

      newSocket.on('connect_error', (err) => {
        console.error('[Socket] Connection ERROR:', err.message);
      });

      newSocket.on('connect', () => {
        console.log('[Socket] Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('crm_notification', (payload: NotificationPayload) => {
        console.log('[Socket] Received crm_notification:', payload);
        setCurrentNotification(payload);
      });

      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  const handleDismiss = () => {
    setCurrentNotification(null);
  };

  const showNotification = (payload: NotificationPayload) => {
    setCurrentNotification(payload);
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, showNotification }}>
      <View style={{ flex: 1 }}>
        {children}
        {currentNotification && (
          <NotificationBanner 
            notification={currentNotification} 
            onDismiss={handleDismiss} 
          />
        )}
      </View>
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
