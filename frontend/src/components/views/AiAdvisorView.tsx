import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Send, Sparkles, Brain, Trash2 } from 'lucide-react';

export const AiAdvisorView: React.FC = () => {
  const { aiConversation, aiLoading, askAssistant, clearAiChat } = useStore();
  const [prompt, setPrompt] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiConversation, aiLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || aiLoading) return;
    askAssistant(prompt);
    setPrompt('');
  };

  const handleChipClick = (text: string) => {
    if (aiLoading) return;
    askAssistant(text);
  };

  const seedChips = [
    "We have KES 50M. Suggest optimal station allocation.",
    "Summarize PAYG borrower default risks in Kasarani.",
    "Evaluate cash flow vulnerability under high grid tariffs.",
    "Compare balanced vs aggressive growth strategies."
  ];

  return (
    <div className="p-6 lg:h-[calc(100vh-120px)] h-[calc(100vh-100px)] flex flex-col gap-6 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-[#1e293b] pb-4 mb-2 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Brain className="text-emerald-400 w-5 h-5" />
            Executive Decision Strategy Assistant
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest leading-relaxed">
            RAG-grounded decision advisor powered by Gemini 3.5 Flash and local database metrics.
          </p>
        </div>
        
        <button 
          onClick={clearAiChat}
          className="p-2 border border-[#1e293b] text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer transition-colors"
          title="Clear Chat History"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* CHAT BUBBLE VIEWPORT */}
      <div className="flex-1 glass-panel rounded-lg p-5 overflow-y-auto flex flex-col gap-4 scrollbar-thin select-text">
        {aiConversation.map((msg, idx) => (
          <div 
            key={`chat-msg-${idx}`}
            className={`flex flex-col max-w-[85%] rounded-lg p-4 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-500/10 border border-blue-500/30 text-slate-200 self-end' 
                : 'bg-slate-900/40 border border-[#1e293b] text-slate-300 self-start'
            }`}
          >
            {/* Header label */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2">
              {msg.role === 'user' ? (
                <span className="text-blue-400">Investment Officer</span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  Strategy Advisor
                </span>
              )}
            </div>
            
            {/* Message text with basic markdown formatting support */}
            <div className="whitespace-pre-line font-sans">
              {msg.content}
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {aiLoading && (
          <div className="bg-slate-900/40 border border-[#1e293b] text-slate-400 self-start rounded-lg p-4 max-w-[85%] text-xs flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100"></span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200"></span>
            <span>Retrieving ground-truth database records and evaluating strategies...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* PROMPT CHIPS */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {seedChips.map((chip, idx) => (
          <button
            key={`chip-${idx}`}
            onClick={() => handleChipClick(chip)}
            disabled={aiLoading}
            className="px-3.5 py-2 border border-[#1e293b] hover:border-emerald-500 text-[11px] text-slate-400 hover:text-white rounded-full bg-slate-950/40 cursor-pointer disabled:opacity-50 transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* INPUT CONSOLE */}
      <form onSubmit={handleSubmit} className="flex gap-3 shrink-0">
        <input 
          type="text" 
          placeholder="e.g. Where should we build next and what is the expected payback?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={aiLoading}
          className="flex-1 px-4 py-3 bg-[#0e1017] border border-[#181b24] rounded text-white text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || aiLoading}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-[#060813] font-bold rounded flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4 fill-current" />
        </button>
      </form>
    </div>
  );
};
export default AiAdvisorView;
