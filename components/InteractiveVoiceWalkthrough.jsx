"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Volume2, VolumeX, ChevronRight, ChevronLeft, X, 
  Sparkles, CheckCircle2, Mic, Camera, Calendar, TrendingUp, Hand 
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    stepNumber: 1,
    targetId: null, // General overview
    title: "Chào Mừng Bác Đến Với ChănNuôi AI! 🐔",
    voiceScript: "Kính chào Bác! Chúc mừng Bác đã đăng nhập thành công vào Chăn Nuôi AI. Ứng dụng này được thiết kế để giúp Bác quản lý đàn gà, ghi chép sổ sách và theo dõi dịch bệnh cực kỳ đơn giản, không cần biết dùng máy tính phức tạp. Hãy cùng xem qua 4 tính năng chính nhé!",
    instruction: "Bác chỉ cần làm quen 4 nút bấm chính để quản lý toàn bộ trang trại gà của mình.",
    icon: Sparkles,
    badgeColor: "bg-primary text-white"
  },
  {
    stepNumber: 2,
    targetId: "tour-mic-button",
    title: "1. Nút Ghi Sổ Giọng Nói — Không Cần Gõ Chữ 🎙️",
    voiceScript: "Bác hãy nhìn vào nút Micro to màu xanh ở đây. Bác chỉ cần bấm vào nút Micro này, sau đó nói bằng giọng nói tự nhiên, ví dụ: 'Hôm nay mua 5 bao cám hết 1 triệu 8' hoặc 'Bán 200 con gà thu 30 triệu'. AI sẽ tự động tính toán và ghi vào sổ quỹ cho Bác.",
    instruction: "👉 Bấm vào nút Micro to này và nói tự nhiên bằng tiếng Việt địa phương. AI tự ghi sổ thu chi!",
    icon: Mic,
    badgeColor: "bg-primary text-white"
  },
  {
    stepNumber: 3,
    targetId: "tour-vision-card",
    title: "2. Khám Bệnh Gia Cầm Bằng Chụp Ảnh AI 📸",
    voiceScript: "Tiếp theo là nút Khám Bệnh màu cam ở đây. Khi thấy gà trong chuồng bị ủ rũ hoặc đi phân lạ, Bác bấm vào nút Khám Bệnh, chụp từ 1 đến 3 tấm ảnh phân hoặc mào mắt của gà. Bác sĩ thú y AI sẽ phân tích đối soát 20 bệnh gia cầm và hướng dẫn Bác cách ly, khử trùng an toàn ngay lập tức.",
    instruction: "👉 Bấm nút 'Khám Bệnh' để chụp ảnh phân hoặc gà bệnh. Bác sĩ thú y AI chẩn đoán ngay sau 3 giây!",
    icon: Camera,
    badgeColor: "bg-secondary-container text-white"
  },
  {
    stepNumber: 4,
    targetId: "tour-vaccines-card",
    title: "3. Lịch Tiêm Vắc-xin & Việc Cần Làm Hàng Ngày 💉",
    voiceScript: "Khu vực này sẽ tự động tính ngày và nhắc Bác chính xác ngày nào cần tiêm phòng vắc-xin gì cho đàn gà, kèm theo danh sách việc cần làm buổi sáng, buổi trưa, buổi chiều để Bác không bao giờ bị quên lịch chăm sóc.",
    instruction: "👉 Hệ thống tự tính ngày tiêm phòng vắc-xin chuẩn và nhắc việc chuồng trại mỗi ngày.",
    icon: Calendar,
    badgeColor: "bg-accent-warm text-white"
  },
  {
    stepNumber: 5,
    targetId: "tour-market-card",
    title: "4. Sổ Thu Chi Lời Lỗ & Giá Thị Trường 3 Miền 💵",
    voiceScript: "Mục Thu Chi giúp Bác biết chính xác lứa gà này đang lời hay lỗ bao nhiêu tiền và đã ăn hết bao nhiêu kg cám. Còn mục Giá Thị Trường giúp Bác xem giá gà thịt 3 miền hôm nay được cập nhật từ Báo Nông Nghiệp Việt Nam để không bao giờ bị thương lái ép giá.",
    instruction: "👉 Theo dõi tiền lời lỗ, lượng cám tiêu thụ và giá gà hôm nay để bán được giá cao nhất.",
    icon: TrendingUp,
    badgeColor: "bg-primary text-white"
  }
];

