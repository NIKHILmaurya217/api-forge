import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

function formatTime(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function msDisplay(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function complexityClass(level) {
  return level === 'HIGH' ? 'high' : level === 'MEDIUM' ? 'medium' : 'low';
}

function DetailModal({ record, onClose }) {
  if (!record) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>
          Request #{record.id}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', lineHeight: 1 }}
          >
            <X size={20} />
          </button>
        </h2>

        <div style={{ marginBottom: 16 }}>
          <div className="card-title">Prompt</div>
          <div className="response-box" style={{ minHeight: 60 }}>{record.prompt}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            ['Task', <span className="badge badge-task">{record.task}</span>],
            ['Complexity', <><strong>{record.complexity}</strong>/100 <span className={`badge badge-${complexityClass(record.level)}`}>{record.level}</span></>],
            ['Selected Model', record.model_name],
            ['Candidates', record.candidates],
            ['Latency', msDisplay(record.latency_ms)],
            ['Fallback', record.is_fallback ? '⚠ Yes' : 'No'],
          ].map(([label, val]) => (
            <div key={label} className="stat-card" style={{ padding: '12px 14px' }}>
              <div className="stat-label">{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>

        {record.factors && record.factors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="card-title">Selection Factors</div>
            <div className="factors-list" style={{ padding: 0 }}>
              {record.factors.map((f, i) => (
                <div key={i} className="factor-item">
                  <div className="factor-dot" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="card-title">Response</div>
          <div className="response-box">{record.response}</div>
        </div>

        {record.fallback_reason && (
          <div className="error-banner" style={{ marginTop: 12 }}>
            Fallback reason: {record.fallback_reason}
          </div>
        )}
      </div>
    </div>
  );
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    api.history(100)
      .then(d => setHistory(d.history || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRowClick(id) {
    setLoadingDetail(true);
    try {
      const r = await api.record(id);
      setSelected(r);
    } catch {
      // fall back to list data
      const r = history.find(h => h.id === id);
      setSelected(r || null);
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>History</h1>
        <p>All requests processed by APIforge. Click a row to see the full routing explanation.</p>
      </div>
      <div className="page-body">
        {loading && (
          <div className="empty-state">
            <span className="spinner spinner-dark" />
            <p style={{ marginTop: 12 }}>Loading history…</p>
          </div>
        )}

        {error && <div className="error-banner">⚠ {error}</div>}

        {!loading && !error && history.length === 0 && (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>No requests recorded yet.</h3>
            <p>Send your first request from Playground to see history here.</p>
            <Link to="/playground" className="btn btn-primary btn-sm">Go to Playground</Link>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Task</th>
                    <th>Complexity</th>
                    <th>Selected Model</th>
                    <th>Latency</th>
                    <th>Fallback</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.id} onClick={() => handleRowClick(row.id)}>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{formatTime(row.created_at)}</span>
                        <div className="secondary" style={{ fontSize: 11 }}>{formatDate(row.created_at)}</div>
                      </td>
                      <td>
                        <span className="badge badge-task">{row.task}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${complexityClass(row.level)}`}>{row.level}</span>
                        <span className="text-secondary text-sm" style={{ marginLeft: 6 }}>{row.complexity}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13 }}>{row.model_name}</span>
                      </td>
                      <td className="mono">{msDisplay(row.latency_ms)}</td>
                      <td>
                        {row.is_fallback
                          ? <span className="badge" style={{ background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A' }}>Yes</span>
                          : <span className="text-secondary text-sm">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {loadingDetail && (
        <div className="modal-backdrop">
          <span className="spinner spinner-dark" />
        </div>
      )}

      {selected && !loadingDetail && (
        <DetailModal record={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
