import Link from "next/link";
import { InterventionForm } from "@/components/intervention-form";
import { requireSession } from "@/lib/auth";
import { listMembers } from "@/lib/queries";
import { today } from "@/lib/format";
import { listClients } from "@/lib/queries";

export const metadata = { title: "New job" };

export default async function NewInterventionPage({ searchParams }: { searchParams: Promise<{ client?: string; date?: string }> }) {
  const { org, user } = await requireSession();
  const clients = await listClients(org.id);
  const team = (await listMembers(org.id)).map((member) => member.name);
  const query = await searchParams;
  const preselected = query.client;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : today();

  return (
    <div className="space-y-6">
      <h1 className="page-title">New job</h1>
      {clients.length === 0 ? (
        <div className="card max-w-xl p-6">
          <p className="text-sm">You need a client before scheduling a job.</p>
          <Link href="/app/clients/new" className="btn btn-primary mt-4">
            Add a client
          </Link>
        </div>
      ) : (
        <InterventionForm
          clients={clients}
          team={team}
          values={{
            clientId: clients.some((c) => c.id === preselected) ? preselected! : "",
            title: "",
            type: "installation",
            status: "planifiee",
            scheduledDate: date,
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
