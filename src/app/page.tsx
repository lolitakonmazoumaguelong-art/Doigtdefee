import Link from "next/link";
import { Logo } from "@/components/ui";

const FEATURES = [
  {
    title: "Un stock toujours juste",
    text: "Caméras, enregistreurs, détecteurs, câbles. Chaque facture émise sort le matériel du stock, et tu es alerté avant la rupture.",
  },
  {
    title: "Des devis en deux minutes",
    text: "Pioche dans ton catalogue, ajoute la pose, envoie. Le devis accepté devient une facture en un clic.",
  },
  {
    title: "Chaque client, tout son historique",
    text: "Matériel installé, interventions passées, factures en attente : tout est sur sa fiche quand il rappelle.",
  },
  {
    title: "Un planning d'interventions clair",
    text: "Installations, maintenances, dépannages. Tu sais qui va où, quand, et ce qui reste à faire.",
  },
];

const STEPS = [
  { n: "1", title: "Tu ajoutes ton matériel", text: "Prix d'achat, prix de vente, quantité, seuil d'alerte." },
  { n: "2", title: "Tu chiffres le chantier", text: "Un devis propre à ton nom, prêt à imprimer ou à envoyer en PDF." },
  { n: "3", title: "Tu poses, tu factures", text: "Le stock se met à jour et tu suis les paiements en attente." },
];

function QuotePreview() {
  const lines = [
    ["Caméra IP dôme 4 MP", "4", "4 500"],
    ["Enregistreur NVR 8 voies", "1", "9 500"],
    ["Disque dur 2 To surveillance", "1", "5 500"],
    ["Pose et paramétrage", "1", "6 000"],
  ];
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-chalk" />
      <div className="card relative p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-2xl leading-none">Devis</p>
            <p className="mt-1 text-xs text-muted tabular-nums">D-2026-014</p>
          </div>
          <span className="rounded-full bg-moss/15 px-2.5 py-0.5 text-xs font-medium text-moss">Accepté</span>
        </div>
        <ul className="mt-5 divide-y divide-line text-sm">
          {lines.map(([name, qty, price]) => (
            <li key={name} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate">{name}</span>
              <span className="shrink-0 text-muted tabular-nums">
                {qty} × <span className="text-ink">{price}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-ink pt-3">
          <span className="text-sm font-medium">Total</span>
          <span className="text-lg font-semibold tabular-nums">Rs 39 000</span>
        </div>
        <div className="mt-4 rounded-lg bg-ink px-4 py-2.5 text-center text-sm font-medium text-paper">
          Transformer en facture
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/connexion" className="btn btn-ghost">
            Connexion
          </Link>
          <Link href="/inscription" className="btn btn-primary hidden sm:inline-flex">
            Créer mon espace
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <p className="inline-flex rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-muted">
              Vidéosurveillance · Alarmes · Maison intelligente
            </p>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl">
              Tu sécurises tes clients. <span className="italic">On sécurise ta gestion.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Doigt de Fée réunit ton stock, tes clients, tes interventions, tes devis et tes factures. Fini les cahiers, les
              fichiers Excel et le matériel qui manque le jour de la pose.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/inscription" className="btn btn-primary px-6 py-3 text-base">
                Créer mon espace
              </Link>
              <a href="#fonctionnalites" className="btn btn-ghost px-6 py-3 text-base">
                Voir ce que ça fait
              </a>
            </div>
          </div>
          <QuotePreview />
        </section>

        <section id="fonctionnalites" className="border-y border-line bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="max-w-2xl font-display text-4xl leading-none sm:text-5xl">
              Pensé pour les installateurs, pas pour les comptables
            </h2>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="border-t border-ink pt-4">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-4xl leading-none sm:text-5xl">Du matériel à l&apos;encaissement</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="card p-6">
                <span className="grid size-9 place-items-center rounded-full bg-chalk font-semibold">{step.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-3xl bg-ink px-6 py-14 text-center text-paper sm:px-10">
            <h2 className="mx-auto max-w-2xl font-display text-4xl leading-none sm:text-5xl">
              Ton premier devis part dans cinq minutes
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-paper/70">
              Crée l&apos;espace de ton entreprise, ajoute ton matériel et commence à chiffrer.
            </p>
            <Link href="/inscription" className="btn btn-accent mt-8 px-6 py-3 text-base">
              Créer mon espace
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <p>© {new Date().getFullYear()} Doigt de Fée</p>
          <p>Gestion pour installateurs de sécurité et de domotique</p>
        </div>
      </footer>
    </div>
  );
}
