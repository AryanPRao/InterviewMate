// API Base URL configuration
// For local development: http://localhost:5000
// For production: Your Elastic Beanstalk URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Helper function to get full API endpoint
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Export for convenience
export default {
  baseURL: API_BASE_URL,
  getUrl: getApiUrl
};