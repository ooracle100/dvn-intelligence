// src/components/DVNMarketplace.jsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DVN_REGISTRY } from '../utils/dvnRegistry';

export default function DVNMarketplace() {
  const [filters, setFilters] = useState({
    jurisdiction: [],
    type: [],
    infrastructure: [],
    regulator: [],
    chains: []
  });

  // Extract unique filter options from DVN_REGISTRY
  const filterOptions = useMemo(() => {
    const jurisdictions = new Set();
    const types = new Set();
    const infrastructures = new Set();
    const regulators = new Set();
    const chains = new Set();

    Object.values(DVN_REGISTRY).forEach(dvn => {
      if (dvn.jurisdiction) jurisdictions.add(dvn.jurisdiction);
      if (dvn.type) types.add(dvn.type);
      if (dvn.infrastructure) infrastructures.add(dvn.infrastructure);
      if (dvn.regulator) regulators.add(dvn.regulator);

      // Extract chain EIDs
      Object.keys(dvn.addresses).forEach(eid => chains.add(parseInt(eid)));
    });

    return {
      jurisdictions: Array.from(jurisdictions).sort(),
      types: Array.from(types).sort(),
      infrastructures: Array.from(infrastructures).sort(),
      regulators: Array.from(regulators).sort(),
      chains: Array.from(chains).sort((a, b) => a - b)
    };
  }, []);

  // Chain name mapping for display
  const chainNames = {
    30101: 'Ethereum',
    30102: 'BNB Chain',
    30106: 'Avalanche',
    30109: 'Polygon',
    30110: 'Arbitrum',
    30111: 'Optimism',
    30184: 'Base',
    30214: 'Scroll',
    30260: 'X Layer',
    30266: 'Tenet'
  };

  // Filter DVNs based on selected criteria
  const filteredDVNs = useMemo(() => {
    return Object.entries(DVN_REGISTRY).filter(([id, dvn]) => {
      // Jurisdiction filter
      if (filters.jurisdiction.length > 0 && !filters.jurisdiction.includes(dvn.jurisdiction)) {
        return false;
      }

      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(dvn.type)) {
        return false;
      }

      // Infrastructure filter
      if (filters.infrastructure.length > 0 && !filters.infrastructure.includes(dvn.infrastructure)) {
        return false;
      }

      // Regulator filter
      if (filters.regulator.length > 0 && !filters.regulator.includes(dvn.regulator)) {
        return false;
      }

      // Chains filter - DVN must support at least one selected chain
      if (filters.chains.length > 0) {
        const dvnChains = Object.keys(dvn.addresses).map(eid => parseInt(eid));
        const hasMatchingChain = filters.chains.some(chain => dvnChains.includes(chain));
        if (!hasMatchingChain) return false;
      }

      return true;
    });
  }, [filters]);

  function toggleFilter(category, value) {
    setFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  }

  function clearAllFilters() {
    setFilters({
      jurisdiction: [],
      type: [],
      infrastructure: [],
      regulator: [],
      chains: []
    });
  }

  const activeFilterCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">DVN Marketplace</h1>
        <p className="text-gray-400">
          Compare and select Decentralized Verifier Networks for your LayerZero OApp
        </p>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-lz-gray-900 rounded-lg p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Filters</h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Clear All ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Jurisdiction */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Jurisdiction</h3>
              <div className="space-y-2">
                {filterOptions.jurisdictions.map(jurisdiction => (
                  <label key={jurisdiction} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.jurisdiction.includes(jurisdiction)}
                      onChange={() => toggleFilter('jurisdiction', jurisdiction)}
                      className="rounded bg-lz-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">{jurisdiction}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Type</h3>
              <div className="space-y-2">
                {filterOptions.types.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(type)}
                      onChange={() => toggleFilter('type', type)}
                      className="rounded bg-lz-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Infrastructure */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Infrastructure</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filterOptions.infrastructures.map(infra => (
                  <label key={infra} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.infrastructure.includes(infra)}
                      onChange={() => toggleFilter('infrastructure', infra)}
                      className="rounded bg-lz-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">{infra}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Regulator */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Regulator</h3>
              <div className="space-y-2">
                {filterOptions.regulators.map(reg => (
                  <label key={reg} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.regulator.includes(reg)}
                      onChange={() => toggleFilter('regulator', reg)}
                      className="rounded bg-lz-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">{reg}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chains */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Supported Chains</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filterOptions.chains.map(chainEid => (
                  <label key={chainEid} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.chains.includes(chainEid)}
                      onChange={() => toggleFilter('chains', chainEid)}
                      className="rounded bg-lz-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">{chainNames[chainEid] || `Chain ${chainEid}`}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* DVN Grid */}
        <div className="flex-1">
          <div className="mb-4 text-sm text-gray-400">
            Showing {filteredDVNs.length} of {Object.keys(DVN_REGISTRY).length} DVNs
          </div>

          {filteredDVNs.length === 0 ? (
            <div className="bg-lz-gray-900 rounded-lg p-12 text-center">
              <p className="text-gray-400 text-lg mb-4">No DVNs match your criteria</p>
              <button
                onClick={clearAllFilters}
                className="text-blue-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDVNs.map(([id, dvn]) => {
                const chainsCount = Object.keys(dvn.addresses).length;


                return (
                  <Link
                    key={id}
                    to={`/dvn/${id}`}
                    className="bg-lz-gray-900 rounded-lg p-6 hover:bg-lz-gray-800 transition-all hover:scale-105 cursor-pointer"
                  >
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-white mb-1">{dvn.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded">
                          {dvn.jurisdiction}
                        </span>
                        <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded">
                          {dvn.type}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div>
                        <span className="text-gray-400">Infrastructure:</span>
                        <span className="text-white ml-2">{dvn.infrastructure}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Regulator:</span>
                        <span className="text-white ml-2">{dvn.regulator}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Security:</span>
                        <span className="text-white ml-2 text-xs">{dvn.securityModel}</span>
                      </div>
                    </div>

                    {/* Chains Badge */}
                    <div className="pt-4 border-t border-gray-700">
                      <span className="text-gray-400 text-sm">
                        🌐 {chainsCount} {chainsCount === 1 ? 'Chain' : 'Chains'} Supported
                      </span>
                    </div>

                    {/* View Profile Button */}
                    <div className="mt-4">
                      <div className="w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-lg transition-colors text-sm font-semibold">
                        View Profile →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}