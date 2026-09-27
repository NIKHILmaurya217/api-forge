import { useState, useRef } from 'react';
import { api } from '../api';
import { addToast } from '../components/Toast';
import { Send, X } from 'lucide-react';

function complexityClass(level) {
  return level === 'HIGH' ? 'high' : level === 'MEDIUM' ? 'medium' : 'low';
}

function formatContext(n) {
  if (!n) return '?';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

function RoutingPanel({ result }) {
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

      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="text-secondary text-sm">Latency</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {result.latency_ms < 1000 ? `${result.latency_ms}ms` : `${(result.latency_ms / 1000).toFixed(2)}s`}
        </span>
      </div>
    </div>
  );
}

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
        <p>Test APIforge's automatic model selection. Enter a prompt to see how it is classified and routed.</p>
      </div>
      <div className="page-body">
        <div className="playground-grid">
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prompt</span>
                {prompt && (
                  <button className="btn btn-secondary btn-sm" onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <X size={13} /> Clear
                  </button>
                )}
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
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Response</span>
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

          {/* Right column — Routing panel */}
          <div>
            <RoutingPanel result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}
