import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchMusic } from '../lib/youtube';
import { useDebounce } from '../hooks/useDebounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = 'Search for songs, artists...', 
  className = '' 
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 5));
        }
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  // Generate suggestions based on debounced query
  useEffect(() => {
    if (debouncedQuery.trim().length > 1) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    try {
      // Here we would typically call an API to get suggestions
      // For now, we'll just filter recent searches as a simple implementation
      const filteredRecent = recentSearches.filter(item => 
        item.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Add some common completions based on the query
      const commonCompletions = [
        `${searchQuery} lyrics`,
        `${searchQuery} official video`,
        `${searchQuery} live`,
        `${searchQuery} remix`,
        `${searchQuery} cover`
      ];
      
      // Combine and remove duplicates
      const allSuggestions = [...new Set([
        ...filteredRecent,
        ...commonCompletions
      ])].slice(0, 6);
      
      setSuggestions(allSuggestions);
    } catch (error) {
      console.error('Suggestion error:', error);
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const newSearches = [
      searchQuery,
      ...recentSearches.filter(item => item !== searchQuery)
    ].slice(0, 5);
    
    setRecentSearches(newSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newSearches));
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSuggestions([]);
    
    try {
      await onSearch(searchQuery);
      saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      handleSearch(query);
      setIsFocused(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            className="w-full bg-[#242424] text-white py-2 pl-10 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1DB954] placeholder-gray-400"
          />
          
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>
      
      {/* Suggestions dropdown */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#282828] rounded-md shadow-lg z-10">
          {query.trim().length > 1 && suggestions.length > 0 ? (
            <div>
              <div className="p-2 text-sm text-gray-400">Suggestions</div>
              <ul>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full text-left px-4 py-2 text-white hover:bg-[#333] transition-colors flex items-center"
                    >
                      <Search className="w-4 h-4 mr-2 text-gray-400" />
                      {suggestion}
                    </button>
                  </li>
                ))}
                <li className="border-t border-gray-700 mt-1">
                  <button
                    onClick={() => handleSearch(query)}
                    className="w-full text-left px-4 py-2 text-[#1DB954] hover:bg-[#333] transition-colors flex items-center font-medium"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search for "{query}"
                  </button>
                </li>
              </ul>
            </div>
          ) : recentSearches.length > 0 && !query ? (
            <div>
              <div className="p-2 text-sm text-gray-400">Recent searches</div>
              <ul>
                {recentSearches.map((search, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleSelectSuggestion(search)}
                      className="w-full text-left px-4 py-2 text-white hover:bg-[#333] transition-colors flex items-center"
                    >
                      <Search className="w-4 h-4 mr-2 text-gray-400" />
                      {search}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : query && query.trim().length > 1 ? (
            <div className="p-4 text-center text-gray-400">
              Press Enter to search for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};