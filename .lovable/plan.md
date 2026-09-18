# Corrigir período e contagem de matrículas

## Alterações
- Adicionar a data de cadastro aos dois programas.
- Calcular os meses restantes como 18 menos os meses decorridos entre o início do atendimento e o cadastro.
- Validar datas ausentes, início posterior ao cadastro e situações sem meses restantes.
- Considerar os alunos especiais como parte do total regular, nunca como matrículas adicionais.
- Calcular a parcela regular apenas para alunos não especiais e aplicar o fator especial somente ao subconjunto informado.
- Aplicar a mesma regra às categorias equivalentes em Novos Estabelecimentos.
- Atualizar os totais, a tabela, os textos e o relatório PDF.
- Conferir os exemplos e os dois programas no navegador.

## Regra de cálculo
- Meses decorridos = diferença em meses entre a data de início e a data de cadastro.
- Meses de repasse = máximo de 0 e mínimo de 18 para `18 − meses decorridos`.
- Alunos regulares sem condição especial = total de alunos regulares − alunos especiais.
- Total de matrículas = total regular informado, sem somar novamente os especiais.
