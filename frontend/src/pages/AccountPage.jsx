import { useEffect, useState } from 'react';

import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';

function buildProfile(user) {
  return {
    nombre_completo: user?.nombre_completo || '',
    telefono: user?.telefono || '',
    dni_ruc: user?.dni_ruc || '',
    pais_region: user?.pais_region || 'Perú',
    direccion_calle: user?.direccion_calle || '',
    poblacion: user?.poblacion || 'Lima',
    region_provincia: user?.region_provincia || 'Lima',
    codigo_postal: user?.codigo_postal || '',
  };
}

export function AccountPage() {
  const { token, user, setNotice, updateUser } = useStore();
  const [profile, setProfile] = useState(() => buildProfile(user));
  const [passwords, setPasswords] = useState({ password_actual: '', password_nueva: '' });
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setProfile(buildProfile(user));
  }, [user]);

  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }));

  const submitProfile = async (event) => {
    event.preventDefault();
    setProfileError('');
    setSavingProfile(true);

    try {
      const body = Object.fromEntries(
        Object.entries(profile).map(([key, value]) => [key, value === '' ? null : value]),
      );
      body.nombre_completo = profile.nombre_completo;
      const data = await apiRequest('/auth/me', { method: 'PUT', token, body });
      updateUser(data.usuario);
      setNotice({ message: 'Datos actualizados correctamente.' });
    } catch (requestError) {
      setProfileError(requestError.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setSavingPassword(true);

    try {
      await apiRequest('/auth/me/password', { method: 'PUT', token, body: passwords });
      setPasswords({ password_actual: '', password_nueva: '' });
      setNotice({ message: 'Contraseña actualizada correctamente.' });
    } catch (requestError) {
      setPasswordError(requestError.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_420px]">
      <section className="rounded-lg border border-ink/10 bg-panel p-7 shadow-card">
        <span className="eyebrow">Mi cuenta</span>
        <h1 className="text-4xl font-black">Mis datos</h1>
        <p className="mt-3 font-sans leading-7 text-stone">
          Sesión iniciada como <strong>{user?.email}</strong> ({user?.rol}). Estos datos se usan para autocompletar tus pedidos.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={submitProfile}>
          <label className="field">
            Nombre completo
            <input required value={profile.nombre_completo} onChange={(event) => update('nombre_completo', event.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">Telefono<input value={profile.telefono} onChange={(event) => update('telefono', event.target.value)} /></label>
            <label className="field">DNI/RUC<input value={profile.dni_ruc} onChange={(event) => update('dni_ruc', event.target.value)} /></label>
          </div>
          <label className="field">Direccion de calle<input value={profile.direccion_calle} onChange={(event) => update('direccion_calle', event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">Pais/region<input value={profile.pais_region} onChange={(event) => update('pais_region', event.target.value)} /></label>
            <label className="field">Poblacion<input value={profile.poblacion} onChange={(event) => update('poblacion', event.target.value)} /></label>
            <label className="field">Codigo postal<input value={profile.codigo_postal} onChange={(event) => update('codigo_postal', event.target.value)} /></label>
          </div>
          {profileError ? <p className="form-error">{profileError}</p> : null}
          <button className="btn-primary min-h-12 w-full" type="submit" disabled={savingProfile}>
            {savingProfile ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </section>

      <aside className="h-fit rounded-lg border border-ink/10 bg-panel p-6 shadow-card">
        <span className="eyebrow">Seguridad</span>
        <h2 className="text-2xl font-black">Cambiar contraseña</h2>
        <form className="mt-5 grid gap-4" onSubmit={submitPassword}>
          <label className="field">
            Contraseña actual
            <input
              required
              type="password"
              value={passwords.password_actual}
              onChange={(event) => setPasswords((current) => ({ ...current, password_actual: event.target.value }))}
            />
          </label>
          <label className="field">
            Contraseña nueva
            <input
              required
              minLength="6"
              type="password"
              value={passwords.password_nueva}
              onChange={(event) => setPasswords((current) => ({ ...current, password_nueva: event.target.value }))}
            />
          </label>
          {passwordError ? <p className="form-error">{passwordError}</p> : null}
          <button className="btn-primary min-h-12 w-full" type="submit" disabled={savingPassword}>
            {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </aside>
    </main>
  );
}
