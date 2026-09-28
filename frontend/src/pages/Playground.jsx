import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { addToast } from '../components/Toast';
import { Send, X, Zap, Hash, BarChart2, Clock, ChevronDown, ChevronUp } from 'lucide-react';

function complexityClass(level) {
  return level === 'HIGH' ? 'high' : level === 'MEDIUM' ? 'medium' : 'low';
}

function formatContext(n) {
  if (!n) return '?';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

/* ───────────────────────── Token Meter ───────────────────────── */
function TokenMeter({ tokens, latencyMs }) {
  if (!tokens) return null;

  const total = tokens.total || 0;
  const prompt = tokens.prompt || 0;
  const completion = tokens.completion || 0;
  const promptPct  = total > 0 ? Math.round((prompt / total) * 100) : 0;
  const completionPct = 100 - promptPct;
  const isReal = tokens.source === 'real';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f7ff 0%, #faf5ff 100%)',
      border: '1.5px solid #c7d7f5',
      borderRadius: 14,
      padding: '18px 20px',
      marginTop: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Hash size={15} color="#4f46e5" />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#3730a3', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Token Usage
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px',
          borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
          background: isReal ? '#dcfce7' : '#fef9c3',
          color:      isReal ? '#166534' : '#854d0e',
          border:     isReal ? '1px solid #86efac' : '1px solid #fde68a',
        }}>
          {isReal ? '✓ Real counts' : '~ Estimated'}
        </span>
      </div>

      {/* Big number */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: '#3730a3', lineHeight: 1 }}>
          {total.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, letterSpacing: '0.05em' }}>
          TOTAL TOKENS
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{
          width: `${promptPct}%`,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          transition: 'width 0.6s ease',
        }} />
        <div style={{
          width: `${completionPct}%`,
          background: 'linear-gradient(90deg, #06b6d4, #22c55e)',
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Legend cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{
          background: 'white', borderRadius: 10, padding: '10px 12px',
          border: '1px solid #e0e7ff', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prompt</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>{prompt.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{promptPct}% of total</div>
        </div>

        <div style={{
          background: 'white', borderRadius: 10, padding: '10px 12px',
          border: '1px solid #d1fae5', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4, #22c55e)' }} />
            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Response</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{completion.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{completionPct}% of total</div>
        </div>
      </div>

      {/* Latency row */}
      {latencyMs && (
        <div style={{
          marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 10, borderTop: '1px solid #e0e7ff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} color="#6b7280" />
            <span style={{ fontSize: 11, color: '#6b7280' }}>Latency</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
            {latencyMs < 1000 ? `${latencyMs}ms` : `${(latencyMs / 1000).toFixed(2)}s`}
          </span>
        </div>
      )}

      {/* Tokens-per-second */}
      {latencyMs && total > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Zap size={12} color="#6b7280" />
            <span style={{ fontSize: 11, color: '#6b7280' }}>Throughput</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
            {Math.round((completion / (latencyMs / 1000)))} tok/s
          </span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Live Prompt Token Counter ───────────────────── */
function PromptTokenCounter({ text }) {
  // Estimate: words * 1.33 (GPT standard)
  const tokens = text.trim() ? Math.ceil(text.trim().split(/\s+/).length * 1.33) : 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: tokens > 1500 ? '#ef4444' : tokens > 800 ? '#f59e0b' : '#6b7280',
    }}>
      <Hash size={11} />
      <span>~{tokens} tokens</span>
    </div>
  );
}

/* ────────────────────────── Routing Panel ──────────────────────────── */
function RoutingPanel({ result }) {
  const [showScored, setShowScored] = useState(false);

  if (!result) {
    return (
      <div className="routing-panel">
        <div className="routing-panel-header">Routing Decision</div>
        <div className="empty-state" style={{ padding: '36px 16px' }}>
          <div style={{ fontSize: 28, opacity: 0.35, marginBottom: 10 }}>⚡</div>
          <p style={{ fontSize: 13 }}>
            Send a prompt to see<br />how APIforge routes it.
          </p>
        </div>
        {/* Token meter placeholder */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            background: '#f9fafb', border: '1.5px dashed #d1d5db',
            borderRadius: 14, padding: '24px 16px', textAlign: 'center',
          }}>
            <Hash size={22} color="#d1d5db" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Token counts will appear<br />after first request
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cls = complexityClass(result.level);

  return (
    <div className="routing-panel">
      <div className="routing-panel-header">Routing Decision</div>

      <div className="routing-row">
        <span className="routing-label">Task</span>
        <span className="routing-value">
          <span className="badge badge-task">{result.task}</span>
        </span>
      </div>

      <div className="routing-row">
        <span className="routing-label">Complexity</span>
        <span className="routing-value">
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{result.complexity}</span>
              <span className="text-secondary text-sm"> / 100</span>
              &nbsp;
              <span className={`badge badge-${cls}`}>{result.level}</span>
            </div>
            <div className="complexity-bar-bg" style={{ width: 140, marginLeft: 'auto' }}>
              <div
                className={`complexity-bar-fill ${cls}`}
                style={{ width: `${result.complexity}%` }}
              />
            </div>
          </div>
        </span>
      </div>

      <div className="routing-row">
        <span className="routing-label">Candidates</span>
        <span className="routing-value">{result.candidates} free models evaluated</span>
      </div>

      <div className="routing-row">
        <span className="routing-label">Selected Model</span>
        <span className="routing-value mono" style={{ maxWidth: 200, wordBreak: 'break-all' }}>
          {result.selectedModel.name}
          <div style={{ fontSize: 11, color: 'var(--secondary)', marginTop: 2 }}>
            Context: {formatContext(result.selectedModel.context_length)} tokens
          </div>
        </span>
      </div>

      <div className="routing-panel-header" style={{ borderTop: '1px solid var(--border)', marginTop: 0 }}>
        Selection Factors
      </div>
      <div className="factors-list">
        {result.factors.map((f, i) => (
          <div key={i} className="factor-item">
            <div className="factor-dot" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      {result.is_fallback && (
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)' }}>
          <div className="badge" style={{ background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A' }}>
            ⚠ Fallback used
          </div>
          {result.fallback_reason && (
            <div className="text-secondary text-sm" style={{ marginTop: 6 }}>
              {result.fallback_reason}
            </div>
          )}
        </div>
      )}

      {/* ── Token Meter ── */}
      <div style={{ padding: '4px 16px 16px' }}>
        <TokenMeter tokens={result.tokens} latencyMs={result.latency_ms} />
      </div>

      {/* Scored models toggle */}
      {result.scoredModels && result.scoredModels.length > 1 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowScored(s => !s)}
            style={{
              width: '100%', padding: '10px 18px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--secondary)', fontWeight: 600,
            }}
          >
            <span>Top Scored Models</span>
            {showScored ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showScored && (
            <div style={{ padding: '0 18px 14px' }}>
              {result.scoredModels.slice(0, 5).map((m, i) => (
                <div key={m.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                  fontSize: 11,
                }}>
                  <span style={{ color: i === 0 ? 'var(--primary)' : 'var(--secondary)', fontWeight: i === 0 ? 700 : 400, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i === 0 ? '★ ' : ''}{m.name || m.id}
                  </span>
                  <span style={{ fontWeight: 700, color: '#374151', background: '#f3f4f6', padding: '2px 7px', borderRadius: 10 }}>
                    {m.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Main Page ──────────────────────────── */
export default function Playground() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.query(prompt.trim());
      setResult(data);
      addToast('Request complete', 'success');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setPrompt('');
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  }

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>Playground</h1>
        <p>Test APIforge's automatic model selection. Enter a prompt to see how it is classified, routed, and <strong>how many tokens it uses</strong>.</p>
      </div>
      <div className="page-body">
        <div className="playground-grid">
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prompt</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <PromptTokenCounter text={prompt} />
                  {prompt && (
                    <button className="btn btn-secondary btn-sm" onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <X size={13} /> Clear
                    </button>
                  )}
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <form onSubmit={handleSubmit}>
                  <textarea
                    ref={textareaRef}
                    className="prompt-area"
                    placeholder="Enter your prompt here. For example: Write a Python function to find all prime numbers up to n using the Sieve of Eratosthenes."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
                    }}
                    disabled={loading}
                    rows={6}
                  />
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !prompt.trim()}
                    >
                      {loading ? (
                        <><span className="spinner" /> Routing…</>
                      ) : (
                        <><Send size={14} /> Analyze &amp; Send</>
                      )}
                    </button>
                    <span className="text-secondary text-sm">
                      Ctrl+Enter to send
                    </span>
                  </div>
                </form>
              </div>
            </div>

            {error && (
              <div className="error-banner">
                <span>⚠</span>
                <div>
                  <strong>Error:</strong> {error}
                  {error.includes('OPENROUTER_API_KEY') && (
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      Edit <code>backend/.env</code> and set your OpenRouter API key, then restart the server.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Response</span>
                {result?.tokens && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#059669', fontWeight: 600 }}>
                    <Hash size={11} />
                    <span>{result.tokens.completion.toLocaleString()} tokens</span>
                  </div>
                )}
              </div>
              <div style={{ padding: 16 }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: 'var(--secondary)', fontSize: 14 }}>
                    <span className="spinner spinner-dark" />
                    Waiting for model response…
                  </div>
                ) : result ? (
                  <div className="response-box">{result.response}</div>
                ) : (
                  <div className="response-box">
                    <span className="response-placeholder">
                      The model's response will appear here after you send a prompt.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column – Routing + Token panel */}
          <div>
            <RoutingPanel result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}
