import type { Page, Locator } from "@playwright/test";
import {
  categoryFields,
  assessmentFields,
  type Category,
} from "../../src/alpha/checklists";
export async function fillUnknownContext(page: Page, category: Category) {
  for (const field of categoryFields[category])
    await page
      .getByRole("combobox", { name: `${field.label} answer`, exact: true })
      .selectOption("unknown");
  if (["Degens", "NFT Specialists", "Airdrop Hunters"].includes(category))
    await page.getByLabel("Chain or network", { exact: false }).fill("Unknown");
  if (["Degens", "NFT Specialists"].includes(category))
    await page
      .getByLabel("Asset or contract identifier", { exact: false })
      .fill("Unknown");
}
export async function fillAssessment(form: Locator) {
  for (const field of assessmentFields)
    await form
      .getByLabel(field.label, { exact: true })
      .fill(
        `Isolated assessment of ${field.label.toLowerCase()}: synthetic workflow evidence only, no claim of real protocol verification.`,
      );
}
