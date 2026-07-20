import React from "react";

const msgIcon = (type) => {
  switch (type) {
    case "question": return "Q";
    case "answer": return "A";
    case "feedback": return "F";
    case "summary": return "S";
    default: return "i";
  }
};

// Past this many seconds a slow response is almost always the free-tier
// backend waking from a cold start, so we reassure the user it isn't stuck.
const COLD_START_HINT_AFTER = 8;

// Memoized so typing in the answer bar (which lives in the parent) doesn't
// re-reconcile the entire, growing transcript on every keystroke.
const MessageList = React.memo(function MessageList({ messages, loading, elapsed = 0, endRef }) {
  return (
    <div className="interview-chat-messages">
      {messages.map((msg, idx) => {
        if (msg.type === "score") {
          const score = Number(msg.text);
          const tone = score >= 75 ? "high" : score >= 50 ? "mid" : "low";
          return (
            <div
              key={idx}
              className={`interview-score-card interview-score-card--${tone}`}
            >
              <span className="interview-score-card__num">{score}</span>
              <span className="interview-score-card__label">
                Interview score
              </span>
            </div>
          );
        }
        return (
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
        );
      })}

      {loading && (
        <div className="interview-msg interview-msg--question">
          <span className="interview-msg__icon interview-msg__icon--question">
            Q
          </span>
          <div className="interview-typing-group">
            <div className="interview-typing" aria-label="Coach is thinking">
              <span /><span /><span />
            </div>
            {elapsed >= COLD_START_HINT_AFTER && (
              <p className="interview-typing-hint">
                Still thinking ({elapsed}s) — the free-tier server may be waking
                up. This is usually quick after the first request.
              </p>
            )}
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
});

export default MessageList;
