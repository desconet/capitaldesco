type RegistroEscola = [nome: string, municipio: string, uf: string, situacao: string];

export interface EscolaInep {
  inep: string;
  nome: string;
  municipio: string;
  uf: string;
  situacao: "Em atividade" | "Paralisada" | "Extinta" | "Não informada";
  fonte: string;
}

const situacoes: Record<string, EscolaInep["situacao"]> = {
  "1": "Em atividade",
  "2": "Paralisada",
  "3": "Extinta",
};

const cacheBases = new Map<string, Promise<Record<string, RegistroEscola>>>();

async function carregarBase(prefixo: string): Promise<Record<string, RegistroEscola>> {
  const emCache = cacheBases.get(prefixo);
  if (emCache) return emCache;

  const carregamento = fetch(`/data/escolas-inep/${encodeURIComponent(prefixo)}.json`, {
    cache: "force-cache",
  })
    .then(async (resposta) => {
      if (!resposta.ok) {
        throw new Error("A base oficial de escolas está indisponível no momento.");
      }
      return (await resposta.json()) as Record<string, RegistroEscola>;
    })
    .catch((erro) => {
      cacheBases.delete(prefixo);
      throw erro;
    });

  cacheBases.set(prefixo, carregamento);
  return carregamento;
}

/**
 * Consulta a base INEP estática no próprio navegador.
 *
 * A versão anterior fazia um Server Function buscar o próprio domínio por HTTP.
 * Em previews protegidos (como Vercel) essa chamada podia cair no SSO e falhar,
 * embora o arquivo estivesse disponível para o usuário autenticado. O lookup
 * direto também permite reutilizar o shard por UF/prefixo durante a sessão.
 */
export async function consultarEscolaPorInep(inep: string): Promise<EscolaInep | null> {
  if (!/^\d{8}$/.test(inep)) {
    throw new Error("O código INEP deve ter exatamente 8 números.");
  }

  const registros = await carregarBase(inep.slice(0, 2));
  const escola = registros[inep];
  if (!escola) return null;

  return {
    inep,
    nome: escola[0],
    municipio: escola[1],
    uf: escola[2],
    situacao: situacoes[escola[3]] ?? "Não informada",
    fonte: "Censo Escolar 2024 — INEP",
  };
}
