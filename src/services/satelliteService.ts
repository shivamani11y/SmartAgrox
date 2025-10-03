import axios from 'axios';

// This would come from environment variables in a real implementation
const API_BASE_URL = 'http://localhost:8000/api';

// Add this satellite API implementation
const satelliteApi = {
  getNdviData: async (boundaries, date) => {
    // In a real implementation, this would make an API call
    // For now, we'll simulate a network request
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data for now
    return {
      data: generateFallbackNdviData(date)
    };
  }
};

/**
 * Fetch NDVI data for a field based on its boundaries and a date
 */

// Rename to indicate this is a fallback, not the primary source
const generateFallbackNdviData = (date) => {
  // Keep the existing mock data generation as fallback
  // Generate a realistic value based on the month (season)
  const month = date.getMonth();
  const seasonFactor = 0.5 + 0.3 * Math.sin((month - 2) * Math.PI / 6); // Peak in summer
  
  // Add some randomness
  const baseNdvi = seasonFactor + (Math.random() * 0.2 - 0.1);
  const avgNdvi = Math.max(0.1, Math.min(0.9, baseNdvi));
  
  // Generate min/max values around the average
  const minNdvi = Math.max(0.05, avgNdvi - 0.1 - Math.random() * 0.1);
  const maxNdvi = Math.min(0.95, avgNdvi + 0.1 + Math.random() * 0.1);
  
  // Generate zones
  const zoneCount = 5;
  const zoneStep = (maxNdvi - minNdvi) / zoneCount;
  
  const zones = Array.from({ length: zoneCount }, (_, i) => {
    const min = minNdvi + i * zoneStep;
    const max = minNdvi + (i + 1) * zoneStep;
    const average = (min + max) / 2 + (Math.random() * 0.02 - 0.01);
    const count = Math.floor(100 + Math.random() * 200);
    
    return {
      min,
      max,
      average,
      count,
      percentage: count / 1000 * 100
    };
  });
  
  return {
    averageNdvi: avgNdvi,
    minNdvi: minNdvi,
    maxNdvi: maxNdvi,
    zones: zones,
    date: date.toISOString()
  };
};

/**
 * Fetch historical NDVI data for a field
 */
export const fetchHistoricalNdviData = async (boundaries, startDate, endDate) => {
  try {
    // For the prototype, we'll simulate the API call
    console.log('Fetching historical NDVI data:', { startDate, endDate });
    
    // Extract bounding box from boundaries
    const coords = getBoundingBoxFromBoundaries(boundaries);
    
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response - in a real implementation this would be:
    // const response = await axios.get(`${API_BASE_URL}/historical-ndvi`, {
    //   params: {
    //     min_lon: coords.min_lon,
    //     min_lat: coords.min_lat,
    //     max_lon: coords.max_lon,
    //     max_lat: coords.max_lat,
    //     start_date: startDate.toISOString().split('T')[0],
    //     end_date: endDate.toISOString().split('T')[0]
    //   }
    // });
    
    // Generate mock historical data
    const dates = [];
    const ndvi_values = [];
    
    // Generate data points at 30-day intervals
    let currentDate = new Date(startDate);
    let lastNdvi = 0.4 + Math.random() * 0.2 - 0.1; // Start between 0.3-0.5
    
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      
      // Add some time correlation and seasonal effects
      const month = currentDate.getMonth();
      const seasonFactor = 0.5 + 0.3 * Math.sin((month - 2) * Math.PI / 6); // Peak in summer
      
      // Move toward the seasonal norm with some randomness
      const trendFactor = 0.7;
      lastNdvi = (trendFactor * seasonFactor + 
                 (1 - trendFactor) * lastNdvi + 
                 (Math.random() * 0.1 - 0.05));
      
      // Keep within reasonable bounds
      lastNdvi = Math.max(0.1, Math.min(0.9, lastNdvi));
      ndvi_values.push(lastNdvi);
      
      // Move forward by 30 days
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 30);
    }
    
    return {
      dates,
      ndvi_values
    };
  } catch (error) {
    console.error('Error fetching historical NDVI data:', error);
    throw error;
  }
};

/**
 * Helper function to generate mock NDVI data
 */
const generateMockNdviData = (date) => {
  // Generate a realistic value based on the month (season)
  const month = date.getMonth();
  const seasonFactor = 0.5 + 0.3 * Math.sin((month - 2) * Math.PI / 6); // Peak in summer
  
  // Add some randomness
  const baseNdvi = seasonFactor + (Math.random() * 0.2 - 0.1);
  const avgNdvi = Math.max(0.1, Math.min(0.9, baseNdvi));
  
  // Generate min/max values around the average
  const minNdvi = Math.max(0.05, avgNdvi - 0.1 - Math.random() * 0.1);
  const maxNdvi = Math.min(0.95, avgNdvi + 0.1 + Math.random() * 0.1);
  
  // Generate zones
  const zoneCount = 5;
  const zoneStep = (maxNdvi - minNdvi) / zoneCount;
  
  const zones = Array.from({ length: zoneCount }, (_, i) => {
    const min = minNdvi + i * zoneStep;
    const max = minNdvi + (i + 1) * zoneStep;
    const average = (min + max) / 2 + (Math.random() * 0.02 - 0.01);
    const count = Math.floor(100 + Math.random() * 200);
    
    return {
      min,
      max,
      average,
      count,
      percentage: count / 1000 * 100
    };
  });
  
  return {
    averageNdvi: avgNdvi,
    minNdvi: minNdvi,
    maxNdvi: maxNdvi,
    zones: zones,
    date: date.toISOString()
  };
};

/**
 * Helper function to extract bounding box from GeoJSON boundaries
 */
const getBoundingBoxFromBoundaries = (boundaries) => {
  // Handle the case when boundaries might not have the expected structure
  if (!boundaries || !boundaries.coordinates || !boundaries.coordinates[0]) {
    // Return a default bounding box covering a small area
    return {
      min_lon: -0.1,
      max_lon: 0.1,
      min_lat: -0.1,
      max_lat: 0.1
    };
  }
  
  const coordinates = boundaries.coordinates[0];
  const lons = coordinates.map(coord => coord[0]);
  const lats = coordinates.map(coord => coord[1]);
  
  return {
    min_lon: Math.min(...lons),
    max_lon: Math.max(...lons),
    min_lat: Math.min(...lats),
    max_lat: Math.max(...lats)
  };
};

// Add the missing function export
export const fetchNdviData = async (farmId: string, date?: Date) => {
  // Implementation for fetching NDVI data
  // This should return NDVI (Normalized Difference Vegetation Index) data for the specified farm
  
  // Example implementation:
  return {
    farmId,
    date: date || new Date(),
    ndviValues: [
      // Sample NDVI data points
      { position: { lat: 0, lng: 0 }, value: 0.75 },
      { position: { lat: 0.01, lng: 0.01 }, value: 0.68 },
      // Add more data points as needed
    ],
    averageNdvi: 0.72,
    coverage: 95 // percentage of farm covered
  };
};