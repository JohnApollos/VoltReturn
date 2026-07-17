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
      <div className="flex justify-between items-center border-b border-[#d8d2c4] pb-4 mb-2 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <Brain className="text-[#15803d] w-5 h-5" />
            Executive Decision Strategy Assistant
          </h2>
          <p className="text-xs text-[#5c564c] mt-1 uppercase tracking-widest leading-relaxed">
            RAG-grounded decision advisor powered by Gemini 2.5 Flash and local database metrics.
          </p>
        </div>
        
        <button 
          onClick={clearAiChat}
          className="p-2 border border-[#d8d2c4] text-[#5c564c] hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
          title="Clear Chat History"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* CHAT BUBBLE VIEWPORT */}
      <div className="flex-1 bg-white border border-[#d8d2c4] rounded p-5 overflow-y-auto flex flex-col gap-4 scrollbar-thin select-text">
        {aiConversation.map((msg, idx) => (
          <div 
            key={`chat-msg-${idx}`}
            className={`flex flex-col max-w-[85%] rounded p-4 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-50 border border-blue-200 text-slate-900 self-end' 
                : 'bg-[#fdfcf9] border border-[#d8d2c4] text-slate-900 self-start'
            }`}
          >
            {/* Header label */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2">
              {msg.role === 'user' ? (
                <span className="text-[#1a68d1]">Investment Officer</span>
              ) : (
                <span className="text-[#15803d] flex items-center gap-1">
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
          <div className="bg-[#fcfaf7] border border-[#d8d2c4] text-[#5c564c] self-start rounded p-4 max-w-[85%] text-xs flex items-center gap-3">
            <span className="w-2 h-2 bg-[#15803d] rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-[#15803d] rounded-full animate-bounce delay-100"></span>
            <span className="w-2 h-2 bg-[#15803d] rounded-full animate-bounce delay-200"></span>
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
            className="px-3.5 py-2 border border-[#d8d2c4] hover:border-[#15803d] text-[11px] text-[#5c564c] hover:text-slate-950 rounded-full bg-white cursor-pointer disabled:opacity-50 transition-all"
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
          className="flex-1 px-4 py-3 bg-white border border-[#d8d2c4] rounded text-slate-900 text-sm focus:outline-none focus:border-[#15803d]"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || aiLoading}
          className="px-5 py-3 bg-[#15803d] hover:bg-[#166534] text-white font-bold rounded flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4 fill-current" />
        </button>
      </form>
    </div>
  );
};
export default AiAdvisorView;
