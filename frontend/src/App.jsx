import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ToastContainer from './components/Toast';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';
import Models from './pages/Models';
import History from './pages/History';
import About from './pages/About';
import Billing from './pages/Billing';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/playground" replace />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/models"     element={<Models />} />
          <Route path="/history"    element={<History />} />
          <Route path="/billing"    element={<Billing />} />
          <Route path="/about"      element={<About />} />
          <Route path="*" element={<Navigate to="/playground" replace />} />
        </Routes>
      </Layout>
      <ToastContainer />
    </BrowserRouter>
  );
}
