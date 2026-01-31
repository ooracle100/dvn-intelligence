// src/components/SearchBar.jsx
// FIXED: Proper routing for all search result types

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader } from 'lucide-react';
import { intelligenceService } from '../services/IntelligenceService';

function SearchBar({ placeholder = "Search by tx hash, address, or DVN name...", autoFocus = false, context = "general" }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Searching for:', query);
      const result = await intelligenceService.search(query.trim());
      
      console.log('📊 Search result:', result);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // FIXED: Proper routing based on result type
      if (result.type === 'dvn_name') {
        // DVN name search → Navigate to DVN profile
        const dvnId = result.dvnId;
        if (dvnId) {
          navigate(`/dvn/${dvnId}`);
        } else {
          setError('DVN profile not found');
        }
      } else if (result.message_guid) {
        // Transaction hash → Navigate to transaction view
        navigate(`/tx/${result.source_tx_hash || query}`);
      } else if (result.type === 'oapp' || result.type === 'wallet') {
        // Address search → Navigate to OApp dashboard
        navigate(`/oapp/${result.address}`);
      } else if (result.type === 'dvn') {
        // DVN address → Navigate to DVN profile
        // Find DVN ID from address
        const dvnId = findDVNIdByAddress(result.address);
        if (dvnId) {
          navigate(`/dvn/${dvnId}`);
        } else {
          navigate(`/oapp/${result.address}`);
        }
      } else {
        setError('Unknown result type');
      }

      setLoading(false);
    } catch (err) {
      console.error('❌ Search error:', err);
      setError('Search failed. Please try again.');
      setLoading(false);
    }
  }

  function findDVNIdByAddress(address) {
    const { DVN_REGISTRY } = require('../utils/dvnRegistry');
    const addr = address.toLowerCase();
    
    for (const [id, dvn] of Object.entries(DVN_REGISTRY)) {
      const addresses = Object.values(dvn.addresses).map(a => a.toLowerCase());
      if (addresses.includes(addr)) {
        return id;
      }
    }
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full bg-lz-gray-900 border border-gray-700 rounded-lg pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {loading && (
            <Loader className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 animate-spin" />
          )}
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
            {error}
          </div>
        )}
        
        <button type="submit" className="hidden">Search</button>
      </form>
      
      {/* Search hints */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        <p>
          Try: Transaction hash (0x...) • Contract address (0x...) • DVN name (Google Cloud, LayerZero Labs)
        </p>
      </div>
    </div>
  );
}

// Compact version for navbar
export function CompactSearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      const result = await intelligenceService.search(query.trim());
      
      if (result.error) {
        setLoading(false);
        return;
      }

      if (result.type === 'dvn_name') {
        const dvnId = result.dvnId;
        if (dvnId) {
          navigate(`/dvn/${dvnId}`);
        }
      } else if (result.message_guid) {
        navigate(`/tx/${result.source_tx_hash || query}`);
      } else if (result.type === 'oapp' || result.type === 'wallet') {
        navigate(`/oapp/${result.address}`);
      } else if (result.type === 'dvn') {
        const dvnId = findDVNIdByAddress(result.address);
        if (dvnId) {
          navigate(`/dvn/${dvnId}`);
        } else {
          navigate(`/oapp/${result.address}`);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Search error:', err);
      setLoading(false);
    }
  }

  function findDVNIdByAddress(address) {
    const { DVN_REGISTRY } = require('../utils/dvnRegistry');
    const addr = address.toLowerCase();
    
    for (const [id, dvn] of Object.entries(DVN_REGISTRY)) {
      const addresses = Object.values(dvn.addresses).map(a => a.toLowerCase());
      if (addresses.includes(addr)) {
        return id;
      }
    }
    return null;
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-full bg-lz-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {loading && (
          <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
        )}
      </div>
    </form>
  );
}

export default SearchBar;