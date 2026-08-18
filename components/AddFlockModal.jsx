'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Layers, Sparkles, Loader2, PlusCircle, CheckCircle2, Mic, Square } from 'lucide-react';

const COMMON_BREEDS = [
  { id: 'Gà Ri', name: 'Gà Ri (Thả vườn)', defaultPurpose: 'Nuôi lấy thịt', defaultPrice: 20000 },
  { id: 'Gà Mía', name: 'Gà Mía Sơn Tây', defaultPurpose: 'Nuôi lấy thịt', defaultPrice: 18000 },
  { id: 'Gà Đông Tảo', name: 'Gà Đông Tảo Hưng Yên', defaultPurpose: 'Nuôi lấy thịt', defaultPrice: 25000 },
  { id: 'Gà Ai Cập', name: 'Gà Ai Cập (Siêu Trứng)', defaultPurpose: 'Nuôi đẻ trứng', defaultPrice: 22000 },
  { id: 'Gà Lai Chọi', name: 'Gà Lai Chọi', defaultPurpose: 'Nuôi lấy thịt', defaultPrice: 20000 },
  { id: 'Gà Lương Phượng', name: 'Gà Lương Phượng', defaultPurpose: 'Nuôi lấy thịt', defaultPrice: 16000 },
  { id: 'Gà Tre', name: 'Gà Tre Tân Châu', defaultPurpose: 'Nuôi cảnh / Giống', defaultPrice: 30000 },
];

