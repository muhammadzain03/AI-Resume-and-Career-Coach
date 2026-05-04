import React, { useState, useEffect } from "react";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import { startInterview, submitAnswer, endInterview } from "../services/api";

const InterviewChat = ({ jobDescription, role = "" }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const initInterview = async () => {
      try {
        const result = await startInterview(jobDescription, role);
        setSessionId(result.session_id);
        setMessages([{ type: "question", text: result.first_question }]);
      } catch (err) {
        console.error("Failed to start interview:", err);
      }
    };

    initInterview();
  }, [jobDescription, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer || !sessionId) return;

    setLoading(true);
    try {
      setMessages((msgs) => [...msgs, { type: "answer", text: answer }]);
      const result = await submitAnswer(sessionId, answer);

      if (result.complete) {
        setMessages((msgs) => [...msgs, { type: "system", text: "Interview complete." }]);
        setFinished(true);
        return;
      }

      setMessages((msgs) => [...msgs, { type: "question", text: result.next_question }]);
      setAnswer("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;
    try {
      await endInterview(sessionId);
      setFinished(true);
      setMessages((msgs) => [...msgs, { type: "system", text: "Interview ended by user." }]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      <p className="eyebrow">Step 4</p>
      <h1>Interview Simulation</h1>
      <Card className="feature-card">
        <div className="chat-window">
          {messages.map((msg, idx) => (
            <p
              key={idx}
              className={`chat-message chat-message--${msg.type}`}
            >
              {msg.text}
            </p>
          ))}
        </div>

        {!finished && (
          <form onSubmit={handleSubmit}>
            <Input
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              disabled={loading}
              required
            />
            <div className="form-actions">
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </Button>
              <Button type="button" onClick={handleEndInterview} disabled={loading}>
                End Interview
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default InterviewChat;