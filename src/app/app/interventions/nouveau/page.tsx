import Link from "next/link";
import { InterventionForm } from "@/components/intervention-form";
import { requireSession } from "@/lib/auth";
import { today } from "@/lib/format";
import { listClients } from "@/lib/queries";

export const metadata = { title: "Nouvelle intervention" };

export default async function NewInterventionPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { org, user } = await requireSession();
  const clients = await listClients(org.id);
  const preselected = (await searchParams).client;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Nouvelle intervention</h1>
      {clients.length === 0 ? (
        <div className="card max-w-xl p-6">
          <p className="text-sm">Il faut d&apos;abord un client pour planifier une intervention.</p>
          <Link href="/app/clients/nouveau" className="btn btn-primary mt-4">
            Ajouter un client
          </Link>
        </div>
      ) : (
        <InterventionForm
          clients={clients}
          values={{
            clientId: clients.some((c) => c.id === preselected) ? preselected! : "",
            title: "",
            type: "installation",
            status: "planifiee",
            scheduledDate: today(),
            scheduledTime: "",
            address: "",
            technician: user.name,
            notes: "",
            feedback: "",
            issue: "",
          }}
        />
      )}
    </div>
  );
}
