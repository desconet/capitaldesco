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

export const ANO_REFERENCIA = 2026;

export type Etapa = "Creche" | "Pré-escola";
export type Turno = "Integral" | "Parcial";
export type Modalidade = "Regular" | "Educação Especial";

/**
 * Valores unitários do Fundeb utilizados pelo SIMEC.
 * Regra do FNDE: A base de cálculo utiliza sempre os valores estabelecidos para o "ano anterior".
 */
export const VALORES_UNITARIOS_SIMEC: Record<Etapa, Record<Turno, number>> = {
  Creche: {
    Integral: 8830.09,
    Parcial: 7121.04,
  },
  "Pré-escola": {
    Integral: 8545.25,
    Parcial: 6551.36,
  },
};

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
 * Novo cálculo de repasse espelhado no comportamento do SIMEC.
 * Substitui a multiplicação (VAAF * Fator) pelo Valor Unitário tabelado da etapa/turno.
 */
export function calcularRepasse(
  etapa: Etapa,
  turno: Turno,
  alunos: number,
  meses: number,
): { valorAnual: number; repasse: number } {
  // Puxa o valor unitário fixo da tabela espelhada do SIMEC
  const valorUnitario = VALORES_UNITARIOS_SIMEC[etapa][turno];

  // O Valor Anual total para todos os alunos daquela categoria
  const valorAnual = valorUnitario * alunos;

  // Repasse proporcional aos meses de direito
  return { valorAnual, repasse: (valorAnual / 12) * meses };
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
