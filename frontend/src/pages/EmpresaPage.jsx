import { useNavigate } from 'react-router-dom';

import { Icon } from '../components/Icon';

export function EmpresaPage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <button className="btn-ghost mb-6 flex items-center gap-2 text-sm" type="button" onClick={() => navigate(-1)}>
        <Icon name="arrow-left" /> Volver
      </button>
      <span className="eyebrow">Nuestra empresa</span>
      <h1 className="mb-6 text-4xl font-black">Ohana Moments</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-ink/10 bg-panel p-6 shadow-card">
          <h2 className="mb-4 text-2xl font-black">Datos de la empresa</h2>
          <div className="grid gap-3 font-sans">
            <div className="flex justify-between border-b border-ink/10 py-2">
              <span className="text-stone">Nombre</span>
              <strong>Ohana Moments</strong>
            </div>
            <div className="flex justify-between border-b border-ink/10 py-2">
              <span className="text-stone">Apellidos</span>
              <strong>E.I.R.L.</strong>
            </div>
            <div className="flex justify-between border-b border-ink/10 py-2">
              <span className="text-stone">Telefono</span>
              <strong>+51 913 912 694</strong>
            </div>
            <div className="flex justify-between border-b border-ink/10 py-2">
              <span className="text-stone">RUC</span>
              <strong>20601234567</strong>
            </div>
            <div className="flex justify-between border-b border-ink/10 py-2">
              <span className="text-stone">Direccion</span>
              <strong>Lima, Peru</strong>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-stone">Fecha de creacion</span>
              <strong>15 de marzo 2024</strong>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-panel p-6 shadow-card">
          <h2 className="mb-4 text-2xl font-black">Sobre nosotros</h2>
          <p className="font-sans leading-7 text-stone">
            Ohana Moments es una empresa dedicada a la creacion de regalos personalizados en Lima, Peru. 
            Ofrecemos tazas, polos, totes, arreglos, boxes de regalo y mas, todos personalizables con 
            tecnicas de sublimado, bordado, vinil y grabado laser.
          </p>
          <p className="mt-3 font-sans leading-7 text-stone">
            Nuestra mision es crear momentos especiales a traves de productos unicos, hechos con calma 
            y detalle para cada cliente. Trabajamos con entrega por distrito en Lima Metropolitana.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn-primary min-h-11 px-4" href="https://wa.me/51913912694" target="_blank" rel="noopener noreferrer">
              <Icon name="messages" /> Contactar por WhatsApp
            </a>
            <button className="btn-ghost min-h-11 px-4" type="button" onClick={() => navigate('/')}>
              <Icon name="shop" /> Ver catalogo
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
