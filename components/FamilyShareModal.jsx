"use client";

import React, { useState } from 'react';
import { X, Copy, Check, QrCode, Lock, Share2, Sparkles } from 'lucide-react';

export default function FamilyShareModal({ isOpen, onClose, farmName }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const farmId = "farm_cuchi_889";
  const shareToken = "token_7d_xyz992837";
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?view=family&token=${shareToken}&farm=${farmId}`
    : `https://channuoi-ai.app/?view=family&token=${shareToken}&farm=${farmId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4 animate-count-up relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[#F0FAF9] text-[#00695C] flex items-center justify-center mx-auto text-xl shadow">
            📲
          </div>
          <h3 className="text-lg font-extrabold text-[#1A2332]">Chia Sẻ Với Con Cái & Người Thân</h3>
          <p className="text-xs text-gray-500 font-medium">
            Cho phép con cái xem tình hình chuồng gà từ xa mà không cần tạo tài khoản
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-[#F0FAF9] p-4 rounded-2xl border border-[#00695C]/20 text-center space-y-3">
          <div className="bg-white p-3 rounded-xl inline-block shadow-md border border-gray-200">
            {/* SVG QR Code Simulation */}
            <svg className="w-44 h-44 mx-auto" viewBox="0 0 100 100">
              <rect width="100" height="100" fill="#ffffff" />
              {/* Corner markers */}
              <rect x="5" y="5" width="25" height="25" fill="#00695C" />
              <rect x="8" y="8" width="19" height="19" fill="#ffffff" />
              <rect x="12" y="12" width="11" height="11" fill="#00695C" />

              <rect x="70" y="5" width="25" height="25" fill="#00695C" />
              <rect x="73" y="8" width="19" height="19" fill="#ffffff" />
              <rect x="77" y="12" width="11" height="11" fill="#00695C" />

              <rect x="5" y="70" width="25" height="25" fill="#00695C" />
              <rect x="8" y="73" width="19" height="19" fill="#ffffff" />
              <rect x="12" y="77" width="11" height="11" fill="#00695C" />

              {/* Data dots pattern */}
              <rect x="35" y="10" width="8" height="8" fill="#FF8F00" />
              <rect x="45" y="15" width="10" height="6" fill="#00695C" />
              <rect x="10" y="35" width="8" height="8" fill="#00695C" />
              <rect x="25" y="40" width="12" height="6" fill="#FF8F00" />
              <rect x="40" y="35" width="20" height="20" fill="#00695C" />
              <rect x="45" y="40" width="10" height="10" fill="#ffffff" />
              <rect x="65" y="35" width="8" height="15" fill="#00695C" />
              <rect x="80" y="40" width="12" height="8" fill="#FF8F00" />
              <rect x="35" y="65" width="15" height="8" fill="#00695C" />
              <rect x="55" y="70" width="10" height="10" fill="#FF8F00" />
              <rect x="70" y="65" width="20" height="20" fill="#00695C" />
              <rect x="75" y="70" width="10" height="10" fill="#ffffff" />
            </svg>
          </div>

          <p className="text-[11px] font-bold text-[#00695C]">
            Quét mã QR bằng Camera hoặc Zalo để mở xem ngay
          </p>
        </div>

        {/* Copy Link Button */}
        <div className="space-y-2">
          <button
            onClick={handleCopyLink}
            className="w-full min-h-[48px] bg-[#00695C] hover:bg-[#004D40] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#FF8F00]" />
                <span>Đã Sao Chép Link Gửi Zalo!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-[#FF8F00]" />
                <span>📋 Sao Chép Đường Link Gửi Zalo</span>
              </>
            )}
          </button>

          {/* Security expiry note as per Note 2 */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 italic pt-1">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <span>🔒 Link tự động hết hạn sau 7 ngày để bảo vệ dữ liệu trang trại</span>
          </div>
        </div>
      </div>
    </div>
  );
}
