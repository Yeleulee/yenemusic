import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Player } from './components/Player';
import { Home } from './pages/Home';
import { PlaylistDetail } from './pages/PlaylistDetail';
import { ApiStatus } from './pages/ApiStatus';
import { Menu, X } from 'lucide-react';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="bg-[#0c0c0c] min-h-screen text-white">
        {/* Mobile menu toggle */}
        <button 
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#282828] rounded-full shadow-lg"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="md:ml-[205px] pt-4 px-3 sm:px-6 pb-24">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/api-status" element={<ApiStatus />} />
            <Route path="/explore" element={
              <div className="py-8">
                <h1 className="text-3xl font-bold mb-6">Explore</h1>
                <p className="text-gray-400">Discover new music</p>
              </div>
            } />
            <Route path="/library" element={
              <div className="py-8">
                <h1 className="text-3xl font-bold mb-6">Library</h1>
                <p className="text-gray-400">Your music collection</p>
              </div>
            } />
            <Route path="/podcasts" element={
              <div className="py-8">
                <h1 className="text-3xl font-bold mb-6">Podcasts</h1>
                <p className="text-gray-400">Listen to your favorite shows</p>
              </div>
            } />
            <Route path="/likes" element={
              <div className="py-8">
                <h1 className="text-3xl font-bold mb-6">Likes</h1>
                <p className="text-gray-400">Tracks you've liked</p>
              </div>
            } />
            <Route path="/comments" element={
              <div className="py-8">
                <h1 className="text-3xl font-bold mb-6">Comments</h1>
                <p className="text-gray-400">Your comments and interactions</p>
              </div>
            } />
            <Route path="/playlist/:id" element={<PlaylistDetail />} />
          </Routes>
        </main>
        <Player />
      </div>
    </Router>
  );
}

export default App;