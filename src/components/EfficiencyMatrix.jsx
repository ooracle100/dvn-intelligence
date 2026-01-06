
import React, { useMemo } from 'react';
import { formatUsd, formatLatency } from '../utils/format';

export default function EfficiencyMatrix({ transactions, tokenPrice }) {
    const routes = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        const stats = {};

        transactions.forEach(tx => {
            const src = tx.source_chain || 'Unknown';
            const dst = tx.destination_chain || 'Unknown';
            const key = `${src} → ${dst}`;

            if (!stats[key]) {
                stats[key] = {
                    id: key,
                    source: src,
                    dest: dst,
                    count: 0,
                    delivered: 0,
                    total_latency: 0,
                    latency_count: 0,
                    total_volume: 0,
                    total_fee: 0,
                    fee_count: 0
                };
            }

            const s = stats[key];
            s.count++;

            const isDelivered = tx.delivery_status?.toLowerCase() === 'delivered' || !!tx.destination_tx_hash;
            if (isDelivered) s.delivered++;

            // Parse latency as number (JSON might have it as string)
            const latency = Number(tx.latency_seconds);
            if (latency > 0 && Number.isFinite(latency)) {
                s.total_latency += latency;
                s.latency_count++;
            }

            if (Number(tx.amount_usd) > 0) {
                s.total_volume += Number(tx.amount_usd);
            } else if (tokenPrice > 0 && tx.amount_tokens) {
                // Fallback: Parse "1,234.56 ZRO" -> 1234.56 * price
                try {
                    const rawStr = tx.amount_tokens.split(' ')[0].replace(/,/g, '');
                    const amount = parseFloat(rawStr);
                    if (!isNaN(amount)) {
                        s.total_volume += amount * tokenPrice;
                    }
                } catch (e) { /* ignore */ }
            }

            if (Number(tx.total_fee_usd) > 0) {
                s.total_fee += Number(tx.total_fee_usd);
                s.fee_count++;
            }
        });

        return Object.values(stats).map(s => ({
            ...s,
            avg_latency: s.latency_count > 0 ? s.total_latency / s.latency_count : 0,
            avg_fee: s.fee_count > 0 ? s.total_fee / s.fee_count : 0,
            reliability: s.count > 0 ? (s.delivered / s.count) * 100 : 0
        })).sort((a, b) => b.total_volume - a.total_volume); // Sort by volume by default
    }, [transactions, tokenPrice]);

    if (routes.length === 0) return null;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg text-emerald-400">Route Efficiency Matrix</h3>
                    <p className="text-xs text-gray-500">Performance benchmarking per route (30D)</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400">TOTAL SECURED VOLUME</p>
                    <p className="font-bold text-white">
                        {formatUsd(routes.reduce((acc, r) => acc + r.total_volume, 0))}
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-800">
                            <th className="py-2 pl-2">ROUTE</th>
                            <th className="py-2">VOLUME</th>
                            <th className="py-2">AVG LATENCY</th>
                            <th className="py-2">AVG COST</th>
                            <th className="py-2">RELIABILITY</th>
                            <th className="py-2 pr-2 text-right">TXS</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {routes.map((route) => {
                            // Color coding for Latency
                            let latColor = 'text-gray-300';
                            if (route.avg_latency > 600) latColor = 'text-red-400'; // > 10m
                            else if (route.avg_latency < 60) latColor = 'text-emerald-400'; // < 1m

                            // Color coding for Reliability
                            let relColor = 'text-emerald-400';
                            if (route.reliability < 98) relColor = 'text-yellow-400';
                            if (route.reliability < 90) relColor = 'text-red-400';

                            return (
                                <tr key={route.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                    <td className="py-3 pl-2 font-medium text-white">
                                        {route.source} → {route.dest}
                                    </td>
                                    <td className="py-3 font-medium text-white">
                                        {formatUsd(route.total_volume)}
                                    </td>
                                    <td className={`py-3 font-medium ${latColor}`}>
                                        {route.avg_latency > 0 ? formatLatency(route.avg_latency) : '-'}
                                    </td>
                                    <td className="py-3 text-gray-300">
                                        {route.avg_fee > 0 ? formatUsd(route.avg_fee) : '-'}
                                    </td>
                                    <td className={`py-3 font-medium ${relColor}`}>
                                        {route.reliability.toFixed(1)}%
                                    </td>
                                    <td className="py-3 pr-2 text-right text-gray-400">
                                        {route.count}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
