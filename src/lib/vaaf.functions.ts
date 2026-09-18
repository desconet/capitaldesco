import { createServerFn } from "@tanstack/react-start";

import { ANO_REFERENCIA, VAAF_NACIONAL_2026, VAAT_NACIONAL_2026 } from "./fnde";

export interface ParametrosFundeb {
  ano: number;
  vaaf: number;
  vaat: number;
  origem: "portal" | "embutido";
  fonte: string;
  url: string | null;
  atualizadoEm: string;
}

const PADRAO: Record<number, { vaaf: number; vaat: number }> = {
  [ANO_REFERENCIA]: { vaaf: VAAF_NACIONAL_2026, vaat: VAAT_NACIONAL_2026 },
};

function paraNumero(texto: string): number | null {
  const n = Number(texto.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 100 ? n : null;
}

function extrair(texto: string, sigla: "VAAF" | "VAAT"): number | null {
  const padroes = [
    new RegExp(`\\(${sigla}\\)[^R]{0,200}?R\\$\\s*([\\d.]+,\\d{2})`, "i"),
    new RegExp(`${sigla}[^R]{0,200}?R\\$\\s*([\\d.]+,\\d{2})`, "i"),
  ];
  for (const re of padroes) {
    const m = re.exec(texto);
    if (m?.[1]) {
      const valor = paraNumero(m[1]);
      if (valor) return valor;
    }
  }
  return null;
}

/**
 * Busca os valores nacionais do Fundeb nos portais públicos (Undime/FNDE).
 * Em caso de falha, devolve os valores oficiais embutidos no app.
 */
export const obterParametrosFundeb = createServerFn({ method: "GET" })
  .inputValidator((input: { ano?: number } | undefined) => ({
    ano: input?.ano ?? ANO_REFERENCIA,
  }))
  .handler(async ({ data }): Promise<ParametrosFundeb> => {
    const { ano } = data;
    const padrao = PADRAO[ano] ?? PADRAO[ANO_REFERENCIA]!;
    const urls = [
      `https://undime.org.br/noticia/fundeb-${ano}-confira-a-estimativa-de-receita-para-o-seu-municipio-2/`,
      `https://undime.org.br/noticia/fundeb-${ano}-confira-a-estimativa-de-receita-para-o-seu-municipio/`,
    ];

    for (const url of urls) {
      try {
        const resposta = await fetch(url, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; CalculadoraFNDE/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        if (!resposta.ok) continue;
        const html = await resposta.text();
        const texto = html
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ");
        const vaaf = extrair(texto, "VAAF");
        const vaat = extrair(texto, "VAAT");
        if (vaaf) {
          return {
            ano,
            vaaf,
            vaat: vaat ?? padrao.vaat,
            origem: "portal",
            fonte: "Undime / Portaria Interministerial MEC/MF",
            url,
            atualizadoEm: new Date().toISOString(),
          };
        }
      } catch {
        // segue para a próxima fonte
      }
    }

    return {
      ano,
      vaaf: padrao.vaaf,
      vaat: padrao.vaat,
      origem: "embutido",
      fonte: "Valores oficiais embutidos (Portaria Interministerial MEC/MF nº 14/2025)",
      url: null,
      atualizadoEm: new Date().toISOString(),
    };
  });
