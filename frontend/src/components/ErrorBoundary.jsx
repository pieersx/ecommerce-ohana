import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto max-w-7xl px-4 py-16">
          <section className="rounded-lg border border-ink/10 bg-panel p-7 shadow-card">
            <span className="eyebrow">Algo salio mal</span>
            <h1 className="text-3xl font-black">No pudimos cargar esta vista.</h1>
            <p className="mt-3 font-sans text-stone">
              Recarga la pagina o vuelve al catalogo. Si el problema continua, revisa que el backend este activo.
            </p>
            <button className="btn-primary mt-5 min-h-11 px-4" type="button" onClick={() => window.location.assign('/')}>
              Volver al catalogo
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