export default function AddFlockModal({ isOpen, onClose, onCreateFlock, ttsEnabled = true }) {
  const [flockName, setFlockName] = useState('Chuồng 1 - Gà Ri');
  const [breed, setBreed] = useState('Gà Ri');
  const [initialCount, setInitialCount] = useState(1000);
  const [unitPrice, setUnitPrice] = useState(20000);
  const [startDate, setStartDate] = useState('2026-08-19');
  const [purpose, setPurpose] = useState('Nuôi lấy thịt');
  const [coopLocation, setCoopLocation] = useState('Chuồng 1');
  const [isCreating, setIsCreating] = useState(false);

  // Voice AI Input State
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isVoiceParsing, setIsVoiceParsing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const accumulatedTextRef = useRef('');

  // Functions declared before useEffect
  const stopVoiceCleanup = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const playTone = (freq, duration) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopVoiceCleanup();
      setIsVoiceListening(false);
      setVoiceTranscript('');
      setVoiceNotice('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parseVoiceForFlock = async (text) => {
    if (!text || !text.trim()) return;
    setIsVoiceParsing(true);
    setVoiceNotice('');

    try {
      const res = await fetch('/api/gemini/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          isFlockCreationMode: true
        })
      });
      const data = await res.json();
      if (data) {
        if (data.breed) {
          setBreed(data.breed);
          const found = COMMON_BREEDS.find(b => b.id === data.breed);
          if (found) setPurpose(found.defaultPurpose);
        }
        if (data.initial_count || data.quantity) {
          setInitialCount(data.initial_count || data.quantity);
        }
        if (data.unit_price || data.price_per_unit) {
          setUnitPrice(data.unit_price || data.price_per_unit);
        }
        if (data.coop_location) {
          setCoopLocation(data.coop_location);
        }
        if (data.flock_name) {
          setFlockName(data.flock_name);
        } else if (data.breed && data.coop_location) {
          setFlockName(`${data.coop_location} - ${data.breed}`);
        }
        if (data.purpose) {
          setPurpose(data.purpose);
        }

        setVoiceNotice(`✨ AI đã điền: ${data.breed || 'Gà'} (${data.initial_count || data.quantity || 1000} con x ${(data.unit_price || data.price_per_unit || 20000).toLocaleString('vi-VN')}đ/con)`);
      }
    } catch (err) {
      console.warn("Voice flock parse error:", err);
    } finally {
      setIsVoiceParsing(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (isVoiceListening) {
      playTone(587, 0.15);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsVoiceListening(false);
      const text = accumulatedTextRef.current.trim() || voiceTranscript.trim();
      if (text) parseVoiceForFlock(text);
      return;
    }

    if (typeof window === 'undefined' || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))) {
      setVoiceNotice('Trình duyệt không hỗ trợ Web Speech API.');
      return;
    }

    stopVoiceCleanup();
    accumulatedTextRef.current = '';
    setVoiceTranscript('');
    setVoiceNotice('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsVoiceListening(true);
      playTone(880, 0.15);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalStr = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalStr += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      const full = (finalStr + interim).trim();
      accumulatedTextRef.current = full;
      setVoiceTranscript(full);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        playTone(587, 0.15);
        try { if (recognitionRef.current) recognitionRef.current.stop(); } catch (e) {}
        setIsVoiceListening(false);
        if (accumulatedTextRef.current.trim()) {
          parseVoiceForFlock(accumulatedTextRef.current.trim());
        }
      }, 2200);
    };

    recognition.onerror = () => {
      setIsVoiceListening(false);
    };

    recognition.onend = () => {
      setIsVoiceListening(false);
    };

    try {
      recognition.start();
    } catch (e) {}
  };

  const totalSeedExpense = (Number(initialCount) || 0) * (Number(unitPrice) || 0);

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
        unitPrice: Number(unitPrice) || 0,
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
            <div>
              <h3 className="text-base font-extrabold text-[#1A2332]">Thêm Đàn Gà / Chuồng Mới</h3>
              <span className="text-[10px] text-gray-500 font-semibold">Tự động sinh lịch tiêm & ghi sổ thu chi</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Voice AI Assistant Banner for Flock Creation */}
        <div className="mb-3.5 p-3 bg-[#F0FAF9] rounded-2xl border border-[#00695C]/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#00695C] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF8F00]" />
              <span>Điền Nhanh Bằng Giọng Nói</span>
            </span>
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all ${
                isVoiceListening
                  ? 'bg-[#C62828] text-white animate-pulse shadow-md'
                  : 'bg-[#FF8F00] hover:bg-[#FFA000] text-[#1A2332] shadow-sm'
              }`}
            >
              {isVoiceListening ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Dừng nói</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>🎙️ Bấm Để Nói</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-gray-600">
            Nói câu: <span className="italic font-semibold text-[#00695C]">"Hôm nay nhập 1000 con gà Đông Tảo giá 22 nghìn 1 con ở chuồng A"</span>
          </p>

          {isVoiceListening && (
            <div className="text-[11px] font-bold text-[#C62828] animate-pulse flex items-center gap-1.5 pt-1">
              <span>🔴 Đang lắng nghe:</span>
              <span className="text-gray-700 italic font-medium">{voiceTranscript || 'Hãy nói thông tin đàn...'}</span>
            </div>
          )}

          {isVoiceParsing && (
            <div className="text-[11px] font-bold text-[#00695C] flex items-center gap-1.5 pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI đang bóc tách giống gà, số lượng và giá tiền...</span>
            </div>
          )}

          {voiceNotice && (
            <div className="text-[11px] font-bold text-[#2E7D32] bg-white p-2 rounded-xl border border-green-200">
              {voiceNotice}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
                  if (found) {
                    setPurpose(found.defaultPurpose);
                    setUnitPrice(found.defaultPrice);
                  }
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
                Số Lượng Nhập (Con) <span className="text-red-500">*</span>
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

          {/* Unit Price per Chick & Total Cost Calculation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Giá Nhập 1 Con (đ/con) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="VD: 20000"
                className="w-full min-h-[44px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tổng Tiền Vốn Giống
              </label>
              <div className="min-h-[44px] px-3 bg-[#FFF8E7] border border-[#FF8F00]/30 rounded-xl flex items-center font-extrabold text-xs text-[#D97706]">
                {totalSeedExpense.toLocaleString('vi-VN')} đ
              </div>
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
              placeholder="VD: Chuồng A - Khu Đồi"
              className="w-full min-h-[44px] px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00695C]"
            />
          </div>

          <div className="p-3 bg-[#F0FAF9] rounded-2xl border border-[#00695C]/20 text-[11px] text-[#00695C] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
            <p>
              Tự động ghi khoản chi <strong>-{totalSeedExpense.toLocaleString('vi-VN')} đ</strong> vào <strong>Sổ Thu Chi</strong> của đàn này & sinh lịch tiêm cho <strong>{breed}</strong>!
            </p>
          </div>

          <div className="flex gap-2 pt-1">
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
                  <span>Đang Khởi Tạo Đàn...</span>
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
