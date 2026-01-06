// src/components/UnifiedSearchBar.jsx
// NEW FILE - Add this to your components folder
import React, { useState } from 'react';
import { Search, Loader } from 'lucide-react';

export default function UnifiedSearchBar({ onSearch, onClear }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      onClear();
      return;
    }
    
    setIsSearching(true);
    await onSearch(query);
    setIsSearching(false);
  };
  
  const handleClear = () => {
    setQuery('');
    onClear();
  };
  
  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
            size={18} 
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: tx hash, address, DVN name (e.g., Deutsche Telekom)..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-24 text-sm focus:outline-none focus:border-emerald-500"
            disabled={isSearching}
          />
          
          {isSearching && (
            <Loader 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-spin" 
              size={18} 
            />
          )}
        </div>
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-3 text-sm text-gray-400 hover:text-white bg-gray-800 rounded-lg"
          >
            Clear
          </button>
        )}
        
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-6 py-3 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Searches local dataset first, then queries LayerZero network for real-time data
      </div>
    </form>
  );
}