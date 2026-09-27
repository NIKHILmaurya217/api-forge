import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COMPLEXITY_COLORS = { LOW: '#16A34A', MEDIUM: '#D97706', HIGH: '#DC2626' };
const CHART_COLORS = ['#2563EB', '#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

function msToDisplay(ms) {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of APIforge request activity and routing statistics.</p>
      </div>
      <div className="page-body">
        {loading && (
          <div className="empty-state">
            <div><span className="spinner spinner-dark" /></div>
            <p style={{ marginTop: 12 }}>Loading stats…</p>
          </div>
        )}

        {error && (
          <div className="error-banner" style={{ marginBottom: 20 }}>
            ⚠ Could not load stats: {error}
          </div>
        )}

        {stats && stats.total === 0 && (
          <div className="empty-state" style={{ marginBottom: 28 }}>
            <div className="icon">📭</div>
            <h3>No requests have been recorded yet.</h3>
            <p>Send your first request from Playground.</p>
            <Link to="/playground" className="btn btn-primary btn-sm">Go to Playground</Link>
          </div>
        )}

        {stats && stats.total > 0 && (
          <>
            {/* Stat cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Requests</div>
                <div className="stat-value accent">{stats.total}</div>
                <div className="stat-sub">All time</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Average Latency</div>
                <div className="stat-value">{msToDisplay(stats.avgLatency)}</div>
                <div className="stat-sub">Per request</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Free Models Available</div>
                <div className="stat-value success">—</div>
                <div className="stat-sub">See Models page</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Fallbacks</div>
                <div className="stat-value">{stats.fallbacks}</div>
                <div className="stat-sub">Primary model unavailable</div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              {/* Activity */}
              <div className="card">
                <div className="card-title">Request Latency (Last 20)</div>
                {stats.activity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.activity} barSize={10}>
                      <XAxis dataKey="created_at" hide />
                      <YAxis tickFormatter={v => `${v}ms`} width={50} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v) => [`${v}ms`, 'Latency']}
                        labelFormatter={() => ''}
                        contentStyle={{ fontSize: 12, border: '1px solid #E2E8F0' }}
                      />
                      <Bar dataKey="latency_ms" fill="#2563EB" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="response-placeholder">No data</div>}
              </div>

              {/* Complexity distribution */}
              <div className="card">
                <div className="card-title">Complexity Distribution</div>
                {stats.complexityDist.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={stats.complexityDist}
                        dataKey="count"
                        nameKey="level"
                        cx="50%" cy="50%"
                        outerRadius={65}
                        label={({ level, percent }) => `${level} ${Math.round(percent * 100)}%`}
                        labelLine={false}
                        fontSize={12}
                      >
                        {stats.complexityDist.map((entry) => (
                          <Cell key={entry.level} fill={COMPLEXITY_COLORS[entry.level] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="response-placeholder">No data</div>}
              </div>

              {/* Model usage */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-title">Model Usage</div>
                {stats.modelDist.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats.modelDist} layout="vertical" barSize={14}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="model_name"
                        width={160}
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => v.length > 22 ? v.slice(0, 22) + '…' : v}
                      />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" radius={[0,3,3,0]}>
                        {stats.modelDist.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="response-placeholder">No data</div>}
              </div>
            </div>

            {/* Task distribution table */}
            {stats.taskDist.length > 0 && (
              <div className="card">
                <div className="card-title">Task Distribution</div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Requests</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.taskDist.map(row => (
                        <tr key={row.task} style={{ cursor: 'default' }}>
                          <td><span className="badge badge-task">{row.task}</span></td>
                          <td>{row.count}</td>
                          <td className="secondary">{((row.count / stats.total) * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
