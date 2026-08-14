"use client";

import React from 'react';
import { X, ShieldAlert, Activity, CheckCircle2, AlertTriangle, BookOpen, ExternalLink, Stethoscope } from 'lucide-react';

export default function DiseaseDetailModal({ disease, isOpen, onClose }) {
  if (!isOpen || !disease) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4 animate-count-up relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF5F5] text-[#C62828] flex items-center justify-center font-bold text-lg shrink-0">
            🦠
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-[#00695C] bg-[#F0FAF9] px-2 py-0.5 rounded-full uppercase">
              Cẩm Nang Thú Y Chẩn Đoán
            </span>
            <h3 className="text-base font-extrabold text-[#1A2332]">{disease.disease_name}</h3>
          </div>
        </div>

        {/* Overview Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-[#FFF8E7] rounded-xl border border-[#FF8F00]/30 space-y-0.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Mức Độ Khớp Triệu Chứng</span>
            <p className="font-extrabold text-[#FF8F00]">{disease.match_score || 'TRUNG BÌNH'}</p>
          </div>
          <div className="p-2.5 bg-[#F0FAF9] rounded-xl border border-[#00695C]/30 space-y-0.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Loại Tác Nhân</span>
            <p className="font-extrabold text-[#00695C]">Virus / Vi Khuẩn Cụ Thể</p>
          </div>
        </div>

        {/* Matching Symptoms */}
        {disease.matching_symptoms?.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
              <span>Triệu chứng khớp quan sát được:</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {disease.matching_symptoms.map((s, i) => (
                <span key={i} className="text-xs bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-1 rounded-lg font-bold">
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ruling out reason if any */}
        {disease.ruling_out_reason && (
          <div className="p-3 bg-gray-50 rounded-xl border text-xs space-y-1">
            <span className="font-bold text-gray-700 block">🔍 Lý do hạ điểm / phân biệt chéo:</span>
            <p className="text-gray-600 italic">"{disease.ruling_out_reason}"</p>
          </div>
        )}

        {/* Veterinary Action Protocol */}
        <div className="p-3.5 bg-[#00695C] text-white rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#FF8F00]">
            <Stethoscope className="w-4 h-4" />
            <span>Phác Đồ Xử Lý Khuyên Dùng:</span>
          </div>
          <ul className="text-xs text-[#E0F2F1] space-y-1 list-disc list-inside">
            <li>Cách ly ngay lập tức các con gà có triệu chứng nặng khỏi đàn.</li>
            <li>Phun sát trùng diện rộng bằng Iodine hoặc Bencocid 2 lần/ngày.</li>
            <li>Bổ sung Điện giải + B-Complex + Vitamin C vào nước uống nâng sức đề kháng.</li>
            <li>Liên hệ ngay Bác sĩ Thú y địa phương để lấy mẫu xét nghiệm khẳng định.</li>
          </ul>
        </div>

        {/* Emergency Call Button */}
        <a
          href="tel:18001119"
          className="w-full min-h-[48px] bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition-all"
        >
          📞 BÁO CÁO CA BỆNH CHO BÁC SĨ THÚ Y ĐỊA PHƯƠNG
        </a>
      </div>
    </div>
  );
}
