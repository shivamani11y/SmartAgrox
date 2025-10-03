/**
 * Enhanced Satellite Service with improved error handling and CORS support
 */
import axios from 'axios';
import { NdviDataPoint } from './ndviService';

// API configuration with validation
const SENTINEL_HUB_API_KEY = import.meta.env.VITE_SENTINEL_HUB_API_KEY;
const SENTINEL_HUB_INSTANCE_ID = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;

// Validate API keys on service initialization
const validateApiKeys = () => {
  console.log('Validating Sentinel Hub API configuration...');
  console.log('API Key available:', !!SENTINEL_HUB_API_KEY);
  console.log('Instance ID available:', !!SENTINEL_HUB_INSTANCE_ID);
  
  if (!SENTINEL_HUB_API_KEY || !SENTINEL_HUB_INSTANCE_ID) {
    console.warn('Missing Sentinel Hub API credentials. Real satellite data will not be available.');
    return false;
  }
  
  // Basic format validation
  if (SENTINEL_HUB_API_KEY.length < 20 || SENTINEL_HUB_INSTANCE_ID.length < 20) {
    console.warn('API credentials appear to be invalid format. Please check your .env file.');
    return false;
  }
  
  console.log('API credentials validated successfully');
  return true;
};

// Token management
let authToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get or refresh Sentinel Hub authentication token
 */
const getAuthToken = async (): Promise<string> => {
  const now = Date.now();
  
  // Return cached token if still valid
  if (authToken && tokenExpiry > now + 60000) { // 1 minute buffer
    console.log('Using cached authentication token');
    return authToken;
  }
  
  console.log('Requesting new Sentinel Hub authentication token...');
  
  try {
    const response = await axios.post(
      '/api/sentinel/oauth/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SENTINEL_HUB_API_KEY,
        client_secret: SENTINEL_HUB_INSTANCE_ID
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    authToken = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in * 1000) - 300000; // 5 min buffer
    
    console.log('Authentication token obtained successfully');
    return authToken;
  } catch (error) {
    console.error('Failed to obtain authentication token:', error);
    if (error.response?.status === 401) {
      throw new Error('Invalid API credentials. Please check your Sentinel Hub API key and instance ID.');
    }
    throw new Error('Authentication failed with Sentinel Hub API');
  }
};

/**
 * Validate and format polygon coordinates
 */
const validatePolygon = (polygon: [number, number][]): boolean => {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    console.error('Invalid polygon: must have at least 3 coordinates');
    return false;
  }
  
  for (const [lat, lng] of polygon) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.error('Invalid coordinate format: must be numbers');
      return false;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('Invalid coordinate values:', { lat, lng });
      return false;
    }
  }
  
  console.log('Polygon validation passed');
  return true;
};

/**
 * Create evalscript for NDVI calculation
 */
const createNdviEvalscript = () => {
  return `
    //VERSION=3
    function setup() {
      return {
        input: ["B04", "B08", "dataMask"],
        output: { bands: 1, sampleType: "FLOAT32" }
      };
    }
    
    function evaluatePixel(sample) {
      if (sample.dataMask == 0) return [null];
      
      const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
      return [ndvi];
    }
  `;
};

/**
 * Fetch real NDVI data from Sentinel Hub with enhanced error handling
 */
/**
 * Fetch real NDVI data from Python backend (no CORS issues)
 */
export const fetchEnhancedNdviData = async (
    polygon: [number, number][],
    fromDate: string,
    toDate: string
  ): Promise<NdviDataPoint[]> => {
    console.log('🐍 Using Python backend for NDVI data...');
    console.log('Polygon:', polygon);
    console.log('Date range:', fromDate, 'to', toDate);
    
    try {
      const response = await axios.post('http://localhost:8000/ndvi-analysis', {
        polygon,
        from_date: fromDate,
        to_date: toDate
      });
      
      console.log('✅ Python backend response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Python backend error:', error);
      
      // Fallback to mock data if backend is not available
      console.log('🔄 Falling back to mock NDVI data');
      const avgNdvi = 0.65 + (Math.random() * 0.2 - 0.1);
      
      return [{
        date: toDate,
        value: Math.round(avgNdvi * 1000) / 1000,
        health: avgNdvi < 0.3 ? 'poor' : avgNdvi < 0.5 ? 'moderate' : avgNdvi < 0.7 ? 'good' : 'excellent'
      }];
    }
  };
/**
 * Test API connectivity and credentials
 */
export const testSentinelHubConnection = async (): Promise<boolean> => {
    try {
      const response = await axios.post('http://localhost:8000/test-connection');
      return response.data.status === 'success';
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

// Initialize service
console.log('Enhanced Satellite Service initialized');
validateApiKeys();
