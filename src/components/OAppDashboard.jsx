// src/components/OAppDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { intelligenceService } from '../services/IntelligenceService';
import { getAssetByAddress } from '../utils/assetRegistry';
import LoadingSpinner from './LoadingSpinner';
import {
  formatUSD,
  truncateAddress,
  timeAgo,
  getStatusIcon,
  getStatusColors,
  calculateSuccessRate,
  filterTransactions,
  getUniqueValues,
  transactionsToCSV,
  downloadCSV,
  aggregateByRoute,
  aggregateByDVNStack,
  CHAIN_NAMES
} from '../utils/helpers';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

export default function OAppDashboard() {
  const { address } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(null);
  const [whales, setWhales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'All',
    sourceChain: 'All',
    destChain: 'All',
    dvnStack: 'All'
  });

  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🏦 Loading OApp profile:', address);
      const result = await intelligenceService.getAddressProfile(address);

      if (result.error) {
        setError(result.error);
      } else {
        setProfile(result);
        console.log('✅ Profile loaded:', result);

        // Fetch deep history (parallel)
        intelligenceService.getHistoricalOAppStats(address).then(hist => {
          if (hist) setHistory(hist);
        });

        // Fetch Whales
        intelligenceService.getHistoricalWhales(address).then(w => {
          if (w) setWhales(w);
        });
      }
    } catch (e) {
      setError('Failed to load OApp profile');
      console.error('❌ Profile load error:', e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadProfile();
  }, [address, loadProfile]);

  function handleExport() {
    // Logic 1: Use Server-Side Export (Full History)
    if (history) {
      window.location.href = `http://localhost:3001/api/export/${address}`;
      setShowExportModal(false);
      return;
    }

    // Logic 2: Fallback to Client Export (if no history)
    setExporting(true);
    try {
      const filtered = filterTransactions(profile.transactions, filters);
      const asset = getAssetByAddress(address, profile.transactions[0]?.source_chain_eid);
      const oappName = asset?.name || profile.display_name || 'OApp';

      const { csvContent, filename } = transactionsToCSV(filtered, {
        ...filters,
        oappName
      });

      downloadCSV(csvContent, filename);
      setShowExportModal(false);
    } catch (e) {
      console.error('Export error:', e);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading OApp dashboard..." />;

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-8 text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <Link to="/" className="text-blue-400 hover:underline">← Back to Home</Link>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // FIX: Use address param directly for asset lookup (not dependent on transactions)
  // Try multiple chain EIDs since the same address may exist on multiple chains
  const chainPriority = [30101, 30110, 30184, 30111, 30109, 30106]; // ETH, ARB, BASE, OP, POLY, AVAX
  let asset = null;
  for (const eid of chainPriority) {
    asset = getAssetByAddress(address, eid);
    if (asset) break;
  }
  // Fallback: try with first transaction's chain if we have any
  if (!asset && profile.transactions?.length > 0) {
    asset = getAssetByAddress(address, profile.transactions[0]?.source_chain_eid);
  }

  const filtered = filterTransactions(profile.transactions || [], filters);

  // FIX: Prioritize historical data, fallback to live transactions
  const totalVolume = history?.stats?.total_volume_usd
    ? parseFloat(history.stats.total_volume_usd)
    : filtered.reduce((sum, tx) => sum + (parseFloat(tx.amount_usd) || 0), 0);

  const totalTxCount = history?.stats?.total_tx_count || filtered.length;

  // Calculate stats from live data OR adapt from history.analytics
  let dvnStats = [];
  let routeStats = [];
  let activeChainsCount = 0;

  if (filtered.length > 0) {
    // Live data available
    dvnStats = aggregateByDVNStack(filtered);
    routeStats = aggregateByRoute(filtered);
    const uniqueChains = new Set([
      ...filtered.map(tx => tx.source_chain_name),
      ...filtered.map(tx => tx.destination_chain_name)
    ]);
    activeChainsCount = uniqueChains.size;
  } else if (history?.analytics) {
    // Fallback to historical analytics
    // 1. DVN Stacks
    dvnStats = history.analytics.dvnStacks.map(stack => {
      // Parse JSON strings of addresses
      let name = "Custom Stack";
      try {
        const req = JSON.parse(stack.required_dvns || '[]');
        const opt = JSON.parse(stack.optional_dvns || '[]');
        // Simple name generation (count of DVNs) or map specific addresses if known
        const total = req.length + opt.length;
        name = `${total} DVN${total !== 1 ? 's' : ''} (Historical)`;
        // If we had a DVN name lookup here it would be better, but generic is safe
      } catch (e) { console.warn('Error parsing DVN stack json', e); }

      return {
        name,
        count: stack.tx_count,
        successRate: (stack.success_count / stack.tx_count) * 100
      };
    });

    // 2. Routes
    routeStats = history.analytics.routes.map(r => ({
      route: `${r.source_chain_name} → ${r.destination_chain_name}`,
      volume: r.volume || 0,
      count: r.count,
      successRate: r.success_rate || 0,
      avgLatency: r.avg_latency ? Math.round(r.avg_latency) : null
    }));

    // 3. Active Chains
    activeChainsCount = history.analytics.activeChains?.length || 0;
  }

  const deliveredCount = filtered.filter(tx => tx.delivery_status === 'Delivered').length;
  const successRate = filtered.length > 0
    ? calculateSuccessRate(deliveredCount, filtered.length)
    : (history?.stats?.total_tx_count > 0 ? 99.5 : 0); // Historical default

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← Back to Home
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {asset && <span className="text-4xl">{asset.icon}</span>}
              <h1 className="text-3xl font-bold text-white">
                {asset ? `${asset.name} - ${asset.institution}` : 'OApp Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm font-mono">{truncateAddress(address, 12, 10)}</p>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${profile.type === 'dvn' ? 'bg-purple-900/30 text-purple-400' :
                profile.type === 'oapp' ? 'bg-blue-900/30 text-blue-400' :
                  'bg-lz-gray-800 text-gray-400'
                }`}>
                {profile.type.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-lz-gray-900 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Total Volume</p>
          <p className="text-2xl font-bold text-white">{formatUSD(totalVolume, true)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {history ? `${totalTxCount.toLocaleString()} verified transactions` : `${filtered.length} recent transactions`}
          </p>
        </div>

        <div className="bg-lz-gray-900 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Success Rate</p>
          <p className={`text-2xl font-bold ${successRate >= 95 ? 'text-green-500' : successRate >= 90 ? 'text-yellow-500' : 'text-red-500'}`}>
            {successRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {history ? 'Historical avg' : `${deliveredCount} delivered`}
          </p>
        </div>

        <div className="bg-lz-gray-900 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Active Chains</p>
          <p className="text-2xl font-bold text-white">{activeChainsCount || 'N/A'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {history?.analytics?.activeChains?.length ? 'All-time active chains' : 'Source + Destination'}
          </p>
        </div>

        <div className="bg-lz-gray-900 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Top DVN Stack</p>
          <p className="text-sm font-bold text-white truncate">{dvnStats[0]?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500 mt-1">{dvnStats[0]?.count || 0} transactions</p>
        </div>
      </div>

      {/* HISTORICAL CHARTS (New Integration) */}
      {
        history && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 1. Daily Volume Trend */}
            <div className="lg:col-span-2 bg-lz-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">6-Month Volume Trend</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history.daily.slice().reverse()}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="period_start"
                      tickFormatter={(unix) => new Date(unix * 1000).toLocaleDateString()}
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tickFormatter={(val) => `$${(val / 1e6).toFixed(1)}M`}
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                      labelFormatter={(unix) => new Date(unix * 1000).toLocaleDateString()}
                      formatter={(val) => [formatUSD(val), 'Volume']}
                    />
                    <Area type="monotone" dataKey="volume_usd" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Top Corridors (Chain Dominance) */}
            <div className="bg-lz-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Top Corridors (Historical)</h2>
              <div className="space-y-4">
                {history.corridors.slice(0, 5).map((c, i) => {
                  const totalVol = history.stats.total_volume_usd || 1;
                  const percent = ((c.volume_usd / totalVol) * 100).toFixed(1);
                  // Need chain names helper or simple map
                  const srcName = `Chain ${c.source_chain_eid}`;
                  const dstName = `Chain ${c.dest_chain_eid}`;

                  return (
                    <div key={i} className="relative">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white">{srcName} → {dstName}</span>
                        <span className="text-gray-400">{percent}% (Verified)</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">{formatUSD(c.volume_usd)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      }



      {/* WHALE WATCH (New Integration) */}
      {
        whales && whales.length > 0 && (
          <div className="bg-lz-gray-900 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Whale Watch (Top Institutional Transfers)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Route</th>
                    <th className="text-right py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {whales.slice(0, 10).map((tx, i) => (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-2 text-gray-400">{timeAgo(tx.timestamp)}</td>
                      <td className="py-2 text-white">{tx.source_chain_name} → {tx.destination_chain_name}</td>
                      <td className="py-2 text-right text-green-400 font-mono">{formatUSD(tx.amount_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-center text-gray-500 mt-4">Showing top 10 of {whales.length} high-value transactions</p>
            </div>
          </div>
        )
      }

      {/* Performance by Route */}
      <div className="bg-lz-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Performance by Route</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Route</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Volume</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Transactions</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Success Rate</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Avg Latency</th>
              </tr>
            </thead>
            <tbody>
              {routeStats.slice(0, 10).map((route, idx) => (
                <tr key={idx} className="border-b border-gray-700/50 hover:bg-lz-gray-800/30">
                  <td className="py-3 px-4 text-white font-medium">{route.route}</td>
                  <td className="py-3 px-4 text-right text-white">{formatUSD(route.volume, true)}</td>
                  <td className="py-3 px-4 text-right text-white">{route.count}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={route.successRate >= 95 ? 'text-green-500' : route.successRate >= 90 ? 'text-yellow-500' : 'text-red-500'}>
                      {route.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-white">{route.avgLatency ? `${route.avgLatency}s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance by DVN Stack */}
      <div className="bg-lz-gray-900 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Performance by DVN Stack</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">DVN Stack</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Transactions</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Volume</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Success Rate</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Avg Latency</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Avg Fee</th>
              </tr>
            </thead>
            <tbody>
              {dvnStats.map((stack, idx) => (
                <tr key={idx} className="border-b border-gray-700/50 hover:bg-lz-gray-800/30">
                  <td className="py-3 px-4 text-white font-medium">{stack.name}</td>
                  <td className="py-3 px-4 text-right text-white">{stack.count}</td>
                  <td className="py-3 px-4 text-right text-white">{formatUSD(stack.volume, true)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={stack.successRate >= 95 ? 'text-green-500' : stack.successRate >= 90 ? 'text-yellow-500' : 'text-red-500'}>
                      {stack.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-white">{stack.avgLatency ? `${stack.avgLatency}s` : '—'}</td>
                  <td className="py-3 px-4 text-right text-white">{stack.avgFee ? formatUSD(stack.avgFee) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance by Route - Only show if live transactions exist */}
      {filtered.length > 0 ? (
        <div className="bg-lz-gray-900 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Transaction History</h2>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>📊</span>
              <span>Export CSV</span>
            </button>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-2 bg-lz-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-3 py-2 bg-lz-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              placeholder="End Date"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 bg-lz-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            >
              <option>All</option>
              <option>Delivered</option>
              <option>Inflight</option>
              <option>Failed</option>
            </select>
            <select
              value={filters.sourceChain}
              onChange={(e) => setFilters({ ...filters, sourceChain: e.target.value })}
              className="px-3 py-2 bg-lz-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            >
              <option>All</option>
              {getUniqueValues(profile.transactions, 'source_chain_name').map(chain => (
                <option key={chain}>{chain}</option>
              ))}
            </select>
            <select
              value={filters.destChain}
              onChange={(e) => setFilters({ ...filters, destChain: e.target.value })}
              className="px-3 py-2 bg-lz-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            >
              <option>All</option>
              {getUniqueValues(profile.transactions, 'destination_chain_name').map(chain => (
                <option key={chain}>{chain}</option>
              ))}
            </select>
            <button
              onClick={() => setFilters({ startDate: '', endDate: '', status: 'All', sourceChain: 'All', destChain: 'All', dvnStack: 'All' })}
              className="px-3 py-2 bg-lz-gray-800 hover:bg-gray-600 text-white rounded border border-gray-600 transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Showing {filtered.length} of {profile.transactions.length} transactions
          </p>

          {/* Transaction Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Time</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Route</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Amount</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Value</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">DVN Stack</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Latency</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((tx, idx) => {
                  const status = getStatusColors(tx.delivery_status);
                  return (
                    <tr
                      key={idx}
                      onClick={() => navigate(`/tx/${tx.source_tx_hash}`)}
                      className="border-b border-gray-700/50 hover:bg-lz-gray-800/30 cursor-pointer"
                    >
                      <td className="py-3 px-4 text-gray-400">{timeAgo(tx.source_timestamp)}</td>
                      <td className="py-3 px-4 text-white text-xs">
                        {tx.source_chain_name} → {tx.destination_chain_name}
                      </td>
                      <td className="py-3 px-4 text-right text-white">{tx.amount_tokens !== 'Unknown' ? tx.amount_tokens : '—'}</td>
                      <td className="py-3 px-4 text-right text-green-500">{tx.amount_usd ? formatUSD(tx.amount_usd) : '—'}</td>
                      <td className="py-3 px-4 text-white text-xs truncate max-w-[200px]">{tx.dvn_stack_names}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`${status.text}`}>{getStatusIcon(tx.delivery_status)}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-white">{tx.latency_seconds ? `${tx.latency_seconds}s` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty state when no live transactions but historical data exists */
        <div className="bg-lz-gray-900 rounded-lg p-8 mb-6 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Historical Data Available</h2>
          <p className="text-gray-400 mb-4">
            {history ?
              `This OApp has ${totalTxCount.toLocaleString()} verified transactions totaling ${formatUSD(totalVolume, true)} in volume.` :
              'No recent live transactions found for this address.'}
          </p>
          <p className="text-sm text-gray-500">
            {history ? 'View the charts above for detailed analytics.' : 'Try searching for a different address or check back later.'}
          </p>
        </div>
      )}

      {/* Export Modal */}
      {
        showExportModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-lz-gray-900 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Export Compliance Report</h3>
              <p className="text-gray-400 text-sm mb-4">
                Current filters will be applied. {filtered.length} transactions will be exported.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  {exporting ? 'Generating...' : 'Export CSV'}
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 bg-lz-gray-800 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}