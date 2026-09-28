import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import ToastContainer from './components/Toast';
import AuthPage  from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';
import Models from './pages/Models';
import History from './pages/History';
import About from './pages/About';
import Billing from './pages/Billing';

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid #e0e7ff', borderTopColor: '#4f46e5',
            animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading APIforge…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<Navigate to="/playground" replace />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/models"     element={<Models />} />
        <Route path="/history"    element={<History />} />
        <Route path="/billing"    element={<Billing />} />
        <Route path="/about"      element={<About />} />
        <Route path="*"           element={<Navigate to="/playground" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedApp />
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}
