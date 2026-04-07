import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';

import { AuthPage }      from '@/pages/AuthPage';
import { SavesPage }     from '@/pages/SavesPage';
import { TeamSelectPage }from '@/pages/TeamSelectPage';
import { GamePage }      from '@/pages/GamePage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useGameStore(s => s.token);
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, loadSaves } = useGameStore();

  // Keep-alive: evita que Railway free tier duerma durante el playtest
  // Hace ping al backend cada 25 minutos
  useEffect(() => {
    const ping = () => fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/health`).catch(() => {});
    const interval = setInterval(ping, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (token) loadSaves().catch(console.error);
  }, [token]);

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/saves" element={<PrivateRoute><SavesPage /></PrivateRoute>} />
        <Route path="/select/:slot" element={<PrivateRoute><TeamSelectPage /></PrivateRoute>} />
        <Route path="/game/:slot/*" element={<PrivateRoute><GamePage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to={token ? '/saves' : '/auth'} replace />} />
      </Routes>
    </BrowserRouter>
    </BrowserRouter>
    </ErrorBoundary>
  );
}