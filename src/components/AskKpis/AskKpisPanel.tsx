import { memo, useId, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import styled from "styled-components";
import { describeError, toWireMessages } from "./wire";
import { ASK_LIMITS } from "./limits";
import ShowTheWork from "./ShowTheWork";
import { chartsOf, toToolSteps } from "./toolSteps";
import AnswerChart from "./charts/AnswerChart";

const SUGGESTIONS = [
  "Which metric dropped most last month?",
  "How did ammonia develop over the past year?",
  "Which KPIs are behind their plan?",
];

// Module-level so useChat sees one stable transport across renders.
const transport = new DefaultChatTransport({
  api: "/api/ask",
  prepareSendMessagesRequest: ({ messages }) => ({
    body: { messages: toWireMessages(messages) },
  }),
});

// ─── Styled Components ───────────────────────────────────────────────────────

const StyledCard = styled.section`
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const StyledTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
`;

const StyledSubtitle = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
`;

const StyledLog = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &:empty {
    display: none;
  }
`;

const StyledMessage = styled.li<{ $role: string }>`
  align-self: ${(p) => (p.$role === "user" ? "flex-end" : "stretch")};
  max-width: ${(p) => (p.$role === "user" ? "80%" : "100%")};
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  background: ${(p) =>
    p.$role === "user" ? "var(--color-tabs-accent-bg)" : "var(--color-hover-bg)"};
  border: 1px solid var(--color-border);
  font-size: 0.875rem;
  line-height: 1.375rem;
  color: var(--color-text-primary);
  white-space: pre-wrap;
`;

const StyledSpeaker = styled.span`
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
`;

const StyledStatus = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
`;

const StyledChartError = styled.p`
  margin: 0.75rem 0 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  white-space: normal;
`;

const StyledError = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-negative);
  font-size: 0.875rem;
  color: var(--color-text-primary);
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const StyledLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
`;

const StyledRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const StyledInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
`;

const StyledButton = styled.button<{ $variant?: "secondary" }>`
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid
    ${(p) => (p.$variant ? "var(--color-border)" : "var(--color-accent)")};
  background: ${(p) => (p.$variant ? "var(--color-bg-card)" : "var(--color-accent)")};
  color: ${(p) => (p.$variant ? "var(--color-text-primary)" : "#fff")};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${(p) =>
      p.$variant ? "var(--color-hover-bg)" : "var(--color-accent-dark)"};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
`;

const StyledHint = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
`;

const StyledSuggestions = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

// ─── Component ───────────────────────────────────────────────────────────────

// One conversation entry: text, then for answers the chart(s), the chart
// failure note and "show the work".
// Memoised: while an answer streams, useChat replaces only that message
// object and keeps earlier ones, so finished answers (and their charts)
// skip re-rendering on every token.
const MessageItem = memo(({ message }: { message: UIMessage }) => {
  const isAssistant = message.role === "assistant";
  const { charts, chartFailed } = isAssistant ? chartsOf(message) : { charts: [], chartFailed: false };
  return (
    <StyledMessage $role={message.role}>
      <StyledSpeaker>{isAssistant ? "Assistant" : "You"}</StyledSpeaker>
      {message.parts.map((part, i) =>
        part.type === "text" ? <span key={i}>{part.text}</span> : null,
      )}
      {charts.map(({ id, chart }) => (
        <AnswerChart key={id} chart={chart} />
      ))}
      {chartFailed && (
        <StyledChartError data-testid="chart-error">
          ⚠ A chart could not be drawn for this answer: the generated chart
          configuration was invalid after 3 attempts. The answer above is
          unaffected.
        </StyledChartError>
      )}
      {isAssistant && <ShowTheWork steps={toToolSteps(message)} />}
    </StyledMessage>
  );
});
MessageItem.displayName = "MessageItem";

const AskKpisPanel = () => {
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error,
    clearError,
    stop,
    regenerate,
  } = useChat({
    transport,
    // Batch streamed tokens into at most ~20 renders per second.
    throttle: 50,
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const inputId = useId();
  const hintId = useId();

  const busy = status === "submitted" || status === "streaming";
  const question = input.trim();

  const ask = (text: string) => {
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
    inputRef.current?.focus();
  };

  const newChat = () => {
    void stop();
    setMessages([]);
    clearError();
    setInput("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  return (
    <StyledCard aria-labelledby={titleId} data-testid="ask-kpis">
      <StyledHeader>
        <div>
          <StyledTitle id={titleId}>Ask your KPIs</StyledTitle>
          <StyledSubtitle>
            Questions are answered by an AI assistant using this dashboard's
            data. Answers can be wrong — check the numbers.
          </StyledSubtitle>
        </div>
        {(messages.length > 0 || error) && (
          <StyledButton type="button" $variant="secondary" onClick={newChat}>
            New chat
          </StyledButton>
        )}
      </StyledHeader>

      <StyledLog aria-label="Conversation" aria-live="polite" aria-busy={busy}>
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} />
        ))}
      </StyledLog>

      {status === "submitted" && (
        <StyledStatus role="status">Looking at your KPIs…</StyledStatus>
      )}

      {error && (
        <StyledError role="alert">
          <span>{describeError(error)}</span>
          <StyledButton type="button" $variant="secondary" onClick={() => regenerate()}>
            Try again
          </StyledButton>
        </StyledError>
      )}

      {messages.length === 0 && (
        <StyledSuggestions aria-label="Example questions">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <StyledButton type="button" $variant="secondary" onClick={() => ask(s)}>
                {s}
              </StyledButton>
            </li>
          ))}
        </StyledSuggestions>
      )}

      <StyledForm onSubmit={handleSubmit}>
        <StyledLabel htmlFor={inputId}>Your question</StyledLabel>
        <StyledRow>
          <StyledInput
            id={inputId}
            ref={inputRef}
            type="text"
            value={input}
            maxLength={ASK_LIMITS.questionChars}
            autoComplete="off"
            placeholder="e.g. Which metric dropped most last month?"
            aria-describedby={hintId}
            onChange={(e) => setInput(e.target.value)}
          />
          {busy ? (
            <StyledButton type="button" $variant="secondary" onClick={() => stop()}>
              Stop
            </StyledButton>
          ) : (
            <StyledButton type="submit" disabled={!question}>
              Ask
            </StyledButton>
          )}
        </StyledRow>
        <StyledHint id={hintId}>
          {input.length}/{ASK_LIMITS.questionChars} characters
        </StyledHint>
      </StyledForm>
    </StyledCard>
  );
};

AskKpisPanel.displayName = "AskKpisPanel";
export default AskKpisPanel;
