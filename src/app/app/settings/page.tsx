import { SettingsForm } from "@/components/settings-form";
import { PasswordPanel, TeamPanel } from "@/components/team-panel";
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
        </>
      )}
      <PasswordPanel />
    </div>
  );
}
