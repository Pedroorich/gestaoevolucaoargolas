'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectivityBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="bg-amber-500 text-brand-black px-4 py-3 flex items-center justify-center gap-3 font-bold text-base md:text-lg border-b-2 border-amber-600 shadow-sm"
      >
        <WifiOff className="w-6 h-6 shrink-0" aria-hidden="true" />
        <span>Modo Offline: Você está sem conexão. Lançamentos sendo salvos no aparelho.</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-center gap-3 font-bold text-base border-b-2 border-emerald-700 shadow-sm animate-fade-in"
      >
        <Wifi className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>Conexão restabelecida! Dados sincronizados com o servidor.</span>
      </div>
    );
  }

  return null;
};
