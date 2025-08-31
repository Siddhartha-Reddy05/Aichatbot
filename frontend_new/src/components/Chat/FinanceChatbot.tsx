"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, X, FileText, Menu, Loader2 } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
import Sidebar from "@/components/ui/Sidebar";
import useChatApi from '@/hooks/useChatApi';
import useSuggestions from '@/hooks/useSuggestions';
import { useFileUpload, type FileItem } from '@/hooks/useFileUpload';
import type { Message } from '@/types/chat';

// Chat Header Component
const ChatHeader = ({ onMenuClick }: { onMenuClick: () => void }) => (
  <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onMenuClick}
          className="text-gray-600 hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-800">Chat</h1>
      </div>
    </div>
  </header>
);

// Upload Area Component
const UploadArea = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
      } transition-colors`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="bg-blue-100 p-3 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <p className="text-sm text-gray-500 mb-1">
        <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
      </p>
      <p className="text-xs text-gray-400">PDF, DOCX, or TXT (max. 10MB)</p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx,.txt"
      />
    </div>
  );
};

// Message Component
const Message = ({ message }: { message: Message }) => (
  <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div 
      className={`max-w-[80%] rounded-lg px-4 py-2 ${
        message.type === 'user' 
          ? 'bg-blue-500 text-white rounded-br-none' 
          : 'bg-gray-100 text-gray-800 rounded-bl-none'
      }`}
    >
      {message.content}
    </div>
  </div>
);

// Chat Messages Component
const ChatMessages = ({ 
  messages, 
  messagesEndRef 
}: { 
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <div className="flex-1 overflow-y-auto p-4 bg-white">
    {messages.length === 0 ? (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-sm text-gray-500">
            Start a conversation or upload a document to get started.
          </p>
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    )}
  </div>
);

export default function FinanceChatbot() {
  // Initial bot message
  const initialBotMessage: Message = {
    id: '1',
    type: 'bot',
    content: "Hello! I'm your Finance Assistant. Ask me anything about financial topics, investments, or market analysis.",
    timestamp: new Date(),
  };

  // State variables
  const [messages, setMessages] = useState<Message[]>([initialBotMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { sendMessage } = useChatApi();
  const { suggestions: suggestedQuestions } = useSuggestions({ 
    messages, 
    selectedFileName: selectedFile?.name 
  });
  
  const { 
    files, 
    selectedFileId, 
    isUploading, 
    uploadFile, 
    selectFile, 
    removeFile,
    clearFiles 
  } = useFileUpload();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await sendMessage(inputValue);
      if (response) {
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: response.answer,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    setInputValue('');
  };

  const handleFileUpload = async (file: File) => {
    try {
      await uploadFile(file);
      const uploadedFile = files.find(f => f.name === file.name);
      if (uploadedFile) {
        setSelectedFile(uploadedFile);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleFileSelect = (fileId: string) => {
    selectFile(fileId);
    const file = files.find(f => f.id === fileId);
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileRemove = (fileId: string) => {
    removeFile(fileId);
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  const handleRemoveAll = () => {
    clearFiles();
    setSelectedFile(null);
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onFileUpload={handleFileUpload}
        files={files.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size ? formatFileSize(Number(file.size)) : '0 Bytes',
          uploadedAt: new Date(),
          type: file.type || 'application/octet-stream'
        }))}
        onFileSelect={handleFileSelect}
        selectedFileId={selectedFileId || undefined}
        onFileRemove={handleFileRemove}
        onRemoveAll={handleRemoveAll}
        isUploading={isUploading}
      />

      <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'} flex flex-col h-screen`}>
        <ChatHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <div className="flex-1 overflow-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="max-w-md w-full space-y-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900">Welcome to Finance Assistant</h2>
                <p className="text-gray-600">Upload a document or start chatting to get insights</p>
              </div>
              
              <UploadArea onFileSelect={handleFileUpload} />
              
              <div className="mt-8">
                <p className="text-sm text-center text-gray-500 mb-3">Or try asking:</p>
                <div className="grid grid-cols-1 gap-3">
                  {suggestedQuestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(suggestion)}
                      className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ChatMessages messages={messages} messagesEndRef={messagesEndRef} />
            
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    selectedFileId
                      ? "Ask me about the selected document..."
                      : "Ask me anything about finance..."
                  }
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
                />
                <Button 
                  onClick={(e) => handleSubmit(e as any)}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              
              <div className="mt-2 flex justify-between items-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Attach file
                </button>
        {messages.length === 1 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Suggested questions:</h3>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputValue(question);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent backdrop-blur-sm border-t border-gray-800/50"
        >
          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600/50 text-gray-200 transition-colors duration-300 group"
            >
              <div className="relative">
                <Upload className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:scale-110" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400 animate-ping opacity-75" />
              </div>
              <span>Upload</span>
            </Button>
            
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                selectedFileId 
                  ? "Ask me about the selected document..." 
                  : "Ask me anything about finance..."
              }
              className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={isLoading}
            />
            
            <Button 
              type="submit" 
              disabled={isLoading || !inputValue.trim()}
              className="px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Sidebar Toggle Button (for mobile) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden fixed bottom-6 right-6 z-50 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  </div>
);
