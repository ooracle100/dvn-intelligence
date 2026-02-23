// src/components/DVNProfile.jsx
// ENHANCED: DB-powered routes/stacks, volume chart, real metrics

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DVN_REGISTRY, CHAIN_INFO } from '../utils/dvnRegistry';
import { intelligenceService } from '../services/IntelligenceService';
import LoadingSpinner from './LoadingSpinner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line
} from 'recharts';

import dvnSnapshots from '../data/dvnSnapshots.json';

function DVNProfile() {
  const { dvnId } = useParams();
  // Try direct lookup, then lowercase lookup (registry keys are lowercase)
  const dvnData = DVN_REGISTRY[dvnId] || DVN_REGISTRY[dvnId?.toLowerCase()];

  const [staticMetrics, setStaticMetrics] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [history, setHistory] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  // Load static snapshot
  useEffect(() => {
    if (!dvnId) return;

    const snapshot = dvnSnapshots.dvns?.[dvnId];
    if (snapshot) {
      console.log(`[DVNProfile] Loaded static snapshot for ${dvnId}`);
      setStaticMetrics(snapshot);
    }
  }, [dvnId]);

  // Fetch live metrics
  useEffect(() => {
    if (!dvnId || !dvnData) return;

    let isMounted = true;

    async function fetchLiveMetrics() {
      setIsUpdating(true);
      setUpdateError(null);

      try {
        console.log(`[DVNProfile] Fetching live metrics for ${dvnId}...`);

        const feedData = await intelligenceService.getLiveFeed(1000);
        const transactions = feedData.recent || [];

        if (!isMounted) return;

        const metrics = calculateDVNMetrics(transactions, dvnId, dvnData);

        if (isMounted) {
          setLiveMetrics(metrics);
          console.log(`[DVNProfile] Live metrics: `, metrics);
        }
      } catch (error) {
        console.error(`[DVNProfile] Live fetch failed: `, error);
        if (isMounted) {
          setUpdateError(error.message);
        }
      } finally {
        if (isMounted) {
          setIsUpdating(false);
        }
      }
    }

    const timer = setTimeout(fetchLiveMetrics, 500);

    // Fetch Historical Data (Once)
    intelligenceService.getHistoricalDVNStats(dvnId).then(hist => {
      if (hist) {
        console.log('[DVNProfile] History loaded:', hist);
        setHistory(hist);
      }
    });

    // Fetch Analytics (routes + stacks from DB)
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/dvn/${dvnId}/analytics`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            console.log('[DVNProfile] Analytics loaded:', data);
            setAnalytics(data);
          }
        }
      } catch (err) {
        console.warn('[DVNProfile] Failed to fetch DVN analytics:', err);
      }
    };
    fetchAnalytics();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [dvnId, dvnData]);

  // Merge metrics: use live for real-time data, but preserve snapshot volume if live has none
  let displayMetrics = null;
  let dataSource = null;

  if (liveMetrics && staticMetrics) {
    // Merge: prefer live metrics but use snapshot volume if live volume is 0
    const liveVolume = parseFloat(liveMetrics.totalVolumeUsd || 0);
    const snapshotVolume = staticMetrics.totalVolume || staticMetrics.totalVolumeUsd || 0;

    // Check if live data has valid stack metrics (volume > 0)
    const liveStacksHaveVolume = liveMetrics.enhancedStacks?.some(s => parseFloat(s.totalVolumeUsd) > 0);

    displayMetrics = {
      ...liveMetrics,
      // Use snapshot volume if live volume is 0 (live feed doesn't decode amounts)
      totalVolumeUsd: liveVolume > 0 ? liveMetrics.totalVolumeUsd : snapshotVolume,
      // Use snapshot stacks if live stacks lack volume metrics
      enhancedStacks: liveStacksHaveVolume ? liveMetrics.enhancedStacks : (staticMetrics.topStacks || []),
      topStacks: liveStacksHaveVolume ? liveMetrics.topStacks : (staticMetrics.topStacks || []),
      // Also preserve decoded transaction count from snapshot
      decodedTransactions: staticMetrics.decodedTransactions || 0,
      avgTransactionSize: staticMetrics.avgTransactionSize || 0
    };
    dataSource = 'merged';
  } else if (liveMetrics) {
    displayMetrics = liveMetrics;
    dataSource = 'live';
  } else if (staticMetrics) {
    // Normalize field name: snapshot uses totalVolume, component expects totalVolumeUsd
    displayMetrics = {
      ...staticMetrics,
      totalVolumeUsd: staticMetrics.totalVolume || staticMetrics.totalVolumeUsd || 0
    };
    dataSource = 'static';
  }

  // OVERRIDE: Inject Historical Data if available
  if (history && displayMetrics) {
    const liveFee = displayMetrics.avgDVNFee;
    // Use sampled fee from DB (enrich_fees.js), fall back to live feed fee
    const sampledFee = history.allTime?.avg_dvn_fee_usd;
    const resolvedFee = sampledFee && sampledFee > 0
      ? sampledFee.toFixed(2)
      : (liveFee || null);

    displayMetrics = {
      ...displayMetrics,
      totalVolumeUsd: history.allTime.total_volume_usd || displayMetrics.totalVolumeUsd,
      successRate: ((history.allTime.success_count / history.allTime.tx_count) * 100).toFixed(2),
      delivered: history.allTime.success_count,
      failed: history.allTime.failure_count,
      transactionCount: history.allTime.tx_count,
      avgDVNFee: resolvedFee,
      isSampledFee: !!(sampledFee && sampledFee > 0),
      dataSource: 'history'
    };
  }

  // OVERRIDE: Inject DB-powered routes and stacks
  if (analytics && displayMetrics) {
    if (analytics.routes && analytics.routes.length > 0) {
      displayMetrics.topRoutes = analytics.routes.map(r => ({
        route: `${r.source_chain} → ${r.dest_chain}`,
        count: r.tx_count,
        volume: r.volume_usd,
        successRate: r.success_rate?.toFixed(1),
        avgLatency: r.avg_latency?.toFixed(1)
      }));
    }
    if (analytics.stacks && analytics.stacks.length > 0) {
      displayMetrics.enhancedStacks = analytics.stacks.map(s => ({
        stack: s.stack_dvns,
        count: s.tx_count,
        successRate: s.success_rate,
        totalVolumeUsd: s.volume_usd?.toFixed(2) || '0',
        avgLatency: s.avg_latency || null
      }));
    }
  }

  if (!dvnData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">DVN not found</p>
          <Link to="/dvn-marketplace" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!displayMetrics && !isUpdating) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link to="/dvn-marketplace" className="text-gray-400 hover:text-white mb-4 inline-block">
            ← Back to Marketplace
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{dvnData.name}</h1>
              <div className="flex items-center gap-4 text-gray-400">
                <span className="px-3 py-1 bg-gray-800 rounded text-sm">{dvnData.type}</span>
                <span>{dvnData.jurisdiction}</span>
                <span>•</span>
                <span>{dvnData.infrastructure}</span>
                {history?.allTime?.success_count && (
                  <>
                    <span>•</span>
                    <span className="text-green-400">
                      {((history.allTime.success_count / history.allTime.tx_count) * 100).toFixed(2)}% Uptime
                    </span>
                  </>
                )}
              </div>
            </div>

            <DataFreshness
              dataSource={dataSource}
              isUpdating={isUpdating}
              lastUpdated={displayMetrics?.lastUpdated}
              error={updateError}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {displayMetrics ? (
          <>
            <MetricsOverview metrics={displayMetrics} />

            {/* HISTORICAL CHARTS */}
            {history && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-6">Daily Activity (4 Months)</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={history.daily.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="period_start"
                        tickFormatter={(unix) => new Date(unix * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        stroke="#9ca3af"
                        fontSize={12}
                      />
                      <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#a78bfa"
                        fontSize={12}
                        tickFormatter={(v) => {
                          if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
                          if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
                          if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
                          return `$${v}`;
                        }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelFormatter={(unix) => new Date(unix * 1000).toLocaleDateString()}
                        formatter={(value, name) => {
                          if (name === 'Volume') {
                            if (value >= 1e9) return [`$${(value / 1e9).toFixed(2)}B`, name];
                            if (value >= 1e6) return [`$${(value / 1e6).toFixed(2)}M`, name];
                            if (value >= 1e3) return [`$${(value / 1e3).toFixed(2)}K`, name];
                            return [`$${value?.toFixed(2)}`, name];
                          }
                          return [value?.toLocaleString(), name];
                        }}
                      />
                      <Bar yAxisId="left" dataKey="tx_count" name="Transactions" fill="#3b82f6" />
                      <Bar yAxisId="left" dataKey="failure_count" name="Failed" fill="#ef4444" />
                      <Line yAxisId="right" type="monotone" dataKey="total_volume_usd" name="Volume" stroke="#a78bfa" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <PerformanceCharts metrics={displayMetrics} />
            <TopRoutes routes={displayMetrics.topRoutes || []} />
            <EnhancedStacks stacks={displayMetrics.enhancedStacks || displayMetrics.topStacks || []} />
            <TechnicalDetails dvnData={dvnData} />
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <LoadingSpinner />
            <p className="mt-4">Loading metrics...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DataFreshness({ dataSource, isUpdating, lastUpdated, error }) {
  if (error) {
    return (
      <div className="text-right">
        <p className="text-xs text-red-400">⚠️ Live update failed</p>
        <p className="text-xs text-gray-500">Showing cached data</p>
      </div>
    );
  }

  if (isUpdating) {
    return (
      <div className="text-right">
        <p className="text-xs text-blue-400 animate-pulse">⟳ Updating...</p>
        <p className="text-xs text-gray-500">Fetching live data</p>
      </div>
    );
  }

  if (dataSource === 'live' || dataSource === 'merged') {
    return (
      <div className="text-right">
        <p className="text-xs text-green-400">✓ {dataSource === 'merged' ? 'Live + Snapshot' : 'Live Data'}</p>
        <p className="text-xs text-gray-500">{dataSource === 'merged' ? 'Volume from snapshot' : 'Just updated'}</p>
      </div>
    );
  }

  if (dataSource === 'static' && lastUpdated) {
    const date = new Date(lastUpdated);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <div className="text-right">
        <p className="text-xs text-gray-400">📊 Snapshot</p>
        <p className="text-xs text-gray-500">
          {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
        </p>
      </div>
    );
  }

  return null;
}

function MetricsOverview({ metrics }) {
  const cards = [
    {
      label: 'Success Rate',
      value: metrics.successRate ? `${metrics.successRate}%` : 'N/A',
      subtext: `${metrics.delivered || 0} delivered, ${metrics.failed || 0} failed`,
      color: 'text-green-400'
    },
    {
      label: 'Avg Latency',
      value: metrics.avgLatency ? `${metrics.avgLatency}s` : 'N/A',
      subtext: 'Time to delivery',
      color: 'text-blue-400'
    },
    {
      label: 'Total Volume',
      value: (() => {
        const vol = parseFloat(metrics.totalVolumeUsd || 0);
        if (vol <= 0) return '$0';
        if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
        if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
        if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
        return `$${vol.toFixed(2)}`;
      })(),
      subtext: metrics.dataSource === 'history'
        ? 'Verified Historical Volume'
        : `${metrics.transactionCount?.toLocaleString() || 0} recent transactions`,
      color: 'text-purple-400'
    },
    {
      label: 'Avg DVN Fee',
      value: metrics.avgDVNFee ? `$${metrics.avgDVNFee}` : 'N/A',
      subtext: metrics.isSampledFee
        ? 'Per transaction (sampled)'
        : metrics.avgDVNFee
          ? 'Per transaction (live data)'
          : metrics.dataSource === 'history'
            ? 'Fee data requires live lookup'
            : 'Insufficient data',
      color: 'text-yellow-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-2">{card.label}</p>
          <p className={`text-3xl font-bold mb-1 ${card.color}`}>{card.value}</p>
          <p className="text-gray-500 text-xs">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}

function PerformanceCharts({ metrics }) {
  const total = metrics.transactionCount || 0;
  const delivered = metrics.delivered || 0;
  const failed = metrics.failed || 0;
  const inflight = metrics.inflight || 0;

  if (total === 0) return null;

  const deliveredPct = ((delivered / total) * 100).toFixed(1);
  const failedPct = ((failed / total) * 100).toFixed(1);
  const inflightPct = ((inflight / total) * 100).toFixed(1);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold mb-6">Transaction Status Breakdown</h2>

      <div className="space-y-4">
        <StatusBar label="Delivered" count={delivered} percentage={deliveredPct} color="bg-green-500" />
        <StatusBar label="Failed" count={failed} percentage={failedPct} color="bg-red-500" />
        <StatusBar label="Inflight" count={inflight} percentage={inflightPct} color="bg-yellow-500" />
      </div>
    </div>
  );
}

function StatusBar({ label, count, percentage, color }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{count} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TopRoutes({ routes }) {
  if (!routes || routes.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Top Routes</h2>
        <p className="text-gray-500">No route data available</p>
      </div>
    );
  }

  const fmtVol = (v) => {
    if (!v || v <= 0) return (
      <span className="text-gray-600" title="Volume tracking available for Verified OApps only">
        —
      </span>
    );
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Top Routes</h2>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded border border-gray-700">
          Last 6 Months
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Route</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Transactions</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">
                Volume
                <span className="ml-1 text-gray-600 cursor-help" title="USD volume is only tracked for Verified OApps (e.g. USDT, WBTC)">ⓘ</span>
              </th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Success Rate</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route, idx) => (
              <tr key={idx} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                <td className="py-3 px-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-300">{route.route}</span>
                </td>
                <td className="py-3 px-4 text-right font-semibold">{route.count?.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-purple-400">{fmtVol(route.volume)}</td>
                <td className="py-3 px-4 text-right text-green-400">{route.successRate ? `${route.successRate}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnhancedStacks({ stacks }) {
  if (!stacks || stacks.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Common DVN Stacks</h2>
        <p className="text-gray-500">No stack data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Common DVN Stacks</h2>
      <p className="text-gray-400 text-sm mb-4">
        DVN combinations used by applications, with performance metrics
      </p>

      <div className="space-y-3">
        {stacks.map((stack, idx) => {
          const hasMetrics = stack.successRate !== undefined;

          return (
            <div key={idx} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-white">{stack.stack}</span>
                <span className="text-gray-400 text-xs">{stack.count} txs</span>
              </div>

              {hasMetrics && (
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-700">
                  <div>
                    <p className="text-xs text-gray-400">Success Rate</p>
                    <p className="text-sm font-semibold text-green-400">
                      {stack.successRate?.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Avg Latency</p>
                    <p className="text-sm font-semibold text-blue-400">
                      {stack.avgLatency ? `${stack.avgLatency.toFixed(1)}s` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Volume</p>
                    <p className="text-sm font-semibold text-purple-400">
                      {stack.totalVolumeUsd ? `$${parseFloat(stack.totalVolumeUsd).toLocaleString()}` : '$0'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TechnicalDetails({ dvnData }) {
  const chainCount = Object.keys(dvnData.addresses || {}).length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Technical Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetailRow label="Security Model" value={dvnData.securityModel} />
        <DetailRow label="Regulator" value={dvnData.regulator} />
        <DetailRow label="Infrastructure" value={dvnData.infrastructure} />
        <DetailRow label="Chain Coverage" value={`${chainCount} chains`} />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Deployed Addresses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
          {Object.entries(dvnData.addresses || {}).map(([chainEid, address]) => {
            const chainName = CHAIN_INFO[chainEid]?.name || `Chain ${chainEid}`;
            return (
              <div key={chainEid} className="flex justify-between items-center p-2 bg-gray-800 rounded text-xs">
                <span className="text-gray-400">{chainName}</span>
                <span className="font-mono text-gray-300">{address.slice(0, 10)}...{address.slice(-8)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}

function formatRouteWithNames(route) {
  const [srcEid, dstEid] = route.split('-').map(Number);
  const srcName = CHAIN_INFO[srcEid]?.name || `Chain ${srcEid}`;
  const dstName = CHAIN_INFO[dstEid]?.name || `Chain ${dstEid}`;
  return `${srcName} → ${dstName}`;
}

function calculateDVNMetrics(transactions, dvnId, dvnData) {
  const dvnAddresses = Object.values(dvnData.addresses).map(a => a.toLowerCase());

  const dvnTxs = transactions.filter(tx => {
    const allDVNs = [
      ...(tx.required_dvn_addresses || []).map(a => a.toLowerCase()),
      ...(tx.optional_dvn_addresses || []).map(a => a.toLowerCase())
    ];
    return dvnAddresses.some(addr => allDVNs.includes(addr));
  });

  if (dvnTxs.length === 0) return null;

  const delivered = dvnTxs.filter(tx => tx.delivery_status === 'Delivered').length;
  const failed = dvnTxs.filter(tx => tx.delivery_status === 'Failed').length;
  const inflight = dvnTxs.filter(tx => tx.delivery_status === 'Inflight').length;

  const successRate = dvnTxs.length > 0 ? (delivered / dvnTxs.length) * 100 : 0;

  const deliveredTxs = dvnTxs.filter(tx =>
    tx.delivery_status === 'Delivered' && tx.latency_seconds
  );

  const avgLatency = deliveredTxs.length > 0
    ? deliveredTxs.reduce((sum, tx) => sum + tx.latency_seconds, 0) / deliveredTxs.length
    : null;

  // Calculate REAL volume from decoded amounts
  let totalVolumeUsd = 0;
  let totalDVNFees = 0;
  let feeCount = 0;

  dvnTxs.forEach(tx => {
    if (tx.amount_usd) {
      totalVolumeUsd += parseFloat(tx.amount_usd);
    }
    if (tx.dvn_fee_usd) {
      totalDVNFees += parseFloat(tx.dvn_fee_usd);
      feeCount++;
    }
  });

  // Use sampled fee from server if available, otherwise fall back to transaction aggregation
  const sampledFee = dvnData?.allTime?.avg_dvn_fee_usd;
  const avgDVNFee = sampledFee
    ? sampledFee.toFixed(2)
    : (feeCount > 0 ? (totalDVNFees / feeCount).toFixed(2) : null);

  const isSampledFee = !!sampledFee;

  const uniqueOApps = new Set(dvnTxs.map(tx => tx.oapp_address).filter(Boolean));

  // Top routes with chain names
  const routes = {};
  dvnTxs.forEach(tx => {
    const route = `${tx.source_chain_eid}-${tx.destination_chain_eid}`;
    routes[route] = (routes[route] || 0) + 1;
  });
  const topRoutes = Object.entries(routes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }));

  // ENHANCED stacks with metrics
  const stackMetrics = {};
  dvnTxs.forEach(tx => {
    const stackName = (tx.required_dvn_names || []).sort().join(' + ') || 'Unknown';

    if (!stackMetrics[stackName]) {
      stackMetrics[stackName] = {
        count: 0,
        delivered: 0,
        totalLatency: 0,
        latencyCount: 0,
        totalVolume: 0
      };
    }

    stackMetrics[stackName].count++;

    if (tx.delivery_status === 'Delivered') {
      stackMetrics[stackName].delivered++;
      if (tx.latency_seconds) {
        stackMetrics[stackName].totalLatency += tx.latency_seconds;
        stackMetrics[stackName].latencyCount++;
      }
    }

    if (tx.amount_usd) {
      stackMetrics[stackName].totalVolume += parseFloat(tx.amount_usd);
    }
  });

  const enhancedStacks = Object.entries(stackMetrics)
    .map(([stack, metrics]) => ({
      stack,
      count: metrics.count,
      successRate: (metrics.delivered / metrics.count) * 100,
      avgLatency: metrics.latencyCount > 0 ? metrics.totalLatency / metrics.latencyCount : null,
      totalVolumeUsd: metrics.totalVolume.toFixed(2)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    transactionCount: dvnTxs.length,
    successRate: parseFloat(successRate.toFixed(2)),
    avgLatency: avgLatency ? parseFloat(avgLatency.toFixed(1)) : null,
    totalVolumeUsd: totalVolumeUsd.toFixed(2),
    avgDVNFee,
    isSampledFee,
    uniqueOApps: uniqueOApps.size,
    topRoutes,
    enhancedStacks,
    delivered,
    failed,
    inflight,
    lastUpdated: new Date().toISOString()
  };
}

export default DVNProfile;