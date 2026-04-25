import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Trash2, Copy, RotateCw, X } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'

interface TerminalComponentProps {
  id: string
  cwd: string
  onClose?: () => void
}

export const TerminalComponent: React.FC<TerminalComponentProps> = ({ id, cwd, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e', // VS Code dark theme background
        foreground: '#cccccc',
        cursor: '#ffffff'
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Tell backend to spawn the pty process
    window.api.terminalCreate({ id, cwd }).then((res) => {
      if (res.error) {
        term.write(`\x1b[31mError starting terminal: ${res.error}\x1b[0m\r\n`)
      }
    })

    // Handle frontend -> backend (keystrokes)
    const onDataDisposable = term.onData((data) => {
      window.api.terminalInput({ id, data })
    })

    // Handle frontend -> backend (resize)
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit()
        const dims = fitAddonRef.current.proposeDimensions()
        if (dims) {
          window.api.terminalResize({ id, cols: dims.cols, rows: dims.rows })
        }
      }
    }

    window.addEventListener('resize', handleResize)

    // Initial resize to sync pty with xterm bounds
    setTimeout(handleResize, 100)

    // Handle backend -> frontend (output)
    window.api.onTerminalOutput(id, (data) => {
      term.write(data)
    })

    // Handle backend -> frontend (exit)
    window.api.onTerminalExit(id, () => {
      term.write('\r\n\x1b[33m[process exited]\x1b[0m\r\n')
      if (onClose) onClose()
    })

    // Cleanup
    return () => {
      onDataDisposable.dispose()
      window.removeEventListener('resize', handleResize)
      window.api.offTerminalOutput(id)
      window.api.offTerminalExit(id)
      window.api.terminalClose({ id })
      term.dispose()
    }
  }, [id, cwd, onClose])

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">
            Terminal Registry
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => xtermRef.current?.clear()}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all"
            title="Clear Buffer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all"
            title="Copy All"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all"
            title="Restart Session"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 w-full p-2" />
    </div>
  )
}
