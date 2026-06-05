import Link from "next/link";

const STEPS = [
  { emoji: "🎯", title: "Pronostica", body: "Marca resultados antes del pitazo." },
  { emoji: "👥", title: "Invita compas", body: "Crea tu grupo o únete con código." },
  { emoji: "🏆", title: "Compite", body: "Sube en leaderboards globales o privados." },
  { emoji: "⚽", title: "Vive el partido", body: "Chat en vivo y datos mamalones." },
] as const;

const FEATURES = [
  "Quiniela global gratis",
  "Grupos privados",
  "Quinielas por jornada o fase",
  "Leaderboards segmentados",
  "Chat de partido",
  "Posiciones del Mundial",
] as const;

const FAQ = [
  {
    q: "¿Es gratis?",
    a: "Sí. La quiniela global es gratuita y por honor. Los grupos privados también son gratis en la app.",
  },
  {
    q: "¿Puedo crear un grupo privado?",
    a: "Claro. Crea tu quiniela, invita compas con código o link y define honor o cooperacha manual.",
  },
  {
    q: "¿La app maneja dinero?",
    a: "No. Mundial Compas no procesa pagos, apuestas ni premios. Cualquier cooperacha es entre ustedes.",
  },
  {
    q: "¿Puedo jugar varias quinielas?",
    a: "Sí. Puedes estar en la global y en tantos grupos privados como quieras.",
  },
] as const;

export function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-sm font-black tracking-tight text-emerald-400">
            Mundial Compas
          </span>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-500"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16">
        <section className="relative overflow-hidden rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-zinc-950 px-5 py-8 text-center">
          <p className="text-4xl" aria-hidden>
            🌍⚽
          </p>
          <h1 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
            Arma la quiniela del Mundial con tus compas
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            Pronostica partidos, crea grupos privados, compite en rankings y vive
            los juegos con chats en vivo y datos mamalones.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-600 px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Crear cuenta
            </Link>
          </div>
          <a
            href="#como-funciona"
            className="mt-3 inline-block text-xs font-medium text-emerald-400 hover:underline"
          >
            Ver cómo funciona ↓
          </a>
        </section>

        <section id="como-funciona" className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            Cómo funciona
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {STEPS.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
              >
                <span className="text-xl" aria-hidden>
                  {s.emoji}
                </span>
                <p className="mt-1 text-sm font-bold text-white">{s.title}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            Features
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300"
              >
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500">
          <p>No afiliado a FIFA ni organizadores oficiales.</p>
          <p className="mt-1">Contenido recreativo; datos y narraciones pueden usar IA.</p>
          <p className="mt-1">No procesa pagos ni apuestas.</p>
          <Link href="/legal" className="mt-2 inline-block text-emerald-500 hover:underline">
            Aviso legal completo →
          </Link>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            FAQ
          </h2>
          <dl className="mt-3 space-y-3">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <dt className="text-sm font-semibold text-white">{item.q}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10 text-center">
          <Link
            href="/login"
            className="inline-block rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-emerald-500"
          >
            Empezar gratis
          </Link>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-4 py-6 text-center text-xs text-zinc-600">
        <Link href="/legal" className="text-zinc-500 hover:text-zinc-300">
          Legal
        </Link>
        <span className="mx-2">·</span>
        <span>© Mundial Compas</span>
      </footer>
    </div>
  );
}
