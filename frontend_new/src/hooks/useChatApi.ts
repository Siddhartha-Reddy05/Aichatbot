import { useState } from 'react';
import logger from '@/lib/logger';
import API_CONFIG from '@/config';
import { Message } from '@/types/chat';
import type {
  QueryResponse,
  UploadResponse,
  FileInfo,
  NewsResponse,
  ScrapeResponse,
  ApiError
} from '@/types';



interface ErrorResponse {
  detail: string | { [key: string]: any };
}

export default function useChatApi() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { BASE_URL, ENDPOINTS } = API_CONFIG;

  const handleApiError = (error: unknown, defaultMessage: string): string => {
    logger.error('API Error', { error });

    if (error && typeof error === 'object') {
      const apiError = error as ApiError;
      
      if (typeof apiError.detail === 'string') {
        return apiError.detail;
      } else if (apiError.detail && typeof apiError.detail === 'object') {
        // Handle structured error responses
        const detail = apiError.detail as { [key: string]: any };
        return detail.message || detail.detail || JSON.stringify(detail);
      } else if ('message' in error && typeof (error as any).message === 'string') {
        return (error as any).message;
      }
    } else if (typeof error === 'string') {
      return error;
    }

    return defaultMessage;
  };

  // Add a new message to the chat
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'> & { progress?: number }, replace = false) => {
    const newMessage: Message = {
      ...message,
      id: replace ? (message as any).id || Date.now().toString() : Date.now().toString(),
      timestamp: new Date(),
      progress: message.progress
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  // Send a message to the chatbot
  const sendMessage = async (message: string): Promise<QueryResponse> => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    setIsLoading(true);
    setError(null);

    try {
      const form = new URLSearchParams();
      form.append('question', message);

      const response = await fetch(`${BASE_URL}${ENDPOINTS.ASK}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(handleApiError(error, 'Failed to send message'));
      }

      const data: QueryResponse = await response.json();

      // Update conversation ID if this is a new conversation
      if (data.conversation_id && data.conversation_id !== conversationId) {
        setConversationId(data.conversation_id);
      }

      // Add bot response to messages
      addMessage({
        type: 'bot',
        content: data.answer,
      });

      return data;
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to send message');
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Upload a file for analysis
  const uploadFile = async (file: File): Promise<UploadResponse> => {
    const startTime = performance.now();
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    // Add initial upload message
    const uploadMessage = addMessage({ 
      type: 'bot', 
      content: `📤 Starting upload: ${file.name} (0%)`,
      progress: 0
    });

    return new Promise<UploadResponse>((resolve, reject) => {
      const formData = new FormData();
      formData.append('files', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}${ENDPOINTS.UPLOAD}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(1);
          setUploadProgress(percent);
          
          // Update the upload progress message
          setMessages(prev => 
            prev.map(msg => 
              msg.id === uploadMessage.id 
                ? { 
                    ...msg, 
                    content: `📤 Uploading: ${file.name} (${percent}%) [${timeElapsed}s]`,
                    progress: percent
                  } 
                : msg
            )
          );
        }
      };

      xhr.onload = () => {
        try {
          const endTime = performance.now();
          const timeTaken = ((endTime - startTime) / 1000).toFixed(1);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            const data: UploadResponse = JSON.parse(xhr.responseText || '{}');
            setCurrentFile(file.name);
            setUploadProgress(100);
            
            // Update message to show completion
            setMessages(prev => 
              prev.map(msg => 
                msg.id === uploadMessage.id 
                  ? { 
                      ...msg, 
                      content: `✅ Uploaded: ${file.name} (${timeTaken}s)`,
                      progress: 100
                    } 
                  : msg
              )
            );
            
            resolve(data);
          } else {
            const err = JSON.parse(xhr.responseText || '{}');
            const msg = handleApiError(err, 'Failed to upload file');
            
            // Update message to show error
            setMessages(prev => 
              prev.map(msg => 
                msg.id === uploadMessage.id 
                  ? { 
                      ...msg, 
                      content: `❌ Upload failed: ${file.name} (${timeTaken}s)\n${msg}`,
                      progress: 0
                    } 
                  : msg
              )
            );
            
            setError(msg);
            reject(new Error(msg));
          }
        } catch (e) {
          const msg = handleApiError(e, 'Failed to parse upload response');
          setError(msg);
          reject(new Error(msg));
        } finally {
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        const endTime = performance.now();
        const timeTaken = ((endTime - startTime) / 1000).toFixed(1);
        const msg = 'Network error during file upload';
        
        // Update message to show network error
        setMessages(prev => 
          prev.map(msg => 
            msg.id === uploadMessage.id 
              ? { 
                  ...msg, 
                  content: `❌ Upload failed: ${file.name} (${timeTaken}s)\n${msg}`,
                  progress: 0
                } 
              : msg
          )
        );
        
        setError(msg);
        setIsUploading(false);
        reject(new Error(msg));
      };

      xhr.send(formData);
    });
  };

  // Get list of uploaded files
  const getFiles = async (): Promise<FileInfo[]> => {
    try {
      const response = await fetch(`${BASE_URL}${ENDPOINTS.FILES}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(handleApiError(error, 'Failed to fetch files'));
      }

      const data: FileInfo[] = await response.json();
      return data;
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to fetch files');
      setError(errorMessage);
      throw error;
    }
  };

  // Delete a file
  const deleteFile = async (fileName: string): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${BASE_URL}${ENDPOINTS.DELETE_FILE}/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(handleApiError(error, 'Failed to delete file'));
      }

      // Clear current file if it's the one being deleted
      if (currentFile === fileName) {
        setCurrentFile(null);
      }

      // Add system message about file deletion
      addMessage({
        type: 'bot',
        content: `File "${fileName}" has been deleted.`,
      });

      return await response.json();
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to delete file');
      setError(errorMessage);
      throw error;
    }
  };

  // Clear chat history
  const clearHistory = async (): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${BASE_URL}${ENDPOINTS.CLEAR_HISTORY}`, { method: 'DELETE' });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(handleApiError(error, 'Failed to clear history'));
      }

      // Clear local messages
      setMessages([]);
      setCurrentFile(null);

      // Add system message
      addMessage({
        type: 'bot',
        content: 'Chat history has been cleared.',
      });

      return await response.json();
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to clear history');
      setError(errorMessage);
      throw error;
    }
  };

  // Get news articles
  const getNews = async (query: string = 'weather'): Promise<NewsResponse[]> => {
    try {
      const response = await fetch(
        `${BASE_URL}${ENDPOINTS.NEWS}?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(handleApiError(error, 'Failed to fetch news'));
      }

      const data: NewsResponse[] = await response.json();
      
      // Add news summary to chat (make items clearly visible with links)
      if (data.length > 0) {
        const top = data.slice(0, 5);
        const lines = top.map((item, index) => {
          const date = item.published_at ? new Date(item.published_at).toLocaleString() : '';
          return `${index + 1}. ${item.title} — ${item.source}${date ? ` — ${date}` : ''}\n${item.url}`;
        });
        addMessage({
          type: 'bot',
          content: `Here are the latest ${query} news articles:\n\n${lines.join('\n\n')}`,
        });
      }

      return data;
    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to fetch news');
      setError(errorMessage);
      throw error;
    }
  };

  // Scrape content from a URL
  const scrapeUrl = async (url: string): Promise<ScrapeResponse | any> => {
    const startTime = performance.now();
    let progressInterval: NodeJS.Timeout;
    
    // Add initial scraping message with progress
    const progressMessage = addMessage({ 
      type: 'bot', 
      content: `🌐 Starting to scrape: ${url}\nProgress: 0%`,
      progress: 0
    });
    
    // Update progress every 500ms
    const updateProgress = () => {
      const elapsed = performance.now() - startTime;
      // Cap progress at 90% until complete
      const progress = Math.min(10 + Math.floor((elapsed / 30000) * 80), 90);
      const timeElapsed = (elapsed / 1000).toFixed(1);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === progressMessage.id
            ? {
                ...msg,
                content: `🌐 Scraping: ${url}\nProgress: ${progress}% [${timeElapsed}s]`,
                progress
              }
            : msg
        )
      );
      
      return progress;
    };
    
    // Start progress updates
    progressInterval = setInterval(updateProgress, 500);
    
    try {
      const response = await fetch(`${BASE_URL}${ENDPOINTS.SCRAPE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ url }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(handleApiError(error, 'Failed to scrape URL'));
      }

      const data: any = await response.json();
      logger.debug('Scrape API response', { data });
      
      // Clear the progress interval and get final time
      clearInterval(progressInterval);
      const endTime = performance.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(1);
      
      // Update to 100% progress
      updateProgress();

      // Backend returns a processing summary (no raw content) with shape:
      // { status: 'success', message, details: { url, title, sections, chunks_generated, source_name } }
      if (data?.status === 'success') {
        const det = data.details || {};
        const title = det.title || data.title || 'Web content';
        const link = det.url || url;
        const chunks = det.chunks_generated || 0;
        
        // Update message with final status
        setMessages(prev => 
          prev.map(msg => 
            msg.id === progressMessage.id
              ? {
                  ...msg,
                  content: `✅ Scraped: ${title}\n${link}\nProcessed ${chunks} chunks in ${timeTaken}s`,
                  progress: 100
                }
              : msg
          )
        );
      } else {
        // Error path: prefer message, then error
        const errMsg = data?.message || data?.error || 'No content was extracted from the provided URL.';
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === progressMessage.id
              ? {
                  ...msg,
                  content: `❌ Failed to scrape\n${url}\nReason: ${errMsg} (${timeTaken}s)`,
                  progress: 0
                }
              : msg
          )
        );
      }

      return data;
    } catch (error) {
      // Clear interval on error
      clearInterval(progressInterval);
      
      const errorMessage = handleApiError(error, 'Failed to scrape URL');
      const endTime = performance.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(1);
      
      // Update message with error status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === progressMessage.id
            ? {
                ...msg,
                content: `❌ Failed to scrape\n${url}\nReason: ${errorMessage} (${timeTaken}s)`,
                progress: 0
              }
            : msg
        )
      );
      
      setError(errorMessage);
      throw error;
    }
  };

  return {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    uploadFile,
    getFiles,
    deleteFile,
    clearHistory,
    getNews,
    scrapeUrl,
    addMessage,
    setMessages,
    setIsLoading,
    setError,
    setConversationId,
    isUploading,
    uploadProgress,
    currentFile,
    setCurrentFile,
  };
}
