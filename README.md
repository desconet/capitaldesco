# FNDE Repasse Calc

Crie uma aplicação web responsiva em React (usando Tailwind CSS e shadcn/ui) que funcione como uma "Calculadora de Repasse FNDE - Novas Turmas e Novos Estabelecimentos". O design deve ser limpo, moderno e focado na usabilidade de servidores públicos.

A aplicação deve ser dividida em três seções principais:

1. CONFIGURAÇÕES GERAIS (Inputs):

- Input numérico: "VAAF Base do FUNDEB (R$)" (Valor padrão: 5962.79).

- Select dropdown: "Mês de Inauguração" (Opções de Janeiro a Dezembro).

  * Lógica invisível: O mês selecionado determina os "Meses de Funcionamento" no ano (ex: Janeiro = 12, Fevereiro = 11, ..., Dezembro = 1).

2. ADIÇÃO DE MATRÍCULAS APROVADAS (Formulário Dinâmico):

Crie um formulário onde o usuário possa adicionar várias "linhas" de turmas. Cada linha deve ter:

- Select "Etapa de Ensino": Creche ou Pré-escola.

- Select "Turno": Integral ou Parcial.

- Select "Modalidade": Regular ou Educação Especial.

- Input numérico: "Quantidade de Alunos".

- Botão: "Remover" (para excluir a linha) e um botão "Adicionar Nova Turma" no final da lista.

3. LÓGICA DE CÁLCULO E TABELA DE RESULTADOS:

Abaixo do formulário, exiba um Dashboard (Cards) e uma Tabela de Resultados atualizados em tempo real.

Regras Matemáticas:

- Fatores de Ponderação padrão:

  * Creche + Integral = 1.40

  * Creche + Parcial = 1.20

  * Pré-escola + Integral = 1.30

  * Pré-escola + Parcial = 1.10

- Se "Modalidade" for "Educação Especial", o fator aplicável deve ser 1.20 (ou o fator da etapa/turno, se este for maior).

- Valor Anual da Turma = (VAAF Base * Fator de Ponderação) * Quantidade de Alunos.

- Valor Total do Repasse da Turma = (Valor Anual da Turma / 12) * Meses de Funcionamento.

Exibição dos Resultados:

- Card em destaque (Destaque visual): "Valor Total do Repasse Previsto (R$)" (Soma do repasse de todas as turmas adicionadas).

- Tabela detalhada listando cada turma adicionada, mostrando: Etapa, Turno, Fator Aplicado, Qtd Alunos, Valor Anual e o Repasse Proporcional (R$). Todos os valores monetários devem ser formatados em Reais (BRL).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://capitaldesco.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/79a39957-72d4-4c24-abaa-d8876d7385e7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
