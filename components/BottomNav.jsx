'use client';

import React from 'react';
import { Home, Layers, Mic, Wallet, TrendingUp } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, onOpenMic, isReadOnly = false }) {
  const tabs = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'flocks', label: 'Đàn gà', icon: Layers },
    { id: 'mic', label: 'Ghi âm', icon: Mic, isCenter: true },
    { id: 'finance', label: 'Sổ Thu Chi', icon: Wallet },
    { id: 'market', label: 'Giá & Dịch', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-[#00695C] z-40 border-t border-[#26A69A]/30 shadow-lg">
      <div className="max-w-md mx-auto h-full flex items-center justify-around px-2 relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          // Center Floating Mic FAB with Notch Space — Hidden in Read-Only (FAMILY_VIEWER) mode
          if (tab.isCenter) {
            if (isReadOnly) return <div key={tab.id} className="w-8"></div>;
            return (
              <div key={tab.id} className="relative -top-5 mx-2 z-50">
                <button
                  onClick={onOpenMic}
                  className="w-14 h-14 rounded-full bg-[#FF8F00] text-[#1A2332] flex items-center justify-center border-2 border-white shadow-xl hover:scale-105 active:scale-95 transition-transform"
                  aria-label="Nút Ghi âm Thu Chi giọng nói"
                >
                  <Mic className="w-7 h-7 text-[#1A2332]" />
                </button>
              </div>
            );
          }

          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 h-full min-h-[44px] transition-colors ${
                isActive ? 'text-[#FF8F00]' : 'text-white/80 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className={`text-[11px] mt-0.5 ${isActive ? 'font-bold' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
