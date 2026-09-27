import { useState, useEffect } from 'react';

let toastId = 0;
let setToastsGlobal = null;

export function addToast(message, type = 'info') {
  if (setToastsGlobal) {
    const id = ++toastId;
    setToastsGlobal(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToastsGlobal(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { setToastsGlobal = setToasts; return () => { setToastsGlobal = null; }; }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
