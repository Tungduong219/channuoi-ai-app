'use client';

import React, { useState } from 'react';
import { X, Layers, Sparkles, Loader2, PlusCircle, CheckCircle2 } from 'lucide-react';

const COMMON_BREEDS = [
  { id: 'Gà Ri', name: 'Gà Ri (Thả vườn)', defaultPurpose: 'Nuôi lấy thịt' },
  { id: 'Gà Mía', name: 'Gà Mía Sơn Tây', defaultPurpose: 'Nuôi lấy thịt' },
  { id: 'Gà Đông Tảo', name: 'Gà Đông Tảo Hưng Yên', defaultPurpose: 'Nuôi lấy thịt' },
  { id: 'Gà Ai Cập', name: 'Gà Ai Cập (Siêu Trứng)', defaultPurpose: 'Nuôi đẻ trứng' },
  { id: 'Gà Lai Chọi', name: 'Gà Lai Chọi', defaultPurpose: 'Nuôi lấy thịt' },
  { id: 'Gà Lương Phượng', name: 'Gà Lương Phượng', defaultPurpose: 'Nuôi lấy thịt' },
  { id: 'Gà Tre', name: 'Gà Tre Tân Châu', defaultPurpose: 'Nuôi cảnh / Giống' },
];

export default function AddFlockModal({ isOpen, onClose, onCreateFlock }) {
  const [flockName, setFlockName] = useState('Chuồng 1 - Gà Ri');
  const [breed, setBreed] = useState('Gà Ri');
  const [initialCount, setInitialCount] = useState(1000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('Nuôi lấy thịt');
  const [coopLocation, setCoopLocation] = useState('Chuồng A');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flockName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateFlock({
        flockName: flockName.trim(),
        breed,
        initialCount: Number(initialCount) || 1000,
        currentCount: Number(initialCount) || 1000,
        startDate,
        purpose,
        coopLocation
      });
      onClose();
    } catch (err) {
      console.error("Create flock error:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl animate-count-up relative border border-gray-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00695C]/10 text-[#00695C] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#1A2332]">Thêm Đàn Gà / Chuồng Mới</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Tên Đàn / Số Chuồng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={flockName}
              onChange={(e) => setFlockName(e.target.value)}
              placeholder="VD: Chuồng 1 - Gà Ri Thả Vườn"
              className="w-full min-h-[44px] px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Giống Gà
              </label>
              <select
                value={breed}
                onChange={(e) => {
                  setBreed(e.target.value);
                  const found = COMMON_BREEDS.find(b => b.id === e.target.value);
                  if (found) setPurpose(found.defaultPurpose);
                }}
                className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
              >
                {COMMON_BREEDS.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Số Lượng Nhập (Con)
              </label>
              <input
                type="number"
                min="1"
                required
                value={initialCount}
                onChange={(e) => setInitialCount(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Ngày Thả Giống / Vào Đàn
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mục Đích Nuôi
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
              >
                <option value="Nuôi lấy thịt">Nuôi lấy thịt</option>
                <option value="Nuôi đẻ trứng">Nuôi đẻ trứng</option>
                <option value="Nuôi gà giống">Nuôi gà giống</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Vị Trí Chuồng / Khu Vực
            </label>
            <input
              type="text"
              value={coopLocation}
              onChange={(e) => setCoopLocation(e.target.value)}
              placeholder="VD: Chuồng A - Khu Đồi 1"
              className="w-full min-h-[44px] px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
            />
          </div>

          <div className="p-3 bg-[#F0FAF9] rounded-2xl border border-[#00695C]/20 text-[11px] text-[#00695C] flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#FF8F00] shrink-0 mt-0.5" />
            <p>
              AI Gemini sẽ tự động khởi tạo <strong>Lịch Tiêm Vắc-xin Cá Nhân Hóa</strong> chuẩn thú y theo ngày tuổi cho giống <strong>{breed}</strong> của đàn này!
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-[2] btn-primary-cta flex items-center justify-center gap-2 text-xs shadow-md disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Đang Tạo Lịch...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>TẠO ĐÀN & LỊCH TIÊM</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
