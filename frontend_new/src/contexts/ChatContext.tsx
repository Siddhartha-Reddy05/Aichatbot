import React, { createContext, useContext, useMemo } from 'react';
import useChatApi from '@/hooks/useChatApi';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useChatState } from '@/hooks/useChatState';
import { Message } from '@/types/chat';

interface ChatContextType {
  // Chat state
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  
  // Chat actions
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  
  // File handling
  files: ReturnType<typeof useFileUpload>['files'];
  uploadFile: (file: File) => Promise<string>;
  removeFile: (fileId: string) => Promise<void>;
  selectedFileId: string | undefined;
  selectFile: (fileId: string) => void;
  isUploading: boolean;
  
  // Additional utilities
  setError: (error: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize all our custom hooks
  const chatState = useChatState();
  const chatApi = useChatApi();
  const fileUpload = useFileUpload();
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // Chat state
    messages: chatApi.messages,
    isLoading: chatApi.isLoading,
    error: chatApi.error || chatState.error,
    conversationId: chatApi.conversationId,
    
    // Chat actions
    sendMessage: async (content: string) => {
      if (!content.trim()) return;
      
      chatState.setIsLoading(true);
      chatState.setError(null);
      
      try {
        // Add user message to chat
        chatApi.addMessage({
          type: 'user',
          content,
        });
        
        // Call the API
        await chatApi.sendMessage(content);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
        chatState.setError(errorMessage);
        console.error('Error sending message:', error);
      } finally {
        chatState.setIsLoading(false);
      }
    },
    
    clearChat: async () => {
      try {
        await chatApi.clearHistory();
        chatState.clearChat();
        // Optionally clear files when chat is cleared
        fileUpload.clearFiles();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to clear chat';
        chatState.setError(errorMessage);
      }
    },
    
    // File handling
    files: fileUpload.files,
    uploadFile: async (file: File) => {
      try {
        const fileId = await fileUpload.uploadFile(file);
        chatState.addMessage({
          type: 'bot',
          content: `File "${file.name}" has been uploaded successfully.`,
        });
        return fileId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        chatState.setError(errorMessage);
        throw error;
      }
    },
    
    removeFile: fileUpload.removeFile,
    selectedFileId: fileUpload.selectedFileId,
    selectFile: fileUpload.selectFile,
    isUploading: fileUpload.isUploading,
    
    // Additional utilities
    setError: (error: string | null) => {
      chatState.setError(error);
      chatApi.setError?.(error);
    },
  }), [chatState, chatApi, fileUpload]);
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
