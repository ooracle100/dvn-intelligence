// src/components/Homepage.jsx
// REDESIGNED: Clean institutional homepage — single search, real stats, no fluff

import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import SearchBar from './SearchBar';
import { DVN_REGISTRY } from '../utils/dvnRegistry';

export default function Homepage() {
  const featuredDVNs = Object.entries(DVN_REGISTRY)
    .filter(([_, dvn]) => dvn.confidence === 'high')
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      {/* Hero — Single Search */}
      <div className="text-center mb-20">
        <h1 className="text-5xl font-bold text-white mb-3">
          DVN Intelligence
        </h1>
        <p className="text-lg text-gray-400 mb-10">
          Analytics for LayerZero Decentralized Verifier Networks
        </p>

        <SearchBar
          autoFocus
          placeholder="Search by DVN name, token symbol, or contract address (0x...)"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { label: 'DVNs Tracked', value: '548', color: 'text-blue-400' },
          { label: 'OApps Monitored', value: '4,381', color: 'text-green-400' },
          { label: 'Transactions', value: '3M+', color: 'text-purple-400' },
          { label: 'Verified Volume', value: '$75.8B', color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-5 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* DVN Marketplace CTA */}
      <div className="mb-16">
        <Link
          to="/dvn-marketplace"
          className="block bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-8 hover:border-blue-600 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">DVN Marketplace</h2>
              </div>
              <p className="text-gray-400 text-sm">
                Compare verifier networks by jurisdiction, performance, and volume to build optimal security stacks.
              </p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-500 group-hover:text-blue-400 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Featured DVNs */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Featured Verifier Networks</h2>
          <Link to="/dvn-marketplace" className="text-blue-400 hover:underline text-sm">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredDVNs.map(([id, dvn]) => (
            <Link
              key={id}
              to={`/dvn/${id}`}
              className="bg-gray-900/60 border border-gray-800 rounded-lg p-5 hover:border-gray-600 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-white">{dvn.name}</h3>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{dvn.type}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{dvn.jurisdiction} • {dvn.infrastructure}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-400">{Object.keys(dvn.addresses).length} chains</span>
                <span className="text-xs text-blue-400">View Profile →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}