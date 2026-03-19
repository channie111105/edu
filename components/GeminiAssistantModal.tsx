import React, { useEffect, useState } from 'react';
import { Copy, Loader2, Send, Sparkles, X } from 'lucide-react';
import { analyzeLeadWithAI, isGeminiEnabled } from '../services/geminiService';
import { AIAnalysisResult, ILead } from '../types';

interface Props {
  lead: ILead | null;
  onClose: () => void;
}

const GeminiAssistantModal: React.FC<Props> = ({ lead, onClose }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!lead) return;
    setAnalysis(null);
    setErrorMessage(null);
    void handleAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);

  const handleAnalyze = async () => {
    if (!lead) return;
    if (!isGeminiEnabled) {
      setAnalysis(null);
      setErrorMessage('AI assistant is disabled in the static build. Set VITE_GEMINI_API_KEY before building to enable it.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await analyzeLeadWithAI(lead);
    setAnalysis(result);
    if (!result) {
      setErrorMessage('The AI assistant could not analyze this lead right now. Please try again.');
    }

    setLoading(false);
  };

  const handleCopy = async () => {
    if (!analysis?.suggestedEmail || !navigator.clipboard) return;
    await navigator.clipboard.writeText(analysis.suggestedEmail);
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <Sparkles className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">ULA Smart Assistant</h3>
              <p className="text-xs text-indigo-100">Lead analysis for {lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 transition-colors hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-indigo-600" />
              <p className="animate-pulse text-gray-500">Analyzing lead history and behavior...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="mb-1 text-sm text-gray-500">Lead score</p>
                  <div className="flex items-end gap-2">
                    <span
                      className={`text-4xl font-bold ${
                        analysis.score > 70
                          ? 'text-green-600'
                          : analysis.score > 40
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {analysis.score}
                    </span>
                    <span className="mb-1 text-gray-400">/ 100</span>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="mb-1 text-sm text-gray-500">Overall assessment</p>
                  <p className="text-xl font-semibold text-gray-800">{analysis.sentiment}</p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                <h4 className="mb-2 flex items-center font-semibold text-blue-900">
                  <Send size={16} className="mr-2" />
                  Recommended next action
                </h4>
                <p className="text-sm leading-relaxed text-blue-800">{analysis.actionableAdvice}</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800">Suggested email</h4>
                  <button
                    onClick={handleCopy}
                    className="flex items-center text-xs text-gray-500 transition-colors hover:text-indigo-600"
                    type="button"
                  >
                    <Copy size={14} className="mr-1" />
                    Copy
                  </button>
                </div>
                <div className="whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-4 font-mono text-sm text-gray-700">
                  {analysis.suggestedEmail}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              {errorMessage || 'The AI assistant could not analyze this lead.'}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-white p-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            type="button"
          >
            Close
          </button>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:opacity-50"
            type="button"
          >
            {loading ? 'Processing...' : 'Analyze again'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiAssistantModal;
