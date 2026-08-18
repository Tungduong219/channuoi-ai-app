"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  LogIn, 
  QrCode, 
  LogOut, 
  Shield, 
  ChevronDown, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Smartphone, 
  PlusCircle, 
  Share2, 
  Building2, 
  Check 
} from 'lucide-react';
import { createFarm, getRegisteredFarms, generateShareMagicLink } from '../lib/tenantDb';

export default function AuthHeader({ 
  userRole, 
  setUserRole, 
  user, 
  setUser, 
  activeFarmId, 
  setActiveFarmId, 
  onOpenShareModal 
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateFarmModal, setShowCreateFarmModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [authTab, setAuthTab] = useState('PHONE'); // 'PHONE' | 'CREATE_FARM'
  const [registeredFarms, setRegisteredFarms] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [farmNameInput, setFarmNameInput] = useState('');
  const [locationInput, setLocationInput] = useState('Bắc Giang');
  const [flockCountInput, setFlockCountInput] = useState('1000');

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    const list = await getRegisteredFarms();
    setRegisteredFarms(list);
  };

  // Handle Phone Login
  const handlePhoneLogin = async (e) => {
    if (e) e.preventDefault();
    if (!phoneInput) return;

    const farmId = `farm_${phoneInput.replace(/\D/g, '') || 'user'}`;
    const farmName = farmNameInput || `Trại Gà ${nameInput || 'Gia Đình'}`;
    const ownerName = nameInput || 'Chủ Hộ';

    const farm = await createFarm({
      farmId,
      farmName,
      ownerName,
      phone: phoneInput,
      authProvider: 'PHONE'
    });

    setUser({
      name: ownerName,
      phone: phoneInput,
      farmName: farm.farmName,
      farmId: farm.farmId,
      avatar: null
    });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowAuthModal(false);
    loadFarms();
  };

  // Handle Google Login (1-Touch)
  const handleGoogleLogin = async () => {
    const farmId = 'farm_google_user';
    const farm = await createFarm({
      farmId,
      farmName: 'Trại Gà Đồi Út Bảy',
      ownerName: 'Trần Văn Bảy',
      email: 'tranvanbay.farm@gmail.com',
      authProvider: 'GOOGLE'
    });

    setUser({
      name: 'Trần Văn Bảy (Chủ Hộ)',
      email: 'tranvanbay.farm@gmail.com',
      farmName: farm.farmName,
      farmId: farm.farmId,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'
    });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowAuthModal(false);
    loadFarms();
  };

  // Handle Facebook Login (1-Touch)
  const handleFacebookLogin = async () => {
    const farmId = 'farm_fb_user';
    const farm = await createFarm({
      farmId,
      farmName: 'Trại Gà Thả Vườn Chị Lan',
      ownerName: 'Nguyễn Thị Lan',
      authProvider: 'FACEBOOK'
    });

    setUser({
      name: 'Nguyễn Thị Lan (Chủ Hộ)',
      farmName: farm.farmName,
      farmId: farm.farmId,
      avatar: null
    });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowAuthModal(false);
    loadFarms();
  };

  // Create New Custom Farm
  const handleCreateNewFarm = async (e) => {
    e.preventDefault();
    if (!farmNameInput || !nameInput) return;

    const farmId = `farm_${Date.now()}`;
    const farm = await createFarm({
      farmId,
      farmName: farmNameInput,
      ownerName: nameInput,
      phone: phoneInput || '0988 888 888',
      location: locationInput,
      totalFlockCount: Number(flockCountInput) || 0
    });

    setUser({
      name: farm.ownerName,
      phone: farm.phone,
      farmName: farm.farmName,
      farmId: farm.farmId,
      avatar: null
    });
    setUserRole('OWNER');
    setActiveFarmId(farm.farmId);
    setShowCreateFarmModal(false);
    setShowAuthModal(false);
    loadFarms();
  };

  // Switch Farm
  const handleSwitchFarm = (targetFarmId, targetFarmName, targetOwner) => {
    setActiveFarmId(targetFarmId);
    if (user) {
      setUser({
        ...user,
        farmId: targetFarmId,
        farmName: targetFarmName,
        name: targetOwner || user.name
      });
    }
    setShowUserDropdown(false);
  };

  // Copy Magic Share Link
  const handleCopyMagicLink = async () => {
    const link = await generateShareMagicLink(activeFarmId || 'farm_guest_local');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole('OWNER');
    setActiveFarmId('farm_guest_local');
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
              {user ? user.farmName || "Trại Gà Gia Đình" : "Trại Gà (Chế độ Khách)"}
              <span className="text-[10px] bg-[#FF8F00] text-[#1A2332] font-black px-1.5 py-0.2 rounded-full uppercase">
                {userRole === 'FAMILY_VIEWER' ? 'XEM TỪ XA' : userRole === 'WORKER' ? 'CÔNG NHÂN' : 'CHỦ HỘ'}
              </span>
            </h1>
            <p className="text-[11px] text-[#E0F2F1] truncate max-w-[180px]">
              {user ? user.name : "Dữ liệu cá nhân hóa riêng biệt"}
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
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 text-[#1A2332] animate-count-up">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-bold text-[#1A2332] truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.phone || user.email || 'Chủ hộ'}</p>
                  </div>

                  {/* Switch Farm Section */}
                  {registeredFarms.length > 1 && (
                    <div className="px-3 py-1.5 border-b border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                        Chuyển Đổi Trang Trại:
                      </span>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {registeredFarms.map((f) => (
                          <button
                            key={f.farmId}
                            onClick={() => handleSwitchFarm(f.farmId, f.farmName, f.ownerName)}
                            className={`w-full text-left px-2 py-1 rounded-lg text-xs flex items-center justify-between font-semibold ${
                              activeFarmId === f.farmId ? 'bg-[#E8F5E9] text-[#00695C] font-bold' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span className="truncate">{f.farmName}</span>
                            {activeFarmId === f.farmId && <Check className="w-3.5 h-3.5 text-[#00695C]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Farm Button */}
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowCreateFarmModal(true);
                    }}
                    className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-[#F0FAF9] text-[#00695C] flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4 text-[#00695C]" />
                    <span>+ Đăng Ký Trang Trại Mới</span>
                  </button>

                  {/* Magic Link Share for Zalo */}
                  <button
                    onClick={handleCopyMagicLink}
                    className="w-full min-h-[44px] px-4 text-left text-xs font-bold hover:bg-[#FFF8E7] text-[#D97706] flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4 text-[#FF8F00]" />
                    <span>{copiedLink ? "✓ Đã copy link Zalo!" : "Copy Link Zalo cho Con cái"}</span>
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

      {/* Auth Modal — Multi-channel Login */}
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
              <h3 className="text-lg font-extrabold text-[#1A2332]">Đăng Nhập Cá Nhân Hóa</h3>
              <p className="text-xs text-gray-500">Mỗi tài khoản sở hữu một trang trại và dữ liệu riêng biệt</p>
            </div>

            {/* Phone Login Form */}
            <form onSubmit={handlePhoneLogin} className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Số điện thoại của bạn:</label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0987 654 321"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Tên của bạn / Chủ hộ:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bác Bảy, Cô Mía..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#00695C] hover:bg-[#004D40] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition-all"
              >
                <Smartphone className="w-4 h-4 text-[#FF8F00]" />
                <span>Đăng Nhập / Vào Trang Trại Riêng</span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-2 text-[10px] font-bold text-gray-400 uppercase">Hoặc đăng nhập 1-chạm</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Google & Facebook OAuth buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleGoogleLogin}
                className="min-h-[44px] bg-white border border-gray-200 hover:border-[#00695C] text-[#1A2332] rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                onClick={handleFacebookLogin}
                className="min-h-[44px] bg-[#1877F2] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
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

      {/* Create New Farm Modal */}
      {showCreateFarmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4 animate-count-up relative">
            <button
              onClick={() => setShowCreateFarmModal(false)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF8E7] text-[#FF8F00] flex items-center justify-center mx-auto text-2xl shadow">
                🏗️
              </div>
              <h3 className="text-lg font-extrabold text-[#1A2332]">Đăng Ký Trang Trại Mới</h3>
              <p className="text-xs text-gray-500">Khởi tạo không gian dữ liệu trắng tinh cho trang trại của bạn</p>
            </div>

            <form onSubmit={handleCreateNewFarm} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Tên Trang Trại:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trại Gà Đồi Ba Vì"
                  value={farmNameInput}
                  onChange={(e) => setFarmNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Tên Chủ Hộ:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn B"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Tỉnh / Thành:</label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Quy mô (con):</label>
                  <input
                    type="number"
                    value={flockCountInput}
                    onChange={(e) => setFlockCountInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#00695C] hover:bg-[#004D40] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4 text-[#FF8F00]" />
                <span>Khởi Tạo Trang Trại (Dữ Liệu Trắng)</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
