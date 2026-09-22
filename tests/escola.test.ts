import test, { after } from "node:test";
import assert from "node:assert/strict";

import { consultarEscolaPorInep } from "../src/lib/escola.functions.ts";

const fetchOriginal = globalThis.fetch;
let chamadas: string[] = [];

globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input);
  chamadas.push(url);

  if (url === "/data/escolas-inep/22.json") {
    return new Response(
      JSON.stringify({
        "22145796": [
          "CMEI ALINA NUNES -CENTRO MUNICIPAL DE EDUCACAO INFANTIL",
          "Oeiras",
          "PI",
          "1",
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  if (url === "/data/escolas-inep/99.json") {
    return new Response("indisponível", { status: 503 });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

after(() => {
  globalThis.fetch = fetchOriginal;
});

test("consulta INEP resolve escola conhecida pela base estática", async () => {
  chamadas = [];
  const escola = await consultarEscolaPorInep("22145796");

  assert.deepEqual(escola, {
    inep: "22145796",
    nome: "CMEI ALINA NUNES -CENTRO MUNICIPAL DE EDUCACAO INFANTIL",
    municipio: "Oeiras",
    uf: "PI",
    situacao: "Em atividade",
    fonte: "Censo Escolar 2024 — INEP",
  });
  assert.deepEqual(chamadas, ["/data/escolas-inep/22.json"]);
});

test("reutiliza o shard INEP em memória para consultas do mesmo prefixo", async () => {
  await consultarEscolaPorInep("22145796");
  await consultarEscolaPorInep("22145796");
  assert.equal(chamadas.filter((url) => url === "/data/escolas-inep/22.json").length, 1);
});

test("código ausente na base retorna null sem ser tratado como indisponibilidade", async () => {
  assert.equal(await consultarEscolaPorInep("33123456"), null);
});

test("código INEP inválido é rejeitado antes da rede", async () => {
  const antes = chamadas.length;
  await assert.rejects(() => consultarEscolaPorInep("123"), /8 números/);
  assert.equal(chamadas.length, antes);
});

test("falha HTTP do shard é explícita e não fica presa no cache", async () => {
  await assert.rejects(() => consultarEscolaPorInep("99123456"), /indisponível/);
  await assert.rejects(() => consultarEscolaPorInep("99123456"), /indisponível/);
  assert.equal(chamadas.filter((url) => url === "/data/escolas-inep/99.json").length, 2);
});
