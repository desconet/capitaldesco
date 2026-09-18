import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calculadora de Repasse FNDE — Novas Turmas e Estabelecimentos" },
      {
        name: "description",
        content:
          "Calcule o repasse do FUNDEB para novas turmas e estabelecimentos: fatores de ponderação, valor anual e repasse proporcional em tempo real.",
      },
      {
        property: "og:title",
        content: "Calculadora de Repasse FNDE — Novas Turmas e Estabelecimentos",
      },
      {
        property: "og:description",
        content:
          "Calcule o repasse do FUNDEB para novas turmas e estabelecimentos em tempo real.",
      },
    ],
  }),
  component: Index,
});

type Etapa = "Creche" | "Pré-escola";
type Turno = "Integral" | "Parcial";
type Modalidade = "Regular" | "Educação Especial";

interface Turma {
  id: number;
  etapa: Etapa;
  turno: Turno;
  modalidade: Modalidade;
  alunos: number;
}

const MESES = [
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

const VAAF_PADRAO = 5962.79;

// Fatores de ponderação por etapa + turno
const FATOR_BASE: Record<Etapa, Record<Turno, number>> = {
  Creche: { Integral: 1.4, Parcial: 1.2 },
  "Pré-escola": { Integral: 1.3, Parcial: 1.1 },
};

function calcularFator(etapa: Etapa, turno: Turno, modalidade: Modalidade): number {
  const base = FATOR_BASE[etapa][turno];
  if (modalidade === "Educação Especial") {
    return Math.max(1.2, base);
  }
  return base;
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fatorFmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Index() {
  const [vaaf, setVaaf] = useState<number>(VAAF_PADRAO);
  const [mesIndex, setMesIndex] = useState<number>(2); // Março (0-based)
  const [turmas, setTurmas] = useState<Turma[]>([
    { id: 1, etapa: "Creche", turno: "Integral", modalidade: "Regular", alunos: 24 },
    { id: 2, etapa: "Creche", turno: "Parcial", modalidade: "Regular", alunos: 18 },
    {
      id: 3,
      etapa: "Pré-escola",
      turno: "Parcial",
      modalidade: "Educação Especial",
      alunos: 31,
    },
  ]);
  const [nextId, setNextId] = useState<number>(4);

  const mesesFuncionamento = 12 - mesIndex; // Janeiro(0)=12, ..., Dezembro(11)=1

  const resultados = useMemo(() => {
    return turmas.map((t) => {
      const fator = calcularFator(t.etapa, t.turno, t.modalidade);
      const valorAnual = vaaf * fator * t.alunos;
      const repasse = (valorAnual / 12) * mesesFuncionamento;
      return { ...t, fator, valorAnual, repasse };
    });
  }, [turmas, vaaf, mesesFuncionamento]);

  const totalAlunos = turmas.reduce((s, t) => s + t.alunos, 0);
  const totalValorAnual = resultados.reduce((s, r) => s + r.valorAnual, 0);
  const totalRepasse = resultados.reduce((s, r) => s + r.repasse, 0);

  function adicionarTurma() {
    setTurmas((prev) => [
      ...prev,
      {
        id: nextId,
        etapa: "Creche",
        turno: "Integral",
        modalidade: "Regular",
        alunos: 0,
      },
    ]);
    setNextId((n) => n + 1);
  }

  function removerTurma(id: number) {
    setTurmas((prev) => prev.filter((t) => t.id !== id));
  }

  function atualizarTurma(id: number, campo: keyof Turma, valor: string) {
    setTurmas((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, [campo]: campo === "alunos" ? Number(valor) || 0 : valor }
          : t,
      ),
    );
  }

  function handleVAAF(valor: string) {
    const limpo = valor.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
    setVaaf(Number(limpo) || 0);
  }

  return (
    <div className="bg-civic-mesh relative min-h-screen font-sans text-ink">
      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="grid size-11 place-items-center rounded-xl bg-brand text-white shadow-sm font-display font-bold"
            >
              FDE
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-none tracking-tight">
                Repasse FNDE
              </p>
              <p className="mt-1 text-xs font-medium text-ink/55">
                Novas Turmas & Novos Estabelecimentos
              </p>
            </div>
          </div>
          <div className="rounded-full border border-brand/15 bg-white/85 px-4 py-2 text-xs font-semibold text-brand-deep shadow-sm">
            FUNDEB · Exercício 2026
          </div>
        </header>

        {/* Configurações + Turmas */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* 1. Configurações Gerais */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink/5 lg:col-span-5">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-md bg-brand/10 text-xs font-bold text-brand">
                1
              </span>
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
                Configurações Gerais
              </h2>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink/70">
                  VAAF Base do FUNDEB (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={vaaf.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  onChange={(e) => handleVAAF(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-ink/10 bg-canvas/60 px-3.5 py-2.5 font-display text-lg font-semibold tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <p className="mt-1 text-[11px] text-ink/45">
                  Valor anual por aluno, referência vigente.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink/70">
                  Mês de Inauguração
                </label>
                <select
                  value={mesIndex}
                  onChange={(e) => setMesIndex(Number(e.target.value))}
                  className="mt-1.5 w-full appearance-none rounded-lg border border-ink/10 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {MESES.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-ink/45">
                  {mesesFuncionamento} meses de funcionamento previstos no
                  exercício.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Matrículas Aprovadas */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink/5 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-brand/10 text-xs font-bold text-brand">
                  2
                </span>
                <h2 className="font-display text-sm font-bold uppercase tracking-wide">
                  Matrículas Aprovadas
                </h2>
              </div>
              <button
                onClick={adicionarTurma}
                className="rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-deep"
              >
                + Adicionar Nova Turma
              </button>
            </div>

            {turmas.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-ink/15 bg-canvas/40 px-4 py-8 text-center text-sm font-medium text-ink/45">
                Nenhuma turma adicionada. Clique em “Adicionar Nova Turma” para
                começar.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {turmas.map((t, idx) => {
                  const fator = calcularFator(t.etapa, t.turno, t.modalidade);
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl border border-ink/8 bg-canvas/40 p-3"
                    >
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.5fr_0.9fr]">
                        <select
                          value={t.etapa}
                          onChange={(e) =>
                            atualizarTurma(t.id, "etapa", e.target.value)
                          }
                          className="rounded-lg border border-ink/10 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-brand"
                        >
                          <option value="Creche">Creche</option>
                          <option value="Pré-escola">Pré-escola</option>
                        </select>
                        <select
                          value={t.turno}
                          onChange={(e) =>
                            atualizarTurma(t.id, "turno", e.target.value)
                          }
                          className="rounded-lg border border-ink/10 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-brand"
                        >
                          <option value="Integral">Integral</option>
                          <option value="Parcial">Parcial</option>
                        </select>
                        <select
                          value={t.modalidade}
                          onChange={(e) =>
                            atualizarTurma(t.id, "modalidade", e.target.value)
                          }
                          className="rounded-lg border border-ink/10 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-brand"
                        >
                          <option value="Regular">Regular</option>
                          <option value="Educação Especial">
                            Educação Especial
                          </option>
                        </select>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={t.alunos === 0 ? "" : t.alunos}
                          placeholder="0"
                          onChange={(e) =>
                            atualizarTurma(t.id, "alunos", e.target.value)
                          }
                          className="rounded-lg border border-ink/10 bg-white px-2.5 py-2 text-xs font-semibold tabular-nums outline-none focus:border-brand"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-ink/45">
                          Turma {idx + 1} · Fator {fatorFmt(fator)}
                          {t.modalidade === "Educação Especial" &&
                            " · Educação Especial"}
                        </span>
                        <button
                          onClick={() => removerTurma(t.id)}
                          className="text-[11px] font-semibold text-rose-600 transition hover:text-rose-700"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Card de total */}
        <section className="mt-5 rounded-2xl bg-gradient-to-br from-brand to-brand-deep p-6 text-white shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
                Valor Total do Repasse Previsto
              </p>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
                {brl(totalRepasse)}
              </p>
            </div>
            <div className="flex gap-5 text-right">
              <div>
                <p className="text-[11px] font-medium text-white/60">Alunos</p>
                <p className="font-display text-lg font-bold tabular-nums">
                  {totalAlunos}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/60">Turmas</p>
                <p className="font-display text-lg font-bold tabular-nums">
                  {turmas.length}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/60">Meses</p>
                <p className="font-display text-lg font-bold tabular-nums">
                  {mesesFuncionamento}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela de Resultados */}
        <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink/5">
          <div className="flex items-center gap-2 border-b border-ink/8 px-6 py-4">
            <span className="grid size-6 place-items-center rounded-md bg-brand/10 text-xs font-bold text-brand">
              3
            </span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">
              Tabela de Resultados
            </h2>
            <span className="ml-auto text-[11px] font-medium text-ink/45">
              Atualizado em tempo real
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink/8 text-left text-[11px] uppercase tracking-wide text-ink/50">
                  <th className="px-6 py-3 font-semibold">Etapa</th>
                  <th className="px-4 py-3 font-semibold">Turno</th>
                  <th className="px-4 py-3 font-semibold">Modalidade</th>
                  <th className="px-4 py-3 font-semibold">Fator</th>
                  <th className="px-4 py-3 text-right font-semibold">Alunos</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Valor Anual
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">
                    Repasse Proporcional
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {resultados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm font-medium text-ink/45"
                    >
                      Adicione turmas para visualizar o detalhamento.
                    </td>
                  </tr>
                ) : (
                  resultados.map((r) => (
                    <tr key={r.id} className="hover:bg-canvas/40">
                      <td className="px-6 py-3.5 font-medium">{r.etapa}</td>
                      <td className="px-4 py-3.5 text-ink/70">{r.turno}</td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {r.modalidade}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={
                            r.modalidade === "Educação Especial"
                              ? "rounded-md bg-special/15 px-2 py-0.5 text-xs font-bold text-special"
                              : "rounded-md bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand"
                          }
                        >
                          {fatorFmt(r.fator)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                        {r.alunos}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-ink/80">
                        {brl(r.valorAnual)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-display font-bold tabular-nums">
                        {brl(r.repasse)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {resultados.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-ink/10 bg-canvas/50">
                    <td
                      className="px-6 py-3.5 font-display font-bold"
                      colSpan={5}
                    >
                      Total Geral
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-ink/70">
                      {brl(totalValorAnual)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-display text-base font-bold tabular-nums text-brand-deep">
                      {brl(totalRepasse)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] text-ink/40">
          Fatores de ponderação: Creche/Integral 1,40 · Creche/Parcial 1,20 ·
          Pré-escola/Integral 1,30 · Pré-escola/Parcial 1,10. Educação Especial
          aplica 1,20 quando superior ao fator da etapa/turno.
        </p>
      </div>
    </div>
  );
}
