"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, Search, ShieldAlert, Cpu } from 'lucide-react';

export default function AIScanningLoader({ message = "Gemini 2.5 Flash đang phân tích ảnh..." }) {
  const [tipIndex, setTipIndex] = useState(0);

  const tips = [
    "🔍 AI đang phân tích bệnh tích ngoại thể và màu phân...",
    "🧬 Đang đối chiếu bảng quy tắc 20 bệnh thú y gia cầm...",
    "🛡️ Đang tính toán mức độ khẩn cấp & biện pháp an toàn sinh học...",
    "⚡ Đang áp dụng quy tắc phân biệt chéo Newcastle vs Thương hàn...",
    "📋 Chuẩn bị xuất kết quả chẩn đoán chính xác..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-[#00695C] shadow-2xl text-center space-y-5 animate-count-up max-w-sm mx-auto my-6 relative overflow-hidden">
      {/* Background Radar Scanning Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#00695C_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

      {/* Center Radar Scanner Animation */}
      <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
        {/* Outer Radar Ripple 1 */}
        <div className="absolute inset-0 rounded-full border-2 border-[#00695C]/40 animate-ping opacity-75"></div>
        {/* Outer Radar Ripple 2 */}
        <div className="absolute -inset-3 rounded-full border border-[#FF8F00]/30 animate-pulse"></div>

        {/* Radar Circle with Rotating Beam */}
        <div className="w-28 h-28 rounded-full bg-[#F0FAF9] border-2 border-[#00695C] flex items-center justify-center relative shadow-inner overflow-hidden">
          {/* Laser Scanning Beam */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#00695C]/30 via-transparent to-transparent animate-spin origin-center"></div>

          {/* Animated Bouncing Chicken & Magnifier Icon */}
          <div className="relative z-10 text-center animate-bounce">
            <span className="text-4xl filter drop-shadow-md select-none">🐔</span>
          </div>

          {/* AI Scanning Lens Overlay */}
          <div className="absolute top-2 right-2 bg-[#FF8F00] text-[#1A2332] p-1 rounded-full shadow animate-pulse">
            <Search className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Text Info */}
      <div className="space-y-2 relative z-10">
        <div className="inline-flex items-center gap-1.5 bg-[#00695C] text-white text-xs font-extrabold px-3 py-1 rounded-full shadow">
          <Cpu className="w-3.5 h-3.5 text-[#FF8F00] animate-spin" />
          <span>Gemini 2.5 Flash Vision Engine</span>
        </div>
        <h4 className="text-sm font-extrabold text-[#1A2332]">{message}</h4>
        
        {/* Rotating Diagnostic Tip */}
        <p className="text-xs text-[#00695C] font-semibold bg-[#F0FAF9] p-2.5 rounded-xl border border-[#00695C]/20 min-h-[42px] flex items-center justify-center italic transition-all">
          {tips[tipIndex]}
        </p>
      </div>

      {/* Progress Bar Animation */}
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
        <div className="h-full bg-gradient-to-r from-[#00695C] via-[#FF8F00] to-[#00695C] w-full animate-pulse"></div>
      </div>
    </div>
  );
}
