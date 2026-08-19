'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Volume2, CheckCircle2, AlertTriangle, Loader2, Square, Sparkles, Layers, Send } from 'lucide-react';

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
      setErrorMsg('Trình duyệt chưa hỗ trợ Web Speech API trực tiếp qua HTTP. Bạn có thể gõ hoặc chọn câu mẫu bên dưới để AI xử lý ngay!');
      return;
    }

    stopRecordingCleanup();
    accumulatedTextRef.current = '';
    setTranscript('');
    setErrorMsg('');
    setParseResult(null);

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = 'vi-VN';
      // On mobile devices, continuous=false prevents unexpected aborts
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      recognition.continuous = !isMobile;
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
        console.warn('SpeechRecognition error:', e);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setIsListening(false);
          setErrorMsg('Quyền truy cập Micro bị từ chối hoặc cần HTTPS trên di động. Bạn có thể bấm câu mẫu hoặc gõ để AI phân tích ngay!');
        } else if (e.error !== 'no-speech') {
          setIsListening(false);
          setErrorMsg('Không thể ghi âm (' + (e.error || 'Lỗi') + '). Bạn có thể gõ câu hoặc chọn câu mẫu bên dưới.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const textToParse = accumulatedTextRef.current.trim();
        if (textToParse && !isLoading && !parseResult) {
          handleParseVoice(textToParse);
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
      setIsListening(false);
      setErrorMsg('Không thể khởi động Micro. Bạn có thể gõ câu hoặc bấm các câu mẫu bên dưới để AI tính tiền ngay!');
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl animate-count-up relative border border-border-subtle max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base sm:text-lg font-black text-on-surface flex items-center gap-2">
            🎙️ Ghi Thu Chi Bằng Giọng Nói
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-danger-container text-on-surface-muted hover:text-danger transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <p className="text-xs text-on-surface-muted mb-3">
          Nói tự nhiên: <span className="italic text-primary font-bold">"Đàn Đông Tảo mua 5 bao cám hết 1 triệu 750k"</span>
        </p>

        {safeFlocksList.length > 0 && (
          <div className="mb-3 p-2.5 bg-surface-subtle rounded-2xl border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Layers className="w-4 h-4" />
              <span>Gán vào đàn:</span>
            </div>
            <select
              value={targetFlockId}
              onChange={(e) => setTargetFlockId(e.target.value)}
              className="text-xs font-extrabold text-on-surface bg-white px-3 py-1.5 rounded-xl border border-border-subtle focus:outline-none focus:border-primary shadow-sm"
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

        {/* Big Mic Center Button */}
        <div className="flex flex-col items-center justify-center my-3">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-danger text-white shadow-xl scale-110 ring-8 ring-danger-container animate-pulse'
                : 'bg-primary hover:bg-primary/90 text-white shadow-lg hover:scale-105 active:scale-95'
            }`}
            aria-label={isListening ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
          >
            {isListening ? (
              <Square className="w-8 h-8 fill-white" />
            ) : (
              <Mic className="w-10 h-10 text-secondary-container" />
            )}
          </button>
          
          <p className="text-xs font-extrabold mt-2.5 text-center">
            {isListening ? (
              <span className="text-danger flex items-center gap-1.5 justify-center">
                🔴 Đang lắng nghe... <span className="underline">Chạm để phân tích ngay</span>
              </span>
            ) : (
              <span className="text-on-surface">Chạm vào Mic để bắt đầu nói</span>
            )}
          </p>

          {isListening && (
            <div className="flex items-center justify-center gap-1.5 mt-2 h-6">
              <div className="w-1.5 bg-secondary-container h-5 rounded-full animate-bounce"></div>
              <div className="w-1.5 bg-primary h-7 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 bg-danger h-4 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              <div className="w-1.5 bg-primary h-6 rounded-full animate-bounce [animation-delay:0.1s]"></div>
            </div>
          )}
        </div>

        {/* 1-Tap Quick Sample Buttons */}
        <div className="my-3">
          <p className="text-[11px] font-bold text-on-surface-muted mb-1.5">⚡ Hoặc chạm nhanh câu mẫu bên dưới:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                const sample = "đàn đông tảo mua 5 bao cám hết 1 triệu 750 nghìn";
                setTranscript(sample);
                handleParseVoice(sample);
              }}
              className="text-xs bg-surface-subtle text-primary hover:bg-surface-hover p-2 rounded-xl border border-primary/20 font-bold transition-all text-left"
            >
              🌾 5 bao cám: 1.750k
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = "chuồng 1 nhập 1000 gà giống giá 20 nghìn một con";
                setTranscript(sample);
                handleParseVoice(sample);
              }}
              className="text-xs bg-accent-warm-container text-secondary hover:bg-accent-warm-container/80 p-2 rounded-xl border border-secondary-container/30 font-bold transition-all text-left"
            >
              🐣 Nhập 1000 gà giống: 20k
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = "bán 100kg gà thịt giá 56 nghìn một cân";
                setTranscript(sample);
                handleParseVoice(sample);
              }}
              className="text-xs bg-surface-container text-primary hover:bg-surface-container-high p-2 rounded-xl border border-primary/20 font-bold transition-all text-left"
            >
              💵 Bán 100kg gà: 56k/kg
            </button>
          </div>
        </div>

        {/* Text Input with Instant Submit & Mobile Voice Dictation Tip */}
        <div className="relative mt-2 space-y-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && transcript.trim()) {
                  handleParseVoice(transcript);
                }
              }}
              placeholder={isListening ? "Đang nghe giọng nói của bạn..." : "Chạm vào đây để gõ hoặc bấm Mic trên bàn phím..."}
              className={`flex-1 min-h-[44px] px-3.5 bg-surface-container-low border rounded-2xl text-xs font-semibold focus:outline-none focus:border-primary ${
                isListening ? 'border-danger bg-danger-container/30' : 'border-border-subtle'
              }`}
            />
            {transcript.trim() && (
              <button
                type="button"
                onClick={() => handleParseVoice(transcript)}
                disabled={isLoading}
                className="px-4 min-h-[44px] bg-primary text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm hover:bg-primary/90 disabled:opacity-50 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Gửi AI</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 text-[11px] text-primary font-bold bg-surface-subtle p-2 rounded-xl border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-secondary-container shrink-0" />
            <span>Trên điện thoại: Chạm vào ô trên rồi bấm nút <strong>Mic 🎙️ trên bàn phím</strong> để nói cực chuẩn!</span>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 my-4 text-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold">AI đang nhận diện số tiền & phân loại đàn...</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 bg-accent-warm-container border border-secondary-container/40 rounded-2xl flex items-start gap-2.5 text-on-surface">
            <AlertTriangle className="w-5 h-5 text-secondary-container shrink-0 mt-0.5" />
            <p className="text-xs font-bold">{errorMsg}</p>
          </div>
        )}

        {parseResult && (
          <div className="mt-3 p-4 bg-surface-subtle border-2 border-primary rounded-2xl animate-count-up space-y-2">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                parseResult.type === 'EXPENSE' ? 'bg-danger text-white' : 'bg-primary text-white'
              }`}>
                {parseResult.type === 'EXPENSE' ? '▼ KHOẢN CHI' : '▲ KHOẢN THU'}
              </span>
              <span className="text-[10px] font-bold text-on-surface-muted uppercase">
                {parseResult.category} • {parseResult.matched_flock_name ? `🐔 ${parseResult.matched_flock_name}` : '🏢 Chung'}
              </span>
            </div>

            <div className="text-2xl font-black text-on-surface">
              {(Number(parseResult.total_amount) || 0).toLocaleString('vi-VN')} đ
            </div>

            <div className="text-xs text-on-surface font-medium">
              Vật tư: <span className="font-bold text-primary">{parseResult.item_name}</span> ({parseResult.quantity} {parseResult.unit})
              {parseResult.price_per_unit && parseResult.quantity > 1 && (
                <span className="text-on-surface-muted block text-[11px] mt-0.5 font-semibold">
                  ({(Number(parseResult.quantity) || 1).toLocaleString('vi-VN')} {parseResult.unit} × {(Number(parseResult.price_per_unit) || 0).toLocaleString('vi-VN')} đ/{parseResult.unit})
                </span>
              )}
            </div>

            {parseResult.tts_confirmation && (
              <div className="text-[11px] text-on-surface-muted italic flex items-center gap-1 bg-white p-2 rounded-xl border border-border-subtle">
                <Volume2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>"{parseResult.tts_confirmation}"</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 min-h-[44px] rounded-xl border border-border-subtle text-on-surface font-bold text-xs hover:bg-surface-container transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex-[2] btn-primary-cta flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>XÁC NHẬN LƯU SỔ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
