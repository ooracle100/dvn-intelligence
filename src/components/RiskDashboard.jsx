import React from 'react';
import { calculateConcentrationRisk } from '../utils/riskAnalysis';
import RiskSegment from './RiskSegment';

/**
 * RiskDashboard Component
 * Visualizes the concentration risk of a specific DVN stack.
 * Features:
 * - Overall Risk Score (0-100)
 * - Breakdown by Category (Jurisdiction, Infra, Entity)
 * - Recommendations Engine
 * - Data Confidence Disclaimer
 */
const RiskDashboard = ({ dvnStack, chainId, isStandalone = false, liveAlerts = { blocked: [], failed: [] } }) => {
    // dvnStack is an array of names or addresses, e.g., ["Google Cloud", "LayerZero Labs"]
    const risk = calculateConcentrationRisk(dvnStack || [], chainId, [], isStandalone);

    // LIVE INTELLIGENCE BLENDING
    // Check if any selected DVN is currently experiencing failures on mainnet
    const liveFailures = (liveAlerts.failed || []).filter(f =>
        dvnStack.some(d => (f.dvn_name || '').includes(d))
    );
    const liveBlocked = (liveAlerts.blocked || []).filter(b =>
        dvnStack.some(d => (b.dvn_name || '').includes(d))
    );

    // Apply Live Penalties
    if (liveFailures.length > 0) {
        risk.overallScore = Math.min(100, risk.overallScore + 20); // +20 Penalty for active failures
        risk.recommendations.unshift({
            severity: 'critical',
            message: `LIVE ALERT: ${liveFailures.length} active failure(s) detected for selected DVNs. Performance degradation likely.`
        });
    }

    const getScoreColor = (score) => {
        if (score < 20) return 'text-emerald-400';
        if (score < 50) return 'text-yellow-400';
        if (score < 80) return 'text-orange-500';
        return 'text-red-500';
    };

    return (
        <div className="bg-[#0f1218] border border-gray-800 rounded-lg p-5 mt-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-gray-200 font-bold text-lg flex items-center gap-2">
                    {isStandalone ? '🛡️ DVN Profile & Attributes' : '🛡️ Concentration Risk Analysis'}
                    <span className="text-xs font-normal text-gray-500 px-2 py-0.5 border border-gray-700 rounded">Beta</span>
                    {(liveFailures.length > 0 || liveBlocked.length > 0) && (
                        <span className="text-[10px] bg-red-900/50 text-red-400 border border-red-800 px-1.5 py-0.5 rounded animate-pulse">
                            🔴 LIVE ISSUES
                        </span>
                    )}
                </h3>
                <div className={`text-2xl font-mono font-bold ${getScoreColor(risk.overallScore)}`}>
                    {risk.overallScore}/100
                    <span className="text-xs text-gray-500 ml-1 block text-right">
                        {isStandalone ? 'ATTR SCORE' : 'RISK SCORE'}
                    </span>
                </div>
            </div>

            {/* Breakdown Bars (Stacked/Segmented) */}
            <div className="space-y-4 mb-6">
                <RiskSegment
                    title="Jurisdictional Diversity"
                    data={dvnStack.map(d => {
                        const meta = calculateConcentrationRisk([d], chainId, [], isStandalone).details.jurisdictions[0] || 'Unknown';
                        return meta;
                    })}
                />
                <RiskSegment
                    title="Infrastructure Diversity"
                    data={dvnStack.map(d => {
                        const meta = calculateConcentrationRisk([d], chainId, [], isStandalone).details.infrastructures[0] || 'Unknown';
                        return meta;
                    })}
                />
                <RiskSegment
                    title="Trust Model Diversity"
                    data={dvnStack.map(d => {
                        const meta = calculateConcentrationRisk([d], chainId, [], isStandalone).details.types[0] || 'Unknown';
                        return meta;
                    })}
                />
            </div>

            {/* Recommendations */}
            {risk.recommendations.length > 0 && (
                <div className="bg-[#1a1d24] rounded p-3 mb-4">
                    <h4 className="text-gray-300 text-xs font-bold uppercase mb-2">Institutional Recommendations</h4>
                    <ul className="space-y-2">
                        {risk.recommendations.map((rec, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                                <span className={rec.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}>
                                    {rec.severity === 'critical' ? '⛔' : '⚠️'}
                                </span>
                                <span className="text-gray-400">{rec.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Disclaimer */}
            <div className="text-[10px] text-gray-600 border-t border-gray-800 pt-3 mt-2 flex items-start gap-2">
                <span>ℹ️</span>
                <p>
                    Risk scores calculate diversity across Jurisdiction, Infrastructure, and Trust Models.
                    Zero correlation (0%) is ideal. High correlation (100%) indicates single points of failure.
                </p>
            </div>
        </div>
    );
};

// Helper Component moved to src/components/RiskSegment.jsx

export default RiskDashboard;
