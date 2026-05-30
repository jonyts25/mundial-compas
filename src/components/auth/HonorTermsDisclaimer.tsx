import { TERMINOS_HONOR_VERSION } from "@/lib/constants";

interface HonorTermsDisclaimerProps {
  id?: string;
}

export function HonorTermsDisclaimer({ id }: HonorTermsDisclaimerProps) {
  return (
    <aside
      id={id}
      role="alert"
      className="rounded-lg border-2 border-red-600 bg-red-50 p-4 text-sm text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100"
    >
      <p className="font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
        Aviso legal — Términos de Honor (Quiniela)
      </p>
      <p className="mt-2 leading-relaxed">
        <strong>Mundial Compas no es una casa de apuestas.</strong> Esta quiniela
        es un juego privado entre amigos con fines recreativos. No hay premios en
        efectivo administrados por la plataforma.
      </p>
      <p className="mt-2 leading-relaxed">
        Al marcar la casilla de aceptación, declaras bajo{" "}
        <strong>contrato de honor</strong> que cualquier aporte o “quiniela de
        paga” es un acuerdo <strong>voluntario entre ustedes</strong>, fuera de
        esta app. La plataforma solo muestra un distintivo visual en el
        leaderboard y facilitará, al cierre del Mundial, un{" "}
        <strong>Tablón de Confirmación Cruzada</strong> para que los participantes
        registren de buena fe quién cumplió su palabra.
      </p>
      <p className="mt-2 text-xs text-red-800/90 dark:text-red-200/80">
        Versión de términos: {TERMINOS_HONOR_VERSION}. Si no estás de acuerdo, no
        actives la quiniela de paga ni aceptes estos términos.
      </p>
    </aside>
  );
}
