// API Configuration for SmartAgroX
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Validate API key
if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not found in environment variables. AI features may be limited.');
}

export const API_CONFIG = {
  GEMINI_API_KEY,
  GEMINI_MODEL: 'gemini-flash-lite-latest',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;

export default API_CONFIG;
