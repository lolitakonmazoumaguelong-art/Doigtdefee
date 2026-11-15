import Link from "next/link";
import { scheduleContractVisit } from "@/actions/contracts";
import { InterventionList } from "@/components/intervention-list";
import { requireSession } from "@/lib/auth";
import { interventionStatus } from "@/lib/catalog";
import { addDays, formatDate, today } from "@/lib/format";
import { listContracts, listInterventions } from "@/lib/queries";

export const metadata = { title: "Jobs" };

const MONTH_TITLE = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const DAY_TITLE = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOT = { info: "bg-sky-600", warn: "bg-amber-500", good: "bg-moss", neutral: "bg-ink/30", bad: "bg-clay" };

export default async function InterventionsPage({ searchParams }: { searchParams: Promise<{ view?: string; month?: string }> }) {
  const { org } = await requireSession();
  const params = await searchParams;
  const calendar = params.view === "calendar";
  const [all, contracts] = await Promise.all([listInterventions(org.id), listContracts(org.id)]);
  const now = today();
  const due = contracts.filter(({ contract }) => contract.status === "actif" && !!contract.nextVisit);

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="page-title">Jobs</h1>
      <div className="flex flex-wrap gap-2">
        <nav className="flex rounded-full border border-line bg-card p-1 text-sm">
          <Link href="/app/interventions" className={`rounded-full px-3 py-1 ${calendar ? "text-muted" : "bg-ink text-paper"}`}>
            List
          </Link>
          <Link href="/app/interventions?view=calendar" className={`rounded-full px-3 py-1 ${calendar ? "bg-ink text-paper" : "text-muted"}`}>
            Calendar
          </Link>
        </nav>
        <Link href="/app/interventions/new" className="btn btn-primary">
          Schedule a job
        </Link>
      </div>
    </header>
  );

  if (calendar) {
    const key = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : now.slice(0, 7);
    const [y, m] = key.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const shift = (delta: number) => new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
    const offset = (first.getUTCDay() + 6) % 7; // lundi en premier
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
      const day = i - offset + 1;
      return day >= 1 && day <= daysInMonth ? `${key}-${String(day).padStart(2, "0")}` : null;
    });
    const jobsOn = (date: string) => all.filter((job) => job.scheduledDate === date && job.status !== "annulee");
    const visitsOn = (date: string) => due.filter(({ contract }) => contract.nextVisit === date);
    const busyDays = cells.filter((date): date is string => !!date && (jobsOn(date).length > 0 || visitsOn(date).length > 0));

    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-between gap-3">
          <Link href={`/app/interventions?view=calendar&month=${shift(-1)}`} className="btn btn-ghost" aria-label="Previous month">
            ←
          </Link>
          <h2 className="font-display text-3xl">{MONTH_TITLE.format(first)}</h2>
          <Link href={`/app/interventions?view=calendar&month=${shift(1)}`} className="btn btn-ghost" aria-label="Next month">
            →
          </Link>
        </div>

        {/* Grille du mois : ordinateur et tablette */}
        <div className="card hidden overflow-hidden md:block">
          <div className="grid grid-cols-7 border-b border-line bg-paper/60 text-center text-xs font-medium tracking-wide text-muted uppercase">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => (
              <div key={i} className={`min-h-28 border-line p-1.5 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${date ? "" : "bg-paper/40"}`}>
                {date && (
                  <>
                    <Link
                      href={`/app/interventions/new?date=${date}`}
                      title="Schedule a job on this day"
                      className={`mb-1 inline-grid size-6 place-items-center rounded-full text-xs tabular-nums ${
                        date === now ? "bg-ink font-semibold text-paper" : "text-muted hover:bg-ink/10"
                      }`}
                    >
                      {Number(date.slice(8))}
                    </Link>
                    <ul className="space-y-1">
                      {jobsOn(date).map((job) => (
                        <li key={job.id}>
                          <Link href={`/app/interventions/${job.id}`} className="flex items-start gap-1.5 rounded px-1 py-0.5 text-xs leading-tight hover:bg-paper" title={`${job.title} · ${job.clientName} · ${interventionStatus(job.status).label}`}>
                            <span className={`mt-1 size-1.5 shrink-0 rounded-full ${DOT[interventionStatus(job.status).tone]}`} />
                            <span className="min-w-0 truncate">
                              {job.scheduledTime && <span className="tabular-nums text-muted">{job.scheduledTime} </span>}
                              {job.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                      {visitsOn(date).map(({ contract, clientName }) => (
                        <li key={contract.id}>
                          <Link href={`/app/clients/${contract.clientId}`} className="block truncate rounded border border-dashed border-ink/40 px-1 py-0.5 text-xs leading-tight hover:bg-paper" title={`Maintenance due: ${contract.title}`}>
                            Maintenance · {clientName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="hidden text-xs text-muted md:block">
          Click a day number to schedule a job. Dashed boxes are maintenance visits due from contracts.
        </p>

        {/* Agenda du mois : téléphone */}
        <div className="space-y-4 md:hidden">
          {busyDays.length === 0 ? (
            <p className="card p-5 text-sm text-muted">Nothing scheduled this month.</p>
          ) : (
            busyDays.map((date) => (
              <section key={date}>
                <h3 className={`mb-2 text-sm font-medium ${date === now ? "text-moss" : ""}`}>
                  {DAY_TITLE.format(new Date(`${date}T12:00:00Z`))}
                  {date === now && " · today"}
                </h3>
                {jobsOn(date).length > 0 && <InterventionList rows={jobsOn(date)} />}
                {visitsOn(date).map(({ contract, clientName }) => (
                  <Link key={contract.id} href={`/app/clients/${contract.clientId}`} className="mt-2 block rounded-xl border border-dashed border-ink/40 px-4 py-2.5 text-sm">
                    Maintenance due · {clientName}
                    <span className="block text-xs text-muted">{contract.title}</span>
                  </Link>
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    );
  }

  const open = all.filter((i) => i.status === "planifiee" || i.status === "en_cours");
  const closed = all.filter((i) => i.status === "terminee" || i.status === "annulee").reverse();
  const dueSoon = due.filter(({ contract }) => contract.nextVisit! <= addDays(now, 30));

  return (
    <div className="space-y-8">
      {header}

      {dueSoon.length > 0 && (
        <section className="rounded-2xl border border-ink/15 bg-chalk/35 p-4 sm:p-5">
          <h2 className="font-display text-2xl">Maintenance visits due</h2>
          <ul className="mt-2 divide-y divide-ink/10">
            {dueSoon.map(({ contract, clientName }) => (
              <li key={contract.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <Link href={`/app/clients/${contract.clientId}`} className="min-w-0 flex-1 basis-48">
                  <span className="font-medium">{clientName}</span> · {contract.title}
                  <span className={`block text-xs ${contract.nextVisit! < now ? "text-clay" : "text-muted"}`}>
                    {contract.nextVisit! < now ? "Was due" : "Due"} {formatDate(contract.nextVisit)}
                  </span>
                </Link>
                <form action={scheduleContractVisit}>
                  <input type="hidden" name="id" value={contract.id} />
                  <button className="btn btn-primary">Schedule the visit</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {all.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">No jobs scheduled</p>
          <p className="mt-2 text-sm text-muted">Installations, maintenance, repairs: schedule them here so nothing gets forgotten.</p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-display text-2xl">Upcoming and in progress</h2>
            {open.length ? <InterventionList rows={open} /> : <p className="card p-5 text-sm text-muted">Nothing planned at the moment.</p>}
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
