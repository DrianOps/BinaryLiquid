import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Guard WebSocket.prototype.send against DOMException when socket is already closing or closed,
// and prevent WizardConnect Nostr relays from forcibly disconnecting when switching browser tabs.
if (typeof window !== 'undefined' && window.WebSocket) {
  const originalWsSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data: any) {
    if (this.readyState === WebSocket.CLOSING || this.readyState === WebSocket.CLOSED) {
      return;
    }
    return originalWsSend.call(this, data);
  };

  if (typeof document !== 'undefined') {
    const origDocAddEventListener = document.addEventListener.bind(document);
    document.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      if (type === 'visibilitychange' && typeof listener === 'function') {
        const wrappedListener = function (this: any, event: Event) {
          if (document.visibilityState === 'hidden') {
            return;
          }
          return listener.call(this, event);
        };
        return origDocAddEventListener(type, wrappedListener, options);
      }
      return origDocAddEventListener(type, listener, options);
    };
  }

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
