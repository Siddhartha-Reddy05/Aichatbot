export interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  progress?: number; // 0-100 for progress indication
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  status?: 'uploading' | 'success' | 'error';
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Message;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearChat: () => void;
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setConversationId: (id: string | null) => void;
}
