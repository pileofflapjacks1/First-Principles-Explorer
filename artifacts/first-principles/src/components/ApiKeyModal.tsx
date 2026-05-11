import { useState } from "react";
import { X, Key, ExternalLink, AlertTriangle } from "lucide-react";

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  onClose?: () => void;
  isEdit?: boolean;
}

export function ApiKeyModal({ onSave, onClose, isEdit }: ApiKeyModalProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  function handleSave() {
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Please enter your API key");
      return;
    }
    if (!trimmed.startsWith("xai-")) {
      setError("xAI API keys typically start with 'xai-'");
    }
    localStorage.setItem("xai_api_key", trimmed);
    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[hsl(224_71%_7%)] border border-[hsl(216_34%_17%)] rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[hsl(210_100%_66%/0.15)] flex items-center justify-center">
              <Key className="w-5 h-5 text-[hsl(210_100%_66%)]" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              {isEdit ? "Update API Key" : "Connect xAI Grok"}
            </h2>
          </div>
          {isEdit && onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(215.4_16.3%_56.9%)] hover:text-white hover:bg-[hsl(216_34%_17%)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-[hsl(215.4_16.3%_56.9%)] text-sm leading-relaxed">
          This app uses the xAI Grok API to generate first-principles breakdowns.
          Your key is stored only in your browser and never sent to any server.
        </p>

        <div className="bg-[hsl(30_80%_55%/0.1)] border border-[hsl(30_80%_55%/0.3)] rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-[hsl(30_80%_65%)] mt-0.5 shrink-0" />
          <p className="text-xs text-[hsl(30_80%_75%)] leading-relaxed">
            API keys stored in localStorage are accessible to browser extensions. Use a key with appropriate rate limits for personal use only.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[hsl(213_31%_91%)]">
            Your xAI API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="xai-..."
            className="w-full px-3 py-2.5 bg-[hsl(223_47%_11%)] border border-[hsl(216_34%_17%)] rounded-xl text-white placeholder-[hsl(215.4_16.3%_36.9%)] text-sm outline-none focus:border-[hsl(210_100%_66%)] transition-colors"
            autoFocus
          />
          {error && (
            <p className="text-xs text-[hsl(0_63%_61%)]">{error}</p>
          )}
        </div>

        <a
          href="https://console.x.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[hsl(210_100%_66%)] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Get your free API key at console.x.ai
        </a>

        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="w-full py-2.5 bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] disabled:opacity-40 disabled:cursor-not-allowed text-[hsl(224_71%_4%)] font-semibold rounded-xl transition-colors text-sm"
        >
          {isEdit ? "Update Key" : "Connect & Start Exploring"}
        </button>
      </div>
    </div>
  );
}
