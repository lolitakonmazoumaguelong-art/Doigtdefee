import Link from "next/link";
import { InterventionList } from "@/components/intervention-list";
import { requireSession } from "@/lib/auth";
import { listInterventions } from "@/lib/queries";

export const metadata = { title: "Jobs" };

export default async function InterventionsPage() {
  const { org } = await requireSession();
  const all = await listInterventions(org.id);
  const open = all.filter((i) => i.status === "planifiee" || i.status === "en_cours");
  const closed = all.filter((i) => i.status === "terminee" || i.status === "annulee").reverse();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Jobs</h1>
        <Link href="/app/interventions/new" className="btn btn-primary">
          Schedule a job
        </Link>
      </header>

      {all.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">No jobs scheduled</p>
          <p className="mt-2 text-sm text-muted">
            Installations, maintenance, repairs: schedule them here so nothing gets forgotten.
          </p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-display text-2xl">Upcoming and in progress</h2>
            {open.length ? (
              <InterventionList rows={open} />
            ) : (
              <p className="card p-5 text-sm text-muted">Nothing planned at the moment.</p>
            )}
          </section>
          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-2xl">History</h2>
              <InterventionList rows={closed} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
