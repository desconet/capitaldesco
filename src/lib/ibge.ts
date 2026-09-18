export interface Uf {
  id: number;
  sigla: string;
  nome: string;
}

export interface Municipio {
  id: number;
  nome: string;
}

const BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

export async function buscarUfs(): Promise<Uf[]> {
  const r = await fetch(`${BASE}/estados?orderBy=nome`);
  if (!r.ok) throw new Error("Não foi possível carregar os estados");
  return (await r.json()) as Uf[];
}

export async function buscarMunicipios(uf: string): Promise<Municipio[]> {
  const r = await fetch(`${BASE}/estados/${uf}/municipios?orderBy=nome`);
  if (!r.ok) throw new Error("Não foi possível carregar os municípios");
  const dados = (await r.json()) as Municipio[];
  return dados.map((m) => ({ id: m.id, nome: m.nome }));
}
