import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useStore();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    telefono: '',
    dni_ruc: '',
    pais_region: 'Perú',
    direccion_calle: '',
    poblacion: 'Lima',
    region_provincia: 'Lima',
    codigo_postal: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await apiRequest(isRegister ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: isRegister ? form : { email: form.email, password: form.password },
      });
      login(session);
      navigate(location.state?.from || '/');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl place-items-center px-4 py-10">
      <section className="w-full max-w-xl rounded-lg border border-ink/10 bg-panel p-7 shadow-card">
        <span className="eyebrow">Acceso</span>
        <h1 className="text-4xl font-black">{isRegister ? 'Crear cuenta cliente' : 'Entrar a Ohana'}</h1>
        <p className="mt-3 font-sans leading-7 text-stone">Para comprar necesitas una cuenta cliente. Los administradores solo gestionan la tienda.</p>

        <form className="mt-6 grid gap-4" onSubmit={submit}>
          {isRegister ? (
            <label className="field">
              Nombre completo
              <input required value={form.nombre_completo} onChange={(event) => update('nombre_completo', event.target.value)} />
            </label>
          ) : null}
          <label className="field">
            Email
            <input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
          </label>
          <label className="field">
            Password
            <input required minLength="6" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} />
          </label>
          {isRegister ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">Telefono<input value={form.telefono} onChange={(event) => update('telefono', event.target.value)} /></label>
              <label className="field">DNI/RUC<input value={form.dni_ruc} onChange={(event) => update('dni_ruc', event.target.value)} /></label>
            </div>
          ) : null}
          {isRegister ? (
            <>
              <label className="field">Direccion de calle<input value={form.direccion_calle} onChange={(event) => update('direccion_calle', event.target.value)} /></label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="field">Pais/region<input value={form.pais_region} onChange={(event) => update('pais_region', event.target.value)} /></label>
                <label className="field">Poblacion<input value={form.poblacion} onChange={(event) => update('poblacion', event.target.value)} /></label>
                <label className="field">Codigo postal<input value={form.codigo_postal} onChange={(event) => update('codigo_postal', event.target.value)} /></label>
              </div>
            </>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn-primary min-h-12 w-full" type="submit" disabled={loading}>{loading ? 'Procesando...' : isRegister ? 'Registrarme' : 'Iniciar sesion'}</button>
        </form>

        <button className="mt-5 font-sans font-bold text-berry" type="button" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}
        </button>
      </section>
    </main>
  );
}
