import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Send, User, Bot, 
  Trash2, Maximize2, Minimize2,
  Play, Square, RefreshCcw, Database, ShieldCheck,
  Terminal, Zap, Loader2, AlertCircle, CheckCircle2,
  Plus, History, MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatMessage } from '../lib/ai-orchestrator';

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

interface AiChatbotProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSendMessage: (content: string) => void;
  onNewChat: () => void;
  onSwitchChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClearHistory: () => void;
  onExecuteAction: (intent: string, service: string) => void;
  isProcessing: boolean;
  workbenchPath?: string | null;
  settings: any;
}

export const AiChatbot: React.FC<AiChatbotProps> = ({ 
  conversations,
  activeConversationId,
  onSendMessage, 
  onNewChat,
  onSwitchChat,
  onDeleteChat,
  onClearHistory, 
  onExecuteAction,
  isProcessing,
  workbenchPath,
  settings
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [input, setInput] = useState('');
  
  const activeConv = conversations.find(c => c.id === activeConversationId);
  const messages = activeConv?.messages || [];
  const [shellExecuting, setShellExecuting] = useState<string | null>(null);
  const [autoExecutedActions] = useState(new Set<string>());
  const [executionResults, setExecutionResults] = useState<Record<string, { success: boolean, error?: string }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Auto-Pilot Effect: Scan the last message for actions to auto-execute
  useEffect(() => {
    if (!settings?.autoPilot) return;
    
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    const actionRegex = /\[(SHELL|CREATE_FILE|FIX_FILE): ([\s\S]+?)\]/g;
    let match;

    while ((match = actionRegex.exec(lastMessage.content)) !== null) {
      const [tag, type, payload] = match;
      const actionKey = `${lastMessage.timestamp}-${match.index}`;

      if (!autoExecutedActions.has(actionKey)) {
        autoExecutedActions.add(actionKey);
        
        // Use a small delay for visual feedback
        setTimeout(() => {
          if (type === 'SHELL') {
             handleAutoShell(payload, actionKey);
          } else {
             handleAutoFile(type, payload, lastMessage.content, match.index + tag.length, actionKey);
          }
        }, 800);
      }
    }
  }, [messages, settings?.autoPilot]);

  const handleAutoShell = async (command: string, key?: string) => {
    if (!workbenchPath) return;
    setShellExecuting(command);
    try {
      const result = await (window as any).api.shellCommand({ command, cwd: workbenchPath });
      if (key) {
        setExecutionResults(prev => ({ 
          ...prev, 
          [key]: { success: result.success, error: result.error } 
        }));
      }
    } catch (e: any) { 
      console.error("Auto-shell failed:", e); 
      if (key) setExecutionResults(prev => ({ ...prev, [key]: { success: false, error: e.message } }));
    }
    finally { setShellExecuting(null); }
  };

  const handleAutoFile = async (type: string, filePath: string, content: string, startIndex: number, key?: string) => {
    const codeMatch = content.substring(startIndex).match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      try {
        await onExecuteAction(type === 'CREATE_FILE' ? 'create-file' : 'fix-file', filePath + "|" + codeMatch[1]);
        if (key) setExecutionResults(prev => ({ ...prev, [key]: { success: true } }));
      } catch (e: any) {
        if (key) setExecutionResults(prev => ({ ...prev, [key]: { success: false, error: e.message } }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const renderContent = (content: string) => {
    const parts: React.ReactNode[] = [];
    
    // Pattern 1: Autonomous Tags [SHELL: ...], [CREATE_FILE: ...], [FIX_FILE: ...]
    // Pattern 2: Legacy Action Tags [ACTION: intent service]
    const unifiedRegex = /\[(SHELL|CREATE_FILE|FIX_FILE): ([\s\S]+?)\]|\[ACTION: (\w+) ([\w-]+)\]/g;
    
    let lastIndex = 0;
    let match;

    while ((match = unifiedRegex.exec(content)) !== null) {
      // Text segment before the match
      if (match.index > lastIndex) {
        parts.push(renderMarkdown(content.substring(lastIndex, match.index)));
      }

      const [tag, type, payloadOrIntent, tagIntent, service] = match;
      const actionKey = `${messages[messages.length - 1]?.timestamp}-${match.index}`; // Simplified key for rendering
      const result = executionResults[actionKey];
      
      if (type === 'SHELL') {
        const command = payloadOrIntent;
        parts.push(
          <div key={`shell-action-${match.index}`} className={cn(
            "my-4 p-4 bg-slate-950 border rounded-2xl space-y-3 shadow-lg group transition-all",
            result ? (result.success ? "border-emerald-500/50" : "border-red-500/50") : "border-emerald-500/30"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  result ? (result.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400") : "bg-emerald-500/20 text-emerald-400"
                )}>
                  {result ? (result.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />) : <Terminal className="h-3.5 w-3.5" />}
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Terminal Action</span>
              </div>
              {settings?.autoPilot && !result && <span className="text-[10px] text-emerald-500 font-bold animate-pulse">Auto-Executing...</span>}
              {result && <span className={cn("text-[10px] font-bold uppercase", result.success ? "text-emerald-500" : "text-red-500")}>
                {result.success ? "Execution Success" : "Execution Failed"}
              </span>}
            </div>
            <div className={cn(
              "bg-black/50 p-3 rounded-xl border font-mono text-[10px] break-all leading-relaxed",
              result ? (result.success ? "border-emerald-500/10 text-emerald-400" : "border-red-500/10 text-red-400") : "border-white/5 text-emerald-400"
            )}>
              {command}
            </div>
            {result?.error && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] text-red-400 font-mono">
                {result.error}
              </div>
            )}
            {!settings?.autoPilot && !result && (
              <button
                onClick={() => handleAutoShell(command, actionKey)}
                disabled={shellExecuting === command}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_10px_rgba(16,185,129,0.3)] active:scale-95 flex items-center justify-center gap-2"
              >
                {shellExecuting === command ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                {shellExecuting === command ? 'Executing...' : 'Run Terminal Action'}
              </button>
            )}
          </div>
        );
      } else if (type === 'CREATE_FILE' || type === 'FIX_FILE') {
        const filePath = payloadOrIntent;
        const codeContentMatch = content.substring(match.index + tag.length).match(/```(?:\w+)?\n([\s\S]*?)```/);

        parts.push(
          <div key={`file-action-${match.index}`} className={cn(
            "my-4 p-4 bg-slate-950 border rounded-2xl space-y-3 shadow-lg overflow-hidden group transition-all",
            result ? (result.success ? "border-purple-500/50" : "border-red-500/50") : "border-purple-500/30"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  result ? (result.success ? "bg-purple-500/20 text-purple-400" : "bg-red-500/20 text-red-400") : "bg-purple-500/20 text-purple-400"
                )}>
                  {result ? (result.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />) : <Database className="h-3.5 w-3.5" />}
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{type === 'CREATE_FILE' ? 'New File' : 'Suggested Fix'}</span>
              </div>
              {settings?.autoPilot && !result && <span className="text-[10px] text-purple-400 font-bold animate-pulse">Auto-Scaffolding...</span>}
              {result && <span className={cn("text-[10px] font-bold uppercase", result.success ? "text-purple-500" : "text-red-500")}>
                {result.success ? "Scaffolded" : "Scaffold Failed"}
              </span>}
            </div>
            <span className={cn(
              "text-[10px] font-mono truncate block",
              result?.success ? "text-purple-400" : "text-slate-500"
            )}>{filePath}</span>
            
            {result?.error && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] text-red-400 font-mono">
                {result.error}
              </div>
            )}

            {!settings?.autoPilot && !result && (
              <button
                onClick={() => handleAutoFile(type, filePath, content, match.index + tag.length, actionKey)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_10px_rgba(147,51,234,0.3)] active:scale-95 flex items-center justify-center gap-2"
              >
                {type === 'CREATE_FILE' ? <Maximize2 className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                {type === 'CREATE_FILE' ? 'Generate File' : 'Apply Implementation'}
              </button>
            )}
          </div>
        );

        // Skip the code block in the main rendering
        if (codeContentMatch) {
          unifiedRegex.lastIndex = match.index + tag.length + (codeContentMatch.index || 0) + codeContentMatch[0].length;
        }
      } else {
        // Tag intent from legacy ACTION pattern
        const intent = tagIntent;
        const sName = service;
        parts.push(
          <button
            key={`action-${match.index}`}
            onClick={() => onExecuteAction(intent, sName)}
            className="my-2 flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 font-bold text-xs hover:bg-cyan-500/30 transition-all group shadow-sm"
          >
            {intent === 'start' && <Play className="h-3 w-3 fill-current" />}
            {intent === 'stop' && <Square className="h-3 w-3 fill-current" />}
            {intent === 'restart' && <RefreshCcw className="h-3 w-3" />}
            {intent?.toUpperCase()} {sName}
          </button>
        );
      }

      lastIndex = unifiedRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex);
      parts.push(
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           key={`text-${lastIndex}`}
        >
          {renderMarkdown(remaining)}
        </motion.div>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  // Luxury Markdown-lite Renderer
  const renderMarkdown = (text: string) => {
    // Fenced code blocks
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentBlock: string[] = [];
    let inCodeBlock = false;

    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${i}`} className="my-3 p-4 bg-slate-950 border border-white/5 rounded-xl text-[11px] font-mono overflow-x-auto text-cyan-300 shadow-inner">
              <code>{currentBlock.join('\n')}</code>
            </pre>
          );
          currentBlock = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
      } else if (inCodeBlock) {
        currentBlock.push(line);
      } else {
        // Handle bold, italic, and inline code
        let processedLine: any = line;
        
        // Inline code
        processedLine = processedLine.split(/(`[^`]+`)/g).map((part: string, pi: number) => {
           if (part.startsWith('`') && part.endsWith('`')) {
             return <code key={pi} className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-purple-300">{part.slice(1, -1)}</code>;
           }
           return part;
        });

        // Bold (very simplified)
        elements.push(<p key={`p-${i}`} className="mb-2 last:mb-0 min-h-[1em]">{processedLine}</p>);
      }
    });

    return <div key={Math.random()}>{elements}</div>;
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
              "w-[400px] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 relative",
              isMinimized ? "h-[60px]" : "h-[600px] max-h-[80vh]",
              isHistoryOpen && !isMinimized && "w-[650px]" 
            )}
          >
            {/* History Sidebar */}
            {!isMinimized && isHistoryOpen && (
              <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-950 border-r border-white/5 z-20 flex flex-col animate-in slide-in-from-left duration-300">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversation Vault</span>
                  <button onClick={() => setIsHistoryOpen(false)} className="text-slate-500 hover:text-white">
                    <History className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {conversations.sort((a, b) => b.updatedAt - a.updatedAt).map(conv => (
                    <div 
                      key={conv.id}
                      className={cn(
                        "group/conv flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer",
                        activeConversationId === conv.id ? "bg-purple-500/10 border border-purple-500/20" : "hover:bg-white/5"
                      )}
                      onClick={() => onSwitchChat(conv.id)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <MessageSquare className={cn("h-4 w-4 shrink-0", activeConversationId === conv.id ? "text-purple-400" : "text-slate-500")} />
                        <span className={cn("text-xs truncate", activeConversationId === conv.id ? "text-purple-300 font-bold" : "text-slate-400")}>
                          {conv.title}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteChat(conv.id); }}
                        className="opacity-0 group-hover/conv:opacity-100 p-1 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <div className="text-center py-10 opacity-30 italic text-[10px]">No history found.</div>
                  )}
                </div>
                <div className="p-4 border-t border-white/5">
                  <button 
                    onClick={onClearHistory}
                    className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-red-400/60 hover:text-red-400 hover:bg-red-950/20 rounded-xl border border-dashed border-red-500/20 transition-all"
                  >
                    <Trash2 className="h-3 w-3" /> Clear All Vaults
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className={cn(
              "p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-b border-white/5 flex items-center justify-between transition-all",
              isHistoryOpen && !isMinimized && "ml-64"
            )}>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isHistoryOpen ? "bg-purple-500 text-white" : "bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30"
                  )}
                  title="History"
                >
                  <History className="h-4 w-4" />
                </button>
                <div>
                  <h3 className="text-sm font-black text-white italic">VANTAGE CO-PILOT</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {activeConv ? activeConv.title : "Active Insight"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={onNewChat}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-cyan-400 flex items-center gap-2"
                  title="New Chat"
                >
                  <Plus className="h-4 w-4" />
                  {!isMinimized && !isHistoryOpen && <span className="text-[10px] font-black uppercase pr-1">New Chat</span>}
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
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
                  className={cn(
                    "flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900/50 transition-all",
                    isHistoryOpen ? "ml-64" : ""
                  )}
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
                  className={cn(
                    "p-4 bg-slate-950/50 border-t border-white/5 transition-all",
                    isHistoryOpen ? "ml-64" : ""
                  )}
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
