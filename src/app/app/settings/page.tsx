import { SettingsForm } from "@/components/settings-form";
import { DeleteCompanyPanel, PasswordPanel, TeamPanel } from "@/components/team-panel";
import { requireSession } from "@/lib/auth";
import { listMembers } from "@/lib/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { org, user } = await requireSession();
  const isOwner = user.role === "owner";
  const members = isOwner ? await listMembers(org.id) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Settings</h1>
        <p className="mt-2 text-sm text-muted">
          {isOwner
            ? "Customise your documents, manage your team and your login."
            : "Company settings are managed by the account owner."}
        </p>
      </header>
      {isOwner && (
        <>
          <SettingsForm
            values={{
              name: org.name,
              address: org.address,
              phone: org.phone,
              email: org.email,
              legalId: org.legalId,
              vatNumber: org.vatNumber,
              currency: org.currency,
              taxRate: org.taxRate,
              footerNote: org.footerNote,
              accentColor: org.accentColor,
              logo: org.logo,
            }}
          />
          <TeamPanel members={members} />
          <section className="card max-w-xl p-5 sm:p-6">
            <h2 className="font-display text-2xl">Your data</h2>
            <p className="mt-1 text-sm text-muted">
              Export to Excel (CSV files open directly in Excel and Google Sheets), or download a full backup of your company data to keep somewhere safe.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ["clients", "Clients"],
                ["stock", "Stock"],
                ["documents", "Quotes & invoices"],
                ["payments", "Payments"],
                ["jobs", "Jobs"],
              ].map(([kind, label]) => (
                <a key={kind} href={`/app/export/${kind}`} download className="btn btn-ghost">
                  {label}
                </a>
              ))}
            </div>
            <a href="/app/export/backup" download className="btn btn-primary mt-4">
              Download full backup
            </a>
            <p className="mt-2 text-xs text-muted">The backup contains everything except passwords. Download one regularly, for example every Friday.</p>
          </section>
        </>
      )}
      <PasswordPanel />
      {isOwner && <DeleteCompanyPanel companyName={org.name} />}
    </div>
  );
}
