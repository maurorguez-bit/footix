import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'var(--bg)' }}>
        <img src="/logo.png" alt="Footix" style={{ width: 120, marginBottom: 24, opacity: 0.6 }} />
        <p className="font-bebas text-2xl mb-2" style={{ color: 'var(--dan)' }}>Algo ha salido mal</p>
        <p className="text-sm mb-6" style={{ color: 'var(--tx2)' }}>
          {this.state.error?.message ?? 'Error inesperado'}
        </p>
        <button
          onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          className="px-6 py-3 rounded-xl font-semibold text-black"
          style={{ background: 'var(--acc)' }}>
          Recargar
        </button>
        <p className="text-xs mt-4" style={{ color: 'var(--tx3)' }}>
          Tu partida está guardada en el servidor
        </p>
      </div>
    );
  }
}
