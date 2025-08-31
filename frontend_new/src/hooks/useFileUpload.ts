import { useState, useCallback } from 'react';
import API_CONFIG from '@/config';

export interface FileItem {
  id: string;
  name: string;
  size: string;
  uploadedAt: Date;
  type: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export const useFileUpload = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const { BASE_URL, ENDPOINTS } = API_CONFIG;

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a new file object with initial state
    const newFile: FileItem = {
      id: fileId,
      name: file.name,
      size: formatFileSize(file.size),
      uploadedAt: new Date(),
      type: file.type || 'application/octet-stream',
      file: file,
      status: 'uploading'
    };

    // Add the file to the list immediately with uploading status
    setFiles(prev => [...prev, newFile]);
    setSelectedFileId(fileId);
    setIsUploading(true);
    setError(undefined);
    
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch(`${BASE_URL}${ENDPOINTS.UPLOAD}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      // Update the file status to success
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'success' as const } : f
      ));
      return fileId;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown upload error';
      setError(message);
      
      // Update the file status to error
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error' as const, error: message } : f
      ));
      
      console.error('Error uploading file:', e);
      throw e;
    } finally {
      setIsUploading(false);
    }
  }, [BASE_URL, ENDPOINTS.UPLOAD, formatFileSize]);

  const removeFile = useCallback(async (fileId: string) => {
    try {
      const fileToRemove = files.find(f => f.id === fileId);
      if (!fileToRemove) return;

      // Call backend to delete the file
      const response = await fetch(`${BASE_URL}${ENDPOINTS.DELETE_FILE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ file_name: fileToRemove.name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete file');
      }

      // Remove from local state
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
      if (selectedFileId === fileId) {
        setSelectedFileId(undefined);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete file';
      setError(message);
      throw e;
    }
  }, [BASE_URL, ENDPOINTS.DELETE_FILE, files, selectedFileId]);

  const selectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  const getSelectedFile = useCallback(() => {
    return files.find(file => file.id === selectedFileId);
  }, [files, selectedFileId]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setSelectedFileId(undefined);
    setError(undefined);
  }, []);

  return {
    files,
    selectedFileId,
    isUploading,
    error,
    uploadFile,
    removeFile,
    selectFile,
    getSelectedFile,
    clearFiles,
    hasUploadError: files.some(f => f.status === 'error')
  };
}; 