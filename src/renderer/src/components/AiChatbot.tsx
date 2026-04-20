import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Send, User, Bot, 
  Trash2, Maximize2, Minimize2,
  Play, Square, RefreshCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatMessage } from '../lib/ai-orchestrator';

interface AiChatbotProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClearHistory: () => void;
  onExecuteAction: (intent: string, service: string) => void;
  isProcessing: boolean;
}

export const AiChatbot: React.FC<AiChatbotProps> = ({ 
  messages, 
  onSendMessage, 
  onClearHistory,
  onExecuteAction,
  isProcessing 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const renderContent = (content: string) => {
    // Basic Action Parser: [ACTION: intent service]
    const actionRegex = /\[ACTION: (\w+) ([\w-]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      // Push text before action
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>);
      }

      const [_, intent, service] = match;
      parts.push(
        <button
          key={`action-${match.index}`}
          onClick={() => onExecuteAction(intent, service)}
          className="my-2 flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 font-bold text-xs hover:bg-cyan-500/30 transition-all group"
        >
          {intent === 'start' && <Play className="h-3 w-3 fill-current" />}
          {intent === 'stop' && <Square className="h-3 w-3 fill-current" />}
          {intent === 'restart' && <RefreshCcw className="h-3 w-3" />}
          {intent.toUpperCase()} {service}
        </button>
      );
      lastIndex = actionRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "w-[400px] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
              isMinimized ? "h-[60px]" : "h-[600px] max-h-[80vh]"
            )}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white italic">VANTAGE CO-PILOT</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Insight</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>
                <button 
                  onClick={onClearHistory}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                  title="Clear History"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            {!isMinimized && (
              <>
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-slate-900/50"
                >
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                      <div className="p-4 rounded-full bg-white/5">
                        <Bot className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="max-w-[200px]">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No conversation yet</p>
                        <p className="text-[10px] text-slate-500 mt-1">Ask me about your services, logs, or branch status.</p>
                      </div>
                    </div>
                  )}
                  {messages.filter(m => m.role !== 'system').map((msg, i) => (
                    <motion.div
                      initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i}
                      className={cn(
                        "flex gap-3",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border",
                        msg.role === 'user' 
                          ? "bg-slate-800 border-white/10 text-white" 
                          : "bg-purple-500/20 border-purple-500/30 text-purple-400"
                      )}>
                        {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={cn(
                        "max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed",
                        msg.role === 'user'
                          ? "bg-blue-600/20 border border-blue-500/30 text-blue-50 rounded-tr-none"
                          : "bg-slate-800/80 border border-white/5 text-slate-300 rounded-tl-none"
                      )}>
                        {renderContent(msg.content)}
                      </div>
                    </motion.div>
                  ))}
                  {isProcessing && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center animate-pulse">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-slate-800/80 border border-white/5 p-3 rounded-2xl rounded-tl-none flex gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500/50 animate-bounce" />
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500/50 animate-bounce [animation-delay:0.2s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500/50 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <form 
                  onSubmit={handleSubmit}
                  className="p-4 bg-slate-950/50 border-t border-white/5"
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-purple-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative flex items-center bg-slate-950 border border-white/10 rounded-2xl p-1 group-focus-within:border-purple-500/50 transition-all">
                      <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isProcessing}
                        className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-xs text-white placeholder:text-slate-600"
                      />
                      <button 
                        type="submit"
                        disabled={!input.trim() || isProcessing}
                        className="p-2 rounded-xl bg-purple-600 text-white disabled:opacity-50 disabled:bg-slate-800 transition-all hover:bg-purple-500"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all relative group",
          isOpen 
            ? "bg-slate-900 border border-white/20 text-slate-400 rotate-90" 
            : "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
        )}
      >
        {isOpen ? (
          <X className="h-7 w-7" />
        ) : (
          <>
            <div className="absolute inset-0 bg-purple-400 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 animate-pulse" />
            <Sparkles className="h-7 w-7 relative z-10" />
            
            {/* Notification Badge if needed */}
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-slate-950 rounded-full animate-bounce" />
          </>
        )}
      </motion.button>
    </div>
  );
};
