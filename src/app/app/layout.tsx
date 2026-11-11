import Link from "next/link";
import { logout } from "@/actions/auth";
import { AppNav } from "@/components/app-nav";
import { requireSession } from "@/lib/auth";
import { countUnreadMessages } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await requireSession();
  const unread = await countUnreadMessages(org.id, user.id, user.messagesReadAt);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 bg-ink p-4 text-paper md:sticky md:top-0 md:h-screen md:w-60 md:gap-8 md:p-5 print:hidden">
        <div className="flex items-center justify-between">
          <Link href="/app" className="inline-flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-chalk font-display text-lg leading-none text-ink">
              D
            </span>
            <span className="font-display text-2xl leading-none">Doigt de Fée</span>
          </Link>
          <form action={logout} className="md:hidden">
            <button className="text-sm text-paper/70 underline-offset-4 hover:underline">Log out</button>
          </form>
        </div>
        <AppNav unread={unread} isOwner={user.role === "owner"} />
        <div className="mt-auto hidden border-t border-paper/15 pt-4 md:block">
          <p className="truncate text-sm font-medium">{org.name}</p>
          <p className="truncate text-xs text-paper/60">{user.name}</p>
          <p className="truncate text-xs text-paper/60">{user.email}</p>
          <form action={logout}>
            <button className="mt-3 cursor-pointer text-sm text-paper/70 underline-offset-4 hover:text-paper hover:underline">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 md:px-10 md:py-10 print:p-0">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
