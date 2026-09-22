/* eslint-disable */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const target = process.env.TARGET_URL;
if (!target) throw new Error("TARGET_URL is required");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });

async function mockIbge(page) {
  await page.route("https://servicodados.ibge.gov.br/api/v1/localidades/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/estados?")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 52, sigla: "GO", nome: "Goiás" },
          { id: 22, sigla: "PI", nome: "Piauí" },
        ]),
      });
    }
    if (url.includes("/estados/PI/municipios")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: 2211100, nome: "Simplício Mendes" }]),
      });
    }
    if (url.includes("/estados/GO/municipios")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: 5220157, nome: "Vicentinópolis" }]),
      });
    }
    return route.fulfill({ status: 404, body: "not mocked" });
  });
}

async function pageReady(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await mockIbge(page);
  const response = await page.goto(target, { waitUntil: "networkidle", timeout: 60000 });
  assert.equal(response?.status(), 200);
  await page.getByRole("heading", { name: "Calculadora de Repasse FNDE" }).waitFor();
  await page.waitForFunction(() => {
    const select = [...document.querySelectorAll("select")].find((el) =>
      el.closest("label")?.textContent?.includes("Estado (UF)"),
    );
    return select && select.querySelectorAll("option").length > 1;
  });
  return errors;
}

async function fillLocation(page, uf, municipio) {
  await page.getByLabel(/Estado \(UF\)/).selectOption(uf);
  const municipioSelect = page.getByLabel(/Município/);
  await page.waitForFunction(
    () => {
      const select = [...document.querySelectorAll("select")].find((el) =>
        el.closest("label")?.textContent?.includes("Município"),
      );
      return select && select.querySelectorAll("option").length > 1;
    },
    null,
    { timeout: 10000 },
  );
  await municipioSelect.selectOption({ label: municipio });
}

async function setEstablishmentQuantity(page, rowText, value) {
  const row = page.locator("label").filter({ hasText: rowText }).first();
  await row.locator('input[type="number"]').fill(String(value));
}

async function fillInputInLabel(page, labelText, value, type = "date") {
  const label = page.locator("label").filter({ hasText: labelText }).first();
  await label.locator(`input[type="${type}"]`).fill(value);
}

async function simplcioMendes() {
  const page = await context.newPage();
  const errors = await pageReady(page);

  await page.getByRole("button", { name: "Novos Estabelecimentos" }).click();
  await page.getByRole("heading", { name: "Identificação e matrículas do estabelecimento" }).waitFor();
  await fillLocation(page, "PI", "Simplício Mendes");
  await fillInputInLabel(page, "Data de registro/envio no Simec", "2026-07-22");
  await fillInputInLabel(page, "Data de início", "2026-05-29");

  await setEstablishmentQuantity(page, "Regular · Creche Parcial", 64);
  await setEstablishmentQuantity(page, "Regular · Pré-escola Parcial", 4);

  await page.getByText("R$ 722.928,00", { exact: true }).first().waitFor({ timeout: 10000 });
  await page.getByText("FUNDEB · 2025", { exact: true }).waitFor();
  assert.equal(await page.getByLabel(/VAAF Base do FUNDEB/).inputValue(), "5696.84");

  const specialRows = page.locator("tbody tr").filter({ hasText: "Educação Especial" });
  assert.equal(await specialRows.count(), 0);

  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await page.getByRole("button", { name: "Exportar PDF" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  assert.ok(path);
  assert.ok((await fs.promises.stat(path)).size > 1000);
  assert.match(download.suggestedFilename(), /\.pdf$/i);

  assert.deepEqual(errors, []);
  await page.close();
}

async function vicentinopolis() {
  const page = await context.newPage();
  const errors = await pageReady(page);

  await page.getByRole("button", { name: "Novos Estabelecimentos" }).click();
  await page.getByRole("heading", { name: "Identificação e matrículas do estabelecimento" }).waitFor();
  await fillLocation(page, "GO", "Vicentinópolis");
  await fillInputInLabel(page, "Data de registro/envio no Simec", "2026-05-07");
  await fillInputInLabel(page, "Data de início", "2025-09-26");

  await setEstablishmentQuantity(page, "Regular · Pré-escola Parcial", 34);

  await page.getByText("R$ 147.248,33", { exact: true }).first().waitFor({ timeout: 10000 });
  await page.getByText("FUNDEB · 2024", { exact: true }).waitFor();
  assert.equal(await page.getByLabel(/VAAF Base do FUNDEB/).inputValue(), "5648.91");

  assert.deepEqual(errors, []);
  await page.close();
}

async function specialSubsetAndValidation() {
  const page = await context.newPage();
  const errors = await pageReady(page);

  await fillLocation(page, "PI", "Simplício Mendes");
  await fillInputInLabel(page, "Data de registro/envio no Simec", "2026-06-15");
  await fillInputInLabel(page, "Data de início", "2026-06-01");
  await page.getByLabel("Turno").selectOption("Parcial");

  await page.getByLabel("Quantidade de alunos regular").fill("20");
  await page.getByText("R$ 226.141,50", { exact: true }).first().waitFor({ timeout: 10000 });

  await page.getByRole("checkbox", { name: "Especial" }).click();
  await page.getByLabel("Quantidade de alunos especial").fill("3");
  await page.getByText("R$ 226.141,50", { exact: true }).first().waitFor({ timeout: 10000 });
  assert.equal(await page.locator("tbody tr").filter({ hasText: "Educação Especial" }).count(), 0);

  await page.getByLabel("Quantidade de alunos regular").fill("1.5");
  await page.getByText(/número inteiro/).first().waitFor();
  await page.getByText("Aguardando dados", { exact: true }).waitFor();

  assert.deepEqual(errors, []);
  await page.close();
}

async function mobileLayout() {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await pageReady(page);
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  assert.equal(overflows, false);
  assert.deepEqual(errors, []);
  await page.close();
}

try {
  await simplcioMendes();
  await vicentinopolis();
  await specialSubsetAndValidation();
  await mobileLayout();
  console.log("PREVIEW_SMOKE_PASS");
} finally {
  await context.close();
  await browser.close();
}
