import { useEffect, useRef, useState, useCallback } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';

type MessageHandler = (data: any) => void;

export function useWebSocket() {
  const { user } = useSupabaseAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageHandlersRef = useRef<Set<MessageHandler>>(new Set());

  const connect = useCallback(() => {
    if (!user?.id || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate with user ID
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Call all registered message handlers
        messageHandlersRef.current.forEach(handler => handler(data));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (user?.id) {
          connect();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [user?.id]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const addMessageHandler = useCallback((handler: MessageHandler) => {
    messageHandlersRef.current.add(handler);
    
    // Return cleanup function
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    addMessageHandler
  };
}

// Hook for document progress updates
export function useDocumentProgress() {
  const { addMessageHandler } = useWebSocket();
  const [documentProgress, setDocumentProgress] = useState<Record<number, {
    status: string;
    progress: number;
    message: string;
  }>>({});

  useEffect(() => {
    const cleanup = addMessageHandler((data) => {
      if (data.type === 'document_progress') {
        setDocumentProgress(prev => ({
          ...prev,
          [data.documentId]: {
            status: data.status,
            progress: data.progress,
            message: data.message
          }
        }));
        
        // Remove completed/failed documents after 5 seconds
        if (data.status === 'completed' || data.status === 'failed') {
          setTimeout(() => {
            setDocumentProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[data.documentId];
              return newProgress;
            });
          }, 5000);
        }
      }
    });

    return cleanup;
  }, [addMessageHandler]);

  return documentProgress;
}