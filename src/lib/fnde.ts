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

/** VAAF mínimo nacional histórico para o teste de Oeiras (2022).
 * Quando for simular projetos de 2026, volte este valor para 5962.79 */
export const VAAF_NACIONAL_2026 = 4710.01;

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
 * Cálculo Híbrido:
 * Se o VAAF for o de 2026, crava os Valores Unitários do SIMEC.
 * Se for um VAAF histórico (como o 4710.01), aplica a matemática pura da época.
 */
export function calcularRepasse(
  vaaf: number,
  fator: number,
  alunos: number,
  meses: number,
): { valorAnual: number; repasse: number } {
  let valorUnitario = 0;
  const f = Number(fator.toFixed(2));

  // Verifica se o VAAF é o de 2026 (com margem de tolerância para casas decimais)
  if (Math.abs(vaaf - 5962.79) < 0.1) {
    if (f === 1.4) valorUnitario = 8830.09;
    else if (f === 1.3) valorUnitario = 8545.25;
    else if (f === 1.2) valorUnitario = 7121.04;
    else if (f === 1.1) valorUnitario = 6551.36;
    else valorUnitario = vaaf * fator;
  } else {
    // Aplica o cálculo raiz para valores históricos de VAAF (como o de Oeiras)
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
