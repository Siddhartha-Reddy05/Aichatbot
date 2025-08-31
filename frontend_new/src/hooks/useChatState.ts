import { useState, useCallback } from 'react';
import { Message, ChatState } from '@/types/chat';

export const useChatState = (): Omit<ChatState, 'setIsLoading' | 'updateMessage' | 'setError' | 'setConversationId'> & {
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setConversationId: (id: string | null) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
} => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Add a new message to the chat
  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Update an existing message
  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Clear the chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setConversationId(null);
  }, []);

  // Set an error message
  const setChatError = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  // Set the conversation ID
  const setChatConversationId = useCallback((id: string | null) => {
    setConversationId(id);
  }, []);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    addMessage,
    updateMessage,
    clearChat,
    setError: setChatError,
    setIsLoading,
    setConversationId: setChatConversationId,
  };
};
