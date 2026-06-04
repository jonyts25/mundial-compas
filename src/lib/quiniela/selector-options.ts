import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { fetchMisGrupos, type GrupoResumen } from "@/lib/liga/grupos-queries";

export interface QuinielaSelectorOption {
  id: string;
  slug: string | null;
  nombre: string;
  href: string;
  tipo_quiniela?: GrupoResumen["tipo_quiniela"];
  esGlobal: boolean;
}

export async function fetchQuinielaSelectorOptions(
  userId: string,
): Promise<QuinielaSelectorOption[]> {
  const grupos = await fetchMisGrupos(userId);
  const options: QuinielaSelectorOption[] = [
    {
      id: LIGA_GLOBAL_ID,
      slug: null,
      nombre: "Mundial Compas",
      href: "/quiniela",
      esGlobal: true,
    },
    ...grupos.map((g) => ({
      id: g.id,
      slug: g.slug,
      nombre: g.nombre,
      href: `/grupos/${g.slug}/quiniela`,
      tipo_quiniela: g.tipo_quiniela,
      esGlobal: false,
    })),
  ];
  return options;
}
