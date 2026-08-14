"use client";

import React, { useState } from 'react';
import { User, LogIn, QrCode, LogOut, Shield, ChevronDown, CheckCircle2, Sparkles, X, Smartphone } from 'lucide-react';

export default function AuthHeader({ userRole, setUserRole, user, setUser, onOpenShareModal }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Mock Google Login Handler
  const handleGoogleLogin = () => {
    setUser({
      name: "Trần Văn Bảy (Chủ Hộ)",
      email: "tranvanbay.farm@gmail.com",
      farmName: "Trại Gà Út Bảy — Củ Chi",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"
    });
    setUserRole('OWNER');
    setShowAuthModal(false);
  };

  // Mock Phone Login Handler
  const handlePhoneLogin = () => {
    setUser({
      name: "Nguyễn Thị Mía (Chủ Hộ)",
      phone: "0987 654 321",
      farmName: "Trại Gà Mía — Ba Vì",
      avatar: null
    });
    setUserRole('OWNER');
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole('OWNER');
    setShowUserDropdown(false);
  };

  return (
    <>
      <div className="w-full bg-[#00695C] text-white px-4 py-2.5 flex items-center justify-between shadow-md">
        {/* Farm Name & Identity */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#F0FAF9] text-[#00695C] flex items-center justify-center font-bold text-sm shadow">
            🏡
          </div>
          <div>
            <h1 className="text-sm font-extrabold leading-tight text-white flex items-center gap-1.5">
              {user ? user.farmName || "Trại Gà Gia Đình" : "ChănNuôi AI"}
              <span className="text-[10px] bg-[#FF8F00] text-[#1A2332] font-black px-1.5 py-0.2 rounded-full uppercase">
                {userRole === 'FAMILY_VIEWER' ? 'XEM TỪ XA' : userRole === 'WORKER' ? 'CÔNG NHÂN' : 'CHỦ HỘ'}
              </span>
            </h1>
            <p className="text-[11px] text-[#E0F2F1] truncate max-w-[180px]">
              {user ? user.name : "Chế độ Khách (Offline)"}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {!user ? (
            <button
              onClick={() => setShowAuthModal(true)}
              className="min-h-[44px] min-w-[44px] px-3 py-1.5 bg-[#F0FAF9] hover:bg-white text-[#00695C] rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4 text-[#00695C]" />
              <span>Đăng nhập</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="min-h-[44px] px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-white" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {/* User Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 text-[#1A2332] animate-count-up">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-bold text-[#1A2332] truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email || user.phone || 'Chủ hộ'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenShareModal();
                    }}
                    className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-[#F0FAF9] text-[#00695C] flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4 text-[#FF8F00]" />
                    <span>Chia sẻ Mã QR cho Con cái</span>
                  </button>

                  <div className="border-t border-gray-100 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-red-50 text-[#C62828] flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal — Palette B & Senior-friendly 44px Touch Target */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4 animate-count-up relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#F0FAF9] text-[#00695C] flex items-center justify-center mx-auto text-2xl shadow">
                🏡
              </div>
              <h3 className="text-lg font-extrabold text-[#1A2332]">Đăng Nhập Trang Trại</h3>
              <p className="text-xs text-gray-500">Đồng bộ dữ liệu và chia sẻ quản lý cùng gia đình</p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Google Login — 44px+ touch target */}
              <button
                onClick={handleGoogleLogin}
                className="w-full min-h-[48px] bg-white border-2 border-gray-200 hover:border-[#00695C] text-[#1A2332] rounded-2xl font-bold text-xs flex items-center justify-center gap-3 shadow-sm active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Đăng nhập 1-Touch bằng Google</span>
              </button>

              {/* Phone Login — 44px+ touch target */}
              <button
                onClick={handlePhoneLogin}
                className="w-full min-h-[48px] bg-[#00695C] hover:bg-[#004D40] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition-all"
              >
                <Smartphone className="w-4 h-4 text-[#FF8F00]" />
                <span>Đăng nhập bằng Số điện thoại</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 text-center">
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-xs text-gray-500 hover:text-[#00695C] font-semibold underline"
              >
                Tiếp tục dùng ở chế độ Khách (Offline)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
