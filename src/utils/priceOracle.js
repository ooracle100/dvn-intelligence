// src/utils/priceOracle.js
const PRICE_CACHE = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchFromCoinGecko() {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
  const data = await res.json();
  return data.ethereum.usd;
}

async function fetchFromEtherscan(apiKey) {
  const res = await fetch(`https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${apiKey}`);
  const data = await res.json();
  return parseFloat(data.result.ethusd);
}

async function fetchFromCryptoCompare() {
  const res = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD');
  const data = await res.json();
  return data.USD;
}

export async function fetchEthPrice(etherscanApiKey = null) {
  // Check cache
  const cached = PRICE_CACHE.get('eth');
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.price;
  }
  
  // Try multiple sources in order
  const sources = [
    { name: 'CoinGecko', fn: fetchFromCoinGecko },
    { name: 'CryptoCompare', fn: fetchFromCryptoCompare },
  ];
  
  if (etherscanApiKey) {
    sources.unshift({ 
      name: 'Etherscan', 
      fn: () => fetchFromEtherscan(etherscanApiKey) 
    });
  }
  
  for (const source of sources) {
    try {
      const price = await source.fn();
      console.log(`✅ ETH price from ${source.name}: $${price}`);
      
      // Cache it
      PRICE_CACHE.set('eth', { price, timestamp: Date.now() });
      return price;
      
    } catch (error) {
      console.warn(`❌ ${source.name} failed:`, error.message);
    }
  }
  
  // All sources failed - use last cached or reasonable fallback
  console.error('⚠️ All price sources failed');
  return cached?.price || 3300; // Last resort
}