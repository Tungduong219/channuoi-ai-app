'use client';

import React, { useState, useEffect } from 'react';
import { Mic, X, Volume2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function MicModal({ isOpen, onClose, onSaveTransaction, ttsEnabled = true }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTranscript('');
      setParseResult(null);
      setErrorMsg('');
      setIsListening(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Web Speech API Recording Toggle
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setErrorMsg('Trình duyệt không hỗ trợ Web Speech API. Hãy gõ văn bản bên dưới.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
    };

    recognition.onresult = (event) => {
      const currentText = event.results[0][0].transcript;
      setTranscript(currentText);
      setIsListening(false);
      handleParseVoice(currentText);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setErrorMsg('Không nghe thấy giọng nói. Xin hãy thử lại.');
    };

    recognition.start();
  };

  // Call API Gemini Voice-to-Finance Parser
  const handleParseVoice = async (textToParse) => {
    const text = textToParse || transcript;
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
      console.error(err);
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
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl animate-count-up relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-xl font-bold text-[#1A2332] mb-2 flex items-center gap-2">
          🎙️ Ghi Thu Chi Bằng Giọng Nói
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Nói tự nhiên: <span className="italic text-[#00695C] font-medium">"Hôm nay lấy 5 bao cám ba trăm rưỡi nghìn"</span>
        </p>

        {/* Mic Pulse Button */}
        <div className="flex flex-col items-center justify-center my-4">
          <button
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-[#C62828] text-white animate-pulse shadow-lg scale-110'
                : 'bg-[#FF8F00] text-[#1A2332] shadow-xl hover:scale-105'
            }`}
          >
            <Mic className="w-10 h-10" />
          </button>
          
          {/* Audio Waveform Visualizer Animation */}
          {isListening ? (
            <div className="flex items-center justify-center gap-1.5 my-3 h-8">
              <div className="w-1.5 bg-[#FF8F00] h-6 rounded-full animate-bounce"></div>
              <div className="w-1.5 bg-[#00695C] h-8 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 bg-[#C62828] h-4 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              <div className="w-1.5 bg-[#00695C] h-7 rounded-full animate-bounce [animation-delay:0.1s]"></div>
              <div className="w-1.5 bg-[#FF8F00] h-5 rounded-full animate-bounce [animation-delay:0.3s]"></div>
            </div>
          ) : (
            <span className="text-xs font-semibold mt-3 text-gray-700">
              Bấm vào nút Mic để nói
            </span>
          )}
        </div>

        {/* Voice Presets / Quick Shortcuts */}
        <div className="mb-3 space-y-1.5">
          <span className="text-[11px] font-bold text-gray-500 block">💡 Nói mẫu hoặc bấm chọn nhanh:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setTranscript("Mua 5 bao cám 1 triệu 750 nghìn"); handleParseVoice("Mua 5 bao cám 1 triệu 750 nghìn"); }}
              className="text-[11px] bg-[#F0FAF9] hover:bg-[#00695C] hover:text-white text-[#00695C] border border-[#00695C]/30 px-2.5 py-1 rounded-full font-bold transition-all active:scale-95"
            >
              🛒 Mua 5 bao cám 1.750k
            </button>
            <button
              onClick={() => { setTranscript("Bán 100kg gà 5 triệu 400 nghìn"); handleParseVoice("Bán 100kg gà 5 triệu 400 nghìn"); }}
              className="text-[11px] bg-[#E8F5E9] hover:bg-[#2E7D32] hover:text-white text-[#2E7D32] border border-[#2E7D32]/30 px-2.5 py-1 rounded-full font-bold transition-all active:scale-95"
            >
              💵 Bán 100kg gà 5.400k
            </button>
          </div>
        </div>

        {/* Manual Input / Transcript Display */}
        <div className="mt-2">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Hoặc gõ văn bản thu chi tại đây..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base text-[#1A2332] focus:outline-none focus:ring-2 focus:ring-[#00695C]"
          />
          {!parseResult && !isLoading && (
            <button
              onClick={() => handleParseVoice(transcript)}
              disabled={!transcript.trim()}
              className="mt-3 w-full btn-secondary disabled:opacity-50"
            >
              Phân Tích Bằng AI
            </button>
          )}
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 my-6 text-[#00695C]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-semibold">Gemini đang phân tích con số...</span>
          </div>
        )}

        {/* Error / Missing Price Alert */}
        {errorMsg && (
          <div className="mt-4 p-4 bg-[#FFF3CD] border border-[#FF8F00] rounded-xl flex items-start gap-3 text-[#1A2332]">
            <AlertTriangle className="w-6 h-6 text-[#FF8F00] shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Parse Result Confirmation Card */}
        {parseResult && (
          <div className="mt-4 p-4 bg-[#F0FAF9] border-2 border-[#26A69A] rounded-xl animate-count-up">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                parseResult.type === 'EXPENSE' ? 'bg-[#C62828] text-white' : 'bg-[#2E7D32] text-white'
              }`}>
                {parseResult.type === 'EXPENSE' ? '▼ CHI PHÍ' : '▲ DOANH THU'}
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase">{parseResult.category}</span>
            </div>

            <div className="text-2xl font-extrabold text-[#1A2332] my-1">
              {parseResult.total_amount?.toLocaleString('vi-VN')} đ
            </div>

            <div className="text-xs text-gray-700 font-medium">
              Vật tư: <span className="font-bold text-[#00695C]">{parseResult.item_name}</span> ({parseResult.quantity} {parseResult.unit})
              {parseResult.price_per_unit && parseResult.quantity > 1 && (
                <span className="text-gray-500 block text-[11px] mt-0.5">
                  ({parseResult.quantity?.toLocaleString('vi-VN')} {parseResult.unit} × {parseResult.price_per_unit?.toLocaleString('vi-VN')} đ/{parseResult.unit})
                </span>
              )}
            </div>

            {parseResult.tts_confirmation && (
              <div className="mt-2 text-xs text-gray-600 italic flex items-center gap-1">
                <Volume2 className="w-4 h-4 text-[#00695C]" />
                "{parseResult.tts_confirmation}"
              </div>
            )}

            <button
              onClick={handleConfirmSave}
              className="mt-4 w-full btn-primary-cta"
            >
              <CheckCircle2 className="w-6 h-6" /> XÁC NHẬN LƯU GIAO DỊCH
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
