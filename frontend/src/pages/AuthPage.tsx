import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { Bebas, Btn } from '@/components/ui';

export function AuthPage() {
  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [nombre, setNombre]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [slowHint, setSlowHint] = useState(false);

  const { login, register } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) { setSlowHint(false); return; }
    const t = setTimeout(() => setSlowHint(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else                  await register(email, password, nombre);
      navigate('/saves');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center pt-16 pb-10 px-6 overflow-hidden"
        style={{ minHeight: 320 }}>
        {/* Stadium background */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(/stadium-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          filter: 'brightness(0.55)',
        }} />
        {/* Dark gradient overlay bottom */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)',
        }} />
        {/* Logo */}
        <img src="/logo.png" alt="Footix" className="relative z-10 w-72 max-w-full drop-shadow-2xl" style={{ filter: 'drop-shadow(0 0 24px rgba(0,100,255,0.6))' }} />
        <p className="relative z-10 mt-3 text-sm font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Tu Club, Tus Reglas · v2.0</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-8 max-w-[430px] w-full mx-auto">
        {/* Toggle */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--sur2)' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: mode === m ? 'var(--acc)' : 'transparent', color: mode === m ? '#000' : 'var(--tx2)' }}>
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <p className="text-xs text-center mb-4" style={{ color: 'var(--tx3)' }}>
          💡 Instala como app: Safari → Compartir → Añadir a inicio (iOS) · Chrome → ⋮ → Instalar (Android)
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Nombre del manager</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" required minLength={2} />
            </div>
          )}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="manager@futbol.com" required />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--tx2)' }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
          </div>

          {error && <p className="text-sm text-center py-2 px-3 rounded-lg" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--dan)' }}>{error}</p>}

          <Btn type="submit" full loading={loading} className="mt-2">
            {mode === 'login' ? '⚽ Entrar' : '🚀 Crear cuenta'}
          </Btn>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--tx3)' }}>
          Manager de fútbol estilo PC Fútbol · Mobile-first
        </p>
      </div>
    </div>
  );
}
