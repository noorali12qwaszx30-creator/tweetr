// Shared CORS utility for Edge Functions
// Restricts origins to known application domains for security

const ALLOWED_ORIGINS = [
  // Lovable preview URLs
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  // Lovable production URLs  
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  // Capacitor mobile app
  'capacitor://localhost',
  'https://localhost',
];

export const getAllowedOrigin = (requestOrigin: string | null): string | null => {
  if (!requestOrigin) {
    return null;
  }

  for (const allowed of ALLOWED_ORIGINS) {
    if (typeof allowed === 'string') {
      if (requestOrigin === allowed) {
        return requestOrigin;
      }
    } else if (allowed instanceof RegExp) {
      if (allowed.test(requestOrigin)) {
        return requestOrigin;
      }
    }
  }

  return null;
};

export const getCorsHeaders = (requestOrigin: string | null): Record<string, string> => {
  const allowedOrigin = getAllowedOrigin(requestOrigin);
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};
