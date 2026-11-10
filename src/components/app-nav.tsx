"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Tableau de bord" },
  { href: "/app/documents", label: "Devis et factures" },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/interventions", label: "Interventions" },
  { href: "/app/messages", label: "Équipe" },
  { href: "/app/stock", label: "Stock" },
  { href: "/app/statistiques", label: "Statistiques", ownerOnly: true },
  { href: "/app/parametres", label: "Paramètres" },
];

export function AppNav({ unread = 0, isOwner = false }: { unread?: number; isOwner?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.filter((link) => isOwner || !("ownerOnly" in link)).map((link) => {
        const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              active ? "bg-chalk font-medium text-ink" : "text-paper/75 hover:bg-paper/10 hover:text-paper"
            }`}
          >
            {link.label}
            {link.href === "/app/messages" && unread > 0 && !active && (
              <span className="ml-2 inline-grid min-w-5 place-items-center rounded-full bg-clay px-1.5 text-xs font-semibold text-paper">
                {unread}
                <span className="sr-only"> message(s) non lu(s)</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
