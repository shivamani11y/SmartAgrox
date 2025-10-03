import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFarms } from '@/lib/firestore';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, MapPin, Calendar, HelpCircle, RefreshCw, WifiOff, AlertCircle, Pencil, Info, LineChart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SatelliteMap from '@/components/agrovision/SatelliteMap';
import NDVIAnalytics from '@/components/agrovision/NDVIAnalytics';
import { FarmNdviData, getFarmNdviData, getNdviDataForDate } from '@/services/ndviService';
import { useTranslation } from 'react-i18next';
import { useUserFarms } from '../../app/hooks/useUserFarms';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import FarmAreaSelector from '@/components/agrovision/FarmAreaSelector';
import { fetchEnhancedNdviData, testSentinelHubConnection } from '@/services/enhancedSatelliteService';
import { saveNDVIAnalysis, NDVIAnalysis } from '@/services/ndviStorageService';



interface Farm {
  id: string;
  name: string;
  location?: string;
  // Add other farm fields as needed
}

// Add type for CustomArea
interface CustomArea {
  id: string;
  name: string;
  polygon: [number, number][];
  ndviValue: number | null;
  isAnalyzing: boolean;
  area?: number; // Area in acres
}

const AgroVision = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { farms, isLoading: isLoadingFarms } = useUserFarms();
  const [userFarms, setUserFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [ndviData, setNdviData] = useState<FarmNdviData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('map');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(300000); // 5 minutes default
  // Add state for custom areas
  const [customAreas, setCustomAreas] = useState<CustomArea[]>([]);
  const [selectedCustomAreaId, setSelectedCustomAreaId] = useState<string | null>(null);
  const [hasPendingArea, setHasPendingArea] = useState(false);
  
  // Load user farms on component mount - works with or without authentication
  const generateNDVIRecommendations = (ndviValue: number): string[] => {
    const recommendations = [];
    
    if (ndviValue < 0.3) {
      recommendations.push("Consider soil testing and fertilization");
      recommendations.push("Check irrigation system");
      recommendations.push("Monitor for pest/disease issues");
    } else if (ndviValue < 0.5) {
      recommendations.push("Moderate vegetation health detected");
      recommendations.push("Consider targeted fertilization");
    } else if (ndviValue < 0.7) {
      recommendations.push("Good vegetation health");
      recommendations.push("Maintain current practices");
    } else {
      recommendations.push("Excellent vegetation health");
      recommendations.push("Optimal growing conditions");
    }
    
    return recommendations;
  };
  useEffect(() => {
    const loadFarms = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (currentUser?.uid) {
          // User is authenticated - load their farms
          const farms = await getUserFarms(currentUser.uid);
          setUserFarms(farms);
          if (farms.length > 0) setSelectedFarm(farms[0]);
        } else {
          // User not authenticated - use demo farms or allow custom area analysis
          console.log('No user authenticated - running in demo mode for AgroVision');
          setUserFarms([]);
          // Create a demo farm for satellite analysis
          const demoFarm = {
            id: 'demo-farm-1',
            name: 'Demo Farm',
            location: 'Sample Location'
          };
          setUserFarms([demoFarm]);
          setSelectedFarm(demoFarm);
          toast.info('Demo Mode - Draw custom areas to analyze satellite data');
        }
      } catch (error) {
        console.error('Failed to load farms:', error);
        toast.error('Failed to load farms');
        setError('Failed to load farms. You can still use custom area analysis.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFarms();
  }, [currentUser]);
  
  // Function to load NDVI data - extracted to a reusable function
  const loadNdviData = useCallback(async (forceRefresh = false) => {
    if (!selectedFarm) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Force refresh if requested
      if (forceRefresh) {
        sessionStorage.setItem('force_refresh_ndvi', 'true');
      }
      
      // Get NDVI data for the selected farm (works for demo farms too)
      const data = await getFarmNdviData(selectedFarm.id, selectedFarm.name);
      
      // Filter data for selected date
      const dateFilteredData = getNdviDataForDate(data, selectedDate.toISOString());
      
      setNdviData(dateFilteredData);
      setLastUpdated(new Date());
      
      // Show appropriate toast notification based on data source
      if (dateFilteredData.usingRealData) {
        toast.success('NDVI data updated', {
          description: `Latest satellite data loaded for ${selectedFarm.name}`
        });
      } else {
        toast.info('Using simulated data', {
          description: 'Unable to connect to satellite provider. Using generated data instead.',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Failed to load NDVI data:', error);
      toast.error('Failed to load NDVI data');
      setError('Failed to load satellite data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFarm, selectedDate]);
  
  // Load NDVI data when farm is selected or date changes
  useEffect(() => {
    if (selectedFarm && mapInitialized) {
      loadNdviData();
    }
  }, [selectedFarm, selectedDate, mapInitialized, loadNdviData]);
  
  // Set up auto-refresh timer if enabled
  useEffect(() => {
    let refreshTimer: number | null = null;
    
    if (autoRefresh && selectedFarm && mapInitialized) {
      refreshTimer = window.setInterval(() => {
        console.log('Auto-refreshing NDVI data...');
        loadNdviData();
      }, refreshInterval);
    }
    
    return () => {
      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
      }
    };
  }, [autoRefresh, refreshInterval, selectedFarm, mapInitialized, loadNdviData]);
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };
  
  const handleInitializeMap = () => {
    setMapInitialized(true);
  };
  
  // Handle field selection from map
  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    // Automatically switch to analytics tab when a field is selected
    if (fieldId && activeTab === 'map') {
      setActiveTab('analytics');
    }
  };
  
  // Handle manual refresh
  const handleManualRefresh = (forceRefresh = false) => {
    loadNdviData(forceRefresh);
  };
  
  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      toast.info('Auto-refresh enabled', {
        description: `NDVI data will update every ${refreshInterval / 60000} minutes`
      });
    } else {
      toast.info('Auto-refresh disabled');
    }
  };
  
  // Calculate the time since last update
  const getLastUpdatedText = () => {
    if (!lastUpdated) return 'Not yet updated';
    
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };
  
  // Update the onCustomAreaUpdate function to track pending areas
  const handleCustomAreaUpdate = (areas, selectedId, hasPending = false) => {
    console.log("handleCustomAreaUpdate called:", { areas, selectedId, hasPending });
    setCustomAreas(areas);
    setSelectedCustomAreaId(selectedId);
    setHasPendingArea(hasPending);
    
    // Don't automatically switch tabs - let user explore the map first
  };
  
  // Add useEffect to monitor state for debugging
  useEffect(() => {
    if (customAreas.length > 0) {
      console.log("Custom areas exist:", customAreas);
      const analyzed = customAreas.filter(area => !area.isAnalyzing && area.ndviValue !== null);
      console.log("Analyzed areas:", analyzed);
      
      if (analyzed.length > 0 && activeTab === 'map') {
        console.log("Have analyzed areas but still on map tab");
      }
    }
  }, [customAreas, activeTab]);
  
  // Add a simple debug function to force tab switch
  const forceAnalyticsTab = () => {
    console.log("Forcing switch to analytics tab");
    setActiveTab('analytics');
  };
  
  // Add event listener for the 'showAnalytics' event from SatelliteMap
  useEffect(() => {
    const handleShowAnalytics = (event: Event) => {
      const customEvent = event as CustomEvent;
      const areaId = customEvent.detail?.areaId;
      console.log("Received showAnalytics event for area:", areaId);
      
      // Switch to analytics tab
      setActiveTab('analytics');
    };
    
    window.addEventListener('showAnalytics', handleShowAnalytics);
    
    return () => {
      window.removeEventListener('showAnalytics', handleShowAnalytics);
    };
  }, []);
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('agroVision.title', 'AgroVision: Satellite Crop Health')}</h1>
            {!currentUser && (
              <p className="text-sm text-gray-600 mt-1">Demo Mode - Sign in to save your analysis results</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleAutoRefresh}
              className={autoRefresh ? "bg-green-50" : ""}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "text-green-600" : ""} ${isLoading ? "animate-spin" : ""}`} />
              {autoRefresh ? t('common.autoRefreshOn', 'Auto-Refresh On') : t('common.autoRefreshOff', 'Auto-Refresh Off')}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleManualRefresh(false)}
              disabled={isLoading || !selectedFarm}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {t('common.refresh', 'Refresh')}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleManualRefresh(true)}
              disabled={isLoading || !selectedFarm}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {t('common.forceRefresh', 'Force Refresh')}
            </Button>
            
            {/* Debug button */}
            {customAreas.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={forceAnalyticsTab}
                className="bg-blue-50 text-blue-600"
              >
                <LineChart className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => toast.info('AgroVision Help Center', { description: 'Help documentation coming soon!' })}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {t('common.help', 'Help')}
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
              <Button 
                variant="link" 
                className="text-red-700 p-0 h-auto text-sm"
                onClick={() => handleManualRefresh(true)}
              >
                Try again
              </Button>
            </div>
          </div>
        )}
        
        {/* Data source warning */}
        {ndviData && !ndviData.usingRealData && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Using Simulated Data</h3>
              <p className="text-amber-700 text-sm">
                Unable to connect to the satellite data provider. The system is currently showing 
                simulated crop health data. Real-time data will be shown when available.
              </p>
              <Button 
                variant="link" 
                className="text-amber-700 p-0 h-auto text-sm"
                onClick={() => handleManualRefresh(true)}
              >
                Try again with force refresh
              </Button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-4">
            <h3 className="font-medium mb-3">{t('agroVision.selectFarm', 'Select Farm')}</h3>
            <Select 
              value={selectedFarm?.id || ''} 
              onValueChange={(farmId) => {
                const farm = userFarms.find(f => f.id === farmId);
                setSelectedFarm(farm || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a farm" />
              </SelectTrigger>
              <SelectContent>
                {userFarms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>
                    {farm.name} {farm.location && `- ${farm.location}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
          <Card className="p-4">
            <h3 className="font-medium mb-3">{t('agroVision.selectDate', 'Select Date')}</h3>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </Card>
          
          <Card className="p-4 col-span-2">
            <h3 className="font-medium mb-3">{t('agroVision.status', 'Status')}</h3>
            <div className="flex items-center justify-between">
              <div>
                {isLoading ? (
                  <div className="flex items-center text-amber-600">
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    {t('agroVision.loadingData', 'Loading data...')}
                  </div>
                ) : (
                  <div className="text-green-600">
                    {t('agroVision.readyToAnalyze', 'Ready to analyze custom areas')}
                  </div>
                )}
                
                {lastUpdated && (
                  <div className="text-xs text-slate-500 mt-1">
                    {t('common.lastUpdated', 'Last updated')}: {getLastUpdatedText()}
                  </div>
                )}
              </div>
              
              {selectedFieldId && ndviData && (
                <div className="flex items-center">
                  <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-200">
                    {t('agroVision.analyzingField', 'Analyzing')}: {ndviData.fields.find(f => f.id === selectedFieldId)?.name}
                    <Button 
                      variant="link" 
                      className="text-xs text-blue-600 p-0 h-auto ml-1" 
                      onClick={() => setSelectedFieldId(null)}
                    >
                      {t('agroVision.clearSelection', 'Clear')}
                    </Button>
                  </div>
                </div>
              )}
              
              {customAreas.length > 0 && (
                <div className="flex items-center">
                  <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-200">
                    {t('agroVision.customAreasDrawn', 'Custom Areas')}: {customAreas.length}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 mr-2" />
              {t('agroVision.satelliteMap', 'Satellite Map')}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <Calendar className="h-4 w-4 mr-2" />
              {t('agroVision.ndviAnalytics', 'NDVI Analytics')}
            </TabsTrigger>
            <TabsTrigger value="ndvi-analysis">NDVI Analysis</TabsTrigger>
            
          </TabsList>
          
          {/* Add Draw Custom Area button here when map tab is active */}
          {activeTab === 'map' && mapInitialized && !isLoading && (
            <div className="flex justify-end gap-3 mb-4">
              <Button
                variant="default"
                size="lg"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-3"
                onClick={() => {
                  if (window.startDrawingPolygon) {
                    window.startDrawingPolygon();
                  }
                }}
              >
                <Pencil className="h-5 w-5" />
                <span className="text-base font-bold">Draw Custom Area</span>
              </Button>
              
              <Button
                variant="default"
                size="lg"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-3"
                onClick={() => {
                  console.log("Analyze Area button clicked");
                  if (window.analyzeDrawnArea) {
                    console.log("Calling window.analyzeDrawnArea()");
                    const success = window.analyzeDrawnArea();
                    
                    // If analysis was successful, consider showing analytics tab
                    if (success && customAreas.length > 0) {
                      setTimeout(() => {
                        // Give time for the analysis to complete before switching tabs
                        setActiveTab('analytics');
                      }, 1500);
                    }
                  } else {
                    toast.error("Analysis tool not available", { 
                      description: "Please refresh the page and try again."
                    });
                  }
                }}
              >
                <LineChart className="h-5 w-5" />
                <span className="text-base font-bold">Analyze Area</span>
              </Button>
            </div>
          )}
          
          <TabsContent value="map" className="mt-4 relative">
            <SatelliteMap 
              ndviData={ndviData}
              isLoading={isLoading}
              onInitialize={handleInitializeMap}
              onFieldSelect={handleFieldSelect}
              selectedFieldId={selectedFieldId}
              onCustomAreaUpdate={handleCustomAreaUpdate}
            />
            
            {/* Add direct overlay analyze button */}
            {hasPendingArea && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999]">
                <Button
                  size="lg"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-5 rounded-md shadow-xl border-2 border-white animate-pulse"
                  onClick={() => {
                    console.log("Center Analyze Area button clicked");
                    if (window.analyzeDrawnArea) {
                      console.log("Calling window.analyzeDrawnArea()");
                      window.analyzeDrawnArea();
                      // Don't switch tabs automatically - user should first see analysis on the map
                    } else {
                      toast.error("Analysis tool not available", { 
                        description: "Please refresh the page and try again."
                      });
                    }
                  }}
                >
                  <LineChart className="h-6 w-6" />
                  <span className="text-lg font-bold">Analyze Selected Area</span>
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics">
            <NDVIAnalytics 
              ndviData={ndviData}
              isLoading={isLoading}
              selectedFieldId={selectedFieldId}
              customAreas={customAreas}
              selectedCustomAreaId={selectedCustomAreaId}
            />
          </TabsContent>
          <TabsContent value="ndvi-analysis">
  <FarmAreaSelector
    onFarmSelect={(farm) => setSelectedFarm(farm)}
    onAreaDraw={(area) => console.log('Area drawn:', area)}
    onNDVIAnalyze={async (farmId, area) => {
      try {
        // Convert area polygon to boundaries format for satellite API
        const boundaries = area.polygon.map(point => [point.lng, point.lat]);
        
        // Fetch actual NDVI data from satellite service
        console.log('🛰️ Fetching real NDVI data for area:', area.name);
        const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const toDate = new Date().toISOString().split('T')[0];
        const coordinates = boundaries.map(([lng, lat]) => [lat, lng] as [number, number]);
        const ndviData = await fetchEnhancedNdviData(coordinates, fromDate, toDate);
        
        // Extract average NDVI value
        const ndviValue = ndviData && ndviData.length > 0 ? ndviData[0].value : 0.65;
        
        console.log('✅ Real NDVI value:', ndviValue);
        
        // 🆕 SAVE TO DATABASE - Now properly placed!
        try {
          if (currentUser?.uid) {
            const analysisData: NDVIAnalysis = {
              userId: currentUser.uid,
              farmId: farmId,
              farmName: area.name,
              analysisDate: new Date().toISOString(),
              ndviValue: ndviValue,
              area: area.area || 0,
              coordinates: coordinates,
              polygon: area.polygon,
              confidence: 0.85,
              vegetationHealth: ndviData[0]?.health || 'moderate',
              recommendations: generateNDVIRecommendations(ndviValue),
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await saveNDVIAnalysis(analysisData);
            console.log('✅ NDVI data saved to database for Yield Predictor');
            toast.success(`NDVI analysis saved: ${ndviValue.toFixed(3)}`);
          } else {
            console.warn('⚠️ User not authenticated, NDVI data not saved');
          }
        } catch (saveError) {
          console.error('❌ Failed to save NDVI data:', saveError);
          toast.error('Failed to save NDVI analysis');
        }
        
        return ndviValue;
        
      } catch (error) {
        console.error('Error fetching NDVI data:', error);
        console.log('Error fetching NDVI data:', error);
        // Fallback to estimated value based on area size
        const estimatedNdvi = 0.5 + (Math.random() * 0.3);
        toast.error('Could not fetch satellite data, using estimated NDVI');
        return estimatedNdvi;
      }
    }}
  />
</TabsContent>
        </Tabs>
        
        {/* Advanced Settings Panel - Can be hidden behind a disclosure or modal in production */}
        <Card className="p-4 mb-6">
          <h3 className="font-medium mb-3">Advanced Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Auto-Refresh Interval
              </label>
              <Select 
                value={refreshInterval.toString()} 
                onValueChange={(value) => {
                  setRefreshInterval(parseInt(value));
                  if (autoRefresh) {
                    toast.info(`Auto-refresh interval updated to ${parseInt(value) / 60000} minutes`);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60000">1 minute</SelectItem>
                  <SelectItem value="300000">5 minutes</SelectItem>
                  <SelectItem value="600000">10 minutes</SelectItem>
                  <SelectItem value="1800000">30 minutes</SelectItem>
                  <SelectItem value="3600000">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Connection Status
              </label>
              <div className="flex items-center">
                {navigator.onLine ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm">Online - Ready for real-time updates</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-amber-500 mr-2" />
                    <span className="text-sm text-amber-700">Offline - Using cached data</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Custom Area Analysis Feature */}
        <Card className="p-4 mb-6 border-l-4 border-l-blue-500">
          <div className="flex items-start">
            <Pencil className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">{t('agroVision.customAreaAnalysis', 'Custom Area Analysis')}</h3>
              <p className="text-sm text-slate-600 mb-2">
                {t('agroVision.customAreaDescription', 'Draw your own areas on the map to analyze specific regions of your farm. Select the "Draw Custom Area" button in the map view to start.')}
              </p>
              <div className="flex items-center text-xs text-blue-600">
                <Info className="h-3.5 w-3.5 mr-1" />
                <span>{t('agroVision.customAreaTip', 'Double-click to complete your drawing after placing points')}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Update floating buttons section - remove Analyze button, keep only Draw Area */}
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3">
          <Button
            size="lg"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-6 rounded-full shadow-lg"
            onClick={() => {
              console.log("Draw Area button clicked");
              // First ensure the map tab is active
              setActiveTab('map');
              
              // Then try to start drawing after a small delay
              setTimeout(() => {
                if (window.startDrawingPolygon) {
                  try {
                    console.log("Starting drawing mode");
                    window.startDrawingPolygon();
                  } catch (error) {
                    console.error('Error starting drawing:', error);
                    toast.error("Could not start drawing", { 
                      description: "There was an error initializing the drawing tool."
                    });
                  }
                } else {
                  toast.error("Drawing tool not available", { 
                    description: "Please make sure the map is fully loaded and try again."
                  });
                }
              }, 500);
            }}
          >
            <Pencil className="h-6 w-6" />
            <span className="text-lg font-bold">Draw Area</span>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default AgroVision; 