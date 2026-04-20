import React, { useState, useRef } from "react";
import { Sparkles, ArrowRight, Loader2, Info } from "lucide-react";
import { cn } from "../lib/utils";

interface CommandBarProps {
  onExecute: (prompt: string) => Promise<void>;
  isProcessing: boolean;
  selectedCount: number;
}

export function CommandBar({ onExecute, isProcessing, selectedCount }: CommandBarProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isProcessing) {
      onExecute(prompt);
      setPrompt("");
    }
  };

  const suggestions = [
    "start checked in QA",
    "stop all services",
    "start all in prod",
    "restart checked"
  ];

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <form 
        onSubmit={handleSubmit}
        className={cn(
          "relative group transition-all duration-300",
          isProcessing ? "opacity-80" : "opacity-100"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl blur-xl group-focus-within:blur-2xl transition-all opacity-0 group-focus-within:opacity-100" />
        
        <div className="relative flex items-center gap-3 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-2 pl-5 rounded-2xl shadow-2xl group-focus-within:border-cyan-500/50 group-focus-within:bg-slate-900/80 transition-all">
          <div className="flex items-center gap-3 shrink-0">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
            )}
            <div className="h-4 w-px bg-slate-700" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isProcessing}
            placeholder={selectedCount > 0 ? `Command ${selectedCount} selected services...` : "Type a command (e.g., 'start checked in QA')"}
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-200 placeholder:text-slate-500 py-2"
          />

          <div className="flex items-center gap-2 pr-1">
             {selectedCount > 1 && (
               <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                 {selectedCount} Selected
               </div>
             )}
             
            <button
              type="submit"
              disabled={isProcessing || !prompt.trim()}
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                prompt.trim() && !isProcessing 
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:scale-105 active:scale-95" 
                  : "bg-slate-800 text-slate-500"
              )}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Suggestions */}
        {!prompt && !isProcessing && (
           <div className="flex items-center gap-3 mt-3 ml-2">
             <Info className="h-3 w-3 text-slate-600" />
             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Suggestions:</span>
             <div className="flex gap-2">
               {suggestions.map((s) => (
                 <button
                   key={s}
                   type="button"
                   onClick={() => setPrompt(s)}
                   className="text-[10px] font-bold text-slate-500 hover:text-cyan-400 transition-colors bg-slate-800/30 px-2 py-0.5 rounded border border-slate-700/30 hover:border-cyan-500/30"
                 >
                   {s}
                 </button>
               ))}
             </div>
           </div>
        )}
      </form>
    </div>
  );
}
