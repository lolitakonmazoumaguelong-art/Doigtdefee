import Link from "next/link";
import { InterventionList } from "@/components/intervention-list";
import { requireSession } from "@/lib/auth";
import { listInterventions } from "@/lib/queries";

export const metadata = { title: "Interventions" };

export default async function InterventionsPage() {
  const { org } = await requireSession();
  const all = await listInterventions(org.id);
  const open = all.filter((i) => i.status === "planifiee" || i.status === "en_cours");
  const closed = all.filter((i) => i.status === "terminee" || i.status === "annulee").reverse();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Interventions</h1>
        <Link href="/app/interventions/nouveau" className="btn btn-primary">
          Planifier une intervention
        </Link>
      </header>

      {all.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">Aucune intervention planifiée</p>
          <p className="mt-2 text-sm text-muted">
            Installations, maintenances, dépannages : planifie-les ici pour ne rien oublier.
          </p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-display text-2xl">À venir et en cours</h2>
            {open.length ? (
              <InterventionList rows={open} />
            ) : (
              <p className="card p-5 text-sm text-muted">Rien de prévu pour le moment.</p>
            )}
          </section>
          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-2xl">Historique</h2>
              <InterventionList rows={closed} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
