interface GrupoAdminSectionProps {
  puedeAdministrar: boolean;
}

const ACCIONES = [
  "Editar nombre y descripción",
  "Cambiar tipo de quiniela",
  "Activar o desactivar grupo",
  "Promover miembro a admin",
  "Degradar admin a miembro",
] as const;

export function GrupoAdminSection({ puedeAdministrar }: GrupoAdminSectionProps) {
  if (!puedeAdministrar) return null;

  return (
    <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        Administración
      </h3>
      <p className="mt-1 text-xs text-zinc-600">
        Estas opciones llegarán en la siguiente fase.
      </p>
      <ul className="mt-3 space-y-2">
        {ACCIONES.map((label) => (
          <li key={label}>
            <button
              type="button"
              disabled
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-left text-sm text-zinc-500 opacity-70"
              title="Próximamente"
            >
              {label}
              <span className="ml-2 text-[10px] font-bold uppercase text-amber-600/90">
                Próximamente
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
