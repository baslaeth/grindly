import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ signedIn: true, reviewer: false }));
vi.mock("@/server/navigation", () => ({
  navigationContext: async () => session,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/workbench",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
import RootLayout from "@/app/layout";

it("places one signed-in logout after the network link and removes the global footer", async () => {
  session.signedIn = true;
  const html = renderToStaticMarkup(await RootLayout({ children: "Hub" }));
  expect(html.match(/Sign out/g)).toHaveLength(1);
  expect(html.indexOf('class="nav-signout"')).toBeGreaterThan(
    html.indexOf('alt="Robinhood Chain"'),
  );
  expect(html).not.toContain("<footer");
  expect(html).toContain("lucide-share-2");
});

it("does not expose logout for a visitor", async () => {
  session.signedIn = false;
  const html = renderToStaticMarkup(await RootLayout({ children: "Hub" }));
  expect(html).not.toContain("Sign out");
  expect(html).toContain("Sign in");
});
