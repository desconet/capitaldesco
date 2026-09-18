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

/** VAAF mínimo nacional do Fundeb — exercício 2026 (Portaria Interministerial MEC/MF nº 14/2025). */
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

/** Prazo máximo de pagamento dos programas: 18 meses. */
export const MESES_MAXIMOS_REPASSE = 18;

/** Calcula os meses restantes, descontando os meses entre o início e o cadastro. */
export function mesesDeFuncionamento(dataInicio: string, dataCadastro: string): number {
  const inicio = dataInicio.split("-").map(Number);
  const cadastro = dataCadastro.split("-").map(Number);
  if (inicio.length !== 3 || cadastro.length !== 3 || inicio.some(Number.isNaN) || cadastro.some(Number.isNaN)) return 0;
  const [anoInicio, mesInicio, diaInicio] = inicio;
  const [anoCadastro, mesCadastro, diaCadastro] = cadastro;
  if (!anoInicio || !mesInicio || !diaInicio || !anoCadastro || !mesCadastro || !diaCadastro) return 0;
  const inicioUtc = Date.UTC(anoInicio, mesInicio - 1, diaInicio);
  const cadastroUtc = Date.UTC(anoCadastro, mesCadastro - 1, diaCadastro);
  if (inicioUtc > cadastroUtc) return 0;
  const mesesDecorridos = (anoCadastro - anoInicio) * 12 + (mesCadastro - mesInicio);
  return Math.max(0, Math.min(MESES_MAXIMOS_REPASSE, MESES_MAXIMOS_REPASSE - mesesDecorridos));
}

export function calcularRepasse(
  vaaf: number,
  fator: number,
  alunos: number,
  meses: number,
): { valorAnual: number; repasse: number } {
  const valorAnual = vaaf * fator * alunos;
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

/** As 8 combinações usadas no programa Novos Estabelecimentos. */
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
