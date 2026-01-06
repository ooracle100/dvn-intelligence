// src/utils/dvn.js

import { getDVNMetadata } from './dvnRegistry';

export function scoreDvns(data, mode = 'balanced', liveAlerts = []) {
  const dvnStats = {};

  // Process historical transactions
  (data?.transactions || []).forEach(tx => {
    const dvns = [
      ...(tx.required_dvn_addresses || []),
      ...(tx.optional_dvn_addresses || [])
    ];

    dvns.forEach(addr => {
      if (!addr) return;
      const key = addr.toLowerCase();
      if (!dvnStats[key]) {
        dvnStats[key] = {
          address: key,
          total: 0,
          delivered: 0,
          failed: 0,
          totalLatency: 0,
          totalVolume: 0,
          liveFailures: 0
        };
      }

      dvnStats[key].total++;

      // Add volume
      const volume = parseFloat(tx.amount_usd) || 0;
      dvnStats[key].totalVolume += volume;

      const delivered = (tx.delivery_status || '').toLowerCase() === 'delivered';
      if (delivered) {
        dvnStats[key].delivered++;
        if (tx.latency_seconds) {
          dvnStats[key].totalLatency += Number(tx.latency_seconds) || 0;
        }
      } else {
        dvnStats[key].failed++;
      }
    });
  });

  // Inject live network variance (Blocked/Failed messages)
  liveAlerts.forEach(alert => {
    const dvns = [
      ...(alert.required_dvn_addresses || []),
      ...(alert.optional_dvn_addresses || [])
    ];

    dvns.forEach(addr => {
      if (!addr) return;
      const key = addr.toLowerCase();
      if (dvnStats[key]) {
        // Significantly penalize for live blocking
        dvnStats[key].total += 2; // Weight live alerts more heavily
        dvnStats[key].failed += 2;
        dvnStats[key].liveFailures += 1;
      }
    });
  });

  return Object.values(dvnStats)
    .map(dvn => {
      const deliveryRate = dvn.delivered / Math.max(1, dvn.total);
      const avgLatency = dvn.delivered > 0
        ? Math.round(dvn.totalLatency / dvn.delivered)
        : 0;

      // Base score from delivery rate
      let score = deliveryRate * 100;

      // Volume bonus (logarithmic, max +10)
      const volumeBonus = Math.min(10, Math.log10(dvn.totalVolume + 1) * 2);
      score += volumeBonus;

      // --- Latency Penalties (Industry Standard: <60s Fast, <180s Normal) ---
      if (avgLatency > 60) score -= 2;   // Minor penalty for missing 'Fast' tier
      if (avgLatency > 180) score -= 8;  // Significant penalty for 'Slow' tier
      if (avgLatency > 600) score -= 15; // Critical penalty for 'Extreme' latency

      // --- MVP Intelligence: Live Network Penalty ---
      // If a DVN is currently blocking messages, apply a significant deduction
      if (dvn.liveFailures > 0) {
        // Flat 10-point deduction per live blockage to ensure it's visible even for high-volume DVNs
        score -= (dvn.liveFailures * 10);
      }

      // --- Trust & Transparency Penalty (New for Day 4) ---
      // Penalize unknown/unverified DVNs to separate them from Institutional grade
      // This solves the '100% fake feel' by creating a natural spread
      const metadata = getDVNMetadata(dvn.address, 30101); // Default to Eth for metadata lookup
      if (metadata.confidence === 'low') score -= 5;
      if (metadata.jurisdiction === 'Unknown') score -= 2;

      // Clamp 10-100
      score = Math.max(10, Math.min(100, Math.round(score)));

      // --- Institutional Tiers (Grok/Claude Standards) ---
      let tier, color;
      if (score >= 99) { tier = 'Excellent'; color = 'emerald'; }
      else if (score >= 95) { tier = 'Good'; color = 'yellow'; }
      else if (score >= 90) { tier = 'Acceptable'; color = 'orange'; }
      else { tier = 'Unreliable'; color = 'red'; }

      return {
        ...dvn,
        score,
        tier,
        color,
        deliveryRate: Math.round(deliveryRate * 100),
        avgLatency,
        displayVolume: `$${(dvn.totalVolume / 1000000).toFixed(2)}M`,
        // Enriched Metadata for UI
        jurisdiction: metadata.jurisdiction,
        type: metadata.type,
        provider: metadata.name
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculates an institutional-grade risk score for a DVN stack.
 * Uses professional terminology like 'Jurisdictional Concentration' as requested.
 * @param {Array} dvnAddresses - List of DVN addresses in the stack
 * @param {number} chainId - Target chain ID
 * @param {Array} liveAlerts - Live network alerts for context
 * @returns {Object} Risk analysis object
 */
export function calculateRiskScore(dvnAddresses, chainId, liveAlerts = [], isStandalone = false) {
  if (!dvnAddresses || dvnAddresses.length === 0) return { score: 100, level: 'CRITICAL', label: 'No Verification' };

  // 1. Fetch metadata for all DVNs in stack
  const { getDVNMetadata } = require('./dvnRegistry');
  const metadata = dvnAddresses.map(addr => getDVNMetadata(addr, chainId));

  let riskScore = 0;
  const issues = [];

  // 2. Jurisdictional Concentration
  const jurisdictions = new Set(metadata.map(m => m.jurisdiction).filter(j => j && j !== 'Unknown'));
  if (jurisdictions.size === 1 && metadata.length > 1) {
    riskScore += 40;
    issues.push("Jurisdictional Concentration (Single Region)");
  } else if (jurisdictions.size === 1 && metadata[0].jurisdiction === 'Unknown') {
    // Even for standalone, unknown jurisdiction is a risk
    riskScore += 20;
    issues.push("Unknown Jurisdictional Disclosure");
  }

  // 3. Entity Type Diversity (Only relevant for stacks, or if standalone is "Unknown")
  const types = new Set(metadata.map(m => m.type));
  if (types.size === 1 && metadata.length > 1) {
    riskScore += 30;
    issues.push("Homogeneous Infrastructure Entity Types");
  }

  // 4. Stack Size Risk (SKIP for Standalone Profile Mode)
  if (!isStandalone) {
    if (metadata.length === 1) {
      riskScore += 50;
      issues.push("Single Point of Failure (1/1 DVN)");
    } else if (metadata.length === 2) {
      riskScore += 20;
      issues.push("Minimal Redundancy (2/2 DVNs)");
    }
  } else {
    // For standalone, we just highlight data quality risks
    if (metadata[0].confidence === 'low') {
      riskScore += 30;
      issues.push("Low Confidence Metadata");
    }
  }

  // 5. Live Network Health context
  const hasLiveIssue = liveAlerts.some(alert =>
    dvnAddresses.some(addr =>
      (alert.required_dvn_addresses || []).includes(addr)
    )
  );
  if (hasLiveIssue) {
    riskScore += 30;
    issues.push("Active Network Pathway Congestion");
  }

  // Calculate final score (0 = Perfect, 100 = Dangerous)
  const finalScore = Math.min(100, riskScore);

  // Map to institutional levels
  let level, color;
  if (finalScore <= 20) { level = 'LOW'; color = 'emerald'; }
  else if (finalScore <= 50) { level = 'MEDIUM'; color = 'yellow'; }
  else if (finalScore <= 80) { level = 'HIGH'; color = 'orange'; }
  else { level = 'CRITICAL'; color = 'red'; }

  return {
    score: finalScore,
    level,
    color,
    issues,
    label: issues[0] || 'Institutional Grade'
  };
}

/* -------------------------
   Summarizers (after scoreDvns)
   ------------------------- */

export function summarizeDvn(txs, address) {
  const total = txs.length;
  const delivered_txs = txs.filter(t =>
    (t.delivery_status || '').toLowerCase() === 'delivered'
  );
  const failed = total - delivered_txs.length;

  const volume_secured = delivered_txs.reduce((s, t) =>
    s + parseFloat(t.amount_usd || 0), 0
  );

  const successRate = Math.round((delivered_txs.length / Math.max(1, total)) * 100);

  const avgLatency = delivered_txs.length
    ? Number((delivered_txs.reduce((s, t) =>
      s + Number(t.latency_seconds || 0), 0) / delivered_txs.length
    ).toFixed(1))
    : null;

  return {
    address,
    total,
    volume_secured,
    failed,
    successRate,
    avgLatency
  };
}

export function summarizeTransactions(txs) {
  const total = txs.length;
  const volume = txs.reduce((s, t) =>
    s + parseFloat(t.amount_usd || 0), 0
  );

  const failed = txs.filter(t =>
    (t.delivery_status || '').toLowerCase() !== 'delivered'
  ).length;

  const successRate = Math.round(((total - failed) / Math.max(1, total)) * 100);

  const delivered = txs.filter(t =>
    (t.delivery_status || '').toLowerCase() === 'delivered'
  );

  const avgLatency = delivered.length
    ? Number((delivered.reduce((s, t) =>
      s + Number(t.latency_seconds || 0), 0) / Math.max(1, delivered.length)
    ).toFixed(1))
    : null;

  return {
    total,
    volume,
    failed,
    successRate: Math.max(0, Math.min(100, successRate)),
    avgLatency
  };
}

export function summarizeStacks(data) {
  const map = {};

  // Helper to normalize stack names (sort alphabetically)
  const normalizeStackName = (stackName) => {
    if (!stackName || stackName === 'unknown') return 'unknown';
    const parts = stackName.split(' + ').map(s => s.trim()).filter(Boolean);
    return parts.sort().join(' + ');
  };

  (data?.transactions || []).forEach(tx => {
    const rawName = tx?.dvn_stack_names || 'unknown';
    const name = normalizeStackName(rawName);

    if (!map[name]) {
      map[name] = {
        name,
        count: 0,
        total_volume: 0,
        delivered_volume: 0,
        failed: 0,
        latencySumDelivered: 0,
        deliveredCount: 0
      };
    }

    const amt = parseFloat(tx.amount_usd || 0);
    map[name].count += 1;
    map[name].total_volume += amt;

    if ((tx.delivery_status || '').toLowerCase() === 'delivered') {
      map[name].delivered_volume += amt;
      map[name].latencySumDelivered += Number(tx.latency_seconds || 0);
      map[name].deliveredCount += 1;
    } else {
      map[name].failed += 1;
    }
  });

  return Object.values(map)
    .map(m => ({
      ...m,
      avgLatency: m.deliveredCount > 0
        ? Number((m.latencySumDelivered / m.deliveredCount).toFixed(1))
        : null,
      successRate: Math.round(((m.count - m.failed) / Math.max(1, m.count)) * 100)
    }))
    .sort((a, b) => (b.delivered_volume || 0) - (a.delivered_volume || 0));
}

export function summarizeOapps(data) {
  const map = {};

  (data?.transactions || []).forEach(tx => {
    const name = tx?.oapp_name || 'unknown';

    if (!map[name]) {
      map[name] = {
        name,
        address: tx?.oapp_address || '',
        count: 0,
        volume: 0,
        transactions: [],
        delivered_volume: 0,
        failed_count: 0
      };
    }

    map[name].count += 1;
    map[name].volume += parseFloat(tx.amount_usd || 0);
    map[name].transactions.push(tx);

    if ((tx.delivery_status || '').toLowerCase() === 'delivered') {
      map[name].delivered_volume += parseFloat(tx.amount_usd || 0);
    } else {
      map[name].failed_count += 1;
    }
  });

  return Object.values(map)
    .sort((a, b) => b.delivered_volume - a.delivered_volume);
}