export default function InteractiveVoiceWalkthrough({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const synthRef = useRef(null);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  // Stop any ongoing speech
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Speak current step narration
  const speakCurrentStep = useCallback((text) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.92; // Slightly slower, very clear for elderly listeners
    utterance.pitch = 1.0;

    // Try finding Vietnamese voice if available
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (viVoice) {
      utterance.voice = viVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // Update spotlight coordinates and scroll smoothly to target
  const updateSpotlight = useCallback(() => {
    if (!isOpen) return;

    if (!currentStep.targetId) {
      setSpotlightRect(null);
      return;
    }

    const element = document.getElementById(currentStep.targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        setSpotlightRect({
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16
        });
      }, 350);
    } else {
      setSpotlightRect(null);
    }
  }, [isOpen, currentStep]);

  // Handle Step Navigation
  useEffect(() => {
    if (isOpen) {
      updateSpotlight();
      speakCurrentStep(currentStep.voiceScript);
    } else {
      stopSpeech();
    }

    return () => stopSpeech();
  }, [isOpen, currentStepIndex, updateSpotlight, speakCurrentStep, stopSpeech, currentStep]);

  // Update rect on resize/scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleResizeOrScroll = () => {
      if (currentStep.targetId) {
        const el = document.getElementById(currentStep.targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          setSpotlightRect({
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16
          });
        }
      }
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);
    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    stopSpeech();
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_completed_voice_walkthrough', 'true');
    }
    onClose();
  };

  const handleReplayVoice = () => {
    speakCurrentStep(currentStep.voiceScript);
  };

  const toggleMute = () => {
    if (!isMuted) {
      stopSpeech();
      setIsMuted(true);
    } else {
      setIsMuted(false);
      speakCurrentStep(currentStep.voiceScript);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-auto select-none">
      {/* ─── 1. DARK SPOTLIGHT BACKDROP OVERLAY ─────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-500">
        <defs>
          <mask id="spotlight-mask">
            {/* White background: dark overlay everywhere */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout: spotlight clear transparent hole */}
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="24"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Semi-transparent dark overlay */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* ─── 2. GLOWING SPOTLIGHT BORDER OVER TARGET ─────────────────────────── */}
      {spotlightRect && (
        <div
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
          }}
          className="absolute rounded-3xl border-4 border-primary shadow-[0_0_35px_rgba(34,197,94,0.85)] pointer-events-none transition-all duration-500 animate-pulse z-10"
        >
          {/* Animated Hand Pointer pointing down to target */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-full shadow-xl border-2 border-primary text-primary font-black text-xs flex items-center gap-1.5 animate-bounce shrink-0 whitespace-nowrap">
            <span className="text-base">👉</span>
            <span>Bác xem ở đây nè!</span>
          </div>
        </div>
      )}

      {/* ─── 3. INTERACTIVE TUTORIAL DIALOG CARD (Accessible Elderly UI) ──────── */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-8 sm:w-[440px] z-50 animate-count-up">
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-primary/40 flex flex-col gap-4 text-on-surface">
          
          {/* Top Bar: Step Counter & Quick Controls */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full ${currentStep.badgeColor}`}>
                Bước {currentStep.stepNumber} / 5
              </span>
              <span className="text-xs font-bold text-on-surface-muted flex items-center gap-1">
                {isSpeaking && <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />}
                {isSpeaking ? 'Đang đọc...' : 'Hướng dẫn âm thanh'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReplayVoice}
                title="Nghe lại giọng đọc"
                className="w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-hover text-primary flex items-center justify-center transition-transform active:scale-90"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onClick={toggleMute}
                title={isMuted ? "Bật giọng đọc" : "Tắt giọng đọc"}
                className="w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-hover text-on-surface-muted flex items-center justify-center transition-transform active:scale-90"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-danger" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={handleComplete}
                title="Đóng hướng dẫn"
                className="w-9 h-9 rounded-xl bg-surface-container-low hover:bg-danger/10 hover:text-danger text-on-surface-muted flex items-center justify-center transition-transform active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Core Content with Big Typography */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-base sm:text-lg text-on-surface leading-snug flex items-center gap-2">
              <span>{currentStep.title}</span>
            </h3>

            <div className="p-3.5 bg-surface-subtle border border-primary/20 rounded-2xl">
              <p className="text-xs sm:text-sm font-semibold text-primary-fixed-variant leading-relaxed">
                {currentStep.instruction}
              </p>
            </div>
          </div>

          {/* Voice Prompt Box */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-base">
              🗣️
            </div>
            <p className="text-xs text-on-surface-muted italic leading-relaxed">
              "{currentStep.voiceScript}"
            </p>
          </div>

          {/* Bottom Navigation Buttons (Large Touch Targets for Elderly) */}
          <div className="flex items-center gap-2 pt-1">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="min-h-[48px] px-4 rounded-2xl border-2 border-border-subtle bg-surface-card hover:bg-surface-hover text-xs sm:text-sm font-extrabold text-on-surface flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 min-h-[48px] px-5 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              {currentStepIndex === TUTORIAL_STEPS.length - 1 ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Bác Đã Hiểu - Bắt Đầu Nuôi Gà</span>
                </>
              ) : (
                <>
                  <span>Tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
