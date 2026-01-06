import React from 'react';
import { formatUsd } from '../utils/format';
import { ArrowRight, ShieldAlert } from 'lucide-react';

const WhaleTicker = ({ transactions }) => {
    const whales = (transactions || [])
        .filter(tx => parseFloat(tx.amount_usd || 0) >= 1000000)
        .sort((a, b) => new Date(b.source_timestamp) - new Date(a.source_timestamp))
        .slice(0, 5);

    if (whales.length === 0) return null;

    return (
        <div className="mb-6 border border-blue-900/50 bg-blue-900/10 rounded-lg overflow-hidden">
            <div className="bg-blue-900/30 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="text-blue-400 animate-pulse" size={18} />
                    <h3 className="text-sm font-bold text-blue-100 uppercase tracking-wider">
                        Whale Watch (&gt; $1M USD)
                    </h3>
                </div>
                <div className="text-xs text-blue-400">{whales.length} active movements</div>
            </div>
            <div className="divide-y divide-blue-900/30">
                {whales.map((tx, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-blue-900/5 transition-colors">
                        <div className="flex items-center gap-4">
                            <div>
                                <div className="text-sm font-bold text-gray-200 flex items-center gap-2">
                                    {formatUsd(tx.amount_usd)}
                                    <span className="text-gray-500 text-xs font-normal">via {tx.oapp_name}</span>
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                    {tx.source_chain_name} <ArrowRight size={10} /> {tx.destination_chain_name}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-mono text-emerald-400 border border-emerald-900/50 bg-emerald-900/10 px-2 py-0.5 rounded">
                                {tx.dvn_stack_names || 'Unknown Stack'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default WhaleTicker;
