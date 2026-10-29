import React from 'react';
import { Cookie, X } from 'lucide-react';

export default function CookieBanner({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[400px] bg-white border border-gray-200 shadow-2xl rounded-2xl p-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex gap-3">
        <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-black text-gray-900 text-sm mb-1">Cookie Policy</h4>
          <p className="text-xs text-gray-500 font-medium mb-3">
            We use strictly necessary cookies and local storage to maintain your active wallet session securely. By continuing, you agree to our policy.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={onAccept}
              className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Accept All
            </button>
            <button 
              onClick={onAccept}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Essential Only
            </button>
          </div>
        </div>
        <button onClick={onAccept} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
