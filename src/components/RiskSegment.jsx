import React from 'react';

// Helper Component for "Toothpaste" Stacked Bars
const RiskSegment = ({ title, data }) => {
    const total = data.length;
    if (total === 0) return null;

    const counts = data.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});

    const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-gray-500'];

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{title}</span>
                <span className="text-xs text-gray-500">{Object.keys(counts).join(', ')}</span>
            </div>
            <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex w-full">
                {Object.entries(counts).map(([key, count], i) => (
                    <div
                        key={key}
                        className={`h-full ${COLORS[i % COLORS.length]} transition-all duration-500 flex items-center justify-center`}
                        style={{ width: `${(count / total) * 100}%` }}
                        title={`${key}: ${Math.round((count / total) * 100)}%`}
                    >
                        {count > 0 && (
                            <span className="text-[9px] font-bold text-black/70 drop-shadow-none truncate px-1">
                                {key} {Math.round((count / total) * 100)}%
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RiskSegment;
