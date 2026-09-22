/* eslint-disable */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const target = process.env.TARGET_URL;
if (!target) throw new Error("TARGET_URL is required");

const browser = await chromium.launch({ headless: true });
const context = await browser.new_context({ accept_downloads: true });

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
  await page.get_by_role("heading", { name: "Calculadora de Repasse FNDE" }).wait_for();
  await page.get_by_label("Estado (UF)*").wait_for();
  return errors;
}

async function fillLocation(page, uf, municipio) {
  await page.get_by_label("Estado (UF)*").select_option(uf);
  const municipioSelect = page.get_by_label("Município*");
  await municipioSelect.wait_for({ state: "visible" });
  await page.wait_for_function(
    () => {
      const select = [...document.querySelectorAll("select")].find((el) =>
        el.closest("label")?.textContent?.includes("Município"),
      );
      return select && select.querySelectorAll("option").length > 1;
    },
    null,
    { timeout: 10000 },
  );
  await municipioSelect.select_option({ label: municipio });
}

async function setEstablishmentQuantity(page, rowText, value) {
  const row = page.locator("label").filter({ hasText: rowText }).first();
  await row.locator('input[type="number"]').fill(String(value));
}

async function simplcioMendes() {
  const page = await context.new_page();
  const errors = await pageReady(page);

  await page.get_by_role("button", { name: "Novos Estabelecimentos" }).click();
  await fillLocation(page, "PI", "Simplício Mendes");
  await page.get_by_label("Data de registro/envio no Simec*").fill("2026-07-22");
  await page.get_by_label("Data de início*").fill("2026-05-29");

  await setEstablishmentQuantity(page, "Regular · Creche Parcial", 64);
  await setEstablishmentQuantity(page, "Regular · Pré-escola Parcial", 4);

  await page.get_by_text("R$ 722.928,00", { exact: true }).wait_for({ timeout: 10000 });
  await page.get_by_text("FUNDEB · 2025", { exact: true }).wait_for();
  assert.equal(await page.get_by_label("VAAF Base do FUNDEB (R$)*").input_value(), "5696.84");

  const specialRows = page.locator("tbody tr").filter({ hasText: "Educação Especial" });
  assert.equal(await specialRows.count(), 0);

  const downloadPromise = page.wait_for_event("download", { timeout: 30000 });
  await page.get_by_role("button", { name: "Exportar PDF" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  assert.ok(path);
  assert.ok((await fs.promises.stat(path)).size > 1000);
  assert.match(download.suggested_filename(), /\.pdf$/i);

  assert.deepEqual(errors, []);
  await page.close();
}

async function vicentinopolis() {
  const page = await context.new_page();
  const errors = await pageReady(page);

  await page.get_by_role("button", { name: "Novos Estabelecimentos" }).click();
  await fillLocation(page, "GO", "Vicentinópolis");
  await page.get_by_label("Data de registro/envio no Simec*").fill("2026-05-07");
  await page.get_by_label("Data de início*").fill("2025-09-26");

  await setEstablishmentQuantity(page, "Regular · Pré-escola Parcial", 34);

  await page.get_by_text("R$ 147.248,33", { exact: true }).wait_for({ timeout: 10000 });
  await page.get_by_text("FUNDEB · 2024", { exact: true }).wait_for();
  assert.equal(await page.get_by_label("VAAF Base do FUNDEB (R$)*").input_value(), "5648.91");

  assert.deepEqual(errors, []);
  await page.close();
}

async function specialSubsetAndValidation() {
  const page = await context.new_page();
  const errors = await pageReady(page);

  await fillLocation(page, "PI", "Simplício Mendes");
  await page.get_by_label("Data de registro/envio no Simec*").fill("2026-06-15");
  await page.get_by_label("Data de início*").fill("2026-06-01");

  await page.get_by_label("Quantidade de alunos regular").fill("20");
  await page.get_by_text("R$ 226.141,50", { exact: true }).wait_for({ timeout: 10000 });

  await page.get_by_role("checkbox", { name: "Especial" }).click();
  await page.get_by_label("Quantidade de alunos especial").fill("3");
  await page.get_by_text("R$ 226.141,50", { exact: true }).wait_for({ timeout: 10000 });
  assert.equal(await page.locator("tbody tr").filter({ hasText: "Educação Especial" }).count(), 0);

  await page.get_by_label("Quantidade de alunos regular").fill("1.5");
  await page.get_by_text(/número inteiro/).wait_for();
  await page.get_by_text("Aguardando dados", { exact: true }).wait_for();

  assert.deepEqual(errors, []);
  await page.close();
}

async function mobileLayout() {
  const page = await context.new_page();
  await page.set_viewport_size({ width: 390, height: 844 });
  const errors = await pageReady(page);
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
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
