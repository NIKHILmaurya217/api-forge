import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  LayoutDashboard,
  FlaskConical,
  Cpu,
  History,
  Info,
  CreditCard,
  LogOut,
  User,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { to: '/playground', icon: <FlaskConical size={16} />,  label: 'Playground' },
  { to: '/models',     icon: <Cpu size={16} />,           label: 'Models' },
  { to: '/history',    icon: <History size={16} />,       label: 'History' },
  { to: '/billing',    icon: <CreditCard size={16} />,    label: 'Billing' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="wordmark">API<span>forge</span></div>
          <div className="tagline">Intelligent model routing</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {icon}
              {label}
            </NavLink>
          ))}

          <div className="nav-section-label" style={{ marginTop: 12 }}>Info</div>
          <NavLink
            to="/about"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Info size={16} />
            About
          </NavLink>
        </nav>

        {/* User section */}
        <div style={{
          marginTop: 'auto', borderTop: '1px solid var(--border)',
          padding: '12px 14px',
        }}>
          {user && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 10,
                background: 'var(--bg-subtle, #f9fafb)',
                marginBottom: 8,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <User size={14} color="white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.username}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--secondary)' }}>Free tier</div>
                </div>
              </div>
              <button
                onClick={logout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--secondary)', fontSize: 12,
                  fontWeight: 500, transition: 'all 0.15s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--secondary)'; }}
              >
                <LogOut size={13} />
                Sign out
              </button>
            </>
          )}
          <div className="sidebar-footer" style={{ paddingTop: 10, paddingLeft: 0, paddingRight: 0 }}>
            College Mini Project · 2025
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
