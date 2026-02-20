import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalComponentProps {
    id: string;
    cwd: string;
    onClose?: () => void;
}

export const TerminalComponent: React.FC<TerminalComponentProps> = ({ id, cwd, onClose }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm.js
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e', // VS Code dark theme background
                foreground: '#cccccc',
                cursor: '#ffffff',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Tell backend to spawn the pty process
        window.api.terminalCreate({ id, cwd }).then(res => {
            if (res.error) {
                term.write(`\x1b[31mError starting terminal: ${res.error}\x1b[0m\r\n`);
            }
        });

        // Handle frontend -> backend (keystrokes)
        const onDataDisposable = term.onData((data) => {
            window.api.terminalInput({ id, data });
        });

        // Handle frontend -> backend (resize)
        const handleResize = () => {
            if (fitAddonRef.current && xtermRef.current) {
                fitAddonRef.current.fit();
                const dims = fitAddonRef.current.proposeDimensions();
                if (dims) {
                    window.api.terminalResize({ id, cols: dims.cols, rows: dims.rows });
                }
            }
        };

        window.addEventListener('resize', handleResize);

        // Initial resize to sync pty with xterm bounds
        setTimeout(handleResize, 100);

        // Handle backend -> frontend (output)
        window.api.onTerminalOutput(id, (data) => {
            term.write(data);
        });

        // Handle backend -> frontend (exit)
        window.api.onTerminalExit(id, () => {
            term.write('\r\n\x1b[33m[process exited]\x1b[0m\r\n');
            if (onClose) onClose();
        });

        // Cleanup
        return () => {
            onDataDisposable.dispose();
            window.removeEventListener('resize', handleResize);
            window.api.offTerminalOutput(id);
            window.api.offTerminalExit(id);
            window.api.terminalClose({ id });
            term.dispose();
        };
    }, [id, cwd, onClose]);

    return (
        <div
            ref={terminalRef}
            className="w-full h-full bg-[#1e1e1e] rounded-b-xl overflow-hidden p-2"
        />
    );
};
