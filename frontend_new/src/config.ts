// Backend API configuration
export const API_CONFIG = {
  // Base URL for all API requests
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  // API endpoints
  ENDPOINTS: {
    UPLOAD: '/upload',
    ASK: '/ask',
    FILES: '/files',
    DELETE_FILE: '/delete', // expects DELETE /delete/{file_name}
    CLEAR_HISTORY: '/clear', // DELETE
    NEWS: '/news',
    SCRAPE: '/scrape'
  },
  
  // Default headers for API requests
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Timeout for API requests in milliseconds
  TIMEOUT: 30000
};

export default API_CONFIG;
