# Análise — Mercado Imobiliário de Itapema (SC)

Esta pasta contém os scripts e outputs da análise de investimento imobiliário
para o Hackathon Jovens Talentos AI Builder 2026 (Seazone).

## Como rodar

O projeto usa **Node.js** (>= 18). Não há dependências externas: o parser CSV
está em `analysis/lib/csv.js` (RFC 4180, respeitando aspas, delimitadores e
quebras de linha internas).

```bash
npm run consolidate   # consolida os preços de diária (Price_AV)
npm run validate      # valida parser e outputs
npm run perfil        # perfis e bairros (receita / diária)
npm run compactos     # comparação dos compactos no Centro
npm run vivareal      # custo de aquisição (VivaReal) e ROI bruto por perfil
npm run ranking       # ranking final com corte mínimo de amostra
```

## Estrutura

```
analysis/
  lib/csv.js          Parser CSV robusto e helpers de escrita
  consolidate.js      Consolida o Price_AV no snapshot 2025-01-20
  validate.js         Valida parser + outputs
  output/
    price_consolidated.csv      Um registro por imóvel (métrica principal + cenários)
    consolidation_report.json   Reporte de cobertura e do processo
```

## Consolidação do Price_AV (preços de diária Airbnb)

O arquivo `Price_AV_Itapema.csv` contém preços de diária **anunciados** por
`airbnb_listing_id`, `date` (data de estadia) e `aquisition_date` (momento do
scrape). Há **3 snapshots de captura**: 2025-01-06, 2025-01-07 e 2025-01-20.
Não há dados observados de ocupação/reserva.

Para evitar viés de cobertura e mistura de tarifas de momentos diferentes, a
consolidação usa **apenas o snapshot 2025-01-20** (mais recente e completo) e
mede, por imóvel, o **preço médio da diária** sobre as datas de estadia
cobertas.

### Cobertura mínima (validada no processo)

Cada imóvel precisa cobrir **>= 50%** da janela de 91 datas de estadia do
snapshot (>= 46 datas) para entrar na métrica. Resultado: **780 listings** no
snapshot, **514** atendem à cobertura mínima; 266 ficam de fora por cobertura
insuficiente (as médias de imóveis com pouquíssimas datas seriam instáveis).

### Métricas de receita

Em razão da ausência de ocupação observada na base, separamos duas métricas:

1. **Métrica principal** — `avg_daily_price` (preço médio da diária): depende
   apenas dos dados disponíveis e serve para comparar potencial de diária entre
   perfis e bairros (sem supor qualquer taxa de ocupação).
2. **Sensibilidade anual** — `annual_revenue_occ_40/50/60`:
   `avg_daily_price × 365 × ocupação`, apenas para análise de sensibilidade com
   cenários explícitos de ocupação (40%, 50%, 60%). Esses valores dependem de
   assunção e **não** vêm da base.

### Chaves

- `Price_AV.airbnb_listing_id` ↔ `Details.airbnb_listing_id` ↔ `Mesh_Ids.airbnb_listing_id`
- `Price_AV` + `Mesh_Ids` fornecem a localização (bairro) de cada preço.

## Custo de aquisição (VivaReal) e retorno por perfil — `vivareal_analysis.js`

Os anúncios de venda do VivaReal não têm chave direta com os anúncios do Airbnb.
O pareamento é feito **por características semelhantes**: bairro (normalizado),
número de quartos e tipo de imóvel (apartamento).

Particularidades tratadas:
- **`bedrooms=0` no VivaReal NÃO é apartamento/studio** — verificado nos dados:
  todos os registros com 0 quartos são `comercial`, `terreno` ou `outros`. Logo,
  o perfil "compacto" residencial é o **apartamento de 1 quarto**.
- **Bairros normalizados** (case/acentos): ex. `CENTRO`→`Centro`, `Meia praia`→`Meia Praia`,
  `Tabuleiro`→`Tabuleiro dos Oliveiras`, etc.
- **Métrica robusta de preço típico**: a **mediana** do `sale_price` por perfil
  (imune a outliers como anúncios de R$44M). Reporta também p25/p75 e mediana de R$/m².
- **Deduplicação** por `listing_id` (36 repetidos no arquivo).

Receita por perfil usa a **mediana** do `avg_daily_price` do Airbnb (robusta).
O **ROI bruto anual** = receita anual estimada / preço de compra mediano, nos
cenários de ocupação 40/50/60%.

Saída: `analysis/output/vivareal_roi.csv`
