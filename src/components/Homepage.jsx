// src/components/Homepage.jsx
// FIXED: Proper routing for all navigation paths

import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, TrendingUp, FileText, Shield, BarChart3 } from 'lucide-react';
import SearchBar from './SearchBar';
import { INSTITUTIONAL_ASSETS } from '../utils/assetRegistry';
import { DVN_REGISTRY } from '../utils/dvnRegistry';

export default function Homepage() {
  // Featured institutions (top 6)
  const featuredInstitutions = Object.values(INSTITUTIONAL_ASSETS).slice(0, 6);

  // Featured DVNs (high confidence ones)
  const featuredDVNs = Object.entries(DVN_REGISTRY)
    .filter(([_, dvn]) => dvn.confidence === 'high')
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-white mb-4">
          DVN Intelligence Platform
        </h1>
        <p className="text-xl text-gray-400 mb-2">
          Decentralized Verifier Network Performance & Marketplace
        </p>
        <p className="text-gray-500 mb-8">
          Analytics and compliance tools for institutional asset builders on LayerZero
        </p>
        
        {/* Main Search Bar */}
        <SearchBar autoFocus />
      </div>

      {/* Two Main Paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* For Builders */}
        <Link
          to="/dvn-marketplace"
          className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700 rounded-xl p-8 hover:scale-105 transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-10 h-10 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">For Builders</h2>
          </div>
          <p className="text-gray-400 mb-6">
            Explore the DVN Marketplace. Compare decentralized verifier networks by jurisdiction, 
            infrastructure, and performance metrics to construct optimal security stacks.
          </p>
          <div className="bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Browse DVN Marketplace</span>
          </div>
        </Link>

        {/* For Institutions */}
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-10 h-10 text-green-400" />
            <h2 className="text-2xl font-bold text-white">For Institutions</h2>
          </div>
          <p className="text-gray-400 mb-6">
            Monitor OApp performance metrics, analyze cross-chain transaction flows, 
            and generate compliance reports for regulatory oversight.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Enter OApp contract address:</p>
            <SearchBar placeholder="0x..." context="oapp" />
          </div>
        </div>
      </div>

      {/* Featured Institutions */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Featured Institutions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredInstitutions.map(asset => {
            const primaryAddress = Object.values(asset.addresses)[0];
            return (
              <Link
                key={asset.id}
                to={`/oapp/${primaryAddress}`}
                className="bg-lz-gray-900 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-gray-600 transition-all"
              >
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-white mb-1">{asset.name}</h3>
                  <p className="text-sm text-gray-400">{asset.institution}</p>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{asset.description}</p>
                <div className="pt-4 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-400 bg-lz-gray-800/50 px-2 py-1 rounded">{asset.type}</span>
                  <span className="text-xs text-blue-400">View Analytics →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured DVNs */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Featured Decentralized Verifier Networks</h2>
          <Link to="/dvn-marketplace" className="text-blue-400 hover:underline text-sm flex items-center gap-1">
            <span>View All</span>
            <span>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredDVNs.map(([id, dvn]) => (
            <Link
              key={id}
              to={`/dvn/${id}`}
              className="bg-lz-gray-900 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-gray-600 transition-all"
            >
              <h3 className="text-lg font-bold text-white mb-2">{dvn.name}</h3>
              <div className="flex gap-2 mb-3">
                <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-800">
                  {dvn.jurisdiction}
                </span>
                <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded border border-purple-800">
                  {dvn.type}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{dvn.infrastructure}</p>
              <p className="text-xs text-gray-500 line-clamp-2 mb-4">{dvn.description}</p>
              <div className="pt-4 border-t border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-400">{Object.keys(dvn.addresses).length} Chains</span>
                <span className="text-xs text-blue-400">View Profile →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Features Overview - REMOVED placeholder buttons, kept informational */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="text-center p-6 bg-lz-gray-900 rounded-lg border border-gray-700">
          <div className="flex justify-center mb-3">
            <Search className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Advanced Search</h3>
          <p className="text-sm text-gray-400">
            Query by transaction hash, contract address, or DVN identifier for instant analytics
          </p>
        </div>
        <div className="text-center p-6 bg-lz-gray-900 rounded-lg border border-gray-700">
          <div className="flex justify-center mb-3">
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Performance Metrics</h3>
          <p className="text-sm text-gray-400">
            Real-time analysis of DVN success rates, latency distributions, and transaction volumes
          </p>
        </div>
        <div className="text-center p-6 bg-lz-gray-900 rounded-lg border border-gray-700">
          <div className="flex justify-center mb-3">
            <FileText className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Compliance Reporting</h3>
          <p className="text-sm text-gray-400">
            Generate audit-ready CSV exports with comprehensive transaction metadata
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">
          Ready to Deploy on LayerZero?
        </h2>
        <p className="text-gray-400 mb-6">
          Analyze decentralized verifier networks to construct enterprise-grade security infrastructure
        </p>
        <Link
          to="/dvn-marketplace"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          <Shield className="w-4 h-4" />
          <span>Explore DVN Marketplace</span>
        </Link>
      </div>
    </div>
  );
}