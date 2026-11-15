"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";

const ICONS = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  users: "M17 20v-1a5 5 0 0 0-10 0v1M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  box: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chat: "M4 5h16v11H9l-5 4z",
  chart: "M5 20V10M12 20V4M19 20v-7",
  gear: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
  more: "M5 12h.01M12 12h.01M19 12h.01",
} as const;

type IconName = keyof typeof ICONS;
type NavLink = { href: string; label: string; short: string; icon: IconName; ownerOnly?: boolean };

const LINKS: NavLink[] = [
  { href: "/app", label: "Dashboard", short: "Home", icon: "home" },
  { href: "/app/documents", label: "Quotes & invoices", short: "Quotes", icon: "doc" },
  { href: "/app/clients", label: "Clients", short: "Clients", icon: "users" },
  { href: "/app/stock", label: "Stock", short: "Stock", icon: "box" },
  { href: "/app/interventions", label: "Jobs", short: "Jobs", icon: "calendar" },
  { href: "/app/messages", label: "Team", short: "Team", icon: "chat" },
  { href: "/app/statistics", label: "Statistics", short: "Stats", icon: "chart", ownerOnly: true },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: "gear" },
];

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} unread message(s)`}
      className="inline-grid min-w-5 place-items-center rounded-full bg-clay px-1.5 text-xs font-semibold text-paper"
    >
      {count}
    </span>
  );
}

const isActive = (pathname: string, href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

/** Menu latéral, affiché sur ordinateur et tablette. */
export function AppNav({ unread = 0, isOwner = false }: { unread?: number; isOwner?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="hidden flex-col gap-1 md:flex">
      {LINKS.filter((link) => isOwner || !link.ownerOnly).map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "bg-chalk font-medium text-ink" : "text-paper/75 hover:bg-paper/10 hover:text-paper"
            }`}
          >
            <Icon name={link.icon} />
            <span className="flex-1">{link.label}</span>
            {link.href === "/app/messages" && unread > 0 && !active && <Badge count={unread} />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barre d'onglets en bas de l'écran, comme une appli, sur téléphone. */
export function MobileNav({ unread = 0, isOwner = false }: { unread?: number; isOwner?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = LINKS.filter((link) => isOwner || !link.ownerOnly);
  const tabs = links.slice(0, 4);
  const more = links.slice(4);
  const moreActive = more.some((link) => isActive(pathname, link.href));
  const showBadge = unread > 0 && !isActive(pathname, "/app/messages");

  return (
    <div className="md:hidden print:hidden">
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-16 z-40 rounded-t-3xl border-t border-line bg-card p-3 pb-4 shadow-lg">
            <ul>
              {more.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base ${
                      isActive(pathname, link.href) ? "bg-chalk font-medium" : ""
                    }`}
                  >
                    <Icon name={link.icon} />
                    <span className="flex-1">{link.label}</span>
                    {link.href === "/app/messages" && showBadge && <Badge count={unread} />}
                  </Link>
                </li>
              ))}
            </ul>
            <form action={logout} className="mt-2 border-t border-line pt-2">
              <button className="w-full cursor-pointer rounded-xl px-3 py-3 text-left text-base text-clay">Log out</button>
            </form>
          </div>
        </>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-paper/10 bg-ink text-paper">
        {tabs.map((link) => {
          const active = !open && isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "text-chalk" : "text-paper/65"}`}
            >
              <Icon name={link.icon} className="size-6" />
              {link.short}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] ${
            open || moreActive ? "text-chalk" : "text-paper/65"
          }`}
        >
          <Icon name="more" className="size-6" />
          More
          {showBadge && !open && <span className="absolute top-2 right-[28%] size-2.5 rounded-full bg-clay" />}
        </button>
      </nav>
    </div>
  );
}
