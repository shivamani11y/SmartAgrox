import { useMediaQuery } from '@mui/material';
import { toast } from 'sonner';
import { format } from 'date-fns';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3,
  MapPin,
  Calendar,
  Brain,
  AlertCircle,
  Clock,
  Info,
  CheckCircle,
  Lightbulb,
  Map,
  Layers,
  BarChart4,
  Shield,
  Droplets,
  ThermometerSun,
  Bug,
  Wind,
  Eye
} from 'lucide-react';
import { LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, Legend, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import yieldPredictionService, { 
  YieldPrediction, 
  YieldPredictionInput, 
  YieldHeatmapData, 
  FieldZone,
  ActionableRecommendation
} from '@/services/yieldPredictionService';
import { useAuth } from '@/contexts/AuthContext';

interface YieldPredictionProps {
  farmData: any;
  cropType: string;
  onRecommendationClick?: (recommendation: ActionableRecommendation) => void;
}

const YieldPredictionComponent: React.FC<YieldPredictionProps> = ({ 
  farmData, 
  cropType, 
  onRecommendationClick 
}) => {
  const { currentUser } = useAuth(); 
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);
  const [heatmapData, setHeatmapData] = useState<YieldHeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedZone, setSelectedZone] = useState<any | null>(null);
  const [animateCharts, setAnimateCharts] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<any | null>(null);

  const isSmallScreen = useMediaQuery('(max-width: 640px)');
  const isMediumScreen = useMediaQuery('(max-width: 1024px)');

  useEffect(() => {
    if (farmData && cropType) {
      generateYieldPrediction();
    }
  }, [farmData, cropType]);

  useEffect(() => {
    if (prediction && !animateCharts) {
      setTimeout(() => {
        setAnimateCharts(true);
      }, 300);
    }
  }, [prediction]);

  const generateYieldPrediction = async () => {
    try {
      setLoading(true);
      setAnimateCharts(false);
      
      const input: YieldPredictionInput = {
        farmId: farmData.id,
        cropType,
        plantingDate: new Date(farmData.plantingDate || Date.now()),
        farmSize: farmData.size || 2.5,
        soilType: farmData.soilType || 'loamy',
        irrigationSystem: farmData.irrigationSystem || 'drip',
        location: { 
          lat: farmData.latitude || 17.3850, 
          lon: farmData.longitude || 78.4867 
        },
        currentStage: farmData.currentStage || 'vegetative',
        userId: currentUser?.uid || '',
        farmName: farmData.name || 'Unknown Farm'
      };

      const validatePrediction = (data: any): YieldPrediction => {
        const defaultPrediction: YieldPrediction = {
          predictedYield: data?.predictedYield || 0,
          confidenceScore: data?.confidenceScore || 0,
          yieldRange: {
            min: data?.yieldRange?.min || 0,
            max: data?.yieldRange?.max || 0
          },
          harvestDate: data?.harvestDate || new Date(),
          keyFactors: Array.isArray(data?.keyFactors) ? data.keyFactors : [],
          risks: Array.isArray(data?.risks) ? data.risks : [],
          recommendations: Array.isArray(data?.recommendations) ? data.recommendations : []
        };
        
        return defaultPrediction;
      };
      
      const [predictionResult, heatmapResult] = await Promise.all([
        yieldPredictionService.predictYield(input),
        yieldPredictionService.generateYieldHeatmap(input)
      ]);
      
      setPrediction(validatePrediction(predictionResult));
      setHeatmapData(heatmapResult || null);
    } catch (error) {
      console.error('❌ Yield prediction failed:', error);
      toast.error("Could not generate yield prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getYieldTrendData = () => {
    if (!prediction) return [];
    
    const defaultStages = [
      { stage: 'Planting', month: 'Jan', yieldFactor: 0.2 },
      { stage: 'Germination', month: 'Feb', yieldFactor: 0.3 },
      { stage: 'Vegetative', month: 'Mar', yieldFactor: 0.5 },
      { stage: 'Flowering', month: 'Apr', yieldFactor: 0.7 },
      { stage: 'Grain Filling', month: 'May', yieldFactor: 0.9 },
      { stage: 'Harvest', month: 'Jun', yieldFactor: 1.0 }
    ];
    
    const growthStages = (farmData?.growthStages && Array.isArray(farmData.growthStages)) 
      ? farmData.growthStages 
      : defaultStages;
    
    const baseYield = prediction.predictedYield;
    
    return growthStages.map(stage => ({
      month: stage.month,
      yield: baseYield * stage.yieldFactor,
      stage: stage.stage
    }));
  };

  const getRiskDistributionData = () => {
    if (!prediction?.risks || !Array.isArray(prediction.risks)) return [];
    
    const highRisks = prediction.risks.filter(r => r.probability > 70).length;
    const mediumRisks = prediction.risks.filter(r => r.probability > 40 && r.probability <= 70).length;
    const lowRisks = prediction.risks.filter(r => r.probability <= 40).length;
    
    return [
      { name: 'High Risk', value: highRisks, color: '#ef4444' },
      { name: 'Medium Risk', value: mediumRisks, color: '#f59e0b' },
      { name: 'Low Risk', value: lowRisks, color: '#10b981' }
    ];
  };

  const getRiskImpactData = () => {
    if (!prediction?.risks || !Array.isArray(prediction.risks)) return [];
    
    return prediction.risks.map(risk => ({
      risk: risk.risk.substring(0, 20) + '...',
      probability: risk.probability,
      severity: risk.severity === 'high' ? 80 : risk.severity === 'medium' ? 50 : 30
    }));
  };

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'positive':
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'neutral':
      case 'medium':
        return 'text-amber-600 bg-amber-50';
      case 'negative':
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability > 70) return 'text-red-600 bg-red-50';
    if (probability > 40) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const getYieldPotentialColor = (potential: string) => {
    switch (potential?.toLowerCase()) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-amber-600 bg-amber-50';
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getRiskIcon = (riskType: string) => {
    const type = riskType.toLowerCase();
    if (type.includes('drought') || type.includes('water')) return <Droplets className="h-5 w-5" />;
    if (type.includes('pest') || type.includes('disease')) return <Bug className="h-5 w-5" />;
    if (type.includes('heat') || type.includes('temperature')) return <ThermometerSun className="h-5 w-5" />;
    if (type.includes('wind') || type.includes('storm')) return <Wind className="h-5 w-5" />;
    return <AlertTriangle className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <Card className="w-full overflow-hidden border-2 border-green-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="text-lg font-medium">Analyzing multimodal data for yield prediction...</span>
          </div>
          <div className="mt-6">
            <Progress value={65} className="h-2 mb-2" />
            <div className="grid grid-cols-2 gap-4 mt-6">
              {['Satellite imagery analysis', 'Weather data integration', 'Soil health assessment', 'ML model prediction'].map((step, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${i < 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card className="w-full border-2 border-green-100">
        <CardContent className="p-8 text-center">
          <Brain className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-80" />
          <h3 className="text-xl font-medium mb-2">No yield prediction available</h3>
          <p className="text-gray-600 mb-6">Please ensure farm data is complete for accurate predictions.</p>
          <Button onClick={generateYieldPrediction} className="bg-green-600 hover:bg-green-700">
            Generate Prediction
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className={`grid ${isSmallScreen ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white transform hover:scale-105 transition-transform duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Predicted Yield</p>
                <p className="text-2xl font-bold">{prediction.predictedYield} t/ha</p>
              </div>
              <Target className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-transform duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Confidence</p>
                <p className="text-2xl font-bold">{prediction.confidenceScore}%</p>
              </div>
              <Brain className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white transform hover:scale-105 transition-transform duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Yield Range</p>
                <p className="text-lg font-bold">
                  {prediction.yieldRange.min} - {prediction.yieldRange.max} t/ha
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white transform hover:scale-105 transition-transform duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Harvest Date</p>
                <p className="text-lg font-bold">{format(new Date(prediction.harvestDate), 'MMM d, yyyy')}</p>
              </div>
              <Calendar className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-0 z-10 bg-white border-b pb-2 pt-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-green-50 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="key-factors" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-1" />
              Key Factors
            </TabsTrigger>
            <TabsTrigger value="risks" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Risks
            </TabsTrigger>
            <TabsTrigger value="field-map" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <Map className="h-4 w-4 mr-1" />
              Field Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className={`grid ${isMediumScreen ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Yield Progression by Growth Stage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getYieldTrendData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 border rounded-md shadow-md">
                                  <p className="font-medium">{payload[0].payload.stage}</p>
                                  <p className="text-green-600 font-medium">{`${payload[0].value} t/ha`}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="yield" 
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#yieldGradient)" 
                          strokeWidth={2}
                          animationDuration={1500}
                          isAnimationActive={animateCharts}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                    Actionable Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                    {prediction.recommendations && prediction.recommendations.map((rec, i) => (
                      <div 
                        key={i} 
                        className="p-3 border rounded-lg bg-gradient-to-r from-white to-green-50 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start">
                          <div className={`p-2 rounded-full mr-3 ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-600' : 
                            rec.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {rec.priority === 'high' ? <AlertCircle className="h-5 w-5" /> : 
                             rec.priority === 'medium' ? <AlertTriangle className="h-5 w-5" /> : 
                             <Info className="h-5 w-5" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{rec.action}</h4>
                            <p className="text-sm text-gray-600 mt-1">{rec.expectedImpact}</p>
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{rec.timeframe}</span>
                            </div>
                          </div>
                        </div>
                        {onRecommendationClick && (
                          <div className="mt-3 pl-10">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs"
                              onClick={() => onRecommendationClick(rec)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Apply Recommendation
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="key-factors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                    Key Yield Factors
                  </CardTitle>
                  <CardDescription>
                    Factors that significantly influence your crop yield
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {prediction.keyFactors && prediction.keyFactors.map((factor, index) => (
                      <div key={index} className="flex items-start p-3 rounded-lg border bg-card">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{factor.factor}</h4>
                            <Badge className={getImpactColor(factor.impact)}>
                              {factor.impact} Impact
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{factor.description}</span>
                            <span className="font-semibold">{factor.currentValue} 
                              {factor.optimalRange && ` (Optimal: ${factor.optimalRange.min}-${factor.optimalRange.max})`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart4 className="h-5 w-5 mr-2 text-blue-600" />
                    Factor Impact Analysis
                  </CardTitle>
                  <CardDescription>
                    Relative importance of each factor on yield
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {prediction.keyFactors && prediction.keyFactors.map((factor, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{factor.factor}</span>
                          <span className="text-sm text-muted-foreground">{factor.impact}</span>
                        </div>
                        <Progress 
                          value={factor.weight * 100} 
                          className={`h-2 ${factor.impact === 'positive' ? 'bg-green-200' : factor.impact === 'neutral' ? 'bg-amber-200' : 'bg-red-200'}`}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            {/* Risk Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">High Risk Factors</p>
                      <p className="text-2xl font-bold text-red-600">
                        {prediction.risks?.filter(r => r.probability > 70).length || 0}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Medium Risk Factors</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {prediction.risks?.filter(r => r.probability > 40 && r.probability <= 70).length || 0}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Low Risk Factors</p>
                      <p className="text-2xl font-bold text-green-600">
                        {prediction.risks?.filter(r => r.probability <= 40).length || 0}
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Visualizations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Risk Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of risks by probability level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getRiskDistributionData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          animationDuration={1000}
                          isAnimationActive={animateCharts}
                        >
                          {getRiskDistributionData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Target className="h-5 w-5 mr-2 text-purple-600" />
                    Risk Impact vs Probability
                  </CardTitle>
                  <CardDescription>
                    Comparative analysis of risk factors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getRiskImpactData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="risk" angle={-45} textAnchor="end" height={80} fontSize={10} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="probability" fill="#f59e0b" name="Probability %" animationDuration={1000} isAnimationActive={animateCharts} />
                        <Bar dataKey="severity" fill="#ef4444" name="Severity Score" animationDuration={1200} isAnimationActive={animateCharts} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Risk Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
                  Detailed Risk Assessment
                </CardTitle>
                <CardDescription>
                  Click on a risk to view mitigation strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {prediction.risks && prediction.risks.map((risk, index) => (
                    <div 
                      key={index}
                      className={`p-4 border rounded-lg transition-all cursor-pointer ${
                        selectedRisk?.risk === risk.risk 
                          ? 'border-green-600 bg-green-50 shadow-md' 
                          : 'hover:border-gray-400 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedRisk(selectedRisk?.risk === risk.risk ? null : risk)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${
                          risk.probability > 70 ? 'bg-red-100 text-red-600' :
                          risk.probability > 40 ? 'bg-amber-100 text-amber-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {getRiskIcon(risk.risk)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-lg">{risk.risk}</h4>
                            <div className="flex gap-2">
                              <Badge className={getProbabilityColor(risk.probability)}>
                                {risk.probability}% Probability
                              </Badge>
                              <Badge className={getImpactColor(risk.severity)}>
                                {risk.severity} Severity
                              </Badge>
                            </div>
                          </div>
                          
                          {selectedRisk?.risk === risk.risk && (
                            <div className="mt-4 space-y-3 animate-fadeIn">
                              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                                <h5 className="font-medium text-blue-900 flex items-center gap-2 mb-2">
                                  <Shield className="h-4 w-4" />
                                  Mitigation Strategies
                                </h5>
                                <ul className="space-y-2">
                                  {risk.mitigation && risk.mitigation.map((strategy, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span className="text-sm text-gray-700">{strategy}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 bg-gray-50 rounded text-center">
                                  <p className="text-xs text-gray-600">Impact on Yield</p>
                                  <p className="font-bold text-red-600">
                                    -{Math.round(risk.probability * 0.2)}%
                                  </p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded text-center">
                                  <p className="text-xs text-gray-600">Affected Area</p>
                                  <p className="font-bold text-amber-600">
                                    {Math.round(risk.probability * 0.5)}%
                                  </p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded text-center">
                                  <p className="text-xs text-gray-600">Response Time</p>
                                  <p className="font-bold text-blue-600">
                                    {risk.probability > 70 ? 'Urgent' : risk.probability > 40 ? '1-2 days' : '1 week'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="field-map" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Map className="h-5 w-5 mr-2 text-green-600" />
                      Field Yield Map
                    </CardTitle>
                    <CardDescription>
                      Spatial distribution of yield potential across your field
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {heatmapData && heatmapData.zones ? (
                      <div className="space-y-4">
                        {/* Interactive Field Map */}
                        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-md h-[400px] relative overflow-hidden border-2 border-slate-300">
                          {/* Legend */}
                          <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg z-10 border">
                            <div className="text-xs font-semibold mb-2 text-gray-700">Yield Potential (t/ha)</div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
                                <span className="text-xs">Low (0-5)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded"></div>
                                <span className="text-xs">Medium (5-8)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
                                <span className="text-xs">High (8+)</span>
                              </div>
                            </div>
                          </div>

                          {/* Field Grid Visualization */}
                          <div className="absolute inset-0 p-8 flex items-center justify-center">
                            <div className="grid grid-cols-4 gap-2 w-full max-w-md">
                              {heatmapData.zones.map((zone, index) => {
                                const isSelected = selectedZone?.id === zone.id;
                                const yieldLevel = zone.predictedYield > 8 ? 'high' : zone.predictedYield > 5 ? 'medium' : 'low';
                                const bgColor = yieldLevel === 'high' 
                                  ? 'from-green-400 to-green-600' 
                                  : yieldLevel === 'medium' 
                                  ? 'from-amber-400 to-amber-600' 
                                  : 'from-red-400 to-red-600';
                                
                                return (
                                  <div
                                    key={zone.id}
                                    className={`
                                      relative aspect-square rounded-lg cursor-pointer transition-all duration-300
                                      bg-gradient-to-br ${bgColor}
                                      ${isSelected ? 'ring-4 ring-blue-500 scale-105 shadow-xl z-10' : 'hover:scale-105 hover:shadow-lg'}
                                    `}
                                    onClick={() => setSelectedZone(zone)}
                                  >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
                                      <span className="text-xs font-semibold">{zone.id}</span>
                                      <span className="text-lg font-bold">{zone.predictedYield.toFixed(1)}</span>
                                      <span className="text-[10px] opacity-90">t/ha</span>
                                    </div>
                                    
                                    {/* NDVI Indicator */}
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white opacity-75" 
                                         style={{ opacity: zone.ndviValue }}></div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Compass */}
                          <div className="absolute bottom-4 left-4 bg-white p-2 rounded-full shadow-md border">
                            <div className="relative w-12 h-12">
                              <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-gray-700">N</div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-0.5 bg-gray-300"></div>
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center rotate-90">
                                <div className="w-full h-0.5 bg-gray-300"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Map Statistics */}
                        <div className="grid grid-cols-4 gap-2">
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-700">Avg NDVI</p>
                            <p className="text-lg font-bold text-green-600">
                              {(heatmapData.zones.reduce((sum, z) => sum + z.ndviValue, 0) / heatmapData.zones.length).toFixed(2)}
                            </p>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700">Total Zones</p>
                            <p className="text-lg font-bold text-blue-600">{heatmapData.zones.length}</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-700">Avg Confidence</p>
                            <p className="text-lg font-bold text-purple-600">
                              {Math.round(heatmapData.zones.reduce((sum, z) => sum + z.confidence, 0) / heatmapData.zones.length)}%
                            </p>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-700">Field Size</p>
                            <p className="text-lg font-bold text-amber-600">{farmData.size || 2.5} ha</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8 bg-slate-50 rounded-lg">
                        <MapPin className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-slate-700 mb-2">No field map data available</h3>
                        <p className="text-slate-500 mb-4">
                          Unable to generate field map visualization with current data.
                        </p>
                        <Button onClick={generateYieldPrediction} variant="outline" className="gap-2">
                          <Eye className="h-4 w-4" />
                          Regenerate Map Data
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Layers className="h-5 w-5 mr-2 text-blue-600" />
                      Field Zones
                    </CardTitle>
                    <CardDescription>
                      Click on map or select zone
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {heatmapData && heatmapData.zones && heatmapData.zones.map((zone) => (
                        <div 
                          key={zone.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedZone?.id === zone.id 
                              ? 'border-green-600 bg-green-50 shadow-md scale-105' 
                              : 'hover:bg-muted/50 hover:border-gray-400'
                          }`}
                          onClick={() => setSelectedZone(zone)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Zone {zone.id}</h4>
                            <Badge className={getYieldPotentialColor(
                              zone.predictedYield > 8 ? 'high' : zone.predictedYield > 5 ? 'medium' : 'low'
                            )}>
                              {zone.predictedYield.toFixed(1)} t/ha
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">NDVI:</span>
                              <span className="font-medium">{zone.ndviValue.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Confidence:</span>
                              <span className="font-medium">{zone.confidence}%</span>
                            </div>
                            <Progress value={zone.confidence} className="h-1 mt-1" />
                          </div>

                          {selectedZone?.id === zone.id && (
                            <div className="mt-3 pt-3 border-t space-y-2 animate-fadeIn">
                              <div className="text-xs">
                                <p className="text-gray-600 mb-1">Zone Analysis:</p>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    zone.predictedYield > 8 ? 'bg-green-500' : 
                                    zone.predictedYield > 5 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}></div>
                                  <span className="font-medium">
                                    {zone.predictedYield > 8 ? 'Excellent' : 
                                     zone.predictedYield > 5 ? 'Good' : 'Needs Attention'}
                                  </span>
                                </div>
                                <p className="text-gray-600 text-[11px]">
                                  {zone.predictedYield > 8 
                                    ? 'This zone shows optimal growth conditions' 
                                    : zone.predictedYield > 5 
                                    ? 'This zone has moderate yield potential' 
                                    : 'Consider additional interventions for this zone'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Zone Comparison Chart */}
            {heatmapData && heatmapData.zones && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart4 className="h-5 w-5 mr-2 text-indigo-600" />
                    Zone Yield Comparison
                  </CardTitle>
                  <CardDescription>
                    Comparative analysis across all field zones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={heatmapData.zones} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="id" label={{ value: 'Zone', position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: 'Yield (t/ha)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-md shadow-lg">
                                  <p className="font-semibold mb-2">Zone {data.id}</p>
                                  <p className="text-sm text-green-600">Yield: {data.predictedYield.toFixed(2)} t/ha</p>
                                  <p className="text-sm text-blue-600">NDVI: {data.ndviValue.toFixed(3)}</p>
                                  <p className="text-sm text-purple-600">Confidence: {data.confidence}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="predictedYield" 
                          fill="#10b981" 
                          radius={[8, 8, 0, 0]}
                          animationDuration={1000}
                          isAnimationActive={animateCharts}
                        >
                          {heatmapData.zones.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.predictedYield > 8 ? '#10b981' : entry.predictedYield > 5 ? '#f59e0b' : '#ef4444'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default YieldPredictionComponent;