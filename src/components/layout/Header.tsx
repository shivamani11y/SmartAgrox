import React, { useState, useEffect } from 'react';
import { Bell, Globe, User, ChevronDown, LogOut, LogIn } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { getUserProfile } from '@/lib/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAllFounders } from '@/services/foundersService';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const Header = () => {
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const { t } = useTranslation();
  const [userName, setUserName] = useState('User');
  const [userImage, setUserImage] = useState('');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser) {
        try {
          // Immediately update with basic info from Firebase Auth
          if (currentUser.displayName) {
            setUserName(currentUser.displayName);
          } else if (currentUser.email) {
            const emailName = currentUser.email.split('@')[0] || 'User';
            setUserName(emailName);
          }

          if (currentUser.photoURL) {
            setUserImage(currentUser.photoURL);
          }

          // Then fetch complete profile from Firestore
          const profile = await getUserProfile(currentUser.uid);

          if (profile?.displayName) {
            setUserName(profile.displayName);
          }

          if (profile?.photoURL) {
            setUserImage(profile.photoURL);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserName('User');
        setUserImage('');
      }
    };

    fetchUserProfile();
  }, [currentUser, lastUpdate]);

  const handleLogout = async () => {
    try {
      await logout();
      setUserName('User');
      setUserImage('');
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const refreshUserData = () => {
    setLastUpdate(Date.now());
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-green-200 h-16 flex items-center px-2 md:px-6 relative overflow-hidden">
      {/* Nature-themed decorative elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Subtle leaf patterns */}
        <svg className="absolute top-0 right-0 text-green-200 opacity-20 h-24 w-24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 5C19.89 4.65 18.67 4.43 17.5 4.35C15.55 4.21 13.76 4.76 12 6C10.24 4.76 8.45 4.21 6.5 4.35C5.33 4.43 4.11 4.65 3 5C3 5.9 3 9.65 3 11.5C3 15.07 6.18 17.42 9 18.31V20C9 20.55 9.45 21 10 21H14C14.55 21 15 20.55 15 20V18.31C17.82 17.42 21 15.07 21 11.5C21 9.65 21 5.9 21 5Z" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-0 left-20 text-amber-300 opacity-20 h-20 w-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
        </svg>
        <svg className="absolute top-5 left-1/3 text-green-300 opacity-10 h-16 w-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 17.5C7 18.61 6.11 19.5 5 19.5C3.89 19.5 3 18.61 3 17.5C3 16.39 3.89 15.5 5 15.5C6.11 15.5 7 16.39 7 17.5Z" fill="currentColor" />
          <path d="M11.5 16.5L13.5 14.5L15.5 16.5L17.5 14.5L18 19.5H7L7.5 14.5L9.5 16.5L11.5 16.5Z" fill="currentColor" />
          <path d="M12.5 2.5L13.87 7.5H18.91L14.97 10.42L16.34 15.5L12.5 12.58L8.66 15.5L10.03 10.42L6.09 7.5H11.13L12.5 2.5Z" fill="currentColor" />
        </svg>
      </div>

      <div className="flex-1 z-10">
        {/* App logo or name could go here */}
        <Link to="/" className="flex items-center">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillOpacity="0.2" />
              <path d="M7 13L12 18L17 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 7L12 12L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="ml-2 font-bold text-green-800 text-lg hidden md:block">SmartAgroX</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4 z-10">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center text-green-700 hover:text-green-800 transition-colors">
            <Globe className="h-5 w-5" />
            <span className="hidden md:inline-block text-sm ml-1">{currentLanguage.name}</span>
            <ChevronDown className="h-4 w-4 ml-1 hidden md:inline-block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('common.selectLanguage')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                className="cursor-pointer"
                onClick={() => {
                  // Force a complete refresh with cache clearing to ensure all translations are applied
                  changeLanguage(lang);
                  // Add a small delay before reloading to ensure language is saved
                  setTimeout(() => {
                    // Clear any cached translations
                    localStorage.removeItem('i18nextLng_cache');
                    // Force a hard reload to ensure all components are refreshed
                    window.location.href = window.location.href.split('?')[0] + '?lang=' + lang.code + '&t=' + new Date().getTime();
                  }, 100);
                }}
              >
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications - Only show when logged in */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger className="relative text-green-700 hover:text-green-800 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.notifications')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <div className="text-sm">
                  <p className="font-medium">{t('common.weatherForecast')}</p>
                  <p className="text-xs text-gray-500">{t('common.rainExpected')}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="text-sm">
                  <p className="font-medium">{t('common.marketPrices')}</p>
                  <p className="text-xs text-gray-500">{t('common.priceIncrease')}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="text-sm">
                  <p className="font-medium">{t('common.diseaseDetection')}</p>
                  <p className="text-xs text-gray-500">{t('common.fungalInfection')}</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User Profile or Sign In Button */}
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-green-700 hover:text-green-800 transition-colors">
              <Avatar className="h-8 w-8 ring-2 ring-green-200">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback className="bg-green-100 text-green-800">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <span className="ml-2 hidden md:inline-block">{userName}</span>
              <ChevronDown className="h-4 w-4 ml-1 hidden md:inline-block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleProfileClick}>
                <User className="h-4 w-4 mr-2" />
                {t('common.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">{t('common.settings')}</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">{t('common.farmDetails')}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-500" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white/90 hover:bg-white border-green-200 hover:border-green-300 text-green-700 hover:text-green-800"
                  onClick={() => navigate('/login')}
                  size={isMobile ? "sm" : "default"}
                >
                  <span className="hidden md:inline-block">{t('common.login')}</span>
                  <LogIn className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 ml-2 md:ml-0 md:mr-2'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('common.login')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </header>
  );
};

export default Header;
