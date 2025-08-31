"use client";

import React, { useState } from "react";
import { Upload, FileText, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

interface FileItem {
  id: string;
  name: string;
  size: string;
  uploadedAt: Date;
  type: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onFileUpload: (file: File) => void;
  files: FileItem[];
  onFileSelect: (fileId: string) => void;
  selectedFileId?: string;
  onSuggestionClick?: (suggestion: string) => void;
  isUploading?: boolean;
  onFileRemove?: (fileId: string) => void;
  onRemoveAll?: () => void;
}

export default function Sidebar({ 
  isOpen, 
  onToggle, 
  onFileUpload, 
  files, 
  onFileSelect, 
  selectedFileId,
  isUploading,
  onFileRemove,
  onRemoveAll
}: SidebarProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <>
      {/* Floating Toggle Button (shown when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-6 left-6 z-30 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border border-white/20 transition-all duration-200 hover:scale-105"
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-slate-800/95 backdrop-blur-sm border-r border-white/20 transform transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header with Toggle Button */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <button
                onClick={onToggle}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border border-white/20 transition-all duration-200 hover:scale-105"
                aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white font-medium">Menu</span>
            </div>
          </div>

          {/* Upload Section */}
          <div className="p-6 overflow-y-auto flex-1">
            <h3 className="text-lg font-medium text-white mb-4">Upload Files</h3>
            
            {/* Drag & Drop Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                dragActive 
                  ? 'border-blue-400 bg-blue-400/10' 
                  : 'border-white/30 hover:border-white/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileInput}
                accept=".pdf,.txt"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-white/60 mb-4" />
                <p className="text-white text-sm mb-2">
                  {isUploading ? (
                    "Uploading..."
                  ) : (
                    <>
                      Drag and drop files here or <span className="text-blue-400 hover:text-blue-300">browse</span>
                    </>
                  )}
                </p>
                <p className="text-gray-400 text-xs">
                  Supports PDF, TXT files
                </p>
              </label>
            </div>

            {/* Remove selected file */}
            {selectedFileId && onFileRemove && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => onFileRemove(selectedFileId)}
                  className="inline-flex items-center gap-2 text-red-300 hover:text-red-200 text-sm"
                >
                  <Trash2 className="h-4 w-4" /> Remove selected
                </button>
              </div>
            )}
          </div>

          {/* Files List */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Uploaded Files</h3>
              {files.length > 0 && onRemoveAll && (
                <button
                  onClick={onRemoveAll}
                  className="text-xs text-gray-300 hover:text-white border border-white/20 px-2 py-1 rounded-md"
                >
                  Clear all
                </button>
              )}
            </div>
            {files.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No files uploaded yet
              </p>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onFileSelect(file.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-white/5 ${
                      selectedFileId === file.id 
                        ? 'border-blue-400 bg-blue-400/10' 
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium whitespace-normal break-words pr-6" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {file.size} • {file.uploadedAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {onFileRemove && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileRemove(file.id);
                          }}
                          className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-white/5"
                          aria-label="Remove file"
                          title="Remove file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 