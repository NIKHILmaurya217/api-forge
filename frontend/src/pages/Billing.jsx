import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import { addToast } from '../components/Toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Zap, TrendingDown, Plus, Play, Square } from 'lucide-react';

// ── Pricing constants (mirror billing.js) ─────────────────────
const BASE_COST  = { LOW: 2, MEDIUM: 6, HIGH: 15 };
const LEVEL_COLOR = { LOW: '#16A34A', MEDIUM: '#D97706', HIGH: '#DC2626' };
const PIE_COLORS  = ['#16A34A', '#D97706', '#DC2626'];

// ── Simulated prompt pool ──────────────────────────────────────
const SIM_PROMPTS = [
  { task: 'CODING',   level: 'HIGH',   label: 'Complex algorithm prompt' },
  { task: 'MATH',     level: 'MEDIUM', label: 'Equation solving request' },
  { task: 'WRITING',  level: 'LOW',    label: 'Short paragraph request' },
  { task: 'CODING',   level: 'MEDIUM', label: 'Debug a function' },
  { task: 'ANALYSIS', level: 'HIGH',   label: 'Deep architectural analysis' },
  { task: 'GENERAL',  level: 'LOW',    label: 'Simple factual query' },
  { task: 'MATH',     level: 'HIGH',   label: 'Calculus proof' },
  { task: 'WRITING',  level: 'MEDIUM', label: 'Draft a blog section' },
];

