import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Shield, Globe, Activity, TrendingUp, CheckCircle, AlertTriangle, Clock, AlertCircle, Wallet } from 'lucide-react';
import { formatUsd, formatLatency } from '../../utils/format';
import { CHAIN_INFO, getDVNName, getDVNMetadata } from '../../utils/dvnRegistry';
import { fetchDvnPulse } from '../../utils/lzscanApi';
import RiskSegment from '../RiskSegment';
import { calculateConcentrationRisk } from '../../utils/riskAnalysis';

export default function EnhancedDvnView({ data, dvnAddress, onBack }) {
  // Enhanced: Live Pulse State
  const [livePulse, setLivePulse] = useState(null);
  const [loadingPulse, setLoadingPulse] = useState(true);

  // Checks
  const isWalletMode = data?.type === 'wallet';
  const traderStats = data?.stats || {}; // New metric object from API

  // Fetch Live Pulse on Mount (Only for DVN/OApps, not Wallets usually unless manually requested)
  useEffect(() => {
    async function loadLivePulse() {
      // If it's a wallet, we rely on the scanned txs, not a "pulse" of global traffic
      if (!dvnAddress || isWalletMode) return;

      setLoadingPulse(true);
      const pulse = await fetchDvnPulse(dvnAddress);

      if (pulse) {
        console.log('✅ Live Pulse Data:', pulse);
        setLivePulse(pulse);
      } else {
        console.log('⚠️ No live pulse found (using static only)');
      }
      setLoadingPulse(false);
    }
    loadLivePulse();
  }, [dvnAddress, isWalletMode]);

  /* -------------------------------------------------------------------------- */
  /*                            HOOKS (Must run unconditionally)                */
  /* -------------------------------------------------------------------------- */

  const dvnMeta = getDVNMetadata(dvnAddress, 30184);
  const dvnName = dvnMeta.name || dvnAddress;

  // Merge Live Pulse with Static Data
  const stats = useMemo(() => {
    if (!data) return null;

    // 1. Filter local transactions (Base Baseline)
    const localTxs = (data.transactions || []).filter(tx => {
      // Safe array access: dvn_stack_names is a string, prefer required_dvn_names/addresses if array
      const stackNames = Array.isArray(tx.required_dvn_names) ? tx.required_dvn_names : [];
      const stackAddrs = Array.isArray(tx.required_dvn_addresses) ? tx.required_dvn_addresses : [];

      const normalizedStack = stackNames.map(n => n.toLowerCase());
      const normalizedAddrs = stackAddrs.map(a => a.toLowerCase());

      // Fallback for flat string matching if needed
      const stringCheck = typeof tx.dvn_stack_names === 'string' && tx.dvn_stack_names.toLowerCase().includes(dvnAddress.toLowerCase());

      return normalizedStack.some(n => n.includes(dvnAddress.toLowerCase()))
        || normalizedAddrs.includes(dvnAddress.toLowerCase())
        || stringCheck;
    });

    // 2. Add Live Pulse Transactions if available
    const mergedTxs = livePulse ? [...localTxs, ...livePulse.recentTxs] : localTxs;

    const delivered = mergedTxs.filter(tx => tx.delivery_status === 'Delivered' || tx.status === 'Delivered');
    const failed = mergedTxs.filter(tx => tx.delivery_status === 'Failed' || tx.status === 'Failed');

    // 3. Compute Metrics (Prioritize Live Pulse for Heuristics)
    const totalVolume = mergedTxs.reduce((acc, tx) => acc + (parseFloat(tx.amount_usd) || 0), 0);
    const deliveredVolume = delivered.reduce((acc, tx) => acc + (parseFloat(tx.amount_usd) || 0), 0);
    const undeliveredVolume = totalVolume - deliveredVolume;

    const avgLatency = livePulse
      ? livePulse.avgLatency // Trust live global sample if available
      : (delivered.reduce((acc, tx) => acc + (parseFloat(tx.latency_seconds) || 0), 0) / (delivered.length || 1));

    const successRate = livePulse
      ? livePulse.successRate.toFixed(1)
      : ((delivered.length / (mergedTxs.length || 1)) * 100).toFixed(1);

    // Unique Chains Coverage
    const uniqueChains = livePulse
      ? livePulse.uniqueChains
      : new Set(mergedTxs.map(t => t.source_chain_eid || t.source_chain)).size;

    // Reliability Tier Logic
    let reliabilityTier = 'Insufficient Data';
    if (mergedTxs.length > 5) {
      if (successRate >= 99) reliabilityTier = 'Excellent';
      else if (successRate >= 95) reliabilityTier = 'Good';
      else if (successRate >= 90) reliabilityTier = 'Acceptable';
      else reliabilityTier = 'At Risk';
    }

    return {
      total: mergedTxs.length,
      delivered: delivered.length,
      failed: failed.length,
      successRate,
      avgLatency,
      deliveredVolume,
      undeliveredVolume,
      uniqueChains,
      reliabilityTier,
      txs: mergedTxs
    };
  }, [data, dvnAddress, livePulse]);

  // Filter transactions for this DVN - now uses stats.txs
  const dvnTransactions = stats?.txs || [];

  const roleStats = useMemo(() => {
    let required = 0, optional = 0;
    dvnTransactions.forEach(tx => {
      const requiredDvns = tx.required_dvn_addresses || [];
      const optionalDvns = tx.optional_dvn_addresses || [];
      if (requiredDvns.includes(dvnAddress)) required++;
      if (optionalDvns.includes(dvnAddress)) optional++;
    });
    return { required, optional, total: required + optional };
  }, [dvnTransactions, dvnAddress]);

  // Group by OAPP
  const oappsUsingDvn = useMemo(() => {
    const oapps = {};
    dvnTransactions.forEach(tx => {
      const oappAddr = tx.oapp_address;
      if (!oappAddr) return;
      if (!oapps[oappAddr]) {
        oapps[oappAddr] = {
          address: oappAddr,
          name: tx.oapp_name || getDVNName(oappAddr),
          transactions: [],
          volume: 0,
          delivered: 0,
          failed: 0
        };
      }
      oapps[oappAddr].transactions.push(tx);
      oapps[oappAddr].volume += parseFloat(tx.amount_usd || 0);

      if ((tx.delivery_status || '').toLowerCase() === 'delivered') {
        oapps[oappAddr].delivered++;
      } else {
        oapps[oappAddr].failed++;
      }
    });

    return Object.values(oapps)
      .map(o => ({
        ...o,
        successRate: o.transactions.length > 0
          ? ((o.delivered / o.transactions.length) * 100).toFixed(1)
          : 0
      }))
      .sort((a, b) => b.volume - a.volume);
  }, [dvnTransactions]);

  // Group by route
  const routePerformance = useMemo(() => {
    const routes = {};
    dvnTransactions.forEach(tx => {
      const srcEid = tx.source_chain_eid;
      const dstEid = tx.destination_chain_eid;
      // Handle both API format (source_chain_name) and local JSON format (source_chain)
      const srcName = tx.source_chain_name || tx.source_chain || (srcEid && CHAIN_INFO[srcEid]?.name) || (srcEid ? `EID ${srcEid}` : 'Unknown');
      const dstName = tx.destination_chain_name || tx.destination_chain || (dstEid && CHAIN_INFO[dstEid]?.name) || (dstEid ? `EID ${dstEid}` : 'Unknown');
      const route = `${srcName} → ${dstName}`;
      if (!routes[route]) {
        routes[route] = {
          route,
          transactions: [],
          totalLatency: 0,
          delivered: 0,
          failed: 0
        };
      }
      routes[route].transactions.push(tx);
      routes[route].totalLatency += parseFloat(tx.latency_seconds || 0);
      if ((tx.delivery_status || '').toLowerCase() === 'delivered') {
        routes[route].delivered++;
      } else {
        routes[route].failed++;
      }
    });

    return Object.values(routes)
      .map(r => ({
        ...r,
        avgLatency: r.transactions.length > 0
          ? (r.totalLatency / r.transactions.length).toFixed(1)
          : 0,
        successRate: r.transactions.length > 0
          ? ((r.delivered / r.transactions.length) * 100).toFixed(1)
          : 0
      }))
      .sort((a, b) => b.transactions.length - a.transactions.length);
  }, [dvnTransactions]);

  const coDvnStats = useMemo(() => {
    const coDvns = {};
    dvnTransactions.forEach(tx => {
      const allDvns = [
        ...(tx.required_dvn_addresses || []),
        ...(tx.optional_dvn_addresses || [])
      ];
      allDvns.forEach(addr => {
        if (addr === dvnAddress) return;
        if (!coDvns[addr]) {
          coDvns[addr] = {
            address: addr,
            name: getDVNName(addr, 30184) || addr.slice(0, 10) + '...',
            count: 0,
            delivered: 0,
            failed: 0
          };
        }
        coDvns[addr].count++;
        if ((tx.delivery_status || '').toLowerCase() === 'delivered') {
          coDvns[addr].delivered++;
        } else {
          coDvns[addr].failed++;
        }
      });
    });
    return Object.values(coDvns)
      .map(d => ({
        ...d,
        successRate: d.count > 0
          ? ((d.delivered / d.count) * 100).toFixed(1)
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [dvnTransactions, dvnAddress]);

  const overallStats = useMemo(() => {
    const total = dvnTransactions.length;
    const delivered = dvnTransactions.filter(tx => (tx.delivery_status || '').toLowerCase() === 'delivered').length;
    const failed = total - delivered;
    let deliveredVolume = 0;
    let undeliveredVolume = 0;
    const uniqueChains = new Set();
    dvnTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount_usd || 0);
      if ((tx.delivery_status || '').toLowerCase() === 'delivered') {
        deliveredVolume += amount;
      } else {
        undeliveredVolume += amount;
      }
      // Handle both API format (eid numbers) and local JSON format (chain names)
      if (tx.source_chain_eid) uniqueChains.add(tx.source_chain_eid);
      else if (tx.source_chain) uniqueChains.add(tx.source_chain);
      if (tx.destination_chain_eid) uniqueChains.add(tx.destination_chain_eid);
      else if (tx.destination_chain) uniqueChains.add(tx.destination_chain);
    });
    const totalVolume = deliveredVolume + undeliveredVolume;
    const totalLatency = dvnTransactions.reduce((sum, tx) => sum + parseFloat(tx.latency_seconds || 0), 0);
    const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;
    let reliabilityTier = 'Unknown';
    if (total >= 100) {
      if (parseFloat(successRate) >= 99) reliabilityTier = 'Excellent';
      else if (parseFloat(successRate) >= 95) reliabilityTier = 'Good';
      else if (parseFloat(successRate) >= 90) reliabilityTier = 'Acceptable';
      else reliabilityTier = 'At Risk';
    } else if (total > 0) {
      reliabilityTier = 'Insufficient Data';
    }
    return {
      total,
      delivered,
      failed,
      successRate,
      totalVolume,
      deliveredVolume,
      undeliveredVolume,
      avgLatency: total > 0 ? (totalLatency / total).toFixed(1) : 0,
      uniqueChains: uniqueChains.size,
      reliabilityTier
    };
  }, [dvnTransactions]);

  // RISK ANALYSIS (Sketch Alignment)
  const riskProfile = useMemo(() => {
    return calculateConcentrationRisk([dvnAddress], 30184, [], true);
  }, [dvnAddress]);

  /* -------------------------------------------------------------------------- */
  /*                            CONDITIONAL RENDERING                           */
  /* -------------------------------------------------------------------------- */

  if (isWalletMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="text-blue-400" />
              Trader Profile
            </h2>
            <p className="text-sm text-gray-400 font-mono">{dvnAddress}</p>
          </div>
        </div>

        {/* TRADER METRICS DASHBOARD */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Volume */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Activity size={16} className="text-emerald-400" />
              Total Volume
            </div>
            <div className="text-3xl font-bold text-white">
              ${parseFloat(traderStats.totalVolumeUsd || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Cross-chain value moved</div>
          </div>

          {/* Top Asset */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Globe size={16} className="text-purple-400" />
              Top Asset
            </div>
            <div className="text-2xl font-bold text-white truncate">
              {traderStats.topAsset || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Most frequently bridged</div>
          </div>

          {/* Top Route */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <TrendingUp size={16} className="text-blue-400" />
              Favorite Route
            </div>
            <div className="text-xl font-bold text-white truncate">
              {traderStats.topRoute || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {traderStats.topRouteCount || 0} transactions
            </div>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="font-bold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {(data.transactions || []).slice(0, 10).map((tx, i) => (
              <div key={i} className="bg-black border border-gray-800 rounded p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-400 w-32">{new Date(tx.source_timestamp).toLocaleString()}</div>
                  <div>
                    <div className="font-medium text-sm text-white">
                      {tx.source_chain_name} → {tx.destination_chain_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tx.oapp_display_name} • {tx.amount_tokens} {tx.asset_symbol}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${tx.delivery_status === 'Delivered' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {tx.delivery_status}
                  </div>
                  {tx.amount_usd > 0 && (
                    <div className="text-xs text-gray-400">${tx.amount_usd}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // RENDER STANDARD VIEW
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{dvnName}</h2>
          <p className="text-sm text-gray-400 font-mono">{dvnAddress}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${dvnMeta.jurisdiction === 'EU' ? 'bg-blue-900/50 text-blue-300 border border-blue-800' :
              dvnMeta.jurisdiction === 'US' ? 'bg-red-900/50 text-red-300 border border-red-800' :
                dvnMeta.jurisdiction === 'APAC' ? 'bg-purple-900/50 text-purple-300 border border-purple-800' :
                  'bg-gray-800 text-gray-400 border border-gray-700'
              }`}>
              <Globe size={12} /> {dvnMeta.jurisdiction || 'Unknown'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
              {dvnMeta.type || 'DVN'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold flex items-center gap-2 text-lg">
            <Shield size={18} className="text-emerald-400" />
            DVN Profile &amp; Attributes
          </h3>
          <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${overallStats.reliabilityTier === 'Excellent' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' :
            overallStats.reliabilityTier === 'Good' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
              overallStats.reliabilityTier === 'Acceptable' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                overallStats.reliabilityTier === 'At Risk' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                  'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
            {overallStats.reliabilityTier}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="bg-black border border-gray-800 rounded p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Volume Delivered</div>
            <div className="text-lg font-bold text-emerald-400">{formatUsd(overallStats.deliveredVolume)}</div>
            <div className="text-xs text-gray-500 mt-1">Confirmed secured</div>
          </div>
          <div className="bg-black border border-gray-800 rounded p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Volume Undelivered</div>
            <div className={`text-lg font-bold ${overallStats.undeliveredVolume > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {formatUsd(overallStats.undeliveredVolume)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{overallStats.undeliveredVolume > 0 ? '⚠️ At risk' : '✅ None'}</div>
          </div>
          <div className="bg-black border border-gray-800 rounded p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Total Transactions</div>
            <div className="text-lg font-bold text-white">{overallStats.total.toLocaleString()}</div>
            <div className="text-xs text-emerald-400 mt-1">{overallStats.delivered.toLocaleString()} delivered</div>
          </div>
          <div className="bg-black border border-gray-800 rounded p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Success Rate</div>
            <div className={`text-lg font-bold ${parseFloat(overallStats.successRate) >= 99 ? 'text-emerald-400' :
              parseFloat(overallStats.successRate) >= 95 ? 'text-blue-400' :
                parseFloat(overallStats.successRate) >= 90 ? 'text-yellow-400' : 'text-red-400'
              }`}>{overallStats.successRate}%</div>
            <div className="text-xs text-red-400 mt-1">{overallStats.failed} failed</div>
          </div>
          <div className="bg-black border border-gray-800 rounded p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Chains Covered</div>
            <div className="text-lg font-bold text-purple-400">{overallStats.uniqueChains}</div>
            <div className="text-xs text-gray-500 mt-1">Unique networks</div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-black border border-gray-800 rounded p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Type</div>
            <div className="text-sm font-bold text-white">{dvnMeta.type || 'Independent'}</div>
            <div className="text-xs text-gray-500 mt-1">{dvnMeta.infrastructure || 'Self-Hosted'}</div>
          </div>
          <div className="bg-black border border-gray-800 rounded p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Jurisdiction</div>
            <div className={`text-sm font-bold ${dvnMeta.jurisdiction === 'US' ? 'text-red-400' :
              dvnMeta.jurisdiction === 'EU' ? 'text-blue-400' :
                dvnMeta.jurisdiction === 'APAC' ? 'text-purple-400' : 'text-gray-400'
              }`}>{dvnMeta.jurisdiction || 'Unknown'}</div>
          </div>
          <div className="bg-black border border-gray-800 rounded p-3">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Avg Latency</div>
            <div className="text-sm font-bold text-white">{formatLatency(overallStats.avgLatency)}</div>
          </div>
        </div>
      </div>

      {/* RISK ANALYSIS BLOCK (Matches Sketch) */}
      <div className="bg-[#151921] border border-gray-800 rounded-lg p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold flex items-center gap-2 text-gray-200">
            <Shield size={18} className="text-orange-400" />
            CONCENTRATION RISK ANALYSIS
          </h3>
          <div className="text-xl font-mono font-bold text-red-400">
            {riskProfile.overallScore}/100
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <RiskSegment
            title="Jurisdictional Concentration"
            data={riskProfile.details.jurisdictions}
          />
          <RiskSegment
            title="Infrastructure Impact"
            data={riskProfile.details.infrastructures}
          />
          <RiskSegment
            title="Entity Diversity"
            data={riskProfile.details.types}
          />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded p-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Institutional Recommendations:</h4>
          {riskProfile.recommendations.length > 0 ? (
            <ul className="space-y-1">
              {riskProfile.recommendations.map((rec, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span>⚠️</span>
                  <span className="text-gray-300">{rec.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No specific warnings. Single-operator risk applies.</p>
          )}
          <div className="mt-2 text-xs text-yellow-500/80">
            * Note: Single DVN configurations inherently carry 100% concentration risk by definition.
            Institutions should use Multi-DVN stacks (e.g. 1 Required + 2 Optional) to lower this score.
          </div>
        </div>
      </div>

      {/* Detailed Metrics Sections */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="font-bold mb-4">Top OApps</h3>
          {oappsUsingDvn.slice(0, 5).map((o, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800 last:border-0">
              <span>{o.name}</span>
              <span className="text-emerald-400">{formatUsd(o.volume)}</span>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="font-bold mb-4">Top Routes</h3>
          {routePerformance.slice(0, 5).map((r, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800 last:border-0">
              <span>{r.route}</span>
              <span className="text-emerald-400">{r.transactions.length} txs</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
