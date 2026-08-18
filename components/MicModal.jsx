'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Volume2, CheckCircle2, AlertTriangle, Loader2, Square, Sparkles, Layers } from 'lucide-react';

export default function MicModal({
  isOpen,
  onClose,
  onSaveTransaction,
  availableFlocks = [],
  defaultFlockId = '',
  ttsEnabled = true
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [targetFlockId, setTargetFlockId] = useState(defaultFlockId || 'general');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const accumulatedTextRef = useRef('');

  // Declare helper functions before useEffect
  const stopRecordingCleanup = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const handleClose = () => {
    stopRecordingCleanup();
    onClose();
  };

  const playStartSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  const playStopSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(587.33, ctx.currentTime, 0.12);
      playTone(880.00, ctx.currentTime + 0.10, 0.22);
    } catch (e) {}
  };

  useEffect(() => {
    if (defaultFlockId) {
      setTargetFlockId(defaultFlockId);
    }
  }, [defaultFlockId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      stopRecordingCleanup();
      setTranscript('');
      setParseResult(null);
      setErrorMsg('');
      setIsListening(false);
      accumulatedTextRef.current = '';
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (isListening) {
      playStopSound();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);

      const finalText = accumulatedTextRef.current.trim() || transcript.trim();
      if (finalText) {
        handleParseVoice(finalText);
      }
      return;
    }

    if (typeof window === 'undefined' || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))) {
      setErrorMsg('Trình duyệt không hỗ trợ Web Speech API. Hãy gõ câu giao dịch bên dưới.');
      return;
    }

    stopRecordingCleanup();
    accumulatedTextRef.current = '';
    setTranscript('');
    setErrorMsg('');
    setParseResult(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
      playStartSound();
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullText = (finalTranscript + interimTranscript).trim();
      accumulatedTextRef.current = fullText;
      setTranscript(fullText);

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = setTimeout(() => {
        playStopSound();
        try {
          if (recognitionRef.current) recognitionRef.current.stop();
        } catch (e) {}
        setIsListening(false);
        const textToParse = accumulatedTextRef.current.trim();
        if (textToParse) {
          handleParseVoice(textToParse);
        }
      }, 2200);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        setIsListening(false);
        setErrorMsg('Không thể ghi âm. Xin hãy bấm lại nút Mic.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  };

  const handleParseVoice = async (textToParse) => {
    const text = textToParse || transcript || accumulatedTextRef.current;
    if (!text || !text.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    setParseResult(null);

    try {
      const res = await fetch('/api/gemini/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          availableFlocks
        }),
      });

      const data = await res.json();

      if (data.parsed_success) {
        setParseResult(data);
        if (data.matched_flock_id) {
          setTargetFlockId(data.matched_flock_id);
        }
        if (ttsEnabled && data.tts_confirmation && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.tts_confirmation);
          utterance.lang = 'vi-VN';
          window.speechSynthesis.speak(utterance);
        }
      } else {
        setErrorMsg(data.tts_confirmation || 'Chưa nhận diện được giá tiền. Xin hãy nói lại kèm số tiền rõ ràng.');
      }
    } catch (err) {
      console.error("Voice parse error:", err);
      setErrorMsg('Đang xử lý ngoại tuyến...');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (parseResult) {
      const safeFlocks = Array.isArray(availableFlocks) ? availableFlocks : [];
      const matchedFlock = safeFlocks.find(f => f.flockId === targetFlockId);
      const flockName = matchedFlock ? matchedFlock.flockName : 'Chung Toàn Trại';

      if (onSaveTransaction) {
        onSaveTransaction({
          ...parseResult,
          flockId: targetFlockId,
          flockName
        });
      }
      handleClose();
    }
  };

  if (!isOpen) return null;

  const safeFlocksList = Array.isArray(availableFlocks) ? availableFlocks : [];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl animate-count-up relative border border-gray-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-extrabold text-[#1A2332] flex items-center gap-2">
            🎙️ Ghi Thu Chi Bằng Giọng Nói
          </h3>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          Nói tự nhiên: <span className="italic text-[#00695C] font-semibold">"Đàn Đông Tảo mua 5 bao cám hết 1 triệu 750k"</span>
        </p>

        {safeFlocksList.length > 0 && (
          <div className="mb-3 p-2.5 bg-[#F0FAF9] rounded-2xl border border-[#00695C]/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00695C]">
              <Layers className="w-4 h-4" />
              <span>Gán vào đàn:</span>
            </div>
            <select
              value={targetFlockId}
              onChange={(e) => setTargetFlockId(e.target.value)}
              className="text-xs font-extrabold text-[#1A2332] bg-white px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#00695C] shadow-sm"
            >
              <option value="general">🏢 Chung Toàn Trại</option>
              {safeFlocksList.map(f => (
                <option key={f.flockId} value={f.flockId}>
                  🐔 {f.flockName} ({f.breed})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col items-center justify-center my-2">
          <button
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-[#C62828] text-white shadow-xl scale-110 ring-8 ring-red-100 animate-pulse'
                : 'bg-[#00695C] hover:bg-[#004D40] text-white shadow-lg hover:scale-105 active:scale-95'
            }`}
            aria-label={isListening ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
          >
            {isListening ? (
              <Square className="w-8 h-8 fill-white" />
            ) : (
              <Mic className="w-10 h-10 text-[#FF8F00]" />
            )}
          </button>
          
          <p className="text-xs font-bold mt-2.5 text-center">
            {isListening ? (
              <span className="text-[#C62828] flex items-center gap-1.5 justify-center">
                🔴 Đang lắng nghe... <span className="underline">Chạm để dừng ngay</span>
              </span>
            ) : (
              <span className="text-gray-600">Bấm vào Mic để bắt đầu nói</span>
            )}
          </p>

          {isListening && (
            <div className="flex items-center justify-center gap-1.5 mt-2 h-6">
              <div className="w-1.5 bg-[#FF8F00] h-5 rounded-full animate-bounce"></div>
              <div className="w-1.5 bg-[#00695C] h-7 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 bg-[#C62828] h-4 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              <div className="w-1.5 bg-[#00695C] h-6 rounded-full animate-bounce [animation-delay:0.1s]"></div>
            </div>
          )}
        </div>

        <div className="my-3">
          <p className="text-[11px] font-bold text-gray-400 mb-1.5">💡 Câu mẫu bấm thử nhanh:</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setTranscript("đàn đông tảo mua 5 bao cám hết 1 triệu 750 nghìn");
                handleParseVoice("đàn đông tảo mua 5 bao cám hết 1 triệu 750 nghìn");
              }}
              className="text-xs bg-[#F0FAF9] text-[#00695C] hover:bg-[#E0F2F1] px-2.5 py-1.5 rounded-xl border border-[#00695C]/20 font-bold transition-all text-left"
            >
              🦃 Đàn Đông Tảo: 5 bao cám 1.750k
            </button>
            <button
              onClick={() => {
                setTranscript("chuồng 1 nhập gà 1000 con giá 20.000đ một con");
                handleParseVoice("chuồng 1 nhập gà 1000 con giá 20.000đ một con");
              }}
              className="text-xs bg-[#FFF8E7] text-[#D97706] hover:bg-[#FFE082] px-2.5 py-1.5 rounded-xl border border-[#FF8F00]/20 font-bold transition-all text-left"
            >
              🐣 Chuồng 1: Nhập 1000 gà giá 20k
            </button>
            <button
              onClick={() => {
                setTranscript("bán 100kg gà thịt giá 54 nghìn một cân");
                handleParseVoice("bán 100kg gà thịt giá 54 nghìn một cân");
              }}
              className="text-xs bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9] px-2.5 py-1.5 rounded-xl border border-[#2E7D32]/20 font-bold transition-all text-left"
            >
              💵 Bán 100kg gà 54k/kg
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={isListening ? "Đang lắng nghe giọng nói..." : "Hoặc gõ câu giao dịch tại đây..."}
            className={`w-full min-h-[44px] px-3.5 bg-gray-50 border rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#00695C] ${
              isListening ? 'border-[#C62828] bg-red-50/40' : 'border-gray-200'
            }`}
          />
          {!isListening && transcript.trim() && (
            <button
              onClick={() => handleParseVoice(transcript)}
              disabled={isLoading}
              className="mt-2 w-full min-h-[40px] bg-[#00695C] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow hover:bg-[#004D40]"
            >
              <Sparkles className="w-4 h-4 text-[#FF8F00]" />
              <span>Phân Tích Bằng AI</span>
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 my-4 text-[#00695C]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold">AI đang phân tích và nhận diện đàn...</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 bg-[#FFF3CD] border border-[#FF8F00] rounded-2xl flex items-start gap-2.5 text-[#1A2332]">
            <AlertTriangle className="w-5 h-5 text-[#FF8F00] shrink-0 mt-0.5" />
            <p className="text-xs font-bold">{errorMsg}</p>
          </div>
        )}

        {parseResult && (
          <div className="mt-3 p-4 bg-[#F0FAF9] border-2 border-[#00695C] rounded-2xl animate-count-up space-y-2">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                parseResult.type === 'EXPENSE' ? 'bg-[#C62828] text-white' : 'bg-[#2E7D32] text-white'
              }`}>
                {parseResult.type === 'EXPENSE' ? '▼ CHI PHÍ' : '▲ DOANH THU'}
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                {parseResult.category} • {parseResult.matched_flock_name ? `🐔 ${parseResult.matched_flock_name}` : '🏢 Chung'}
              </span>
            </div>

            <div className="text-2xl font-extrabold text-[#1A2332]">
              {(Number(parseResult.total_amount) || 0).toLocaleString('vi-VN')} đ
            </div>

            <div className="text-xs text-gray-700 font-medium">
              Vật tư: <span className="font-bold text-[#00695C]">{parseResult.item_name}</span> ({parseResult.quantity} {parseResult.unit})
              {parseResult.price_per_unit && parseResult.quantity > 1 && (
                <span className="text-gray-500 block text-[11px] mt-0.5 font-semibold">
                  ({(Number(parseResult.quantity) || 1).toLocaleString('vi-VN')} {parseResult.unit} × {(Number(parseResult.price_per_unit) || 0).toLocaleString('vi-VN')} đ/{parseResult.unit})
                </span>
              )}
            </div>

            {parseResult.tts_confirmation && (
              <div className="text-[11px] text-gray-600 italic flex items-center gap-1 bg-white/70 p-2 rounded-xl border border-gray-100">
                <Volume2 className="w-3.5 h-3.5 text-[#00695C] shrink-0" />
                <span>"{parseResult.tts_confirmation}"</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 min-h-[44px] rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-[2] btn-primary-cta flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>XÁC NHẬN LƯU</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
