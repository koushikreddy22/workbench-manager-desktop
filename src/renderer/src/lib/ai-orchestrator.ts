import { AiSettings } from '../components/AiSettingsModal';

export interface DiagnosisResult {
    error: string;
    explanation: string;
    fixCommand?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

declare global {
    interface Window {
        api: any;
    }
}

export class AiOrchestrator {
    private static async askAi(prompt: string, settings: AiSettings): Promise<string> {
        if (settings.mode === 'ollama') {
            return this.callOllama(prompt, settings);
        } else if (settings.mode === 'cloud') {
            return this.callCloudProvider(prompt, settings);
        }
        return ""; // Fallback for native
    }

    private static async callOllama(prompt: string, settings: AiSettings, history: ChatMessage[] = []): Promise<string> {
        const messages = history.length > 0 ? history : [{ role: 'user', content: prompt }];
        try {
            return await window.api.aiChat({ mode: 'ollama', settings, messages });
        } catch (err: any) {
            console.error("Main process AI call failed:", err);
            throw new Error(`Ollama Proxy failed: ${err.message}`);
        }
    }

    private static async callCloudProvider(prompt: string, settings: AiSettings, history: ChatMessage[] = []): Promise<string> {
        const messages = history.length > 0 ? history : [{ role: 'user', content: prompt }];
        try {
            return await window.api.aiChat({ mode: 'cloud', settings, messages });
        } catch (err: any) {
            console.error("Main process AI call failed:", err);
            throw new Error(err.message);
        }
    }

    static async chat(messages: ChatMessage[], settings: AiSettings, systemContext: string): Promise<string> {
        if (settings.mode === 'native') {
            const lastMsg = messages[messages.length - 1].content.toLowerCase();
            if (lastMsg.includes('status')) return `System Context: ${systemContext}`;
            if (lastMsg.includes('start')) return "I can help with that. Which service should I start? (Pro tip: use the Cloud or Ollama mode for better conversations!)";
            return "Vantage Co-pilot (Native Mode): I'm currently running in heuristic mode. Switch to Ollama or Cloud mode in Settings for a full LLM experience!";
        }

        const fullHistory: ChatMessage[] = [
            { role: 'system', content: `You are Vantage Co-pilot, an expert developer assistant. 
              Current Workbench Context: ${systemContext}.
              You can suggest actions using this format: [ACTION: intent service-name]. 
              Available intents: start, stop, restart, build, install.
              Example: "I see the auth-service is stopped. Would you like me to start it? [ACTION: start auth-service]"` },
            ...messages
        ];

        if (settings.mode === 'ollama') {
            return this.callOllama("", settings, fullHistory);
        } else {
            return this.callCloudProvider("", settings, fullHistory);
        }
    }

    static async analyzeLogs(logs: string[], settings: AiSettings): Promise<DiagnosisResult | null> {
        if (settings.mode !== 'native') {
            try {
                const logContext = logs.slice(-20).join('\n');
                const prompt = `Analyze these service logs and provide a JSON response with 'error' (short title), 'explanation' (detailed reasoning), and 'fixCommand' (optional terminal command). 
                Logs:\n${logContext}`;
                const response = await this.askAi(prompt, settings);
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
            } catch (e) { console.warn("AI analysis failed", e); }
        }

        const errorLogs = logs.filter(l => l.includes('[ERROR]') || l.toLowerCase().includes('error'));
        if (errorLogs.length === 0) return { error: "System Health: Optimal", explanation: "No critical issues detected." };

        for (let i = errorLogs.length - 1; i >= 0; i--) {
            const l = errorLogs[i].toUpperCase();
            if (l.includes('EADDRINUSE')) return { error: "Port Conflict", explanation: "Port already occupied.", fixCommand: "stop" };
            if (l.includes('MODULE_NOT_FOUND')) return { error: "Missing Dependency", explanation: "Module not found.", fixCommand: "npm install" };
            if (l.includes('CONNECTION REFUSED')) return { error: "Connection Failed", explanation: "Backend unreachable." };
        }
        return { error: "Complex Issue Detected", explanation: "Issues found but no specific pattern matched." };
    }

    static async summarizeDiff(diff: string, settings: AiSettings): Promise<string> {
        if (!diff) return "No changes detected.";
        if (settings.mode !== 'native') {
            try {
                return await this.askAi(`Summarize this git diff briefly in bullet points:\n${diff.slice(0, 4000)}`, settings);
            } catch (e) { console.warn("AI summary failed"); }
        }
        const lines = diff.split('\n');
        const uniqueFiles = Array.from(new Set(lines.filter(l => l.startsWith('--- a/') || l.startsWith('+++ b/')).map(l => l.replace('--- a/', '').replace('+++ b/', ''))));
        return `Modified ${uniqueFiles.length} files including ${uniqueFiles.slice(0, 3).join(', ')}`;
    }

    static async suggestCommitMessage(diff: string, settings: AiSettings): Promise<string> {
        if (!diff) return "chore: idle";
        if (settings.mode !== 'native') {
            try {
                return await this.askAi(`Suggest a professional conventional commit message for this diff:\n${diff.slice(0, 2000)}`, settings);
            } catch (e) { console.warn("AI commit suggestion failed"); }
        }
        if (diff.includes('package.json')) return "chore: update dependencies";
        return "feat: updates in core logic";
    }
}
