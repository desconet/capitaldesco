export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** VAAF mínimo nacional do Fundeb — exercício 2026. */
export const VAAF_NACIONAL_2026 = 5962.79;
/** VAAT mínimo nacional do Fundeb — exercício 2026. */
export const VAAT_NACIONAL_2026 = 10194.38;
export const ANO_REFERENCIA = 2026;

export type Etapa = "Creche" | "Pré-escola";
export type Turno = "Integral" | "Parcial";
export type Modalidade = "Regular" | "Educação Especial";

export const FATOR_BASE: Record<Etapa, Record<Turno, number>> = {
  Creche: { Integral: 1.4, Parcial: 1.2 },
  "Pré-escola": { Integral: 1.3, Parcial: 1.1 },
};

export function calcularFator(etapa: Etapa, turno: Turno, modalidade: Modalidade): number {
  const base = FATOR_BASE[etapa][turno];
  return modalidade === "Educação Especial" ? Math.max(1.2, base) : base;
}

export const MESES_MAXIMOS_REPASSE = 18;

export function mesesDeFuncionamento(dataInicio: string, dataCadastro: string): number {
  const inicio = dataInicio.split("-").map(Number);

  if (inicio.length !== 3 || inicio.some(Number.isNaN)) return 0;

  const [anoInicio, mesInicio, diaInicio] = inicio;
  if (!anoInicio || !mesInicio || !diaInicio) return 0;

  const mesesNoAnoDeInicio = 12 - mesInicio + 1;
  const mesesAnoSubsequente = 12;
  const totalMeses = mesesNoAnoDeInicio + mesesAnoSubsequente;

  return Math.min(MESES_MAXIMOS_REPASSE, totalMeses);
}

/**
 * Cálculo de repasse adaptado!
 * Como o frontend ainda envia (vaaf, fator, alunos, meses), nós recebemos esses dados numéricos.
 * Usamos o valor do 'fator' para "adivinhar" a categoria e aplicar a tabela fixa do SIMEC.
 */
export function calcularRepasse(
  vaaf: number,
  fator: number,
  alunos: number,
  meses: number,
): { valorAnual: number; repasse: number } {
  let valorUnitario = 0;

  // Arredonda o fator para 2 casas decimais para garantir a comparação exata
  const f = Number(fator.toFixed(2));

  // Mapeia o fator para o Valor Unitário tabelado do SIMEC
  if (f === 1.4) {
    valorUnitario = 8830.09; // Creche Integral
  } else if (f === 1.3) {
    valorUnitario = 8545.25; // Pré-escola Integral
  } else if (f === 1.2) {
    valorUnitario = 7121.04; // Creche Parcial (Regular ou Especial)
  } else if (f === 1.1) {
    valorUnitario = 6551.36; // Pré-escola Parcial
  } else {
    // Fallback de segurança se o fator for diferente
    valorUnitario = vaaf * fator;
  }

  const valorAnual = valorUnitario * alunos;
  return { valorAnual, repasse: (valorAnual / 12) * meses };
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fatorFmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const numeroFmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface Combinacao {
  chave: string;
  rotulo: string;
  etapa: Etapa;
  turno: Turno;
  modalidade: Modalidade;
}

export const COMBINACOES: Combinacao[] = (
  [
    ["Regular", "Creche", "Parcial"],
    ["Regular", "Creche", "Integral"],
    ["Regular", "Pré-escola", "Parcial"],
    ["Regular", "Pré-escola", "Integral"],
    ["Educação Especial", "Creche", "Parcial"],
    ["Educação Especial", "Creche", "Integral"],
    ["Educação Especial", "Pré-escola", "Parcial"],
    ["Educação Especial", "Pré-escola", "Integral"],
  ] as [Modalidade, Etapa, Turno][]
).map(([modalidade, etapa, turno]) => ({
  chave: `${modalidade}-${etapa}-${turno}`,
  rotulo: `${modalidade === "Regular" ? "Regular" : "Especial"} · ${etapa} ${turno}`,
  etapa,
  turno,
  modalidade,
}));
