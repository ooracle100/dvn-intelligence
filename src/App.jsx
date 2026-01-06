// src/App.jsx
// Single search bar version - Live Search with unified logic

import React, { useState, useEffect, useMemo } from 'react';
import { unifiedSearch, normalizeStatus } from './utils/unifiedSearch';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import DebugPanel from './components/DebugPanel';
import HomeView from './components/views/HomeView';
import OappView from './components/views/OappView';
import EnhancedDvnView from './components/views/EnhancedDvnView';
import WalletView from './components/views/WalletView';
import TransactionView from './components/views/TransactionView';
import SearchView from './components/views/SearchView';
import { summarizeStacks, scoreDvns } from './utils/dvn';

export default function App() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('home');
  const [viewData, setViewData] = useState(null);
  const [scoringMode, setScoringMode] = useState('balanced');

  // Single unified search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetch('/dvn_data.json')
      .then(r => r.json())
      .then(j => {
        setData(j);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load dvn_data.json', err);
        setIsLoading(false);
      });
  }, []);

  const handleHome = () => {
    setViewMode('home');
    setViewData(null);
    setSearchResults(null);
    setSearchQuery(''); // Clear search input
    setIsSearching(false); // Reset searching state
    window.scrollTo(0, 0);
  };

  const handleViewTransaction = (tx) => {
    setViewMode('transaction');
    setViewData({ transaction: tx });
    window.scrollTo(0, 0);
  };

  // Unified search handler
  const handleSearch = async () => {
    if (!searchQuery || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    setSearchResults(null);

    try {
      const result = await unifiedSearch(searchQuery.trim(), data);

      // Handle errors
      if (result.error) {
        setSearchResults({ error: result.error });
        setIsSearching(false);
        return;
      }

      // Navigate directly to view for these types
      if (result.type === 'transaction') {
        setViewMode('transaction');
        setViewData({ transaction: result.transaction });
        setSearchResults(null);
        setIsSearching(false);
        window.scrollTo(0, 0);
        return;
      }

      if (result.type === 'oapp') {
        setViewMode('oapp');
        setViewData({
          address: result.address,
          name: result.name,
          transactions: result.transactions
        });
        setSearchResults(null);
        setIsSearching(false);
        window.scrollTo(0, 0);
        return;
      }

      if (result.type === 'dvn') {
        setViewMode('dvn');
        setViewData({
          address: result.address,
          name: result.name || result.dvnName,
          transactions: result.transactions
        });
        setSearchResults(null);
        setIsSearching(false);
        window.scrollTo(0, 0);
        return;
      }

      // Show results for these types
      if (result.type === 'dvn_name') {
        setSearchResults({
          type: 'dvn_name',
          name: result.name,
          addresses: result.addresses,
          message: result.message
        });
        setIsSearching(false);
        return;
      }

      if (result.type === 'address' && result.transactions) {
        setSearchResults({
          type: 'live_results',
          source: result.source,
          display_name: result.display_name,
          transactions: result.transactions,
          total: result.total
        });
        setIsSearching(false);
        return;
      }

      // Live single transaction
      if (result.source === 'live' && result.source_tx_hash) {
        setViewMode('transaction');
        setViewData({ transaction: result });
        setSearchResults(null);
        setIsSearching(false);
        window.scrollTo(0, 0);
        return;
      }

      setSearchResults(result);
      setIsSearching(false);

    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ error: 'Search failed. Please try again.' });
      setIsSearching(false);
    }
  };

  const dvnScores = useMemo(() => scoreDvns(data, scoringMode), [data, scoringMode]);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-black text-white">
      <Header onHome={handleHome} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <DebugPanel
          scoringMode={scoringMode}
          setScoringMode={setScoringMode}
        />

        {/* Single Live Search Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-emerald-400">🔴 Live Search</h2>
            <p className="text-xs text-gray-400">Instant search across all chains - local data + real-time LayerZero network</p>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search: tx hash, address, DVN name (e.g., Deutsche Telekom)..."
              maxLength={120} // Ensure full addresses fit
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              disabled={isSearching}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 rounded-lg font-semibold text-sm"
            >
              {isSearching ? 'Searching...' : 'Search Live'}
            </button>
          </div>

          {searchResults && (
            <div className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg max-h-96 overflow-auto">
              {searchResults.error ? (
                <p className="text-red-400 text-sm">{searchResults.error}</p>
              ) : searchResults.type === 'live_results' ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-emerald-900 text-emerald-300 rounded">
                      {searchResults.source === 'live' ? 'LIVE DATA' : 'LOCAL DATA'}
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      Found {searchResults.total} transactions
                    </span>
                    {searchResults.display_name && (
                      <span className="text-white">• {searchResults.display_name}</span>
                    )}
                  </div>
                  <div className="space-y-2 mt-3">
                    {searchResults.transactions.slice(0, 10).map((tx, i) => {
                      const status = normalizeStatus(tx.delivery_status);

                      return (
                        <div
                          key={i}
                          className="text-xs bg-gray-900 p-3 rounded cursor-pointer hover:bg-gray-800"
                          onClick={() => {
                            setViewMode('transaction');
                            setViewData({ transaction: tx });
                            setSearchResults(null);
                            window.scrollTo(0, 0);
                          }}
                        >
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">
                              {tx.source_chain_name || tx.source_chain} → {tx.destination_chain_name || tx.destination_chain}
                            </span>
                            <span className={`text-${status.color}-400`}>
                              {status.text}
                            </span>
                          </div>
                          <p className="text-white font-mono text-xs mb-1">
                            {tx.source_tx_hash?.slice(0, 30)}...
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs">
                              {tx.oapp_display_name || tx.oapp_name || 'Unknown OAPP'}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {tx.latency_seconds ? `${tx.latency_seconds}s` : 'N/A'}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            DVNs: {tx.dvn_stack_names || tx.required_dvn_names?.join(', ') || 'N/A'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : searchResults.type === 'dvn_name' ? (
                <div>
                  <p className="text-emerald-400 font-semibold mb-2">Found DVN: {searchResults.name}</p>
                  <p className="text-xs text-gray-400 mb-2">{searchResults.message}</p>
                  <div className="space-y-1 mt-3">
                    <p className="text-xs text-gray-500 mb-1">Addresses across chains:</p>
                    {Object.entries(searchResults.addresses).map(([chainId, addr]) => (
                      <div key={chainId} className="text-xs flex justify-between bg-gray-900 p-2 rounded">
                        <span className="text-gray-400">Chain {chainId}:</span>
                        <span className="text-white font-mono">{addr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-gray-400">Route</p>
                      <p className="text-white">{searchResults.source_chain} → {searchResults.destination_chain}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Status</p>
                      <p className={searchResults.delivery_status === 'DELIVERED' || searchResults.delivery_status === 'Delivered' ? 'text-emerald-400' : 'text-yellow-400'}>
                        {searchResults.delivery_status}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">DVNs</p>
                      <p className="text-white">{searchResults.dvn_stack_names || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Latency</p>
                      <p className="text-white">{searchResults.latency_seconds ? `${searchResults.latency_seconds}s` : 'N/A'}</p>
                    </div>
                  </div>
                  {searchResults.fees?.available && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-gray-400 mb-1">Transaction Fee</p>
                      <p className="text-emerald-400 font-semibold">
                        ${searchResults.fees.chain_fee_usd} ({searchResults.fees.chain_fee_eth} ETH)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {viewMode === 'home' && <HomeView data={data} setViewMode={setViewMode} setViewData={setViewData} onViewTransaction={handleViewTransaction} />}
        {viewMode === 'oapp' && <OappView viewData={viewData} setViewMode={setViewMode} onViewTransaction={handleViewTransaction} data={data} dvnScores={dvnScores} />}
        {viewMode === 'dvn' && <EnhancedDvnView data={data} dvnAddress={viewData.address} onBack={() => setViewMode('home')} />}
        {viewMode === 'wallet' && <WalletView viewData={viewData} onViewTransaction={handleViewTransaction} />}
        {viewMode === 'transaction' && <TransactionView viewData={viewData} setViewMode={setViewMode} />}
        {viewMode === 'search' && <SearchView viewData={viewData} setViewMode={setViewMode} onViewTransaction={handleViewTransaction} />}
      </main>
    </div>
  );
}