import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FlaskConical,
  Cpu,
  History,
  Info,
  CreditCard,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { to: '/playground', icon: <FlaskConical size={16} />, label: 'Playground' },
  { to: '/models',     icon: <Cpu size={16} />,           label: 'Models' },
  { to: '/history',    icon: <History size={16} />,        label: 'History' },
  { to: '/billing',    icon: <CreditCard size={16} />,     label: 'Billing' },
];

export default function Layout({ children }) {
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

        <div className="sidebar-footer">
          College Mini Project · 2025
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
