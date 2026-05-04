import React, { useState, useEffect, useRef, useCallback } from "react";
import Button from "../components/Button";
import { startInterview, submitAnswer, endInterview } from "../services/api";

const getSpeechRecognition = () =>
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const InterviewChat = ({ jobDescription, role = "" }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);
  const [listening, setListening] = useState(false);
  const [hostSpeaking, setHostSpeaking] = useState(false);
  const [voiceNote, setVoiceNote] = useState(null);
  const [autoListen, setAutoListen] = useState(true);
  const [questionNum, setQuestionNum] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const lastSpokenRef = useRef("");
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR || loading || finished) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    recognitionRef.current = rec;

    let finalTranscript = "";

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim = t;
        }
      }
      setAnswer((finalTranscript + interim).trim());
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [loading, finished]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const speakText = useCallback(
    (text, onDone) => {
      if (!voiceOut || typeof window === "undefined" || !window.speechSynthesis) {
        onDone?.();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) u.voice = preferred;

      u.onstart = () => setHostSpeaking(true);
      u.onend = () => {
        setHostSpeaking(false);
        onDone?.();
      };
      u.onerror = () => {
        setHostSpeaking(false);
        onDone?.();
      };
      window.speechSynthesis.speak(u);
    },
    [voiceOut]
  );

  const speakAndAutoListen = useCallback(
    (text) => {
      if (text === lastSpokenRef.current) return;
      lastSpokenRef.current = text;
      speakText(text, () => {
        if (autoListen && !finished) {
          setTimeout(() => startListening(), 400);
        }
      });
    },
    [speakText, autoListen, finished, startListening]
  );

  useEffect(() => {
    const questions = messages.filter((m) => m.type === "question");
    const latest = questions[questions.length - 1];
    if (latest?.text && voiceOut) {
      speakAndAutoListen(latest.text);
    }
  }, [messages, voiceOut, speakAndAutoListen]);

  useEffect(() => scrollToBottom(), [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setVoiceNote(
        "Voice input requires Chrome or Edge with microphone permission."
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    const initInterview = async () => {
      try {
        const result = await startInterview(jobDescription, role);
        setSessionId(result.session_id);
        setTotalQuestions(result.total_questions);
        setQuestionNum(1);
        setMessages([{ type: "question", text: result.first_question }]);
      } catch (err) {
        console.error("Failed to start interview:", err);
        setMessages([{
          type: "system",
          text: "Failed to start the interview. Please check that the backend is running.",
        }]);
      }
    };
    initInterview();
  }, [jobDescription, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || !sessionId) return;
    stopListening();

    const userAnswer = answer.trim();
    setLoading(true);
    setAnswer("");

    try {
      setMessages((msgs) => [...msgs, { type: "answer", text: userAnswer }]);
      const result = await submitAnswer(sessionId, userAnswer);

      if (result.feedback) {
        setMessages((msgs) => [...msgs, { type: "feedback", text: result.feedback }]);
      }

      if (result.complete) {
        const summaryText = result.summary || "Great job completing the interview!";
        setMessages((msgs) => [
          ...msgs,
          { type: "system", text: "Interview complete!" },
          { type: "summary", text: summaryText },
        ]);
        setFinished(true);
      } else {
        setQuestionNum(result.question_number + 1);
        setMessages((msgs) => [
          ...msgs,
          { type: "question", text: result.next_question },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((msgs) => [
        ...msgs,
        { type: "system", text: "Something went wrong. Try submitting again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;
    try {
      window.speechSynthesis?.cancel();
      stopListening();
      const result = await endInterview(sessionId);
      setFinished(true);
      setMessages((msgs) => [
        ...msgs,
        { type: "system", text: "Interview ended." },
        ...(result.summary
          ? [{ type: "summary", text: result.summary }]
          : []),
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMic = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const replayQuestion = () => {
    const questions = messages.filter((m) => m.type === "question");
    const latest = questions[questions.length - 1]?.text;
    if (latest) {
      lastSpokenRef.current = "";
      speakAndAutoListen(latest);
    }
  };

  const msgIcon = (type) => {
    switch (type) {
      case "question": return "Q";
      case "answer": return "A";
      case "feedback": return "F";
      case "summary": return "S";
      default: return "i";
    }
  };

  return (
    <div className="interview-page">
      {/* Top bar */}
      <div className="interview-topbar">
        <span className="interview-topbar__title">Interview Session</span>
        {totalQuestions > 0 && (
          <span className="interview-topbar__progress">
            Question {Math.min(questionNum, totalQuestions)} / {totalQuestions}
          </span>
        )}
        {!finished && (
          <Button
            type="button"
            className="btn--outline interview-topbar__end"
            onClick={handleEndInterview}
            disabled={loading}
          >
            End Interview
          </Button>
        )}
      </div>

      <div className="interview-main">
        {/* AI Host Panel */}
        <div className="interview-host-panel">
          <div
            className={`interview-avatar ${hostSpeaking ? "interview-avatar--speaking" : ""} ${listening ? "interview-avatar--listening" : ""}`}
          >
            <img
              src={`${process.env.PUBLIC_URL || ""}/interview-host.svg`}
              alt="AI Interview Coach"
              className="interview-avatar__img"
            />
            <div className="interview-avatar__ring" />
            {hostSpeaking && (
              <div className="interview-avatar__waves">
                <span /><span /><span />
              </div>
            )}
          </div>
          <p className="interview-host-name">ARCC Interview Coach</p>
          <p className="interview-host-status">
            {hostSpeaking
              ? "Speaking..."
              : listening
                ? "Listening to you..."
                : loading
                  ? "Thinking..."
                  : finished
                    ? "Interview complete"
                    : "Ready"}
          </p>

          <div className="interview-controls">
            <label className="interview-toggle">
              <input
                type="checkbox"
                checked={voiceOut}
                onChange={(e) => {
                  setVoiceOut(e.target.checked);
                  if (!e.target.checked) {
                    window.speechSynthesis?.cancel();
                    setHostSpeaking(false);
                  }
                }}
              />
              <span>Voice on</span>
            </label>
            <label className="interview-toggle">
              <input
                type="checkbox"
                checked={autoListen}
                onChange={(e) => setAutoListen(e.target.checked)}
              />
              <span>Auto-listen</span>
            </label>
            <Button
              type="button"
              className="btn--outline btn--small"
              onClick={replayQuestion}
              disabled={!messages.some((m) => m.type === "question") || finished}
            >
              Replay
            </Button>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="interview-chat-panel">
          <div className="interview-chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`interview-msg interview-msg--${msg.type}`}
              >
                <span className={`interview-msg__icon interview-msg__icon--${msg.type}`}>
                  {msgIcon(msg.type)}
                </span>
                <div className="interview-msg__bubble">
                  <p className="interview-msg__text">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {voiceNote && <p className="interview-voice-note">{voiceNote}</p>}

          {!finished && (
            <form className="interview-input-bar" onSubmit={handleSubmit}>
              <div className={`interview-mic-btn ${listening ? "interview-mic-btn--active" : ""}`}>
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={loading || !getSpeechRecognition()}
                  aria-label={listening ? "Stop microphone" : "Start microphone"}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
                {listening && <span className="interview-mic-pulse" />}
              </div>
              <input
                ref={inputRef}
                type="text"
                className="interview-text-input"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={listening ? "Listening... speak now" : "Type or speak your answer..."}
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !answer.trim()}>
                {loading ? "..." : "Send"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewChat;
