import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import WelcomeBanner from '@/components/layout/WelcomeBanner';
import SoilStatusCard from '@/components/dashboard/SoilStatusCard';
import { useTranslation } from 'react-i18next';
import CropRecommendationCard from '@/components/dashboard/CropRecommendationCard';
import DiseaseDetectionCard from '@/components/dashboard/DiseaseDetectionCard';
import MarketPriceCard from '@/components/dashboard/MarketPriceCard';
import WeatherForecastCard from '@/components/dashboard/WeatherForecastCard';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { 
  LogIn, 
  Droplets, 
  LineChart, 
  Leaf, 
  Eye, 
  BarChart4, 
  CloudSun, 
  Sprout, 
  Sun, 
  Pill, 
  Fish, 
  Tractor,
  Wind,
  PieChart,
  LayoutGrid,
  LayoutList,
  Scan,
  Loader2,
  Camera,
  Upload,
  ChevronRight,
  Globe,
  AlertCircle,
  MapPin,
  ArrowRight,
  CalendarClock,
  Newspaper,
  Flame,
  RefreshCw,
  Activity,
  PanelTop,
  TrendingUp,
  Satellite
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLocation } from '../hooks/useLocation';
import { getCurrentWeather } from '../services/weatherService';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

// Update the globalAgriNews interface/type to include summary property
interface AgriNewsItem {
  title: string;
  category: string;
  date: string;
  summary: string;
}

