'use client';

import React from 'react';
import { Home, Layers, Mic, Wallet, Stethoscope } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, onOpenMic }) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 bg-surface-card border-t border-border-subtle shadow-xl lg:hidden rounded-t-3xl px-1 pt-1.5 pb-6">
      <div className="grid grid-cols-5 items-center">
        {/* Tab 1: Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'home'
              ? 'text-primary font-black scale-105'
              : 'text-on-surface-muted hover:text-primary'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Trang chủ</span>
        </button>

        {/* Tab 2: Flocks */}
        <button
          onClick={() => setActiveTab('flocks')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'flocks'
              ? 'text-primary font-black scale-105'
              : 'text-on-surface-muted hover:text-primary'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'flocks' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Đàn & Tiêm</span>
        </button>

        {/* Tab 3: Center Floating Mic FAB */}
        <div className="flex items-center justify-center relative -top-3.5">
          <button
            onClick={onOpenMic}
            className="flex items-center justify-center bg-primary text-white rounded-full w-13 h-13 shadow-xl active:scale-95 transition-transform border-4 border-surface pulse-ring"
            aria-label="Ghi âm giọng nói"
            style={{ width: '52px', height: '52px' }}
          >
            <Mic className="w-6 h-6 text-secondary-container" />
          </button>
        </div>

        {/* Tab 4: Vision AI */}
        <button
          onClick={() => setActiveTab('vision')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'vision'
              ? 'text-primary font-black scale-105'
              : 'text-on-surface-muted hover:text-primary'
          }`}
        >
          <Stethoscope className={`w-5 h-5 ${activeTab === 'vision' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Khám bệnh</span>
        </button>

        {/* Tab 5: Finance */}
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'finance'
              ? 'text-primary font-black scale-105'
              : 'text-on-surface-muted hover:text-primary'
          }`}
        >
          <Wallet className={`w-5 h-5 ${activeTab === 'finance' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Sổ thu chi</span>
        </button>
      </div>
    </nav>
  );
}
