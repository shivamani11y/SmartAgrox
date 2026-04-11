import React, { useState, useEffect, useMemo, useRef } from 'react';

import { 
  Home, 
  LayoutDashboard, 
  FlaskConical, 
  Leaf, 
  Scan, 
  BarChart2, 
  CloudSun, 
  Bot, 
  ChevronLeft, 
  ChevronRight,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Settings,
  ChevronDown,
  Sprout,
  CloudRain,
  Star,
  Satellite,
  Menu,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bell,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './sidebar.css';
import Logo from '../common/Logo';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { CSSTransition } from 'react-transition-group';

type SidebarCategory = 'main' | 'tools' | 'info';

type SidebarItem = {
  name: string;
  icon: React.ElementType;
  href: string;
  color: string;
  translationKey?: string;
  category: SidebarCategory;
  featured?: boolean;
  badge?: string;
  description?: string;
};

const sidebarItems: SidebarItem[] = [
  { 
    name: 'Home', 
    icon: Home, 
    href: '/',
    color: 'bg-agri-blue/10 text-agri-blue',
    translationKey: 'common.home',
    category: 'main'
  },
  { 
    name: 'Dashboard', 
    icon: LayoutDashboard, 
    href: '/dashboard',
    color: 'bg-agri-green/10 text-agri-green',
    translationKey: 'common.dashboard',
    category: 'main'
  },
  // { 
  //   name: 'YieldXPredictor', 
  //   icon: TrendingUp, 
  //   href: '/yield-prediction',
  //   color: 'bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-purple-700 border-2 border-purple-300/50',
  //   translationKey: 'common.yieldPrediction',
  //   category: 'main',
  //   featured: true,
  //   badge: '🔮 AI',
  //   description: '📊 ML-Powered Yield Forecasting with Multimodal Data',
  // },
  // { 
  //   name: 'AgriBuddy', 
  //   icon: Sprout, 
  //   href: '/agribuddy',
  //   color: 'bg-gradient-to-r from-green-500/30 to-blue-500/30 text-green-700 border-2 border-green-300/50',
  //   translationKey: 'common.agriBuddy',
  //   category: 'main',
  //   featured: true,
  //   badge: '🚀 NEW',
  //   description: '🤖 AI Crop Journey Assistant - Your Smart Farming Companion',
  // },
  // { 
  //   name: 'Farm', 
  //   icon: MapPin, 
  //   href: '/farm',
  //   color: 'bg-agri-green/10 text-agri-green',
  //   translationKey: 'common.farm',
  //   category: 'main'
  // },
  { 
    name: 'AgroLab', 
    icon: FlaskConical, 
    href: '/disease-scan',
    color: 'bg-agri-tomato/10 text-agri-tomato',
    translationKey: 'common.agroLab',
    category: 'tools'
  },
  { 
    name: 'Soil Lab', 
    icon: FlaskConical, 
    href: '/soil-lab',
    color: 'bg-agri-soil/10 text-agri-soil',
    translationKey: 'common.soilLab',
    category: 'tools'
  },
  { 
    name: 'AgroVision', 
    icon: Satellite, 
    href: '/agrovision',
    color: 'bg-gradient-to-r from-agri-teal/20 to-green-500/20 text-agri-teal',
    translationKey: 'common.agroVision',
    category: 'tools',
    featured: true,
    badge: 'New',
    description: 'Satellite Crop Health',
  },
  { 
    name: 'Crop Advisor', 
    icon: Leaf, 
    href: '/crop-advisor',
    color: 'bg-agri-freshGreen/10 text-agri-freshGreen',
    translationKey: 'common.cropAdvisor',
    category: 'tools'
  },
  // { 
  //   name: 'Market', 
  //   icon: BarChart2, 
  //   href: '/market',
  //   color: 'bg-agri-amber/10 text-agri-amber',
  //   translationKey: 'common.market',
  //   category: 'tools'
  // },
  // { 
  //   name: 'Weather', 
  //   icon: CloudSun, 
  //   href: '/weather',
  //   color: 'bg-agri-lightBlue/10 text-agri-lightBlue',
  //   translationKey: 'common.weather',
  //   category: 'tools'
  // },
  { 
    name: 'AgriBot', 
    icon: Bot, 
    href: '/agribot',
    color: 'bg-agri-teal/10 text-agri-teal',
    translationKey: 'common.agriBot',
    category: 'info'
  },
  // { 
  //   name: 'Founders', 
  //   icon: Users, 
  //   href: '/founders',
  //   color: 'bg-gradient-to-r from-amber-400/30 to-amber-500/40 text-amber-100',
  //   translationKey: 'common.founders',
  //   category: 'info'
  // },
];

const Sidebar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false); // Always expanded for better UX
  const [activeItem, setActiveItem] = useState<string | null>(() => {
    return sessionStorage.getItem("activeItem") || "Home";
  });
  const location = useLocation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  
  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<{[key in SidebarCategory]: boolean}>({
    main: true,
    tools: true,
    info: true
  });
  
  // Toggle category expansion
  const toggleCategory = (category: SidebarCategory) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  // Update when language changes
  useEffect(() => {
    const handleLanguageChanged = () => {
      console.log('Language changed in Sidebar to:', i18n.language);
      setCurrentLang(i18n.language);
    };
    
    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  // Create translated sidebar items with proper display names
  // Use currentLang as a dependency to ensure this runs when language changes
  const translatedSidebarItems = useMemo(() => {
    console.log('Rebuilding sidebar items with language:', currentLang);
    return sidebarItems.map(item => ({
      ...item,
      displayName: item.translationKey ? t(item.translationKey) : item.name
    }));
  }, [t, currentLang]);

  // Group items by category
  const categorizedItems = useMemo(() => {
    const grouped: Record<SidebarCategory, typeof translatedSidebarItems> = {
      main: [],
      tools: [],
      info: []
    };
    
    translatedSidebarItems.forEach(item => {
      // Skip Founders as we'll show it separately
      if (item.name !== 'Founders') {
        grouped[item.category].push(item);
      }
    });
    
    return grouped;
  }, [translatedSidebarItems]);

  // Get Founders item for the featured section
  const foundersItem = useMemo(() => {
    return translatedSidebarItems.find(item => item.name === 'Founders');
  }, [translatedSidebarItems]);

  // Set active item based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = translatedSidebarItems.find(item => 
      currentPath === item.href || 
      (item.href !== '/' && currentPath.startsWith(item.href))
    );
    
    if (currentItem) {
      setActiveItem(currentItem.name);
    } else if (currentPath === '/' || currentPath === '') {
      setActiveItem('Home');
    }
  }, [location.pathname, translatedSidebarItems]);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    // Handle mobile sidebar behavior
    if (isMobile) {
      // On mobile, we use showMobileSidebar instead of collapsed
      // Listen for route changes to close mobile sidebar
      const handleRouteChange = () => {
        setShowMobileSidebar(false);
      };
      window.addEventListener('popstate', handleRouteChange);
      return () => {
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
    // Don't override desktop collapsed state here - let it use the initial state
  }, [isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setShowMobileSidebar(!showMobileSidebar);
    } else {
      const newCollapsedState = !collapsed;
      setCollapsed(newCollapsedState);
    }
  };

  const handleNavigation = (href: string, name: string) => {
    setActiveItem(name);
    navigate(href);
  };

  // Category labels mapping
  const categoryLabels: Record<SidebarCategory, { name: string, icon: React.ElementType }> = {
    main: { name: t('sidebar.categories.main', 'Main'), icon: Sprout },
    tools: { name: t('sidebar.categories.tools', 'Tools'), icon: Settings },
    info: { name: t('sidebar.categories.info', 'Information'), icon: CloudRain }
  };

  // Sidebar item animation variants
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({ 
      opacity: 1, 
      x: 0,
      transition: { 
        delay: i * 0.05,
        duration: 0.3
      }
    })
  };

  // Add useEffect to fix mobile scrolling issues
  useEffect(() => {
    // On mobile, handle scroll position and prevent body scroll when sidebar is open
    if (isMobile) {
      if (showMobileSidebar) {
        // Prevent body scrolling when sidebar is open
        document.body.style.overflow = 'hidden';
      } else {
        // Restore body scrolling when sidebar is closed
        document.body.style.overflow = '';
      }
      
      // Cleanup function
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile, showMobileSidebar]);

  return (
    <>
      {/* Mobile menu toggle button - visible only on mobile */}
      {isMobile && (
        <button 
          className="fixed top-4 left-4 z-50 bg-white p-3 rounded-md shadow-md text-agri-green"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      )}
      
      {/* Mobile overlay */}
      {isMobile && showMobileSidebar && (
        <div 
          className="sidebar-overlay"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
      
      {/* Sidebar content */}
      {isMobile ? (
        <CSSTransition
          in={showMobileSidebar}
          timeout={300}
          classNames="sidebar"
          unmountOnExit
          nodeRef={sidebarRef}
        >
          <div ref={sidebarRef} className="sidebar-mobile bg-gradient-to-b from-agri-darkGreen to-agri-green/90 border-r border-agri-lime/20 shadow-xl">
            {/* Mobile sidebar content - force expanded view */}
            <SidebarContent 
              collapsed={false} // Force expanded view on mobile
              setCollapsed={setCollapsed}
              toggleSidebar={toggleSidebar}
              foundersItem={foundersItem}
              t={t}
              activeItem={activeItem}
              handleNavigation={handleNavigation}
              categorizedItems={categorizedItems}
              categoryLabels={categoryLabels}
              expandedCategories={expandedCategories}
              toggleCategory={toggleCategory}
              itemVariants={itemVariants}
              isMobile={true}
            />
          </div>
        </CSSTransition>
      ) : (
        <motion.div 
          initial={{ width: collapsed ? 80 : 280 }}
          animate={{ width: collapsed ? 80 : 280 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "flex flex-col min-h-screen h-auto bg-gradient-to-b from-agri-darkGreen to-agri-green/90 border-r border-agri-lime/20 overflow-hidden",
            "shadow-xl"
          )}
        >
          {/* Desktop sidebar content */}
          <SidebarContent 
            collapsed={collapsed} 
            setCollapsed={setCollapsed}
            toggleSidebar={toggleSidebar}
            foundersItem={foundersItem}
            t={t}
            activeItem={activeItem}
            handleNavigation={handleNavigation}
            categorizedItems={categorizedItems}
            categoryLabels={categoryLabels}
            expandedCategories={expandedCategories}
            toggleCategory={toggleCategory}
            itemVariants={itemVariants}
            isMobile={false}
          />
        </motion.div>
      )}
    </>
  );
};

// Update the SidebarContent component to handle mobile better
interface SidebarContentProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  foundersItem: any;
  t: any;
  activeItem: string | null;
  handleNavigation: (href: string, name: string) => void;
  categorizedItems: Record<SidebarCategory, any[]>;
  categoryLabels: Record<SidebarCategory, { name: string, icon: React.ElementType }>;
  expandedCategories: {[key in SidebarCategory]: boolean};
  toggleCategory: (category: SidebarCategory) => void;
  itemVariants: any;
  isMobile: boolean;
}

// Create a new component for sidebar content to avoid duplication
const SidebarContent = ({ 
  collapsed, 
  setCollapsed,
  toggleSidebar,
  foundersItem,
  t,
  activeItem,
  handleNavigation,
  categorizedItems,
  categoryLabels,
  expandedCategories,
  toggleCategory,
  itemVariants,
  isMobile
}: SidebarContentProps) => {
  return (
    <>
      {/* Header with logo and toggle button */}
      <div className="flex flex-col p-5 border-b border-agri-lime/30">
        <div className={cn("flex items-center", collapsed && !isMobile ? "justify-center w-full" : "justify-between w-full")}>
          <Logo size={collapsed && !isMobile ? 'sm' : 'md'} />
          {(!collapsed || isMobile) && 
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-2 text-xl font-semibold text-white"
            >
            </motion.span>
          }
        </div>
        
        {/* Only show toggle button on desktop */}
        {!isMobile && (
          <div className="flex justify-center mt-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-all duration-300",
                "bg-agri-lime/20 hover:bg-agri-lime/30 text-white",
                "focus:outline-none focus:ring-2 focus:ring-agri-lime/50",
                collapsed ? "w-10" : "w-full"
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </motion.button>
          </div>
        )}
        
        {/* Mobile close button */}
        {isMobile && (
          <div className="flex justify-end mt-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="flex items-center justify-center p-2 rounded-lg bg-agri-lime/20 hover:bg-agri-lime/30 text-white"
              aria-label="Close sidebar"
            >
              <ChevronLeft size={20} />
            </motion.button>
          </div>
        )}
      </div>
      
      {/* Enhanced Founders Section - Always visible on mobile */}
      {(foundersItem && (!collapsed || isMobile)) && (
        <div className="px-3 pt-5 pb-4 relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-400/20 rounded-full blur-xl"></div>
            <div className="absolute -left-5 bottom-0 w-20 h-20 bg-amber-300/10 rounded-full blur-lg"></div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-3 mb-2 flex items-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Star className="h-4 w-4 mr-2 text-amber-400" />
            </motion.div>
            <span className="text-xs uppercase tracking-wider font-bold text-amber-300">
              {t('sidebar.featured', 'Featured')}
            </span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{
              scale: 1.03,
              transition: { duration: 0.2 },
              boxShadow: "0 10px 25px -5px rgba(251, 191, 36, 0.3)"
            }}
            className="mb-2 relative z-10"
          >
            <Link
              to={foundersItem.href}
              className={cn(
                'flex items-center rounded-xl px-4 py-4 text-sm font-medium transition-all w-full',
                'relative overflow-hidden',
                activeItem === foundersItem.name 
                  ? `bg-gradient-to-r from-amber-500/40 to-amber-600/50 text-white shadow-lg shadow-amber-900/30 border border-amber-500/30` 
                  : 'text-white bg-gradient-to-r from-amber-600/30 to-amber-700/30 hover:from-amber-500/40 hover:to-amber-600/50 shadow-lg shadow-amber-900/20 border border-amber-500/20 hover:border-amber-400/30'
              )}
              onClick={() => handleNavigation(foundersItem.href, foundersItem.name)}
            >
              {/* Animated background particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-1 w-1 rounded-full bg-amber-300"
                    initial={{ 
                      x: `${Math.random() * 100}%`, 
                      y: `${Math.random() * 100}%`,
                      opacity: 0.3 + Math.random() * 0.5
                    }}
                    animate={{ 
                      y: [
                        `${Math.random() * 100}%`, 
                        `${Math.random() * 100}%`
                      ],
                      opacity: [0.3, 0.7, 0.3]
                    }}
                    transition={{ 
                      duration: 3 + Math.random() * 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
              
              {/* Icon with pulsing effect */}
              <motion.div 
                className={cn(
                  'flex items-center justify-center p-3 rounded-lg',
                  activeItem === foundersItem.name 
                    ? 'bg-amber-400/30' 
                    : 'bg-amber-400/20'
                )}
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(251, 191, 36, 0)",
                    "0 0 0 6px rgba(251, 191, 36, 0.3)",
                    "0 0 0 0 rgba(251, 191, 36, 0)"
                  ]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut"
                }}
              >
                <foundersItem.icon className={cn('h-6 w-6', collapsed && !isMobile ? 'mx-auto' : 'mr-0')} />
              </motion.div>
              
              <motion.div className="ml-3 flex flex-col">
                <span className="font-bold whitespace-nowrap flex items-center text-lg">
                  {foundersItem.displayName}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Star className="h-3.5 w-3.5 ml-1.5 text-amber-300" />
                  </motion.div>
                </span>
                <span className="text-xs text-amber-200/90">
                  {t('sidebar.meetTeam', 'Meet our team')}
                </span>
              </motion.div>
              
              {/* Active indicator */}
              {activeItem === foundersItem.name && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute right-3 h-2 w-2 rounded-full bg-amber-400"
                />
              )}
              
              {/* Animated glow effect */}
              <motion.div 
                className="absolute -inset-1 bg-amber-500/10 rounded-full blur-md"
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              ></motion.div>
            </Link>
          </motion.div>
        </div>
      )}
      
      {/* Separator */}
      <div className="mx-4 h-px bg-agri-lime/20 my-3"></div>
      
      {/* Navigation with categorized items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
        <AnimatePresence>
          {/* Render each category */}
          {Object.entries(categorizedItems).map(([category, items], categoryIndex) => (
            <div key={category} className="mb-6">
              {/* Category header - Always visible on mobile */}
              {(!collapsed || isMobile) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 mb-3 flex items-center justify-between"
                >
                  <div className="flex items-center text-white/80">
                    {React.createElement(categoryLabels[category as SidebarCategory].icon, { className: "h-4 w-4 mr-2" })}
                    <span className="text-xs uppercase tracking-wider font-semibold">
                      {categoryLabels[category as SidebarCategory].name}
                    </span>
                  </div>
                  <button 
                    onClick={() => toggleCategory(category as SidebarCategory)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {expandedCategories[category as SidebarCategory] ? 
                      <ChevronDown size={16} /> : 
                      <ChevronRight size={16} />
                    }
                  </button>
                </motion.div>
              )}
              
              {/* Category items - Always visible on mobile */}
              <AnimatePresence>
                {(collapsed || expandedCategories[category as SidebarCategory] || isMobile) && (
                  <motion.ul 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2 px-2 overflow-hidden"
                  >
                    {items.map((item, index) => (
                      <motion.li 
                        key={item.name}
                        custom={index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="overflow-visible"
                      >
                        <div key={item.name} className={cn("relative", 
                          item.featured && "bg-card/30 p-2 rounded-xl mb-2",
                          !item.featured && "mb-1")}>
                          {activeItem === item.name && (
                            <motion.div 
                              layoutId="activeItem" 
                              className="absolute left-0 w-1 h-8 my-1 bg-primary rounded-r-full" 
                            />
                          )}
                          <Link 
                            to={item.href} 
                            onClick={() => handleNavigation(item.href, item.name)}
                            className={cn(
                              "flex items-center gap-3 w-full hover:bg-muted/50 p-2 rounded-lg transition-all",
                              activeItem === item.name && "bg-muted/50 dark:text-white"
                            )}
                          >
                            <span className={cn("p-1 rounded-md", item.color)}>
                              {item.icon && React.createElement(item.icon, { size: 18 })}
                            </span>
                            {/* Always show text on mobile */}
                            <span className={cn("font-medium truncate", (collapsed && !isMobile) && "hidden")}>
                              {t(item.translationKey || item.name)}
                            </span>
                            {item.featured && (
                              <Badge className={cn("ml-auto badge", (collapsed && !isMobile) && 'hidden')} variant="outline">
                                {item.badge || t('new')}
                              </Badge>
                            )}
                          </Link>
                        </div>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          ))}
        </AnimatePresence>
        
        {/* Extra spacing to increase vertical size */}
        <div className="h-20"></div>
      </nav>
      
      {/* Footer with version */}
      <div className="p-4 border-t border-agri-lime/20 text-white/50 text-xs text-center mt-auto">
        {(!collapsed || isMobile) && <span>v1.0.0</span>}
      </div>
    </>
  );
};

export default Sidebar;
