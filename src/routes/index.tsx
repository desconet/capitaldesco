import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Building2, Calculator, CheckCircle2, FileDown, Info, Loader2, Plus, RefreshCw, School, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ANO_REFERENCIA,
  brl,
  calcularFator,
  calcularRepasse,
  COMBINACOES,
  type Etapa,
  fatorFmt,
  MESES,
  mesesDeFuncionamento,
  type Modalidade,
  numeroFmt,
  type Turno,
  VAAF_NACIONAL_2026,
} from "@/lib/fnde";
import { buscarMunicipios, buscarUfs, type Municipio, type Uf } from "@/lib/ibge";
import { obterParametrosFundeb } from "@/lib/vaaf.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calculadora de Repasse FNDE — Turmas e Estabelecimentos" },
      { name: "description", content: "Simule repasses do Fundeb para novas turmas e novos estabelecimentos, com VAAF oficial e relatório PDF." },
      { property: "og:title", content: "Calculadora de Repasse FNDE — Turmas e Estabelecimentos" },
      { property: "og:description", content: "Calculadora do Fundeb com municípios do Brasil, valores oficiais e relatório detalhado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Modo = "turmas" | "estabelecimentos";
interface Turma { id: number; etapa: Etapa; turno: Turno; modalidade: Modalidade; alunos: number }
type Quantidades = Record<string, number>;

const campo = "w-full rounded-md border border-ink/10 bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
const quantidadesIniciais = Object.fromEntries(COMBINACOES.map((c) => [c.chave, 0]));

function Index() {
  const [modo, setModo] = useState<Modo>("turmas");
  const [ufs, setUfs] = useState<Uf[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [uf, setUf] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [carregandoLocalidades, setCarregandoLocalidades] = useState(true);
  const [vaaf, setVaaf] = useState(VAAF_NACIONAL_2026);
  const [fonteVaaf, setFonteVaaf] = useState("Valor oficial 2026 embutido");
  const [carregandoVaaf, setCarregandoVaaf] = useState(false);
  const [mesIndex, setMesIndex] = useState(2);
  const [diaInicio, setDiaInicio] = useState("01");
  const [turmas, setTurmas] = useState<Turma[]>([
    { id: 1, etapa: "Creche", turno: "Integral", modalidade: "Regular", alunos: 24 },
  ]);
  const [nextId, setNextId] = useState(2);
  const [quantidades, setQuantidades] = useState<Quantidades>(quantidadesIniciais);
  const [exportando, setExportando] = useState(false);
  const obterParametros = useServerFn(obterParametrosFundeb);

  useEffect(() => {
    buscarUfs().then(setUfs).catch(() => setUfs([])).finally(() => setCarregandoLocalidades(false));
  }, []);

  useEffect(() => {
    if (!uf) { setMunicipios([]); setMunicipioId(""); return; }
    setCarregandoLocalidades(true);
    buscarMunicipios(uf).then(setMunicipios).catch(() => setMunicipios([])).finally(() => setCarregandoLocalidades(false));
  }, [uf]);

  async function atualizarVaaf() {
    if (!municipioId) return;
    setCarregandoVaaf(true);
    try {
      const r = await obterParametros({ data: { ano: ANO_REFERENCIA } });
      setVaaf(r.vaaf);
      setFonteVaaf(r.origem === "portal" ? `${r.fonte} · consulta atualizada` : r.fonte);
    } catch {
      setVaaf(VAAF_NACIONAL_2026);
      setFonteVaaf("Valor oficial 2026 embutido · portal indisponível");
    } finally { setCarregandoVaaf(false); }
  }

  useEffect(() => { if (municipioId) void atualizarVaaf(); }, [municipioId, mesIndex]);

  const meses = mesesDeFuncionamento(mesIndex);
  const municipio = municipios.find((m) => String(m.id) === municipioId)?.nome ?? "Não selecionado";
  const resultadosTurmas = useMemo(() => turmas.map((t) => {
    const fator = calcularFator(t.etapa, t.turno, t.modalidade);
    return { ...t, fator, ...calcularRepasse(vaaf, fator, t.alunos, meses) };
  }), [turmas, vaaf, meses]);
  const resultadosEstabelecimento = useMemo(() => COMBINACOES.map((c) => {
    const fator = calcularFator(c.etapa, c.turno, c.modalidade);
    const alunos = quantidades[c.chave] ?? 0;
    return { ...c, fator, alunos, ...calcularRepasse(vaaf, fator, alunos, meses) };
  }), [quantidades, vaaf, meses]);
  const resultados = modo === "turmas" ? resultadosTurmas : resultadosEstabelecimento.filter((r) => r.alunos > 0);
  const totalAlunos = resultados.reduce((s, r) => s + r.alunos, 0);
  const totalAnual = resultados.reduce((s, r) => s + r.valorAnual, 0);
  const totalRepasse = resultados.reduce((s, r) => s + r.repasse, 0);

  function atualizarTurma(id: number, chave: keyof Turma, valor: string) {
    setTurmas((lista) => lista.map((t) => t.id === id ? { ...t, [chave]: chave === "alunos" ? Number(valor) || 0 : valor } : t));
  }

  async function exportarPdf() {
    setExportando(true);
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableModule.default;
      const doc = new jsPDF();
      doc.setFillColor(28, 75, 145); doc.rect(0, 0, 210, 34, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text("Relatorio de Simulacao FNDE", 14, 16);
      doc.setFontSize(10); doc.text(modo === "turmas" ? "Novas Turmas" : "Novos Estabelecimentos", 14, 25);
      doc.setTextColor(25, 34, 53); doc.setFontSize(11);
      doc.text(`Municipio: ${municipio} / ${uf || "--"}`, 14, 45);
      doc.text(`Inicio de funcionamento: ${diaInicio}/${String(mesIndex + 1).padStart(2, "0")}/${ANO_REFERENCIA}`, 14, 52);
      doc.text(`Meses no exercicio: ${meses}`, 14, 59);
      doc.text(`VAAF base: ${brl(vaaf)}`, 110, 45);
      doc.text(`Fonte: ${fonteVaaf}`, 110, 52, { maxWidth: 86 });
      const linhas = resultados.map((r) => [
        "rotulo" in r ? r.rotulo : `${r.etapa} / ${r.turno}`,
        r.modalidade === "Educação Especial" ? "Especial" : "Regular",
        fatorFmt(r.fator), String(r.alunos), brl(r.valorAnual), brl(r.repasse),
      ]);
      autoTable(doc, {
        startY: 70,
        head: [["Etapa / Turno", "Modalidade", "Fator", "Alunos", "Valor anual", "Repasse"]],
        body: linhas,
        foot: [["TOTAL", "", "", String(totalAlunos), brl(totalAnual), brl(totalRepasse)]],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [28, 75, 145] }, footStyles: { fillColor: [230, 238, 249], textColor: [25, 34, 53], fontStyle: "bold" },
      });
      const finalY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
      doc.setFontSize(9); doc.setTextColor(90, 99, 116);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · Valores estimativos sujeitos a validacao pelo FNDE.`, 14, finalY + 12);
      doc.save(`simulacao-fnde-${municipio.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
    } finally { setExportando(false); }
  }

  return (
    <main className="bg-civic-mesh min-h-screen text-ink">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-7 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-brand font-display font-bold text-primary-foreground shadow-sm">FDE</div>
            <div><h1 className="font-display text-lg font-bold">Calculadora de Repasse FNDE</h1><p className="text-xs text-ink/55">Novas Turmas e Novos Estabelecimentos</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-special/25 bg-background/80 px-3 py-2 text-xs font-semibold text-special sm:inline">FUNDEB · {ANO_REFERENCIA}</span>
            <Button onClick={exportarPdf} disabled={exportando || resultados.length === 0} className="bg-brand text-primary-foreground hover:bg-brand-deep">
              {exportando ? <Loader2 className="animate-spin" /> : <FileDown />} Exportar PDF
            </Button>
          </div>
        </header>

        <nav className="mt-7 grid max-w-xl grid-cols-2 rounded-lg border border-ink/10 bg-background/75 p-1 shadow-sm" aria-label="Tipo de cálculo">
          <Button variant="ghost" onClick={() => setModo("turmas")} className={modo === "turmas" ? "bg-brand text-primary-foreground hover:bg-brand hover:text-primary-foreground" : "text-ink/60"}><School /> Novas Turmas</Button>
          <Button variant="ghost" onClick={() => setModo("estabelecimentos")} className={modo === "estabelecimentos" ? "bg-brand text-primary-foreground hover:bg-brand hover:text-primary-foreground" : "text-ink/60"}><Building2 /> Novos Estabelecimentos</Button>
        </nav>

        <section className="mt-5 border-y border-ink/8 bg-background/75 px-4 py-5 shadow-sm sm:px-6">
          <div className="mb-4 flex items-center gap-2"><span className="grid size-6 place-items-center rounded-md bg-brand/10 text-xs font-bold text-brand">1</span><h2 className="font-display text-sm font-bold uppercase">Localidade e início do funcionamento</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Estado (UF)"><select className={campo} value={uf} onChange={(e) => setUf(e.target.value)}><option value="">Selecione</option>{ufs.map((u) => <option key={u.id} value={u.sigla}>{u.nome}</option>)}</select></Field>
            <Field label="Município"><select className={campo} value={municipioId} onChange={(e) => setMunicipioId(e.target.value)} disabled={!uf || carregandoLocalidades}><option value="">{carregandoLocalidades && uf ? "Carregando..." : "Selecione"}</option>{municipios.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></Field>
            <Field label="Mês de início"><select className={campo} value={mesIndex} onChange={(e) => setMesIndex(Number(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></Field>
            <Field label="Dia de início"><input className={campo} type="number" min="1" max="31" value={diaInicio} onChange={(e) => setDiaInicio(e.target.value)} /></Field>
            <Field label="Meses computados"><div className="flex h-[42px] items-center rounded-md bg-brand/8 px-3 font-display font-bold text-brand-deep">{meses} {meses === 1 ? "mês" : "meses"}</div></Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink/8 pt-4">
            <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-special" /><span className="text-xs text-ink/60">VAAF base nacional {ANO_REFERENCIA}</span><strong className="font-display text-brand-deep">{brl(vaaf)}</strong></div>
            {carregandoVaaf && <Loader2 className="size-4 animate-spin text-brand" />}
            <span className="text-[11px] text-ink/45">{municipioId ? fonteVaaf : "Selecione município e mês para consultar automaticamente."}</span>
            <Button variant="ghost" size="icon" onClick={atualizarVaaf} disabled={!municipioId || carregandoVaaf} title="Atualizar valor oficial"><RefreshCw className="size-4" /></Button>
          </div>
          <p className="mt-2 flex gap-2 text-[11px] leading-relaxed text-ink/45"><Info className="mt-0.5 size-3.5 shrink-0" />O VAAF mínimo é definido nacionalmente e aplicado ao município selecionado. O app tenta atualizar pelo portal oficial e mantém o valor embutido se a fonte estiver indisponível.</p>
        </section>

        {modo === "turmas" ? (
          <section className="mt-5 bg-background p-5 shadow-sm ring-1 ring-ink/5 sm:p-6">
            <SectionTitle numero="2" titulo="Matrículas aprovadas"><Button size="sm" onClick={() => { setTurmas((v) => [...v, { id: nextId, etapa: "Creche", turno: "Integral", modalidade: "Regular", alunos: 0 }]); setNextId((v) => v + 1); }} className="bg-brand text-primary-foreground hover:bg-brand-deep"><Plus /> Nova turma</Button></SectionTitle>
            <div className="mt-5 space-y-3">{turmas.map((t, i) => <div key={t.id} className="grid gap-2 border-b border-ink/8 pb-3 sm:grid-cols-[1fr_1fr_1.4fr_.8fr_auto] sm:items-end">
              <Field label={i === 0 ? "Etapa" : undefined}><select className={campo} value={t.etapa} onChange={(e) => atualizarTurma(t.id, "etapa", e.target.value)}><option>Creche</option><option>Pré-escola</option></select></Field>
              <Field label={i === 0 ? "Turno" : undefined}><select className={campo} value={t.turno} onChange={(e) => atualizarTurma(t.id, "turno", e.target.value)}><option>Integral</option><option>Parcial</option></select></Field>
              <Field label={i === 0 ? "Modalidade" : undefined}><select className={campo} value={t.modalidade} onChange={(e) => atualizarTurma(t.id, "modalidade", e.target.value)}><option>Regular</option><option>Educação Especial</option></select></Field>
              <Field label={i === 0 ? "Alunos" : undefined}><input className={campo} type="number" min="0" value={t.alunos || ""} placeholder="0" onChange={(e) => atualizarTurma(t.id, "alunos", e.target.value)} /></Field>
              <Button variant="ghost" size="icon" onClick={() => setTurmas((v) => v.filter((x) => x.id !== t.id))} className="text-destructive" title="Remover turma"><Trash2 /></Button>
            </div>)}</div>
          </section>
        ) : (
          <section className="mt-5 bg-background p-5 shadow-sm ring-1 ring-ink/5 sm:p-6">
            <SectionTitle numero="2" titulo="Matrículas não beneficiárias do Fundeb" />
            <p className="mt-2 text-sm text-ink/55">Informe somente as matrículas ainda não computadas no Fundeb regular.</p>
            <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">{COMBINACOES.map((c) => <label key={c.chave} className="flex items-center justify-between gap-4 border-b border-ink/8 pb-3"><span className="text-sm font-medium">{c.rotulo}<small className="mt-0.5 block text-ink/45">Fator {fatorFmt(calcularFator(c.etapa, c.turno, c.modalidade))}</small></span><input className={`${campo} w-24 text-right font-semibold tabular-nums`} type="number" min="0" value={quantidades[c.chave] || ""} placeholder="0" onChange={(e) => setQuantidades((q) => ({ ...q, [c.chave]: Number(e.target.value) || 0 }))} /></label>)}</div>
          </section>
        )}

        <section className="mt-5 bg-gradient-to-r from-brand to-brand-deep p-5 text-primary-foreground shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase text-primary-foreground/70">Valor total do repasse previsto</p><p className="mt-2 font-display text-3xl font-bold tabular-nums sm:text-5xl">{brl(totalRepasse)}</p></div><div className="flex gap-6 text-right"><Stat label="Matrículas" valor={totalAlunos} /><Stat label="Meses" valor={meses} /><Stat label={modo === "turmas" ? "Turmas" : "Categorias"} valor={resultados.length} /></div></div>
        </section>

        <section className="mt-5 overflow-hidden bg-background shadow-sm ring-1 ring-ink/5">
          <div className="flex items-center gap-2 border-b border-ink/8 px-5 py-4"><span className="grid size-6 place-items-center rounded-md bg-brand/10 text-xs font-bold text-brand">3</span><h2 className="font-display text-sm font-bold uppercase">Resultado detalhado</h2><span className="ml-auto hidden text-[11px] text-ink/45 sm:inline">Atualizado em tempo real</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-ink/8 text-left text-[11px] uppercase text-ink/50"><th className="px-5 py-3">Etapa / turno</th><th className="px-4 py-3">Modalidade</th><th className="px-4 py-3">Fator</th><th className="px-4 py-3 text-right">Alunos</th><th className="px-4 py-3 text-right">Valor anual</th><th className="px-5 py-3 text-right">Repasse proporcional</th></tr></thead>
            <tbody className="divide-y divide-ink/5">{resultados.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-ink/45">Informe as matrículas para visualizar o cálculo.</td></tr> : resultados.map((r) => <tr key={"chave" in r ? r.chave : r.id}><td className="px-5 py-3.5 font-medium">{r.etapa} · {r.turno}</td><td className="px-4 py-3.5 text-ink/65">{r.modalidade}</td><td className="px-4 py-3.5"><span className={`rounded px-2 py-1 text-xs font-bold ${r.modalidade === "Educação Especial" ? "bg-special/12 text-special" : "bg-brand/10 text-brand"}`}>{fatorFmt(r.fator)}</span></td><td className="px-4 py-3.5 text-right font-semibold">{r.alunos}</td><td className="px-4 py-3.5 text-right tabular-nums">{brl(r.valorAnual)}</td><td className="px-5 py-3.5 text-right font-display font-bold tabular-nums">{brl(r.repasse)}</td></tr>)}</tbody>
            {resultados.length > 0 && <tfoot><tr className="border-t-2 border-ink/10 bg-canvas/50 font-bold"><td className="px-5 py-4" colSpan={3}>Total geral</td><td className="px-4 py-4 text-right">{totalAlunos}</td><td className="px-4 py-4 text-right tabular-nums">{brl(totalAnual)}</td><td className="px-5 py-4 text-right font-display text-brand-deep tabular-nums">{brl(totalRepasse)}</td></tr></tfoot>}</table></div>
        </section>
        <footer className="py-6 text-center text-[11px] text-ink/40">Estimativa para apoio ao planejamento. Confirme os dados e a habilitação junto ao FNDE antes do envio oficial.</footer>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string | undefined; children: React.ReactNode }) { return <label className="block">{label && <span className="mb-1.5 block text-xs font-semibold text-ink/65">{label}</span>}{children}</label>; }
function SectionTitle({ numero, titulo, children }: { numero: string; titulo: string; children?: React.ReactNode }) { return <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-md bg-brand/10 text-xs font-bold text-brand">{numero}</span><h2 className="font-display text-sm font-bold uppercase">{titulo}</h2></div>{children}</div>; }
function Stat({ label, valor }: { label: string; valor: number }) { return <div><p className="text-[11px] text-primary-foreground/60">{label}</p><p className="font-display text-lg font-bold">{numeroFmt(valor).replace(",00", "")}</p></div>; }