const Index = () => {
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState('Guest');
  const [userLocation, setUserLocation] = useState('Tirupati, Andhra Pradesh');
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dashboardSection, setDashboardSection] = useState('main');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Farm data states
  const [farmData, setFarmData] = useState({
    soilHealth: { status: 'Good', lastUpdated: 'Yesterday' },
    cropHealth: { status: 'Good', lastScanned: '2 days ago' },
    irrigationStatus: { nextScheduled: 'Tomorrow', moistureLevel: 65 }
  });
  
  // Global news/trends (placeholder for real API data)
  const [globalAgriNews, setGlobalAgriNews] = useState<AgriNewsItem[]>([
    {
      title: "Global Wheat Production Expected to Rise by 5%",
      category: "Market",
      date: "2 days ago",
      summary: "Analysts predict increased wheat yields globally due to favorable weather conditions."
    },
    {
      title: "New Sustainable Farming Techniques Show Promise",
      category: "Innovation",
      date: "5 days ago",
      summary: "Researchers demonstrate improved crop yields with reduced environmental impact using new methods."
    },
    {
      title: "Climate Change Impact on Agricultural Zones",
      category: "Research",
      date: "1 week ago",
      summary: "Study maps shifting agricultural zones due to climate change, with implications for future crop selection."
    }
  ]);
  
  // Location and weather data
  const { location, loading: locationLoading, usingFallback } = useLocation();
  const [weatherData, setWeatherData] = useState({
    temperature: 32,
    condition: 'Sunny',
    forecast: []
  });
  
  // Reference to hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Animation variants for sections
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: 'easeOut'
      }
    })
  };
  
  // Fetch location-based data
  useEffect(() => {
    const fetchLocationData = async () => {
      if (location) {
        try {
          console.log(`Index fetching weather for: ${location.latitude}, ${location.longitude}`);
          
          const data = await getCurrentWeather(location.latitude, location.longitude);
          console.log('Weather data received in Index:', data);
          
          if (data && data.name) {
            // Format location with city and country
            const locationDisplay = `${data.name}${data.sys.country ? ', ' + data.sys.country : ''}`;
            setUserLocation(locationDisplay);
            
            // Update weather data
            setWeatherData({
              temperature: Math.round(data.main.temp),
              condition: data.weather[0].main,
              forecast: [
                { day: 'Today', temp: `${Math.round(data.main.temp)}°/${Math.round(data.main.temp_min)}°`, condition: data.weather[0].main },
                { day: 'Tomorrow', temp: `${Math.round(data.main.temp)-2}°/${Math.round(data.main.temp_min)-1}°`, condition: 'Partly Cloudy' },
                { day: 'Wed', temp: `${Math.round(data.main.temp)-4}°/${Math.round(data.main.temp_min)-2}°`, condition: 'Light Rain' },
                { day: 'Thu', temp: `${Math.round(data.main.temp)-1}°/${Math.round(data.main.temp_min)-3}°`, condition: 'Windy' },
              ]
            });
          }
        } catch (error) {
          console.error('Error fetching weather data in Index:', error);
        }
      }
    };
    
    fetchLocationData();
  }, [location]);
  
  const fetchUserProfile = async () => {
    setIsLoading(true);
    if (currentUser) {
      setIsAuthenticated(true);
      try {
        // Immediately update with basic info from Firebase Auth
        if (currentUser.displayName) {
          setUserName(currentUser.displayName);
        } else if (currentUser.email) {
          const emailName = currentUser.email.split('@')[0] || 'User';
          setUserName(emailName);
        }
        
        // Then fetch complete profile from Firestore
        const userProfile = await getUserProfile(currentUser.uid);
        
        // Set user name
        if (userProfile?.displayName) {
          setUserName(userProfile.displayName);
        }
        
        // Don't override location if already set by the weather API
        if (userProfile?.location && !userLocation.includes(",")) {
          setUserLocation(userProfile.location);
        }
        
        console.log('Index: User profile loaded', { 
          name: userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0],
          userId: currentUser.uid 
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Default for non-authenticated users
      setUserName('Guest');
      if (!userLocation.includes(",")) {
        setUserLocation('Tirupati, Andhra Pradesh');
      }
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUserProfile();
    // Force a check of authentication status when component mounts
    console.log("Auth status on Index page:", { currentUser, isAuthenticated: !!currentUser });
  }, [currentUser, lastUpdate]);
  
  // Add effect to listen for language changes
  useEffect(() => {
    const handleLanguageChanged = () => {
      console.log('Language changed in Index to:', i18n.language);
      setCurrentLang(i18n.language);
    };
    
    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);
  
  // Function to refresh data
  const refreshUserData = () => {
    setLastUpdate(Date.now());
  };
  
  // Function to handle file upload for disease detection
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert file to base64 and store in sessionStorage
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const imageData = reader.result as string;
          
          // Store the image data and analysis type in sessionStorage
          // Use try/catch to handle potential sessionStorage errors
          try {
            sessionStorage.setItem('uploadedImage', imageData);
            sessionStorage.setItem('analysisType', 'disease'); // Default to disease analysis
            
            // Get the base URL regardless of current path to prevent broken navigation
            const baseUrl = window.location.origin;
            const targetPath = `${baseUrl}/disease-scan`;
            
            // Use window.location.href for reliable navigation on mobile
            window.location.href = targetPath;
          } catch (storageError) {
            console.error('SessionStorage error:', storageError);
            // Fallback - navigate directly without storage
            window.location.href = window.location.origin + '/disease-scan';
          }
        } catch (error) {
          console.error('Error processing image:', error);
          toast({
            title: "Error",
            description: "Failed to process the image. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      reader.onerror = () => {
        console.error('FileReader error');
        window.location.href = window.location.origin + '/disease-scan';
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  // Farm activity status widget
  const renderFarmStatus = () => {
    // Show farm status if user is authenticated
    if (!currentUser && !isAuthenticated) return null;
    
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">{t('dashboard.farmActivityStatus')}</h3>
          <Badge variant="outline" className="text-agri-green border-agri-green/30 bg-agri-green/10">
            {t('common.active')}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center justify-center p-5"
          >
            <div className="bg-agri-blue/10 rounded-full p-2 mb-3">
              <Droplets className="h-5 w-5 text-agri-blue" />
            </div>
            <span className="text-sm text-gray-500 mb-1">{t('dashboard.irrigation')}</span>
            <span className="font-medium">{t('common.last')}: {t('common.today')}</span>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center justify-center p-5"
          >
            <div className="bg-agri-freshGreen/10 rounded-full p-2 mb-3">
              <Leaf className="h-5 w-5 text-agri-freshGreen" />
            </div>
            <span className="text-sm text-gray-500 mb-1">{t('dashboard.cropsHealth')}</span>
            <span className="font-medium">{t('common.good')}</span>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center justify-center p-5"
          >
            <div className="bg-agri-soil/10 rounded-full p-2 mb-3">
              <Tractor className="h-5 w-5 text-agri-soil" />
            </div>
            <span className="text-sm text-gray-500 mb-1">{t('dashboard.lastPlowed')}</span>
            <span className="font-medium">{t('common.daysAgo', { count: 3 })}</span>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            className="flex flex-col items-center justify-center p-5"
          >
            <div className="bg-agri-tomato/10 rounded-full p-2 mb-3">
              <Pill className="h-5 w-5 text-agri-tomato" />
            </div>
            <span className="text-sm text-gray-500 mb-1">{t('dashboard.lastTreatment')}</span>
            <span className="font-medium">{t('common.weekAgo', { count: 1 })}</span>
          </motion.div>
        </div>
      </motion.div>
    );
  };
  
  // Dashboard controls for tabs and view mode
  const renderDashboardControls = () => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <Tabs 
          defaultValue="overview" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-white border border-gray-200 p-1 w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="overview" className="data-[state=active]:bg-agri-green data-[state=active]:text-white">
              {t('common.overview')}
            </TabsTrigger>
            <TabsTrigger value="soil" className="data-[state=active]:bg-agri-soil data-[state=active]:text-white">
              {t('dashboard.soil')}
            </TabsTrigger>
            <TabsTrigger value="crops" className="data-[state=active]:bg-agri-freshGreen data-[state=active]:text-white">
              {t('dashboard.crops')}
            </TabsTrigger>
            <TabsTrigger value="market" className="data-[state=active]:bg-agri-amber data-[state=active]:text-white">
              {t('dashboard.market')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center space-x-2">
          <RadioGroup 
            defaultValue="grid" 
            value={viewMode}
            onValueChange={(value) => setViewMode(value as 'grid' | 'list')}
            className="flex items-center space-x-1"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="grid" id="grid" className="sr-only" />
              <Label 
                htmlFor="grid" 
                className={cn(
                  "cursor-pointer p-2 rounded-md",
                  viewMode === 'grid' ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <LayoutGrid className="h-5 w-5 text-gray-700" />
              </Label>
            </div>
            
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="list" id="list" className="sr-only" />
              <Label 
                htmlFor="list" 
                className={cn(
                  "cursor-pointer p-2 rounded-md",
                  viewMode === 'list' ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <LayoutList className="h-5 w-5 text-gray-700" />
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    );
  };
  
  // Render dashboard cards
  const renderDashboardCards = () => {
    // Define cards data
    const cards = [
      {
        id: 'agrovision',
        title: t('agroVision.title', 'AgroVision: Satellite Crop Health'),
        icon: <Satellite className="h-5 w-5 text-agri-teal" />,
        gradient: "from-agri-teal/20 to-agri-green/20",
        featured: true, // Highlight this as a featured card
        content: (
          <div>
            <div className="mb-4 bg-gradient-to-r from-agri-teal/10 to-agri-green/10 rounded-lg p-3">
              <h3 className="font-medium text-agri-teal flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                {t('agroVision.realTimeSatellite', 'Real-Time Satellite Monitoring')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{t('agroVision.monitorDescription', 'Monitor your fields with satellite imagery and NDVI analysis')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-50 p-2 rounded-lg">
                <div className="text-xs text-gray-500">{t('agroVision.fieldsMonitored', 'Fields Monitored')}</div>
                <div className="font-medium text-lg">2</div>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg">
                <div className="text-xs text-gray-500">{t('agroVision.lastUpdated', 'Last Updated')}</div>
                <div className="font-medium text-sm">{t('common.today')}</div>
              </div>
            </div>
            
            <div className="relative h-24 bg-gray-100 rounded-lg overflow-hidden mb-3">
              <img 
                src="/images/ndvi-sample.jpg" 
                alt="NDVI Map" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/400x150?text=NDVI+Map';
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <div className="text-white text-xs font-medium">{t('agroVision.healthStatus', 'Health Status')}: {t('common.excellent')}</div>
              </div>
            </div>
            
            <Button 
              className="w-full bg-agri-teal hover:bg-agri-teal/90"
              onClick={() => navigate('/agrovision')}
            >
              <MapPin className="mr-2 h-4 w-4" />
              {t('agroVision.openSatelliteView', 'Open Satellite View')}
            </Button>
          </div>
        ),
      },
      {
        id: 'soil',
        title: t('soilLab.title'),
        icon: <Droplets className="h-5 w-5 text-agri-blue" />,
        gradient: "from-agri-soil/20 to-agri-clay/20",
        content: (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-gray-500">{t('soilLab.lastAnalyzed')}</span>
                <p className="font-medium">{t('common.yesterday')}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">{t('soilLab.overallHealth')}</span>
                <p className="font-medium text-agri-green">{t('common.good')}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { name: t('soilLab.nitrogen'), value: 75, color: 'bg-agri-blue' },
                { name: t('soilLab.phosphorus'), value: 62, color: 'bg-agri-freshGreen' },
                { name: t('soilLab.potassium'), value: 88, color: 'bg-agri-tomato' },
                { name: t('soilLab.ph'), value: 6.8, color: 'bg-agri-amber', unit: 'pH' }
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">
                      {typeof item.value === 'number' && item.value > 10 ? `${item.value}%` : item.value}
                      {item.unit ? ` ${item.unit}` : ''}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full`} 
                      style={{ width: typeof item.value === 'number' && item.value > 10 ? `${item.value}%` : '70%' }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="link" 
              size="sm" 
              className="mt-4 text-agri-soil p-0"
              onClick={() => navigate('/soil-lab')}
            >
              {t('common.viewFullReport')}
            </Button>
          </div>
        )
      },
      {
        id: 'crops',
        title: t('cropAdvisor.title'),
        icon: <Sprout className="h-5 w-5 text-agri-freshGreen" />,
        gradient: "from-agri-freshGreen/20 to-agri-lime/20",
        content: (
          <div>
            <div className="text-xs text-gray-500 mb-3">{t('cropAdvisor.recommendation')}</div>
            
            {[
              { name: 'Rice', confidence: 92, yield: '5.8 tons/ha' },
              { name: 'Cotton', confidence: 87, yield: '2.3 tons/ha' },
              { name: 'Sugarcane', confidence: 78, yield: '80 tons/ha' }
            ].map((crop, i) => (
              <div key={i} className="flex items-center p-2 rounded-lg mb-2 hover:bg-gray-50">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mr-3",
                  i === 0 ? "bg-agri-lime/20 text-agri-darkGreen" : 
                  i === 1 ? "bg-agri-blue/10 text-agri-blue" : 
                  "bg-agri-amber/10 text-agri-amber"
                )}>
                  {i === 0 && <Leaf className="h-5 w-5" />}
                  {i === 1 && <Sun className="h-5 w-5" />}
                  {i === 2 && <Droplets className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{crop.name}</span>
                    <span className="text-sm text-agri-green">{crop.confidence}%</span>
                  </div>
                  <div className="text-xs text-gray-500">{t('cropAdvisor.estYield')}: {crop.yield}</div>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2 text-agri-freshGreen border-agri-freshGreen/30 hover:bg-agri-freshGreen/10"
              onClick={() => navigate('/crop-advisor')}
            >
              {t('cropAdvisor.getAnalysis')}
            </Button>
          </div>
        )
      },
      {
        id: 'disease',
        title: t('diseaseScan.title'),
        icon: <Eye className="h-5 w-5 text-agri-tomato" />,
        gradient: "from-agri-tomato/20 to-agri-orange/20",
        content: (
          <div className="text-center py-4">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-agri-tomato/10 text-agri-tomato mb-2">
                <Scan className="h-8 w-8" />
              </div>
              <h3 className="font-medium">{t('diseaseScan.scanCrops')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('diseaseScan.uploadPhotos')}</p>
            </div>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <div className="flex flex-wrap justify-center gap-2">
              <Button 
                className="bg-agri-tomato hover:bg-agri-tomato/90"
                onClick={handleUploadClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('diseaseScan.uploadImages')}
              </Button>

              <label htmlFor="disease-camera-capture" className="relative inline-block">
                <Button className="bg-agri-blue hover:bg-agri-blue/90">
                  <Camera className="mr-2 h-4 w-4" />
                  {t('diseaseScan.takePhoto')}
                </Button>
                <input
                  id="disease-camera-capture"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        )
      },
      {
        id: 'market',
        title: t('market.title'),
        icon: <BarChart4 className="h-5 w-5 text-agri-amber" />,
        gradient: "from-agri-amber/20 to-agri-gold/20",
        content: (
          <div>
            <div className="flex justify-between items-center mb-3 text-sm">
              <span className="text-gray-500">{t('market.commodity')}</span>
              <span className="text-gray-500">{t('market.currentPrice')}</span>
            </div>
            
            {[
              { name: 'Rice', price: '₹2,350/q', change: '+2.4%' },
              { name: 'Cotton', price: '₹6,700/q', change: '+1.2%' },
              { name: 'Wheat', price: '₹2,050/q', change: '-0.8%' },
              { name: 'Sugarcane', price: '₹350/q', change: '+0.5%' }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="font-medium">{item.name}</span>
                <div className="text-right">
                  <span className="font-medium">{item.price}</span>
                  <span className={cn(
                    "text-xs ml-2 px-1.5 py-0.5 rounded",
                    item.change.startsWith('+') ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                  )}>
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
            
            <div className="text-xs text-gray-500 mt-3 text-right">
              {t('market.lastUpdated')}: {t('common.todayAt', { time: '8:30 AM' })}
            </div>
          </div>
        )
      },
      {
        id: 'weather',
        title: t('dashboard.weatherForecast'),
        icon: <CloudSun className="h-5 w-5 text-agri-lightBlue" />,
        gradient: "from-agri-lightBlue/20 to-agri-blue/20",
        content: (
          <div>
            <div className="flex flex-wrap -mx-2">
              {[
                { day: t('common.today'), icon: <Sun className="h-5 w-5 text-agri-yellow" />, temp: '32°/27°', desc: t('weather.sunny') },
                { day: t('common.tomorrow'), icon: <CloudSun className="h-5 w-5 text-agri-blue" />, temp: '30°/26°', desc: t('weather.partlyCloudy') },
                { day: t('common.wednesday'), icon: <Droplets className="h-5 w-5 text-agri-lightBlue" />, temp: '28°/25°', desc: t('weather.lightRain') },
                { day: t('common.thursday'), icon: <Wind className="h-5 w-5 text-agri-slate" />, temp: '29°/24°', desc: t('weather.windy') },
              ].map((day, i) => (
                <div key={i} className="w-1/2 sm:w-1/4 px-2 mb-4">
                  <div className="text-center p-2 rounded-lg hover:bg-gray-50">
                    <div className="text-sm font-medium">{day.day}</div>
                    <div className="flex justify-center my-2">{day.icon}</div>
                    <div className="text-sm font-medium">{day.temp}</div>
                    <div className="text-xs text-gray-500">{day.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-2 pt-3 border-t border-gray-100 flex flex-wrap justify-between text-xs text-gray-500 gap-2">
              <span>{t('weather.precipitation')}: 20%</span>
              <span>{t('weather.humidity')}: 68%</span>
              <span>{t('weather.wind')}: 12 km/h</span>
            </div>
          </div>
        )
      },
      {
        id: 'irrigation',
        title: t('dashboard.irrigation'),
        icon: <Droplets className="h-5 w-5 text-agri-teal" />,
        gradient: "from-agri-teal/20 to-agri-lightBlue/20",
        content: (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-gray-500">{t('cropAdvisor.waterRequirement')}</span>
                <p className="font-medium">{t('common.medium')}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">{t('dashboard.nextIrrigation')}</span>
                <p className="font-medium text-agri-blue">{t('common.tomorrow')}</p>
              </div>
            </div>
            
            <div className="relative pt-2">
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="text-gray-500">{t('soilLab.moisture')}</span>
                <span className="font-medium">65%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div className="h-full bg-agri-blue rounded-full" style={{ width: '65%' }} />
              </div>
              <div className="absolute -top-1 left-[65%] w-4 h-4 rounded-full border-2 border-white bg-agri-blue transform -translate-x-1/2" />
            </div>
            
            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs">
              {[t('common.mon'), t('common.tue'), t('common.wed'), t('common.thu'), t('common.fri'), t('common.sat'), t('common.sun')].map((day, i) => (
                <div key={i} className="space-y-1">
                  <div>{day}</div>
                  <div className={cn(
                    "w-full py-1 rounded-md", 
                    i === 1 || i === 4 ? "bg-agri-blue text-white" : "bg-gray-100"
                  )}>
                    {i === 1 || i === 4 ? <Droplets className="h-3 w-3 mx-auto" /> : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      },
      {
        id: 'global-news',
        title: t('dashboard.globalTrends'),
        icon: <Globe className="h-5 w-5 text-agri-slate" />,
        gradient: "from-agri-slate/20 to-agri-darkGreen/20",
        content: (
          <div>
            <div className="space-y-3">
              {globalAgriNews.map((news, i) => (
                <div key={i} className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center 
                    ${news.category === 'Market' ? 'bg-agri-amber/10 text-agri-amber' : 
                      news.category === 'Innovation' ? 'bg-agri-blue/10 text-agri-blue' : 
                      'bg-agri-tomato/10 text-agri-tomato'}`}
                  >
                    {news.category === 'Market' ? <BarChart4 className="h-5 w-5" /> : 
                     news.category === 'Innovation' ? <Leaf className="h-5 w-5" /> : 
                     <Flame className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium line-clamp-2">{news.title}</div>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="mr-2 text-xs px-1.5 py-0 h-4">
                        {news.category}
                      </Badge>
                      <span className="text-xs text-gray-500">{news.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => navigate('/news')}
            >
              <Newspaper className="h-4 w-4 mr-2" />
              {t('dashboard.viewAllNews')}
            </Button>
          </div>
        )
      },
    ];

    // Filter cards based on active tab
    let filteredCards = [...cards];
    
    if (activeTab === 'soil') {
      filteredCards = cards.filter(card => ['soil', 'irrigation'].includes(card.id));
    } else if (activeTab === 'crops') {
      filteredCards = cards.filter(card => ['crops', 'disease'].includes(card.id));
    } else if (activeTab === 'market') {
      filteredCards = cards.filter(card => ['market', 'global-news'].includes(card.id));
    }

    // Function to render a card
    const renderCard = (card: any, index: number) => {
      return (
        <motion.div
          key={card.id}
          custom={index}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <div className={`p-4 border-b bg-gradient-to-r ${card.gradient}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">{card.title}</h3>
              <div className="rounded-full bg-white/90 backdrop-blur-sm p-1.5">
                {card.icon}
              </div>
            </div>
          </div>
          <div className="p-4">
            {card.content}
          </div>
        </motion.div>
      );
    };

    return (
      <div className={cn(
        "gap-6 mb-8",
        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-6"
      )}>
        {filteredCards.map((card, index) => renderCard(card, index))}
      </div>
    );
  };
  
  // Loading skeleton for the dashboard
  const renderLoadingSkeleton = () => {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
          <Skeleton className="h-48 w-full" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <Skeleton className="h-12 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Enhance the seasons data with icons
  const seasonalData = {
    currentSeason: "Kharif",
    idealCrops: ["Rice", "Cotton", "Sugarcane", "Maize"],
    weatherConditions: [
      { label: "Rainfall", value: "65%", icon: <Droplets className="h-4 w-4 text-blue-500" /> },
      { label: "Sunlight", value: "High", icon: <Sun className="h-4 w-4 text-yellow-500" /> },
      { label: "Wind", value: "Moderate", icon: <Wind className="h-4 w-4 text-gray-500" /> },
    ]
  };

  // Add an agriculture calendar
  const upcomingEvents = [
    { date: "June 15", event: "Sowing Season Begins", location: "Central Region" },
    { date: "July 10", event: "Fertilizer Application", location: "All Regions" },
    { date: "August 5", event: "Pest Management Workshop", location: "Western Districts" }
  ];
  
  return (
    <MainLayout>
      <div className="px-4 md:px-6 relative">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        
        {/* Welcome Banner */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mb-6"
        >
          <WelcomeBanner 
            userName={userName}
            temperature={weatherData.temperature}
            weatherCondition={weatherData.condition}
            location={userLocation}
          />
        </motion.div>

        {/* AgriBuddy Feature Announcement */}
        

        {/* Farm Monitoring Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 bg-gradient-to-r from-agri-darkGreen/90 to-agri-green/90 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('homepage.farmManagementAnalysis')}</h2>
                <p className="text-white/80 max-w-2xl">{t('homepage.farmManagementDescription')}</p>
              </div>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="mt-4 md:mt-0 bg-white text-agri-darkGreen hover:bg-white/90 transition-all duration-300"
              >
                <PanelTop className="h-4 w-4 mr-2" />
                {t('homepage.viewDashboard')}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* AgriBuddy - Featured NEW Card */}
              

              <motion.div 
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/20 backdrop-blur-sm rounded-lg p-4 cursor-pointer hover:bg-white/30 transition-all duration-300 border-2 border-white/40 relative overflow-hidden"
                onClick={() => navigate('/farm')}
              >
                {/* Pulsing highlight effect */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/30 rounded-full animate-pulse" />
                
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-white/30 rounded-full mr-3 shadow-inner">
                    <Tractor className="h-6 w-6 text-white animate-bounce" />
                  </div>
                  <h3 className="font-bold text-lg">{t('homepage.farmManagement')}</h3>
                </div>
                <p className="text-sm text-white/90 mb-4 font-medium">{t('homepage.farmManagementCardDescription')}</p>
                <div className="flex items-center bg-white/30 rounded-full px-3 py-2 w-fit text-white font-semibold text-sm mt-2 hover:bg-white/40 transition-all shadow-sm">
                  <span>{t('homepage.viewMyFarms')}</span>
                  <ArrowRight className="h-4 w-4 ml-2 animate-pulse" />
                </div>
                <div className="absolute bottom-2 right-2 text-xs text-white/50 font-medium">
                  {t('homepage.newFeatures')}
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-all duration-300"
                onClick={() => navigate('/disease-scan')}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-white/20 rounded-full mr-3">
                    <Scan className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold">{t('diseaseScan.title')}</h3>
                </div>
                <p className="text-sm text-white/70 mb-3">{t('diseaseScan.scanCropsDescription')}</p>
                <div className="flex items-center text-white/90 text-sm">
                  <span>{t('diseaseScan.analyzeNow')}</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-all duration-300"
                onClick={() => {
                  // Store the analysis type in sessionStorage
                  try {
                    sessionStorage.setItem('analysisType', 'pesticide');
                    navigate('/disease-scan');
                  } catch (error) {
                    console.error('Error setting analysis type:', error);
                    navigate('/disease-scan');
                  }
                }}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-white/20 rounded-full mr-3">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold">{t('pestAnalysis.title')}</h3>
                </div>
                <p className="text-sm text-white/70 mb-3">{t('pestAnalysis.detectPestsDescription')}</p>
                <div className="flex items-center text-white/90 text-sm">
                  <span>{t('pestAnalysis.detectPests')}</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-all duration-300"
                onClick={() => navigate('/soil-lab')}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-white/20 rounded-full mr-3">
                    <Droplets className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold">{t('soilLab.title')}</h3>
                </div>
                <p className="text-sm text-white/70 mb-3">{t('soilLab.checkSoilHealthDescription')}</p>
                <div className="flex items-center text-white/90 text-sm">
                  <span>{t('soilLab.testSoil')}</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </motion.div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={() => navigate('/farm')}
                className="flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-agri-darkGreen px-8 py-6 rounded-full cursor-pointer transition-all duration-300 font-bold shadow-lg text-lg hover:shadow-xl hover:scale-105 transform"
              >
                <Tractor className="h-5 w-5" />
                <span>{t('homepage.viewAndManageFarms')}</span>
                <span className="ml-2 bg-agri-green text-white text-xs px-2 py-1 rounded-full animate-pulse">{t('homepage.new')}</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-[180px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-6 p-6">
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
