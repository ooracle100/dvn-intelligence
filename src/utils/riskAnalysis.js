// DVN Concentration Risk Calculator
// Implements Day 3: "Killer Feature" - Risk Scoring
// Based on verified metadata from dvnRegistry.js

import { getDVNMetadata } from './dvnRegistry';

/**
 * Calculates a comprehensive risk score for a DVN stack.
 * @param {Array<string>} dvnAddresses - List of DVN addresses or names in the stack
 * @param {number} chainId - The chain ID (to resolve addresses)
 * @returns {Object} Risk analysis results
 */
export function calculateConcentrationRisk(dvnAddresses, chainId, _unused = [], isStandalone = false) {
    if (!dvnAddresses || dvnAddresses.length === 0) {
        return { overallScore: 100, level: 'CRITICAL', recommendations: ["No verification stack found"] };
    }

    const stackMetadata = dvnAddresses.map(addr => getDVNMetadata(addr, chainId));

    const risks = {
        jurisdictionRisk: 0,
        infrastructureRisk: 0,
        entityRisk: 0,
        overallScore: 0,
        details: {
            jurisdictions: [],
            infrastructures: [],
            types: []
        }
    };

    // 1. Jurisdiction Concentration
    // Risk increases if multiple DVNs share the same jurisdiction (e.g. all US)
    const jurisdictions = stackMetadata.map(m => m.jurisdiction);
    const uniqueJurisdictions = new Set(jurisdictions.filter(j => j !== 'Unknown'));
    const jurisdictionCount = uniqueJurisdictions.size;

    // Formula: (1 - (Unique / Total)) * 100
    // e.g., 3 DVNs, 1 Jurisdiction (US) = (1 - 1/3) * 100 = 66% Risk
    // e.g., 3 DVNs, 3 Jurisdictions = (1 - 3/3) * 100 = 0% Risk
    risks.jurisdictionRisk = Math.round((1 - (jurisdictionCount / Math.max(1, stackMetadata.length))) * 100);
    risks.details.jurisdictions = [...new Set(jurisdictions)];

    // 2. Infrastructure Concentration
    // Risk increases if multiple DVNs share the same cloud provider (e.g. all AWS)
    const infras = stackMetadata.map(m => m.infrastructure);
    const uniqueInfra = new Set(infras.filter(i => i !== 'Unknown'));
    const infraCount = uniqueInfra.size;

    risks.infrastructureRisk = Math.round((1 - (infraCount / Math.max(1, stackMetadata.length))) * 100);
    risks.details.infrastructures = [...new Set(infras)];

    // 3. Entity Type Concentration
    // Risk increases if all DVNs are same type (e.g. all Corporate)
    const types = stackMetadata.map(m => m.type);
    const uniqueTypes = new Set(types.filter(t => t !== 'Unknown'));
    const typeCount = uniqueTypes.size;

    risks.entityRisk = Math.round((1 - (typeCount / Math.max(1, stackMetadata.length))) * 100);
    risks.details.types = [...new Set(types)];

    // 4. Overall Score Calculation
    // Weighted Average: Jurisdiction (40%) + Infra (40%) + Entity (20%)
    risks.overallScore = Math.round(
        (risks.jurisdictionRisk * 0.4) +
        (risks.infrastructureRisk * 0.4) +
        (risks.entityRisk * 0.2)
    );

    // Recommendations Generation
    const recommendations = [];

    if (risks.jurisdictionRisk > 50) {
        const dominantJ = getMode(jurisdictions);
        recommendations.push({
            severity: 'high',
            message: `High Jurisdictional Concentration (${dominantJ}). Consider adding EU or APAC verifiers.`
        });
    }

    if (risks.infrastructureRisk > 50) {
        const dominantI = getMode(infras);
        recommendations.push({
            severity: 'high',
            message: `High Infrastructure Concentration (${dominantI}). ${dominantI === 'AWS' ? 'Add GCP or Self-hosted DVNs.' : 'Diversify cloud providers.'}`
        });
    }

    if (risks.entityRisk > 60) {
        recommendations.push({
            severity: 'medium',
            message: `Homogeneous Entity Types. Mix Corporates with Polyhedra (ZK) or Nethermind (Research).`
        });
    }

    if (stackMetadata.length === 1) {
        recommendations.push({
            severity: 'critical',
            message: 'Single Point of Failure (1/1 DVN). Minimum of 2 required for redundancy.'
        });
        risks.overallScore = Math.max(risks.overallScore, 80); // Floor at 80 for 1/1
    }

    return {
        ...risks,
        recommendations,
        level: getRiskLevel(risks.overallScore)
    };
}

// Helpers
function getMode(array) {
    return array.sort((a, b) =>
        array.filter(v => v === a).length
        - array.filter(v => v === b).length
    ).pop();
}

function getRiskLevel(score) {
    if (score < 20) return 'LOW';
    if (score < 50) return 'MEDIUM';
    if (score < 80) return 'HIGH';
    return 'CRITICAL';
}
