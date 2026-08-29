'use client';

import React from 'react';
import { 
  Home, 
  Wallet, 
  Syringe, 
  Stethoscope, 
  TrendingUp, 
  HelpCircle, 
  Settings, 
  Share2, 
  Sparkles,
  Layers
} from 'lucide-react';

export default function DesktopSidebar({
  activeTab,
  setActiveTab,
  user,
  currentFarm,
  onOpenShareModal,
  onOpenSettings,
  onOpenWalkthrough,
}) {
  const navItems = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'flocks', label: 'Đàn gà & Lịch tiêm', icon: Layers },
    { id: 'finance', label: 'Sổ thu chi', icon: Wallet },
    { id: 'vision', label: 'Khám bệnh AI', icon: Stethoscope },
    { id: 'market', label: 'Giá thị trường & Radar', icon: TrendingUp },
  ];

  return (
    <aside className="h-screen w-64 hidden lg:flex flex-col bg-surface-container-low border-r border-border-subtle fixed left-0 top-0 z-40">
      {/* Brand & User Profile */}
      <div className="p-6 pb-4 border-b border-border-subtle/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary-container shrink-0 bg-primary/10 flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAE78zuGi8bTZKWeP7QXErrsqkAGmcdkzANnzu67MaU3T4SWMkpoluM0uJ-SMVfWsCPGq_QijFbrFxaxFUf_SToKIFEFzVBLIcR3hgtNFoopLOsSuz3AaZ06y7zWBD9rTQq7rfYFH5FZYtmui0ZRflqJPKcyJoom6GSe5Z6t9RV1IyjnTAfx-h-h1W17d4ms5TV09HrVlEUUAjDo0OSDBlx0uaoRXCL9ErMM-eLAQCW7VcQ8O2Lhjp10g" 
                alt="Farmer Avatar" 
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-title-md text-sm font-extrabold text-primary truncate">
              Chào {user?.name || currentFarm?.ownerName || "Bác Bảy"}!
            </h2>
            <p className="text-xs text-on-surface-muted truncate">
              {currentFarm?.farmName || "ChănNuôi AI"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-primary bg-surface-subtle px-2.5 py-1.5 rounded-xl border border-primary/20">
          <Sparkles className="w-3.5 h-3.5 text-secondary-container" />
          <span>Hệ Thống Trợ Lý AI 24/7</span>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="p-4 flex-1 overflow-y-auto hide-scrollbar space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-muted px-3 block mb-2">
          Quản Trị Trang Trại
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-all text-left ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm font-extrabold'
                  : 'text-on-surface-variant hover:bg-surface-hover hover:text-primary'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-on-surface-muted'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-3 space-y-1">
          <button
            onClick={onOpenWalkthrough}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-primary bg-surface-subtle border border-primary/20 hover:bg-surface-hover transition-colors text-left"
          >
            <Sparkles className="w-4 h-4 text-secondary-container" />
            <span>🎧 Hướng dẫn giọng nói</span>
          </button>

          <button
            onClick={onOpenShareModal}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-on-surface-muted hover:bg-surface-hover hover:text-primary transition-colors text-left"
          >
            <Share2 className="w-4 h-4" />
            <span>Chia sẻ quyền gia đình</span>
          </button>
        </div>
      </div>

      {/* Footer Support & Settings */}
      <div className="p-4 border-t border-border-subtle/60 space-y-2">
        <a
          href="tel:19001234"
          className="w-full py-2.5 px-3 bg-surface-card border border-border-subtle text-primary rounded-xl font-bold text-xs hover:bg-surface-hover transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <HelpCircle className="w-4 h-4 text-secondary-container" />
          <span>Hotline Thú Y 24/7</span>
        </a>
      </div>
    </aside>
  );
}
