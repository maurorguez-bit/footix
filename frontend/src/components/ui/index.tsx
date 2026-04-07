import { clsx } from 'clsx';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={clsx('rounded-xl border p-4 mb-3', className)}
      style={{ background: 'var(--sur)', borderColor: 'var(--bor)', cursor: onClick ? 'pointer' : undefined }}
    >
      {children}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'gold';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  small?: boolean;
  full?: boolean;
  loading?: boolean;
}

const variantStyles: Record<BtnVariant, string> = {
  primary:   'text-black font-semibold',
  secondary: 'text-[var(--tex)] font-semibold border border-[var(--bor)]',
  danger:    'text-white font-semibold',
  gold:      'text-black font-semibold',
};
const variantBg: Record<BtnVariant, string> = {
  primary:   'var(--acc)',
  secondary: 'var(--sur2)',
  danger:    'var(--dan)',
  gold:      'var(--gol)',
};

export function Btn({ children, variant = 'primary', small = false, full = false, loading = false, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95',
        small ? 'px-3 py-2 text-xs rounded-lg' : 'px-5 py-3 text-sm',
        full ? 'w-full' : '',
        (disabled || loading) ? 'opacity-40 cursor-not-allowed' : '',
        variantStyles[variant],
        className,
      )}
      style={{ background: variantBg[variant] }}
    >
      {loading ? <span className="animate-pulse-slow">...</span> : children}
    </button>
  );
}

// ── Bebas heading ─────────────────────────────────────────────
export function Bebas({ children, size = 20, color = 'var(--acc)', className = '' }: { children: ReactNode; size?: number; color?: string; className?: string }) {
  return <div className={clsx('font-bebas tracking-wider', className)} style={{ fontSize: size, color }}>{children}</div>;
}

// ── Mono text ─────────────────────────────────────────────────
export function Mono({ children, className = '', style = {} }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <span className={clsx('font-mono', className)} style={style}>{children}</span>;
}

// ── StatRow ───────────────────────────────────────────────────
export function StatRow({ label, value, valueColor = 'var(--tex)', last = false }: { label: string; value: ReactNode; valueColor?: string; last?: boolean }) {
  return (
    <div className={clsx('flex justify-between items-center py-2', !last && 'border-b')} style={{ borderColor: 'var(--bor)' }}>
      <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{label}</span>
      <Mono style={{ fontSize: 13, color: valueColor }}>{value}</Mono>
    </div>
  );
}

// ── Tag ───────────────────────────────────────────────────────
type TagColor = 'green' | 'red' | 'gold' | 'blue' | 'gray';
const tagStyles: Record<TagColor, { bg: string; color: string }> = {
  green: { bg: 'rgba(0,229,160,0.15)', color: 'var(--acc)' },
  red:   { bg: 'rgba(255,71,87,0.15)',  color: 'var(--dan)' },
  gold:  { bg: 'rgba(255,215,0,0.15)',  color: 'var(--gol)' },
  blue:  { bg: 'rgba(74,158,255,0.15)', color: 'var(--acc3)' },
  gray:  { bg: 'rgba(136,153,187,0.15)',color: 'var(--tx2)' },
};

export function Tag({ children, color = 'green' }: { children: ReactNode; color?: TagColor }) {
  const s = tagStyles[color];
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ background: s.bg, color: s.color }}>
      {children}
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────
export function Progress({ value, color = 'var(--acc)', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={clsx('h-1 rounded-full overflow-hidden', className)} style={{ background: 'var(--bor)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

// ── Rating badge ──────────────────────────────────────────────
function ratingColor(r: number) { return r >= 85 ? '#00e5a0' : r >= 75 ? '#4a9eff' : r >= 65 ? '#ffd700' : '#ff6b35'; }
function ratingBg(r: number)    { return r >= 85 ? '#1a3a1a' : r >= 75 ? '#1a2e3a' : r >= 65 ? '#2a2a1a' : '#2a1a1a'; }

export function RatingBadge({ rating, size = 36 }: { rating: number; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg font-mono font-bold flex-shrink-0"
      style={{ width: size, height: size, background: ratingBg(rating), color: ratingColor(rating), border: `1px solid ${ratingColor(rating)}40`, fontSize: size * 0.36 }}
    >
      {Math.round(rating)}
    </div>
  );
}

// ── Position badge ────────────────────────────────────────────
const posColors: Record<string, { bg: string; color: string }> = {
  POR: { bg: '#1a2e3a', color: '#4a9eff' },
  DEF: { bg: '#1a3a2a', color: '#00e5a0' },
  MED: { bg: '#2a2a1a', color: '#ffd700' },
  DEL: { bg: '#2a1a1a', color: '#ff6b35' },
};
export function PosBadge({ pos }: { pos: string }) {
  const s = posColors[pos] ?? posColors.MED;
  return <span className="text-xs font-bold px-1.5 py-0.5 rounded font-mono" style={{ background: s.bg, color: s.color }}>{pos}</span>;
}

// ── Form dots ─────────────────────────────────────────────────
export function FormDots({ forma }: { forma: string[] }) {
  const colors: Record<string, string> = { W: 'var(--acc)', D: 'var(--gol)', L: 'var(--dan)' };
  return (
    <div className="flex gap-1">
      {forma.map((f, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: colors[f] ?? 'var(--bor)' }} />)}
    </div>
  );
}

// ── Bottom Sheet Modal ────────────────────────────────────────
export function BottomSheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: '#000000cc' }} onClick={onClose}>
      <div
        className="w-full max-w-[430px] rounded-t-2xl overflow-y-auto animate-slideup"
        style={{ background: 'var(--sur)', borderTop: '1px solid var(--bor)', maxHeight: '85vh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: 'var(--bor)' }} />
        {title && <Bebas size={20} className="px-5 mb-3">{title}</Bebas>}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
export function Toast({ msg, type = 'ok' }: { msg: string; type?: 'ok' | 'err' }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl font-semibold text-sm animate-fadein text-center"
      style={{ top: 'max(60px, calc(env(safe-area-inset-top) + 16px))', background: type === 'err' ? 'var(--dan)' : 'var(--acc)', color: type === 'err' ? '#fff' : '#000', maxWidth: 340, pointerEvents: 'none' }}
    >
      {msg}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--sur2)' }}>
      {tabs.map((t, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className="flex-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all"
          style={{ background: active === i ? 'var(--acc)' : 'transparent', color: active === i ? '#000' : 'var(--tx2)' }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── fmtK ─────────────────────────────────────────────────────
export function fmtK(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M€';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K€';
  return n + '€';
}

// ── Loading screen ────────────────────────────────────────────
export function LoadingScreen({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
      <img src="/logo.png" alt="Footix" style={{ width: 200, filter: 'drop-shadow(0 0 20px rgba(0,100,255,0.5))' }} />
      <div className="text-sm animate-pulse-slow" style={{ color: 'var(--tx2)' }}>{label}</div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-10 flex flex-col items-center gap-2">
      <span className="text-4xl">{icon}</span>
      <p style={{ color: 'var(--tx3)', fontSize: 14 }}>{text}</p>
    </div>
  );
}
