'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import useChatApi from '@/hooks/useChatApi';
import API_CONFIG from '@/config';
import logger, { setLogLevel } from '@/lib/logger';

export default function Home() {
  const [message, setMessage] = useState('');
  const [scrapeUrlValue, setScrapeUrlValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [scrapingUrl, setScrapingUrl] = useState<string | null>(null);
  const [fetchingNews, setFetchingNews] = useState(false);
  const [files, setFiles] = useState<Array<{file_name?: string; name?: string; uploaded_at?: string}>>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseStart, setResponseStart] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    isLoading,
    sendMessage,
    uploadFile,
    getNews,
    scrapeUrl,
    clearHistory,
    addMessage,
    getFiles,
    deleteFile,
    isUploading,
    uploadProgress,
  } = useChatApi();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load files on component mount
  useEffect(() => {
    loadFiles();
  }, []);

  // Enable verbose frontend logging in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      setLogLevel('debug');
      logger.debug('Frontend logger set to DEBUG');
    }
  }, []);

  const loadFiles = async () => {
    try {
      const fileList = await getFiles();
      setFiles(fileList);
    } catch (error) {
      logger.error('Failed to load files', { error });
    }
  };

  const onSend = useCallback(async () => {
    const text = message.trim();
    if (!text || isLoading || isStreaming) return;
    
    addMessage({ type: 'user', content: text });
    setMessage('');
    setIsStreaming(true);
    setIsProcessing(true);
    setCurrentAnswer('');

    try {
      const startTime = performance.now();
      setResponseStart(startTime);
      
      const form = new URLSearchParams();
      form.append('question', text);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ASK}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Handle JSON response (error cases)
        const data = await response.json();
        const answer = data.answer || data.message || 'No answer received';
        const end = performance.now();
        const timeTaken = (end - startTime) / 1000;
        const seconds = timeTaken < 1 ? timeTaken.toFixed(2) : timeTaken.toFixed(1);
        addMessage({ type: 'bot', content: `${answer}\n\n⏱️ ${seconds}s` });
      } else {
        // Handle streaming text response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          let accumulatedAnswer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            accumulatedAnswer += chunk;
            setCurrentAnswer(accumulatedAnswer);
          }
          
          if (accumulatedAnswer.trim()) {
            const end = performance.now();
            const timeTaken = (end - startTime) / 1000;
            const seconds = timeTaken < 1 ? timeTaken.toFixed(2) : timeTaken.toFixed(1);
            addMessage({ type: 'bot', content: `${accumulatedAnswer}\n\n⏱️ ${seconds}s` });
          }
        } else {
          // Fallback to text response
          const text = await response.text();
          const end = performance.now();
          const timeTaken = (end - startTime) / 1000;
          const seconds = timeTaken < 1 ? timeTaken.toFixed(2) : timeTaken.toFixed(1);
          addMessage({ type: 'bot', content: `${text}\n\n⏱️ ${seconds}s` });
        }
      }
    } catch (error) {
      logger.error('Error sending message', { error });
      addMessage({ type: 'bot', content: 'Sorry, I encountered an error. Please try again.' });
    } finally {
      setIsStreaming(false);
      setIsProcessing(false);
      setCurrentAnswer('');
      setResponseStart(null);
    }
  }, [message, isLoading, isStreaming, addMessage, responseStart]);

  const handleFileUpload = async (file: File) => {
    setUploadingFile(file.name);
    try {
      await uploadFile(file);
      await loadFiles(); // Refresh file list
    } catch (error) {
      addMessage({ type: 'bot', content: `❌ Failed to upload ${file.name}` });
    } finally {
      setUploadingFile(null);
    }
  };

  const handleUrlScrape = async (url: string) => {
    setScrapingUrl(url);
    try {
      const res = await scrapeUrl(url);
      // Only refresh files if scraping succeeded. Messaging is handled inside useChatApi.scrapeUrl
      if ((res as any)?.status === 'success') {
        await loadFiles();
      }
    } catch (error) {
      // Error message already surfaced by useChatApi.scrapeUrl
    } finally {
      setScrapingUrl(null);
    }
  };

  const handleGetNews = async () => {
    setFetchingNews(true);
    try {
      await getNews('weather');
      addMessage({ type: 'bot', content: `📰 Fetched latest weather news` });
    } catch (error) {
      addMessage({ type: 'bot', content: `❌ Failed to fetch news` });
    } finally {
      setFetchingNews(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      await deleteFile(fileName);
      await loadFiles(); // Refresh file list
      addMessage({ type: 'bot', content: `🗑️ Deleted: ${fileName}` });
    } catch (error) {
      addMessage({ type: 'bot', content: `❌ Failed to delete ${fileName}` });
    }
  };

  return (
    <main className="min-h-screen flex overflow-hidden">
      {/* Left Sidebar - File List */}
      <div className="w-80 h-screen bg-white/5 backdrop-blur-md border-r border-white/10 flex flex-col">
        <div className="px-4 h-24 flex flex-col justify-center border-b border-white/10 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white/95 mb-2">Uploaded Files</h2>
          <p className="text-sm text-white/60">Your documents and sources</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {files.length === 0 ? (
            <div className="text-center text-white/50 py-8">
              <div className="text-2xl mb-2">📁</div>
              <div className="text-sm">No files uploaded yet</div>
              <div className="text-xs mt-1">Upload a document to get started</div>
            </div>
          ) : (
            files.map((file, index) => (
              <div key={index} className="bg-white rounded-lg p-3 ring-1 ring-white/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {file.file_name || file.name || 'Unknown file'}
                    </div>
                    {file.uploaded_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.file_name || file.name || '')}
                    className="ml-2 p-1 rounded text-gray-500 hover:text-red-500 hover:bg-red-50 transition"
                    title="Delete file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}

          {(uploadingFile || scrapingUrl || fetchingNews) && (
            <div className="sticky bottom-0 left-0 right-0 mt-2 bg-white/5 backdrop-blur-md rounded-md p-3 ring-1 ring-white/10">
              {/* Upload progress */}
              {uploadingFile && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Uploading {uploadingFile}...</span>
                    {typeof uploadProgress === 'number' && (
                      <span>{uploadProgress}%</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded">
                    <div
                      className="h-1.5 bg-cyan-400 rounded transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, uploadProgress ?? 0))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Scrape & news spinners */}
              {scrapingUrl && (
                <div className="mt-2 flex items-center gap-2 text-xs text-white/80">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white"></div>
                  <span>Scraping {scrapingUrl}...</span>
                </div>
              )}
              {fetchingNews && (
                <div className="mt-2 flex items-center gap-2 text-xs text-white/80">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white"></div>
                  <span>Fetching weather news...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pb-28 h-screen">{/* padding for fixed prompt */}
        {/* Header */}
        <header className="h-24 flex items-center justify-center border-b border-white/10 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/80 to-emerald-500/80 shadow-lg ring-1 ring-white/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l3.5 6H8.5L12 2zm0 20l-3.5-6h7L12 22z" fill="currentColor" className="text-white/90"/>
                <path d="M2 12l6-3.5v7L2 12zm20 0l-6 3.5v-7L22 12z" fill="currentColor" className="text-white/70"/>
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white/95">AI ChatBot</h1>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">{/* removed center alignment to avoid overlap/merging */}
          <div className="max-w-4xl w-full mx-auto space-y-3">{/* space between messages */}
            {messages.length === 0 ? (
              <div className="text-center text-white/60">
                <div className="text-4xl mb-4">👋</div>
                <div className="text-xl font-medium mb-3 text-white/90">Welcome to AI chatbot</div>
                <div className="text-base text-white/70">Start a conversation or upload a document to get started</div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.type === 'user' 
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' 
                      : 'bg-white/10 text-white/90 ring-1 ring-white/20'
                  }`}>
                    <div className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            
            {/* Spinner bubble while processing */}
            {isProcessing && !currentAnswer && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/10 text-white/90 ring-1 ring-white/20">
                  <div className="flex items-center gap-2">
                    <span className="relative inline-flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Streaming answer preview */}
            {isStreaming && currentAnswer && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/10 text-white/90 ring-1 ring-white/20">
                  <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {currentAnswer}
                    <span className="animate-pulse">▋</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Input Area - fixed to viewport */}
        <div className="fixed left-80 right-0 bottom-0 p-6 border-t border-white/10 bg-background/70 backdrop-blur-md">{/* account for sidebar width */}
          <div className="max-w-4xl mx-auto">
            <div className={`flex items-center gap-3 rounded-full bg-white/5 ring-1 ring-white/10 backdrop-blur-md shadow-2xl ${isStreaming ? 'cursor-not-allowed opacity-80' : ''} focus-within:ring-2 focus-within:ring-cyan-400`}>
              {/* Plus Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="ml-3 p-2 rounded-full bg-white/10 text-white/80 ring-1 ring-white/10 hover:bg-white/15 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1z"/>
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute bottom-full mb-2 left-0 z-50 bg-gray-900 rounded-2xl ring-1 ring-white/10 p-2 space-y-1 min-w-[240px] shadow-xl">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={async (ev) => {
                        if (!ev.target.files || ev.target.files.length === 0) return;
                        const file = ev.target.files[0];
                        await handleFileUpload(file);
                        ev.currentTarget.value = '';
                        setShowMenu(false);
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition text-left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                      </svg>
                      Upload Document
                    </button>

                    <div className="px-4 py-2">
                      <input
                        value={scrapeUrlValue}
                        onChange={(ev) => setScrapeUrlValue(ev.target.value)}
                        placeholder="Paste URL to scrape"
                        className="w-full bg-gray-800 text-white placeholder-white/70 outline-none rounded-lg px-3 py-2 text-sm"
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' && scrapeUrlValue.trim()) {
                            handleUrlScrape(scrapeUrlValue.trim());
                            setScrapeUrlValue('');
                            setShowMenu(false);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (scrapeUrlValue.trim()) {
                            handleUrlScrape(scrapeUrlValue.trim());
                            setScrapeUrlValue('');
                            setShowMenu(false);
                          }
                        }}
                        className="mt-2 w-full px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600 transition"
                      >
                        Scrape URL
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        handleGetNews();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition text-left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/>
                      </svg>
                      Get Weather News
                    </button>

                    <button
                      onClick={() => {
                        clearHistory().catch(() => {});
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition text-left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M19 13H5v-2h14v2z"/>
                      </svg>
                      Clear Chat
                    </button>
                  </div>
                )}
              </div>

              {/* Main Input */}
              <input
                type="text"
                value={message}
                onChange={(ev) => setMessage(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') onSend(); }}
                className="flex-1 bg-transparent px-4 py-4 text-white placeholder-white/50 outline-none"
                placeholder="Send a message to AI chatbot"
                disabled={isStreaming}
              />

              {/* Send Button */}
              <button
                onClick={onSend}
                disabled={isLoading || isStreaming}
                className="mr-3 p-3 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-lg hover:opacity-95 active:scale-95 transition disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M3.4 20.6l17.8-8.6a1 1 0 000-1.8L3.4 1.6A1 1 0 002 2.7l3.2 7.1a1 1 0 00.7.6l6.8.9-6.8.9a1 1 0 00-.7.6L2 21.3a1 1 0 001.4 1.3z"/>
                </svg>
              </button>
            </div>

            {/* Upload Status Indicators */}
            {/* Removed as they are now in the sidebar header */}
          </div>
        </div>
      </div>
    </main>
  );
}
