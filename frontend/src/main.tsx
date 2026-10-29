import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Guard WebSocket.prototype.send against DOMException when socket is already closing or closed.
// This prevents unhandled exceptions from Nostr/WizardConnect relays when switching tabs (visibilityChange).
if (typeof window !== 'undefined' && window.WebSocket) {
  const originalWsSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data: any) {
    if (this.readyState === WebSocket.CLOSING || this.readyState === WebSocket.CLOSED) {
      return;
    }
    return originalWsSend.call(this, data);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event?.reason?.message || event?.reason || '');
    if (msg.includes('CLOSING or CLOSED') || msg.includes('WebSocket is already')) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
