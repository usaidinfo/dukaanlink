"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { isLowParseConfidence, parseVoiceItem } from "../../lib/voice-item-parser";
import { romanizeHinglish } from "../../lib/romanize-hi";
import { useI18n } from "../i18n-provider";
import "./voice-item-input.css";

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function scoreTranscript(text) {
  const parsed = parseVoiceItem(text);
  let score = 0;
  if (parsed.price != null) score += 4;
  if (parsed.name && parsed.name.length >= 2) score += 2;
  if (/[a-zA-Z]/.test(text)) score += 1;
  if (/confirmation of the word|x-o-c|spelled? out/i.test(text)) score -= 8;
  return score;
}

function pickBestTranscript(results) {
  const options = [];
  for (let i = 0; i < results.length; i += 1) {
    const row = results[i];
    for (let j = 0; j < row.length; j += 1) {
      const text = romanizeHinglish(String(row[j]?.transcript || "").trim());
      if (text) options.push(text);
    }
  }
  if (!options.length) return "";
  return options.sort((a, b) => scoreTranscript(b) - scoreTranscript(a))[0];
}

export function useVoiceRecorder({ onTranscript, onError }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState("idle");
  const [liveText, setLiveText] = useState("");
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  function finish(text) {
    setPhase("idle");
    setLiveText("");
    const heard = romanizeHinglish(String(text || "").trim());
    if (!heard) {
      onErrorRef.current(t("menu.voiceMissed"));
      return;
    }
    onTranscriptRef.current(heard);
  }

  function startListening() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      onErrorRef.current(t("menu.voiceUnsupported"));
      return;
    }

    onErrorRef.current("");
    setLiveText("");
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 5;
    recognitionRef.current = recognition;

    recognition.onstart = () => setPhase("listening");
    recognition.onend = () => {
      recognitionRef.current = null;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
    recognition.onerror = (event) => {
      setPhase("idle");
      setLiveText("");
      const code = event?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        onErrorRef.current(t("menu.voicePermission"));
        return;
      }
      if (code === "aborted") return;
      onErrorRef.current(t("menu.voiceMissed"));
    };
    recognition.onresult = (event) => {
      const best = pickBestTranscript(event.results);
      setLiveText(best);
      if (event.results[event.results.length - 1]?.isFinal) {
        finish(best);
      }
    };

    try {
      recognition.start();
      timeoutRef.current = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }, 8000);
    } catch {
      setPhase("idle");
      onErrorRef.current(t("menu.voiceMissed"));
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setPhase("idle");
  }

  function toggle() {
    if (phase === "listening") {
      stopListening();
      return;
    }
    if (phase === "idle") startListening();
  }

  return {
    phase,
    listening: phase === "listening",
    busy: false,
    liveText,
    toggle,
  };
}

export function VoiceMicButton({ listening, busy, onClick, className = "" }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`menu-fab voice ${listening ? "on" : ""} ${className}`.trim()}
      onClick={onClick}
      disabled={busy}
      aria-label={listening ? t("menu.voiceStop") : t("menu.voiceSpeak")}
    >
      {listening ? <Square size={18} strokeWidth={2.5} /> : <Mic size={22} strokeWidth={2.3} />}
    </button>
  );
}

export function VoiceStatus({ phase, error, transcript, liveText }) {
  const { t } = useI18n();
  if (error) return <div className="voice-status error">{error}</div>;
  if (phase === "listening") {
    return (
      <div className="voice-status live">
        <span className="voice-listening">
          <i />
          <i />
          <i />
        </span>
        {liveText || t("menu.voiceListening")}
      </div>
    );
  }
  if (transcript) return <div className="voice-status heard">{t("menu.voiceHeard")}: {transcript}</div>;
  return null;
}

export { isLowParseConfidence, parseVoiceItem };
