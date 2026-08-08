'use client';

import React from 'react';
import { Settings, Sprout } from 'lucide-react';

export default function TopBar({ pnlAmount = 3450000, onOpenSettings }) {
  const isProfit = pnlAmount >= 0;
  const formattedAmount = Math.abs(pnlAmount).toLocaleString('vi-VN');

  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-[#00695C] text-white z-50 px-4 flex items-center justify-between shadow-md">
      {/* Brand Logo */}
      <div className="flex items-center gap-1.5 w-[100px]">
        <div className="w-8 h-8 rounded-full bg-[#26A69A] flex items-center justify-center">
          <Sprout className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-base tracking-tight text-white">
          ChănNuôi<span className="text-[#FF8F00]">AI</span>
        </span>
      </div>

      {/* Center Sticky P&L Widget (Font 18-20px Bold) */}
      <div className="flex items-center justify-center flex-1">
        <div className={`px-3 py-1 rounded-full text-sm sm:text-base font-bold flex items-center gap-1 animate-count-up ${
          isProfit ? 'bg-[#2E7D32] text-white' : 'bg-[#C62828] text-white'
        }`}>
          <span>{isProfit ? '▲ LÃI:' : '▼ LỖ:'}</span>
          <span className="font-extrabold">{isProfit ? `+${formattedAmount}đ` : `-${formattedAmount}đ`}</span>
        </div>
      </div>

      {/* Right Settings / Profile Icon */}
      <div className="w-[50px] flex justify-end">
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#26A69A]/30 transition-colors"
          aria-label="Cài đặt trang trại"
        >
          <Settings className="w-6 h-6 text-white" />
        </button>
      </div>
    </header>
  );
}
