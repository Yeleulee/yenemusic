import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Library, Plus, Heart, Clock, User, Music } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  // Handle link click in mobile view
  const handleLinkClick = () => {
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <div 
      className={`bg-[#121212] h-full flex flex-col fixed left-0 top-0 p-2 pt-4 border-r border-[#282828] transition-all duration-300 z-40
        ${isOpen ? 'translate-x-0 w-[220px]' : '-translate-x-full w-[220px]'} 
        md:translate-x-0 md:w-[205px]`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 mb-6">
        <Music className="h-8 w-8 text-red-500" />
        <span className="text-white text-xl font-bold">yenein</span>
      </div>
      
      {/* Main Navigation */}
      <div className="mb-6">
        <Link 
          to="/" 
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2 my-1 rounded-md ${
            isActive('/') ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link 
          to="/explore" 
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2 my-1 rounded-md ${
            isActive('/explore') ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Search className="h-5 w-5" />
          <span>Explore</span>
        </Link>
        <Link 
          to="/library" 
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2 my-1 rounded-md ${
            isActive('/library') ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Library className="h-5 w-5" />
          <span>Library</span>
        </Link>
      </div>
      
      {/* Your Activity */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs uppercase font-bold text-gray-500">Your Activity</span>
        </div>
        <Link 
          to="/likes" 
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2 my-1 rounded-md ${
            isActive('/likes') ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Heart className="h-5 w-5" />
          <span>Likes</span>
        </Link>
        <Link 
          to="/history" 
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2 my-1 rounded-md ${
            isActive('/history') ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="h-5 w-5" />
          <span>History</span>
        </Link>
        <Link 
          to="/profile" 
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2 my-1 rounded-md ${
            isActive('/profile') ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </Link>
      </div>
      
      {/* Playlists */}
      <div>
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs uppercase font-bold text-gray-500">Playlists</span>
          <button className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-[#282828]">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Placeholder playlists */}
        <Link 
          to="/playlist/high-distortion" 
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2 my-1 rounded-md text-gray-400 hover:text-white"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <div className="w-4 h-4 bg-gradient-to-br from-red-600 to-red-800 rounded"></div>
          </div>
          <span>High Distortion</span>
        </Link>
        <Link 
          to="/playlist/easy-breezy" 
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2 my-1 rounded-md text-gray-400 hover:text-white"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded"></div>
          </div>
          <span>Easy Breezy Beats</span>
        </Link>
      </div>
    </div>
  );
};