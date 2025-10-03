import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Pencil, Save, Trash2, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFarms } from '@/lib/firestore';
import { saveNDVIAnalysis, getFarmNDVIAnalysis, NDVIAnalysis } from '@/services/ndviStorageService';
import { toast } from 'sonner';

interface Farm {
  id: string;
  name: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
}

interface DrawnArea {
  id: string;
  name: string;
  polygon: Array<{ lat: number; lng: number }>;
  area: number; // in hectares
  ndviValue?: number;
}

interface FarmAreaSelectorProps {
  onFarmSelect: (farm: Farm) => void;
  onAreaDraw: (area: DrawnArea) => void;
  onNDVIAnalyze: (farmId: string, area: DrawnArea) => Promise<number>;
}

const FarmAreaSelector: React.FC<FarmAreaSelectorProps> = ({
  onFarmSelect,
  onAreaDraw,
  onNDVIAnalyze
}) => {
  const { currentUser } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<NDVIAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFarms();
  }, [currentUser]);

  useEffect(() => {
    if (selectedFarm) {
      loadSavedAnalyses();
    }
  }, [selectedFarm]);

  const loadFarms = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const userFarms = await getUserFarms(currentUser.uid);
      setFarms(userFarms);
    } catch (error) {
      console.error('Error loading farms:', error);
      toast.error('Failed to load farms');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAnalyses = async () => {
    if (!currentUser || !selectedFarm) return;
    
    try {
      const analyses = await getFarmNDVIAnalysis(currentUser.uid, selectedFarm.id);
      setSavedAnalyses(analyses);
    } catch (error) {
      console.error('Error loading saved analyses:', error);
    }
  };

  const handleFarmSelect = (farmId: string) => {
    const farm = farms.find(f => f.id === farmId);
    if (farm) {
      setSelectedFarm(farm);
      onFarmSelect(farm);
      setDrawnAreas([]);
    }
  };

  const handleAreaDraw = (area: DrawnArea) => {
    setDrawnAreas([...drawnAreas, area]);
    onAreaDraw(area);
  };

  const analyzeNDVI = async (area: DrawnArea) => {
    if (!selectedFarm || !currentUser) return;

    try {
      setIsAnalyzing(true);
      toast.info('Analyzing NDVI for selected area...');
      
      // Get NDVI value from analysis
      const ndviValue = await onNDVIAnalyze(selectedFarm.id, area);
      
      // Determine vegetation health
      const getVegetationHealth = (ndvi: number): 'poor' | 'fair' | 'good' | 'excellent' => {
        if (ndvi < 0.3) return 'poor';
        if (ndvi < 0.5) return 'fair';
        if (ndvi < 0.7) return 'good';
        return 'excellent';
      };

      // Save to database
      const analysisData: Omit<NDVIAnalysis, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: currentUser.uid,
        farmId: selectedFarm.id,
        farmName: selectedFarm.name || `Farm ${selectedFarm.id.slice(0, 6)}`,
        analysisDate: new Date(),
        ndviValue,
        area: area.area,
        coordinates: {
          lat: area.polygon[0]?.lat || 0,
          lng: area.polygon[0]?.lng || 0
        },
        polygon: area.polygon,
        confidence: 85, // Mock confidence score
        vegetationHealth: getVegetationHealth(ndviValue),
        recommendations: generateRecommendations(ndviValue)
      };

      const analysisId = await saveNDVIAnalysis(analysisData);
      
      // Update drawn area with NDVI value
      const updatedAreas = drawnAreas.map(a => 
        a.id === area.id ? { ...a, ndviValue } : a
      );
      setDrawnAreas(updatedAreas);
      
      // Reload saved analyses
      await loadSavedAnalyses();
      
      toast.success(`NDVI Analysis completed! Value: ${ndviValue.toFixed(3)}`);
      
    } catch (error) {
      console.error('Error analyzing NDVI:', error);
      toast.error('Failed to analyze NDVI');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRecommendations = (ndviValue: number): string[] => {
    if (ndviValue < 0.3) {
      return [
        'Consider soil testing for nutrient deficiencies',
        'Check irrigation system efficiency',
        'Apply organic fertilizers to improve soil health'
      ];
    } else if (ndviValue < 0.5) {
      return [
        'Monitor crop growth closely',
        'Consider targeted fertilization',
        'Ensure adequate water supply'
      ];
    } else if (ndviValue < 0.7) {
      return [
        'Maintain current farming practices',
        'Regular monitoring recommended',
        'Consider precision agriculture techniques'
      ];
    } else {
      return [
        'Excellent vegetation health detected',
        'Continue current management practices',
        'Consider this area as a reference for other fields'
      ];
    }
  };

  const calculateAreaSize = (polygon: Array<{ lat: number; lng: number }>): number => {
    // Simple polygon area calculation (approximate)
    // In a real implementation, use proper geodesic calculations
    if (polygon.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i].lat * polygon[j].lng;
      area -= polygon[j].lat * polygon[i].lng;
    }
    area = Math.abs(area) / 2;
    
    // Convert to hectares (rough approximation)
    return area * 111320 * 111320 / 10000; // Very rough conversion
  };

  return (
    <div className="space-y-6">
      {/* Farm Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Select Farm</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedFarm?.id || ''} onValueChange={handleFarmSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a farm for NDVI analysis" />
            </SelectTrigger>
            <SelectContent>
              {farms.map((farm) => (
                <SelectItem key={farm.id} value={farm.id}>
                  <div className="flex items-center space-x-2">
                    <span>{farm.name || `Farm ${farm.id.slice(0, 6)}`}</span>
                    {farm.location && (
                      <Badge variant="outline" className="text-xs">
                        {farm.location}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Area Drawing Controls */}
      {selectedFarm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Pencil className="h-5 w-5" />
              <span>Draw Analysis Area</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setIsDrawing(!isDrawing)}
              variant={isDrawing ? "destructive" : "default"}
              className="w-full"
            >
              {isDrawing ? 'Cancel Drawing' : 'Start Drawing Area'}
            </Button>
            
            {drawnAreas.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Drawn Areas:</h4>
                {drawnAreas.map((area) => (
                  <div key={area.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{area.name}</span>
                      <p className="text-sm text-gray-500">
                        Area: {area.area.toFixed(2)} hectares
                      </p>
                      {area.ndviValue && (
                        <Badge variant="outline">
                          NDVI: {area.ndviValue.toFixed(3)}
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => analyzeNDVI(area)}
                      disabled={isAnalyzing}
                      size="sm"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Analyze NDVI'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved Analyses */}
      {savedAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous NDVI Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedAnalyses.slice(0, 5).map((analysis) => (
                <div key={analysis.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">NDVI: {analysis.ndviValue.toFixed(3)}</span>
                      <Badge 
                        variant={
                          analysis.vegetationHealth === 'excellent' ? 'default' :
                          analysis.vegetationHealth === 'good' ? 'secondary' :
                          analysis.vegetationHealth === 'fair' ? 'outline' : 'destructive'
                        }
                      >
                        {analysis.vegetationHealth}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {analysis.area.toFixed(2)} hectares • {analysis.analysisDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FarmAreaSelector;
