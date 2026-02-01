import React, { useState, useEffect } from 'react';
import { ILead, AIAnalysisResult } from '../types';
import { analyzeLeadWithAI } from '../services/geminiService';
import { X, Sparkles, Send, Copy, Loader2 } from 'lucide-react';

interface Props {
  lead: ILead | null;
  onClose: () => void;
}

const GeminiAssistantModal: React.FC<Props> = ({ lead, onClose }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);

  const handleAnalyze = async () => {
    if (!lead) return;
    setLoading(true);
    const result = await analyzeLeadWithAI(lead);
    setAnalysis(result);
    setLoading(false);
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">ULA Smart Assistant</h3>
              <p className="text-xs text-indigo-100">Phân tích chuyên sâu cho {lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-500 animate-pulse">Đang phân tích dữ liệu lịch sử và hành vi...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Score & Sentiment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Điểm tiềm năng</p>
                  <div className="flex items-end gap-2">
                    <span className={`text-4xl font-bold ${analysis.score > 70 ? 'text-green-600' : analysis.score > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {analysis.score}
                    </span>
                    <span className="text-gray-400 mb-1">/ 100</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Đánh giá chung</p>
                  <p className="text-xl font-semibold text-gray-800">{analysis.sentiment}</p>
                </div>
              </div>

              {/* Actionable Advice */}
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Send size={16} className="mr-2" />
                  Hành động đề xuất
                </h4>
                <p className="text-blue-800 text-sm leading-relaxed">
                  {analysis.actionableAdvice}
                </p>
              </div>

              {/* Email Suggestion */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">Email gợi ý</h4>
                  <button className="text-xs flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
                    <Copy size={14} className="mr-1" /> Sao chép
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-100 font-mono">
                  {analysis.suggestedEmail}
                </div>
              </div>
            </div>
          ) : (
             <div className="text-center text-gray-500">Không thể phân tích. Vui lòng thử lại.</div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">
            Đóng
          </button>
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Phân tích lại'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiAssistantModal;