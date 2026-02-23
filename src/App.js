// src/App.js
// FIXED: Removed unnecessary navbar search, fixed marketplace route consistency

import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Homepage from './components/Homepage';
import TransactionView from './components/TransactionView';
import OAppDashboard from './components/OAppDashboard';
import DVNMarketplace from './components/DVNMarketplace';
import DVNProfile from './components/DVNProfile';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#1e1e1e]">
        {/* Header/Navbar */}
        <header className="bg-lz-gray-900 border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="text-2xl">🌐</div>
                <div>
                  <h1 className="text-xl font-bold text-white">DVN Intelligence</h1>
                  <p className="text-xs text-gray-400">LayerZero Performance Tool</p>
                </div>
              </Link>

              {/* Nav Links */}
              <nav className="flex items-center gap-4">
                <Link
                  to="/dvn-marketplace"
                  className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  DVN Marketplace
                </Link>
                <a
                  href="https://layerzeroscan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  LayerZero Scan ↗
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/tx/:txHash" element={<TransactionView />} />
            <Route path="/oapp/:address" element={<OAppDashboard />} />
            <Route path="/dvn-marketplace" element={<DVNMarketplace />} />
            <Route path="/dvn/:dvnId" element={<DVNProfile />} />

            {/* 404 Not Found */}
            <Route path="*" element={
              <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold text-white mb-4">404 - Page Not Found</h1>
                <p className="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
                <Link to="/" className="text-blue-400 hover:underline">← Back to Home</Link>
              </div>
            } />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-lz-gray-900 border-t border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* About */}
              <div>
                <h3 className="text-white font-bold mb-3">DVN Intelligence</h3>
                <p className="text-gray-400 text-sm">
                  Performance analytics and marketplace for institutional builders on LayerZero.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-white font-bold mb-3">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link to="/dvn-marketplace" className="text-gray-400 hover:text-white transition-colors">
                      DVN Marketplace
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://layerzeroscan.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      LayerZero Scan ↗
                    </a>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-white font-bold mb-3">Resources</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="https://docs.layerzero.network"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      LayerZero Docs ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://layerzero.network"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      LayerZero Network ↗
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 text-sm">
                © 2026 DVN Intelligence. Built for institutional builders on LayerZero.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">Powered by</span>
                <a
                  href="https://layerzero.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  LayerZero
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;