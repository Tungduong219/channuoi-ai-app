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
          <span className="text-xs font-semibold mt-3 text-gray-700">
            {isListening ? 'Đang lắng nghe... Hãy nói ngay' : 'Bấm vào nút Mic để nói'}
          </span>
        </div>

        {/* Manual Input / Transcript Display */}
        <div className="mt-4">
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

            <div className="text-sm text-gray-700 font-medium">
              Vật tư: <span className="font-bold text-[#00695C]">{parseResult.item_name}</span> ({parseResult.quantity} {parseResult.unit})
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
