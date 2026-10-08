import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { HomeActions, HomeEcosystem } from "@/components/home-ecosystem";
import { categories, ranks } from "@/research/spaces";

it("explains all specialties and ranks without promising active token or upgrade features", () => {
  const html = renderToStaticMarkup(createElement(HomeEcosystem));
  for (const name of [...categories, ...ranks]) expect(html).toContain(name);
  expect(html).toContain("Invitation, email and wallet verification");
  expect(html).toContain("Planned separately");
  expect(html).toContain("NFT upgrade execution is not live yet");
  expect(html).toContain("A higher rank does not unlock lower-rank rooms");
  expect(html).not.toContain('href="/workbench');
});
it("links only permitted rooms and distinguishes member from incomplete onboarding", () => {
  const html = renderToStaticMarkup(
    createElement(HomeEcosystem, {
      rank: "Bronze",
      rooms: [{ id: "bronze-airdrop-hunters", category: "Airdrop Hunters" }],
    }),
  );
  expect(html).toContain('href="/workbench?room=bronze-airdrop-hunters"');
  expect(html).toContain("Inside your Bronze community");
  expect(
    renderToStaticMarkup(
      createElement(HomeActions, { member: false, signedIn: true }),
    ),
  ).toContain("Continue membership setup");
  expect(
    renderToStaticMarkup(
      createElement(HomeActions, { member: true, signedIn: true }),
    ),
  ).toContain("Open your Hub");
});