function cc(n) { return typeof n === 'number' ? n.toFixed(3) : '—'; }
function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(2)} cr`;
}
function fmtTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Balance Meter ──────────────────────────────────────────────
function BalanceMeter({ balance, initialBalance = 200 }) {
  const pct = Math.max(0, Math.min(100, (balance / initialBalance) * 100));
  const color = pct > 50 ? '#16A34A' : pct > 20 ? '#D97706' : '#DC2626';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
        <span className="stat-label">Current Balance</span>
        <span style={{ fontSize: 13, color: 'var(--secondary)' }}>{pct.toFixed(1)}% remaining</span>
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color, letterSpacing: '-0.5px', marginBottom: 10, lineHeight: 1 }}>
        {typeof balance === 'number' ? balance.toFixed(2) : '—'}
        <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 4, color: 'var(--secondary)' }}>credits</span>
      </div>
      <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 0.5s ease' }} />
      </div>
      {pct < 20 && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#DC2626', fontWeight: 500 }}>
          ⚠ Low balance — top up to continue.
        </div>
      )}
    </div>
  );
}

// ── Simulation Control ─────────────────────────────────────────
function SimControl({ running, onStart, onStop }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {!running ? (
        <button className="btn btn-primary btn-sm" onClick={onStart} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Play size={13} /> Simulate Usage
        </button>
      ) : (
        <button className="btn btn-secondary btn-sm" onClick={onStop} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Square size={13} /> Stop
        </button>
      )}
      <span className="text-secondary text-sm">
        {running ? 'Firing simulated requests every 2s…' : 'Auto-fires fake requests to demonstrate billing'}
      </span>
    </div>
  );
}

// ── Top-up Modal ───────────────────────────────────────────────
function TopUpModal({ onClose, onTopUp }) {
  const PRESETS = [10, 25, 50, 100];
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await onTopUp(amount);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 16 }}>Add Credits</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: 16 }}>
          Select a top-up amount to add to your simulated balance.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {PRESETS.map(p => (
            <button
              key={p}
              className={`btn ${amount === p ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setAmount(p)}
              style={{ justifyContent: 'center' }}
            >
              {p}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: 'var(--secondary)', whiteSpace: 'nowrap' }}>Custom:</label>
          <input
            type="number"
            min={1} max={10000}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, outline: 'none' }}
          />
          <span className="text-secondary text-sm">credits</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={loading || amount <= 0}>
            {loading ? <><span className="spinner" /> Adding…</> : `Add ${amount} credits`}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Billing() {
  const [data, setData]         = useState(null);
  const [txns, setTxns]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const simRef = useRef(null);
  // Live balance timeline for the real-time chart
  const [liveTimeline, setLiveTimeline] = useState([]);

  // ── Load data ────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [billing, txData] = await Promise.all([
        api.billing(),
        api.transactions(60),
      ]);
      setData(billing);
      setTxns(txData.transactions || []);

      // Rebuild live timeline from transaction history
      const charges = (txData.transactions || [])
        .filter(t => t.type === 'CHARGE')
        .slice()
        .reverse()
        .slice(-20)
        .map((t, i) => ({
          index: i + 1,
          balance: t.balance_after,
          cost: t.amount,
          level: t.level,
          time: fmtTime(t.created_at),
        }));
      setLiveTimeline(charges);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Simulation ───────────────────────────────────────────────
  function startSim() {
    setSimRunning(true);
    let idx = 0;
    simRef.current = setInterval(async () => {
      const pick = SIM_PROMPTS[idx % SIM_PROMPTS.length];
      idx++;
      const cost = +(BASE_COST[pick.level] + Math.random() * 2).toFixed(3);
      try {
        const w = await api.wallet();
        const newBal = +(w.balance - cost).toFixed(3);
        // Optimistically update UI
        setData(prev => prev ? {
          ...prev,
          wallet: { ...prev.wallet, balance: newBal, total_spent: +(prev.wallet.total_spent + cost).toFixed(3) },
          costTimeline: [...(prev.costTimeline || []).slice(-29), {
            created_at: new Date().toISOString(), cost, level: pick.level, task: pick.task,
          }],
        } : prev);
        setLiveTimeline(prev => {
          const next = [...prev, { index: prev.length + 1, balance: newBal, cost, level: pick.level, time: fmtTime(new Date().toISOString()) }];
          return next.slice(-20);
        });
        addToast(`Simulated ${pick.label} — ${cost} cr`, 'info');
      } catch { /* ignore */ }
    }, 2000);
  }

  function stopSim() {
    clearInterval(simRef.current);
    setSimRunning(false);
    load(); // reload real data
    addToast('Simulation stopped', 'info');
  }

  useEffect(() => () => clearInterval(simRef.current), []);

  // ── Top-up ───────────────────────────────────────────────────
  async function handleTopUp(amount) {
    await api.topup(amount, 'Manual top-up via Billing page');
    addToast(`Added ${amount} credits`, 'success');
    load();
  }

  // ── Render ───────────────────────────────────────────────────
  const wallet = data?.wallet;

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>Billing &amp; Credits</h1>
        <p>Credit usage based on complexity level and token count. All figures are simulated.</p>
      </div>

      <div className="page-body">
        {loading && (
          <div className="empty-state"><span className="spinner spinner-dark" /><p style={{ marginTop: 12 }}>Loading billing data…</p></div>
        )}
        {error && <div className="error-banner">⚠ {error}</div>}

        {!loading && data && (
          <>
            {/* Top row: balance + quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Balance card */}
              <div className="stat-card" style={{ gridColumn: '1 / 2' }}>
                <BalanceMeter balance={wallet?.balance} initialBalance={wallet ? wallet.balance + wallet.total_spent : 200} />
              </div>

              <div className="stat-card">
                <div className="stat-label">Total Spent</div>
                <div className="stat-value" style={{ fontSize: 26 }}>{wallet ? wallet.total_spent.toFixed(2) : '—'}</div>
                <div className="stat-sub">credits consumed</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Top-ups</div>
                <div className="stat-value accent" style={{ fontSize: 26 }}>{wallet ? wallet.top_ups.toFixed(2) : '—'}</div>
                <div className="stat-sub">credits added</div>
              </div>

              <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div className="stat-label">Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowTopUp(true)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Plus size={13} /> Add Credits
                  </button>
                  <SimControl running={simRunning} onStart={startSim} onStop={stopSim} />
                </div>
              </div>
            </div>

            {/* Pricing reference */}
            <div className="card mb-24" style={{ marginBottom: 20 }}>
              <div className="card-title">Pricing Model</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div className="text-secondary text-sm" style={{ marginBottom: 8 }}>Base cost by complexity</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {Object.entries(BASE_COST).map(([lvl, cr]) => (
                      <div key={lvl} style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <div className={`badge badge-${lvl.toLowerCase()}`} style={{ marginBottom: 6 }}>{lvl}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: LEVEL_COLOR[lvl] }}>{cr}</div>
                        <div style={{ fontSize: 11, color: 'var(--secondary)' }}>credits</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-secondary text-sm" style={{ marginBottom: 8 }}>Token cost</div>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 2 }}>
                    <div>Input tokens: <strong>0.5 cr</strong> per 1,000</div>
                    <div>Output tokens: <strong>1.0 cr</strong> per 1,000</div>
                    <div style={{ fontSize: 12, color: 'var(--secondary)' }}>Token count estimated from word count × 1.33</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live balance chart */}
            <div className="card mb-24" style={{ marginBottom: 20 }}>
              <div className="flex-between mb-16">
                <div className="card-title" style={{ marginBottom: 0 }}>
                  {simRunning ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="#D97706" /> Live Balance (real-time)</span> : 'Balance Timeline'}
                </div>
              </div>
              {liveTimeline.length === 0 ? (
                <div className="response-placeholder" style={{ padding: '24px 0', textAlign: 'center' }}>
                  No charge history yet. Send a request or click <strong>Simulate Usage</strong>.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={liveTimeline}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={v => v.toFixed(0)} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, border: '1px solid var(--border)' }}
                      formatter={(v, name) => [typeof v === 'number' ? v.toFixed(2) : v, name === 'balance' ? 'Balance' : 'Cost']}
                    />
                    <Area dataKey="balance" stroke="#2563EB" strokeWidth={2} fill="url(#balGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Cost by complexity */}
              <div className="card">
                <div className="card-title">Cost by Complexity</div>
                {data.byLevel.length === 0 ? (
                  <div className="response-placeholder" style={{ padding: '24px 0', textAlign: 'center' }}>No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.byLevel} dataKey="total_cost" nameKey="level" cx="50%" cy="50%" outerRadius={65}
                        label={({ level, total_cost }) => `${level} ${total_cost?.toFixed(1)}`} labelLine={false} fontSize={12}>
                        {data.byLevel.map((e, i) => <Cell key={e.level} fill={LEVEL_COLOR[e.level] || PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={v => [`${v?.toFixed(3)} cr`, 'Cost']} contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Cost by task */}
              <div className="card">
                <div className="card-title">Cost by Task</div>
                {data.byTask.length === 0 ? (
                  <div className="response-placeholder" style={{ padding: '24px 0', textAlign: 'center' }}>No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.byTask} layout="vertical" barSize={14}>
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(1)} />
                      <YAxis type="category" dataKey="task" width={72} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => [`${v?.toFixed(3)} cr`, 'Total cost']} contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="total_cost" radius={[0, 3, 3, 0]} fill="#2563EB" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Daily cost (if multi-day data) */}
            {data.dailyCost.length > 1 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">Daily Spend</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.dailyCost} barSize={20}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(1)} width={44} />
                    <Tooltip formatter={v => [`${v?.toFixed(3)} cr`, 'Cost']} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="total" fill="#2563EB" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-complexity stats table */}
            {data.byLevel.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">Breakdown by Complexity Level</div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Level</th><th>Requests</th><th>Total Cost</th><th>Avg Cost / Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byLevel.map(row => (
                        <tr key={row.level} style={{ cursor: 'default' }}>
                          <td><span className={`badge badge-${row.level.toLowerCase()}`}>{row.level}</span></td>
                          <td>{row.count}</td>
                          <td style={{ fontWeight: 600 }}>{cc(row.total_cost)} cr</td>
                          <td className="secondary">{cc(row.avg_cost)} cr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transaction log */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingDown size={14} color="var(--secondary)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Transaction Log
                </span>
              </div>
              <div className="table-container">
                {txns.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 20px' }}>
                    <p>No transactions yet.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th><th>Type</th><th>Description</th><th>Amount</th><th>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map(t => (
                        <tr key={t.id} style={{ cursor: 'default' }}>
                          <td className="secondary">{fmtTime(t.created_at)}</td>
                          <td>
                            {t.type === 'TOP_UP'
                              ? <span className="badge badge-free">TOP-UP</span>
                              : <span className="badge" style={{ background: 'var(--high-bg)', color: 'var(--high)', border: '1px solid var(--high-border)' }}>CHARGE</span>
                            }
                          </td>
                          <td style={{ fontSize: 13 }}>{t.description}</td>
                          <td style={{ fontWeight: 600, color: t.type === 'TOP_UP' ? 'var(--success)' : 'var(--high)' }}>
                            {t.type === 'TOP_UP' ? '+' : '−'}{t.amount.toFixed(3)} cr
                          </td>
                          <td className="mono">{t.balance_after.toFixed(2)} cr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} onTopUp={handleTopUp} />}
    </div>
  );
}
