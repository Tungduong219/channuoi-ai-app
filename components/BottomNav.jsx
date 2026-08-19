'use client';

import React from 'react';
import { Home, Layers, Mic, Wallet, TrendingUp } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, onOpenMic }) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 py-2 bg-surface-card border-t border-border-subtle shadow-lg lg:hidden rounded-t-3xl">
      {/* Left Side Items */}
      <div className="flex flex-1 justify-around items-center">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'home'
              ? 'text-primary font-black scale-105'
              : 'text-on-surface-muted hover:text-primary'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">Trang chủ</span>
        </button>

        <button
          onClick={() => setActiveTab('flocks')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'flocks'
              ? 'text-primary font-black scale-105'
              : 'text-on-surface-muted hover:text-primary'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'flocks' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">Đàn & Tiêm</span>
        </button>
      </div>

      {/* Center Mic FAB */}
      <div className="relative w-14 h-14 flex-shrink-0 mx-1">
        <button
          onClick={onOpenMic}
          className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center justify-center bg-primary text-white rounded-full w-14 h-14 shadow-lg active:scale-95 transition-transform border-4 border-surface pulse-ring"
          aria-label="Ghi âm giọng nói"
        >
          <Mic className="w-6 h-6 text-secondary-container" />
        </button>
      </div>

      {/* Right Side Items */}
      <div className="flex flex-1 justify-around items-center">
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'finance'
              ? 'text-primary font-black scale-105'
              : 'text-on-surface-muted hover:text-primary'
          }`}
        >
          <Wallet className={`w-5 h-5 ${activeTab === 'finance' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">Sổ thu chi</span>
        </button>

        <button
          onClick={() => setActiveTab('market')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'market'
              ? 'text-primary font-black scale-105'
              : 'text-on-surface-muted hover:text-primary'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeTab === 'market' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">Thị trường</span>
        </button>
      </div>
    </nav>
  );
}
