// components/MetricCard.jsx
import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * MetricCard component for displaying key performance metrics
 * @param {string} label - Metric label (e.g., "TOTAL TXS")
 * @param {string|number} value - Metric value to display
 * @param {string} sublabel - Optional secondary label
 */
export default function MetricCard({ label, value, sublabel }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 tracking-wider">{label}</p>
        <CheckCircle className="text-gray-600" size={16} />
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      {sublabel && <p className="text-xs text-gray-600">{sublabel}</p>}
    </div>
  );
}