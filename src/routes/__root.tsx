import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RecallOS" },
      { name: "description", content: "Evidence-backed personal memory agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { AccountProvider, useAccount } from "@/components/account";

const nav = [
  { to: "/", label: "Briefing" },
  { to: "/devices", label: "Connect", highlight: true },
  { to: "/alexa", label: "Alexa+ Sim", highlight: true },
  { to: "/drift", label: "Drift Radar" },
  { to: "/import", label: "Import" },
  { to: "/commitments", label: "Commitments" },
  { to: "/graph", label: "GraphRAG" },
  { to: "/insights", label: "Insights" },
  { to: "/consolidate", label: "Consolidate" },
  { to: "/ask", label: "Ask" },
] as const;

function UserNavStatus() {
  const { session } = useAccount();
  if (session?.user) {
    return (
      <span className="font-mono text-xs rounded-full border border-confirmed/40 bg-confirmed/10 px-2.5 py-1 text-confirmed">
        ● {session.user.email?.split("@")[0] ?? "Signed In"}
      </span>
    );
  }
  return (
    <Link
      to="/import"
      className="font-mono text-xs rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground"
    >
      Sign In
    </Link>
  );
}

import { MemoryStoreProvider } from "@/lib/memory-store";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        <MemoryStoreProvider>
          <div className="min-h-screen">
            <nav className="border-b bg-card/40 backdrop-blur sticky top-0 z-50">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
                <div className="flex items-center gap-6">
                  <Link
                    to="/"
                    className="font-mono text-sm font-bold tracking-wider flex items-center gap-2"
                  >
                    <span>
                      RECALL<span className="text-primary">OS</span>
                    </span>
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono text-primary font-bold">
                      MCP
                    </span>
                  </Link>
                  <div className="hidden flex-wrap gap-1 text-sm md:flex">
                    {nav.map((n) => (
                      <Link
                        key={n.to}
                        to={n.to}
                        activeOptions={{ exact: true }}
                        className={`rounded px-2.5 py-1 text-xs transition ${
                          "highlight" in n && n.highlight
                            ? "font-semibold text-primary hover:bg-primary/10"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        activeProps={{ className: "bg-accent text-foreground font-medium" }}
                      >
                        {n.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <details className="group relative md:hidden">
                    <summary className="list-none cursor-pointer rounded-full border border-border bg-card/60 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
                      Menu
                    </summary>
                    <div className="absolute right-0 top-full z-50 mt-2 grid min-w-44 gap-1 rounded-xl border border-border bg-card p-2 shadow-2xl">
                      {nav.map((n) => (
                        <Link
                          key={n.to}
                          to={n.to}
                          activeOptions={{ exact: true }}
                          className="rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          activeProps={{
                            className:
                              "rounded-lg bg-accent px-3 py-2 text-xs font-medium text-foreground",
                          }}
                        >
                          {n.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                  <Link
                    to="/devices"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-mono text-[10px] font-semibold text-primary transition hover:bg-primary/20 md:hidden"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Connect
                  </Link>
                  <UserNavStatus />
                </div>
              </div>
            </nav>
            <main className="mx-auto max-w-5xl px-6 py-10">
              <Outlet />
            </main>
          </div>
        </MemoryStoreProvider>
      </AccountProvider>
    </QueryClientProvider>
  );
}
