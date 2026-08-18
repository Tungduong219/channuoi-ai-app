'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Volume2, CheckCircle2, AlertTriangle, Loader2, Square, Sparkles } from 'lucide-react';

export default function MicModal({ isOpen, onClose, onSaveTransaction, ttsEnabled = true }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const accumulatedTextRef = useRef('');

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

  // Audio Tone Generator using Web Audio API (Zero external file dependencies)
  const playStartSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Crisp 880Hz Tone (A5)
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  };

  const playStopSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Harmonic 2-tone chime (587Hz -> 880Hz)
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
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  };

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

  // Web Speech API Recording Toggle: Tap to Start / Tap to Stop
  const toggleListening = () => {
    // IF CURRENTLY LISTENING -> USER TAPPED TO STOP IMMEDIATELY
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

      const finalText = accumulatedTextRef.current.trim();
      if (finalText) {
        handleParseVoice(finalText);
      }
      return;
    }

    // START RECORDING
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setErrorMsg('Trình duyệt không hỗ trợ Web Speech API. Hãy gõ văn bản bên dưới.');
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
    recognition.continuous = true; // Allow long speech with pauses
    recognition.interimResults = true; // Live transcript streaming

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
      playStartSound(); // Crisp Beep Sound
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

      // Reset Silence Buffer Timer (2.8 seconds timeout after user stops speaking)
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = setTimeout(() => {
        // Automatic stop after 2.8s of silence
        playStopSound();
        try {
          recognition.stop();
        } catch (e) {}
        setIsListening(false);
        if (accumulatedTextRef.current.trim()) {
          handleParseVoice(accumulatedTextRef.current.trim());
        }
      }, 2800);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
        setErrorMsg('Không thể ghi âm. Xin hãy thử bấm lại mic.');
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

  // Call API Gemini Voice-to-Finance Parser
  const handleParseVoice = async (textToParse) => {
    const text = textToParse || transcript || accumulatedTextRef.current;
    if (!text.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    setParseResult(null);

    try {
      const res = await fetch('/api/gemini/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });

      const data = await res.json();

      if (data.parsed_success) {
        setParseResult(data);
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
      setErrorMsg('Lỗi kết nối AI. Đang lưu tạm vào bộ nhớ Offline Queue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (parseResult) {
      onSaveTransaction(parseResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl animate-count-up relative border border-gray-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-extrabold text-[#1A2332] mb-1 flex items-center gap-2">
          🎙️ Ghi Thu Chi Bằng Giọng Nói
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Nói tự nhiên: <span className="italic text-[#00695C] font-semibold">"Hôm nay nhập 1000 con gà giá 20 nghìn 1 con"</span>
        </p>

        {/* Mic Pulse Button with 2-Phase Interaction (Tap to Start / Tap to Stop) */}
        <div className="flex flex-col items-center justify-center my-3">
          <button
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-[#C62828] text-white shadow-xl scale-110 ring-8 ring-red-100 animate-pulse'
                : 'bg-[#00695C] hover:bg-[#004D40] text-white shadow-lg hover:scale-105 active:scale-95'
            }`}
          >
            {isListening ? (
              <Square className="w-8 h-8 fill-white" />
            ) : (
              <Mic className="w-10 h-10 text-[#FF8F00]" />
            )}
          </button>
          
          {/* Status Label */}
          <p className="text-xs font-bold mt-3 text-center">
            {isListening ? (
              <span className="text-[#C62828] flex items-center gap-1.5 justify-center">
                🔴 Đang lắng nghe... <span className="underline">Chạm vào nút để dừng ngay</span>
              </span>
            ) : (
              <span className="text-gray-600">Bấm vào Mic để bắt đầu nói</span>
            )}
          </p>

          {/* Audio Waveform Visualizer Animation */}
          {isListening && (
            <div className="flex items-center justify-center gap-1.5 mt-2 h-6">
              <div className="w-1.5 bg-[#FF8F00] h-5 rounded-full animate-bounce"></div>
              <div className="w-1.5 bg-[#00695C] h-7 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 bg-[#C62828] h-4 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              <div className="w-1.5 bg-[#00695C] h-6 rounded-full animate-bounce [animation-delay:0.1s]"></div>
            </div>
          )}
        </div>

        {/* Quick Sample Phrases */}
        <div className="my-3">
          <p className="text-[11px] font-bold text-gray-400 mb-1.5">💡 Câu mẫu bấm thử nhanh:</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setTranscript("mua 5 bao cám hết 1 triệu 750 nghìn");
                handleParseVoice("mua 5 bao cám hết 1 triệu 750 nghìn");
              }}
              className="text-xs bg-[#F0FAF9] text-[#00695C] hover:bg-[#E0F2F1] px-2.5 py-1.5 rounded-xl border border-[#00695C]/20 font-bold transition-all text-left"
            >
              🛒 Mua 5 bao cám 1.750k
            </button>
            <button
              onClick={() => {
                setTranscript("nhập gà 1000 con giá 20.000đ một con");
                handleParseVoice("nhập gà 1000 con giá 20.000đ một con");
              }}
              className="text-xs bg-[#FFF8E7] text-[#D97706] hover:bg-[#FFE082] px-2.5 py-1.5 rounded-xl border border-[#FF8F00]/20 font-bold transition-all text-left"
            >
              🐣 Nhập 1000 con gà giá 20k
            </button>
            <button
              onClick={() => {
                setTranscript("bán 100kg gà giá 54 nghìn một cân");
                handleParseVoice("bán 100kg gà giá 54 nghìn một cân");
              }}
              className="text-xs bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9] px-2.5 py-1.5 rounded-xl border border-[#2E7D32]/20 font-bold transition-all text-left"
            >
              💵 Bán 100kg gà 54k/kg
            </button>
          </div>
        </div>

        {/* Transcript Box */}
        <div className="relative">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={isListening ? "Đang lắng nghe giọng nói của bạn..." : "Hoặc gõ/chỉnh sửa câu nói tại đây..."}
            className={`w-full min-h-[44px] px-3.5 bg-gray-50 border rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#00695C] ${
              isListening ? 'border-[#C62828] bg-red-50/40' : 'border-gray-200'
            }`}
          />
          {!isListening && transcript.trim() && (
            <button
              onClick={() => handleParseVoice(transcript)}
              disabled={isLoading}
              className="mt-2 w-full min-h-[40px] bg-[#00695C] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow"
            >
              <Sparkles className="w-4 h-4 text-[#FF8F00]" />
              <span>Phân Tích Bằng AI</span>
            </button>
          )}
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 my-4 text-[#00695C]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold">AI đang phân tích và tính toán số tiền...</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-3 p-3 bg-[#FFF3CD] border border-[#FF8F00] rounded-2xl flex items-start gap-2.5 text-[#1A2332]">
            <AlertTriangle className="w-5 h-5 text-[#FF8F00] shrink-0 mt-0.5" />
            <p className="text-xs font-bold">{errorMsg}</p>
          </div>
        )}

        {/* Parse Result Confirmation Card */}
        {parseResult && (
          <div className="mt-3 p-4 bg-[#F0FAF9] border-2 border-[#00695C] rounded-2xl animate-count-up space-y-2">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                parseResult.type === 'EXPENSE' ? 'bg-[#C62828] text-white' : 'bg-[#2E7D32] text-white'
              }`}>
                {parseResult.type === 'EXPENSE' ? '▼ CHI PHÍ' : '▲ DOANH THU'}
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">{parseResult.category}</span>
            </div>

            <div className="text-2xl font-extrabold text-[#1A2332]">
              {parseResult.total_amount?.toLocaleString('vi-VN')} đ
            </div>

            <div className="text-xs text-gray-700 font-medium">
              Vật tư: <span className="font-bold text-[#00695C]">{parseResult.item_name}</span> ({parseResult.quantity} {parseResult.unit})
              {parseResult.price_per_unit && parseResult.quantity > 1 && (
                <span className="text-gray-500 block text-[11px] mt-0.5 font-semibold">
                  ({parseResult.quantity?.toLocaleString('vi-VN')} {parseResult.unit} × {parseResult.price_per_unit?.toLocaleString('vi-VN')} đ/{parseResult.unit})
                </span>
              )}
            </div>

            {parseResult.tts_confirmation && (
              <div className="text-[11px] text-gray-600 italic flex items-center gap-1 bg-white/70 p-2 rounded-xl border border-gray-100">
                <Volume2 className="w-3.5 h-3.5 text-[#00695C] shrink-0" />
                <span>"{parseResult.tts_confirmation}"</span>
              </div>
            )}

            <button
              onClick={handleConfirmSave}
              className="w-full btn-primary-cta mt-2 flex items-center justify-center gap-2 text-xs"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>XÁC NHẬN LƯU GIAO DỊCH</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
