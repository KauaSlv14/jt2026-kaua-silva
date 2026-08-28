# Relatório Final — Recomendação de Investimento Imobiliário em Itapema (SC)

**Hackathon Jovens Talentos AI Builder 2026 — Seazone**

---

## 1. Resumo executivo

A recomendação principal é investir em **apartamentos de 2 quartos no bairro de
Morretes**, que combinam o melhor retorno bruto entre as opções com amostra
minimamente robusta e um dos menores preços de aquisição do mercado.

A tese preliminar dos **compactos (studios/1 quarto) no Centro** foi testada e é
**parcialmente sustentada**: é uma opção forte e confiável (2ª entre as opções
válidas), mas **não é a mais eficiente em capital** — perde para o Morretes 2q.

> **Importante:** todos os retornos abaixo são **brutos** (receita estimada de
> diária / preço de compra) e **não consideram custos operacionais** (condomínio,
> IPTU, manutenção, taxas de plataforma, custos de gestão). Servem para comparar
> perfis entre si, mas o retorno líquido será menor.

---

## 2. Metodologia (resumida)

1. **Receita (Airbnb):** usamos o arquivo `Price_AV_Itapema.csv`, que contém
   apenas **preço de diária anunciado** — **não há dado de ocupação/reserva**.
   Para não misturar tarifas de momentos diferentes, usamos **um único snapshot
   de captura (2025-01-20)**, mais recente e completo, e exigimos **cobertura
   mínima de ≥50% da janela de 91 datas** por imóvel (514 imóveis válidos).
   A métrica principal é a **mediana da diária por perfil** (robusta a outliers).
2. **Ocupação:** como não há ocupação observada, estimamos a receita anual apenas
   como **análise de sensibilidade**, com **cenários explícitos de 40%, 50% e 60%**
   (`receita = diária × 365 × ocupação`).
3. **Custo (VivaReal):** não há chave direta entre os anúncios de venda e os do
   Airbnb. O pareamento foi feito **por características semelhantes**: bairro
   (normalizado), número de quartos e tipo (apartamento). O **preço típico usa a
   mediana** do `sale_price` por perfil (imune a outliers).
4. **Retorno (ROI bruto):** `receita anual estimada / preço de compra mediano`.
5. **Robustez:** o ranking final exige **amostra mínima de 15 imóveis no Airbnb**
   por perfil, para descartar perfis com estimativa de receita instável (ex. o
   Morretes 3q, que tinha ROI alto mas só 6 imóveis no Airbnb).

---

## 3. Respostas às perguntas do desafio

### Q1. Qual o melhor perfil de imóvel para investir?

**Apartamento de 2 quartos.**

- Entre as opções com amostra minimamente robusta, foi o perfil de **melhor
  retorno bruto** (ROI **11,9%** @ocupação 50%).
- Tem **amostra equilibrada nas duas bases**: 31 imóveis no Airbnb e 1.037
  anúncios de venda no VivaReal.
- Preço de aquisição mais baixo entre os perfis válidos (mediana de **R$790 mil**).

O Centro 1 quarto (compacto) também é uma boa opção (ROI 10,7% @50%), mas fica
em 2º.

### Q2. Qual a melhor localização em termos de receita?

Depende da métrica:

- **Receita bruta (diária mais alta):** **Meia Praia** lidera em diária mediana
  (R$635,57) e é o bairro com maior número de anúncios.
- **Eficiência de capital (melhor retorno por real investido):** **Morretes**,
  porque une diárias razoáveis (R$515/dia em imóveis de 2q) a preços de compra
  baixos (R$790 mil). É a melhor localização **para investimento**.

### Q3. Que características estão associadas às melhores receitas?

- **Mais quartos ⇒ diária maior.** A diária mediana cresce com o nº de quartos:
  ~R$476 (1q), R$518 (2q), R$708 (3q), R$1.346 (4q).
- **Tipo apartamento** domina o mercado de aluguel de curta duração (485 de 514
  imóveis válidos) e é o foco da comparação de investimento.
- **Mas receita alta ≠ melhor investimento:** bairros com diárias altas (Meia
  Praia, Centro) têm imóveis de compra caros, o que dilui o retorno. O que
  define a melhor receita **sobre o capital investido** é a combinação de
  diária razoável + preço de compra baixo.

### Q4. O que a Seazone compraria hoje e por quê? Estimativa de retorno.

**Comprar apartamentos de 2 quartos em Morretes.**

- **Por quê:** melhor ROI bruto entre os perfis com amostra robusta (11,9% @50%),
  menor preço de entrada entre os válidos (R$790 mil) e bom volume de mercado
  (1.037 à venda), facilitando a aquisição de múltiplas unidades.

**Estimativa simples de retorno (bruto, por unidade):**

| Cenário de ocupação | Receita anual est. | ROI bruto anual |
|---|---|---|
| 40% | ~R$75.200 | 9,5% |
| **50%** | **~R$94.000** | **11,9%** |
| 60% | ~R$112.900 | 14,3% |

*(Receita = R$515,28 de diária mediana × 365 dias × ocupação. Preço de compra =
R$790.000 mediano.)*

---

## 4. Avaliação da tese dos compactos no Centro

Hipótese testada (sem assumir que era correta): studios ou imóveis de 1 quarto
no Centro seriam a opção mais eficiente.

**Resultado: parcialmente sustentada.**

- **A favor:** Centro 1 quarto é a 2ª opção em ROI (10,7% @50%), com a **maior
  amostra entre os compactos** (65 imóveis no Airbnb) e diária mediana de
  R$524,14 — boa e confiável.
- **Contra:** não foi a mais eficiente em capital. Perde para o **Morretes 2q**
  (11,9%); tem **poucos apartamentos de 1 quarto à venda no Centro** (22 na
  amostra), o que limita a capacidade de comprar várias unidades.

> **Nota de dados:** no VivaReal, imóveis com `0 quartos` são todos comerciais,
> terrenos ou "outros" — **nenhum studio residencial** — e no Airbnb os registros
> de 0 quartos são heterogêneos (casas, suítes, hostels). Por isso o perfil
> "compacto" foi tratado como **apartamento de 1 quarto**, e não como studio.

---

## 5. Considerações finais

- O ROI é **bruto** e não inclui custos operacionais, condomínio, IPTU,
  manutenção nem taxas de plataforma. O retorno líquido será menor; os números
  servem para **comparar relativa** entre perfis.
- A receita é **estimada** a partir de preço de diária anunciado (não há
  ocupação observada na base). É uma estimativa de **potencial** de receita.
- A comparação entre Airbnb e VivaReal é uma **aproximação por perfil similar**
  (bairro + quartos + tipo), pois não compartilham chave.
- A recomendação combina o **melhor retorno** com **robustez de amostra** e
  **preço de entrada baixo**.

---

## 6. Arquivos gerados

| Arquivo | Conteúdo |
|---|---|
| `analysis/output/price_consolidated.csv` | Diária média por imóvel (snapshot 2025-01-20) |
| `analysis/output/perfil_bairro_resumo.csv` | Bairros/perfis: n, média, mediana, p25, p75 |
| `analysis/output/comparacao_compactos_centro.csv` | Compactos no Centro vs outros perfis |
| `analysis/output/vivareal_roi.csv` | Custo de compra + ROI por perfil |
| `analysis/output/ranking_roi.csv` | Ranking final com amostra mínima |
