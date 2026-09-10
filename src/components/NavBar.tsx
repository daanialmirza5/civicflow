"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

const CITIZEN_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/services", label: "Discover Services" },
  { href: "/applications", label: "My Applications" },
  { href: "/deadlines", label: "Deadlines" },
];

const STAFF_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/case-worker", label: "Case Queue" },
  { href: "/deadlines", label: "Deadlines" },
  { href: "/analytics", label: "Analytics" },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const links = user && user.role !== "CITIZEN" ? STAFF_LINKS : CITIZEN_LINKS;

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">CF</span>
          CivicFlow
        </Link>

        {user && (
          <nav className="hidden gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  pathname?.startsWith(link.href) && "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                <div className="text-xs text-slate-500">{user.role.replace(/_/g, " ")}</div>
              </div>
              {user.role === "CITIZEN" && (
                <Link href="/profile" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
                  Profile
                </Link>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:underline dark:text-slate-300">
                Sign in
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
