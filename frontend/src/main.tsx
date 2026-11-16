import { Buffer } from 'buffer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

// Guard WebSocket.prototype.send against DOMException when socket is already closing or closed.
if (typeof window !== 'undefined' && window.WebSocket) {
  const originalWsSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data: any) {
    if (this.readyState === WebSocket.CLOSING || this.readyState === WebSocket.CLOSED) {
      return;
    }
    return originalWsSend.call(this, data);
  };

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const firstArg = String(args[0] || '');
    const secondArg = String(args[1]?.message || args[1] || '');
    if (
      firstArg.includes('Failed to publish dapp_ready') ||
      firstArg.includes('Error pushing dapp_ready') ||
      (firstArg.includes('[wizardconnect/dapp]') && secondArg.includes('dapp_ready')) ||
      secondArg.includes('relay connection closed by us')
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event?.reason?.message || event?.reason || '');
    if (
      msg.includes('CLOSING or CLOSED') ||
      msg.includes('WebSocket is already') ||
      msg.includes('relay connection closed by us') ||
      msg.includes('Failed to publish dapp_ready')
    ) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
