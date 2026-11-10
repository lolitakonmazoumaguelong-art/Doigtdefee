import Link from "next/link";
import { notFound } from "next/navigation";
import { setInterventionStatus } from "@/actions/interventions";
import { InterventionForm } from "@/components/intervention-form";
import { Badge } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { interventionStatus } from "@/lib/catalog";
import { getIntervention, listClients } from "@/lib/queries";

export const metadata = { title: "Intervention" };

export default async function InterventionPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSession();
  const intervention = await getIntervention(org.id, (await params).id);
  if (!intervention) notFound();
  const clients = await listClients(org.id);
  const client = clients.find((c) => c.id === intervention.clientId);
  const status = interventionStatus(intervention.status);
  const next =
    intervention.status === "planifiee"
      ? { status: "en_cours", label: "Démarrer l'intervention" }
      : intervention.status === "en_cours"
        ? { status: "terminee", label: "Marquer comme terminée" }
        : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/app/interventions" className="text-sm text-muted underline-offset-4 hover:underline">
            Interventions
          </Link>
          <h1 className="page-title mt-1">{intervention.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <Badge label={status.label} tone={status.tone} />
            {client && (
              <Link href={`/app/clients/${client.id}`} className="underline underline-offset-4">
                {client.name}
              </Link>
            )}
            {client?.phone && (
              <a href={`tel:${client.phone}`} className="text-muted underline underline-offset-4">
                {client.phone}
              </a>
            )}
          </div>
        </div>
        {next && (
          <form action={setInterventionStatus}>
            <input type="hidden" name="id" value={intervention.id} />
            <input type="hidden" name="status" value={next.status} />
            <button className="btn btn-accent">{next.label}</button>
          </form>
        )}
      </header>

      <InterventionForm
        key={intervention.status}
        clients={clients}
        values={{
          id: intervention.id,
          clientId: intervention.clientId,
          title: intervention.title,
          type: intervention.type,
          status: intervention.status,
          scheduledDate: intervention.scheduledDate,
          scheduledTime: intervention.scheduledTime,
          address: intervention.address,
          technician: intervention.technician,
          notes: intervention.notes,
          feedback: intervention.feedback,
          issue: intervention.issue,
        }}
      />
    </div>
  );
}
