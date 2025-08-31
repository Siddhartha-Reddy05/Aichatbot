export interface QueryResponse {
  answer: string;
  sources: string[];
  conversation_id: string;
}

export interface UploadResponse {
  message: string;
  files: string[];
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface NewsResponse {
  title: string;
  url: string;
  published_at: string;
  source: string;
  summary?: string;
}

export interface ScrapeResponse {
  title: string;
  content: string;
  url: string;
  status: 'success' | 'error';
  error?: string;
}

export interface ApiError {
  detail: string | { [key: string]: any };
  status?: number;
}
