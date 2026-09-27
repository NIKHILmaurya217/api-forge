import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ArrowRight } from 'lucide-react';

function formatContext(n) {
  if (!n) return '?';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

export default function Models() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.models()
      .then(d => setModels(d.models || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = models.filter(m =>
    !search || (m.name + m.id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>Models</h1>
        <p>Free models available on OpenRouter. These are the candidates APIforge selects from.</p>
      </div>
      <div className="page-body">
        {/* Search + count */}
        <div className="flex-between mb-16">
          <input
            type="text"
            placeholder="Search by name or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              color: 'var(--text)',
              background: 'var(--surface)',
              outline: 'none',
              width: 260,
            }}
          />
          {!loading && !error && (
            <span className="text-secondary text-sm">
              {filtered.length} of {models.length} models
            </span>
          )}
        </div>

        {loading && (
          <div className="empty-state">
            <span className="spinner spinner-dark" />
            <p style={{ marginTop: 12 }}>Fetching models from OpenRouter…</p>
          </div>
        )}

        {error && (
          <div className="error-banner">
            ⚠ {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No models matched your search.</h3>
            <p>Try a different keyword.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="models-grid">
            {filtered.map(m => (
              <div key={m.id} className="model-card">
                <div>
                  <div className="model-card-name">{m.name}</div>
                  <div className="model-card-id">{m.id}</div>
                </div>

                <div className="model-meta-row">
                  <span className="badge badge-free">Free</span>
                  <span className="model-meta-item text-secondary text-sm">
                    Context: {formatContext(m.context_length)}
                  </span>
                </div>

                {m.description && (
                  <div style={{ fontSize: 12, color: 'var(--secondary)', lineHeight: 1.5 }}>
                    {m.description.length > 120
                      ? m.description.slice(0, 120) + '…'
                      : m.description}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/playground')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    Use in Playground <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
