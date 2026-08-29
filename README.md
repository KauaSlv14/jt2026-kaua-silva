https://drive.google.com/file/d/1gcXxdUqqNfnBP5hnvxyq421pf6pS_T5Q/view?usp=sharing
---

# Hackathon Jovens Talentos AI Builder 2026 — Seazone

**Recomendação de investimento imobiliário em Itapema (SC)** — análise construída
com IA (OpenCode) sobre os dados de Airbnb + VivaReal deste repositório.

---

## 🎯 Recomendação em resumo

**Invista em apartamentos de 2 quartos no bairro de Morretes.**

Foi o perfil com o **melhor retorno bruto** entre as opções com amostra
minimamente robusta, combinado com o **menor preço de aquisição** entre os
perfis válidos:

- **Preço mediano de compra:** R$ 790 mil
- **Diária mediana do Airbnb:** R$ 515,28
- **Retorno bruto anual (receita ÷ preço):** 9,5% (oc. 40%) · **11,9% (oc. 50%)** · 14,3% (oc. 60%)
- **Amostra:** 31 imóveis no Airbnb e 1.037 anúncios de venda (VivaReal)

> **Retorno bruto (comparação inicial):** não considera custos operacionais
> (condomínio, IPTU, manutenção, taxa de plataforma). Serve para uma **primeira
> comparação** entre perfis — custos operacionais podem reduzir o retorno
> líquido e até alterar a ordem entre os perfis.

---

## 🧪 E a tese dos compactos no Centro?

**Parcialmente sustentada.**

A hipótese interna de que studios/1 quarto no Centro seriam a opção mais
eficiente foi testada sem ser assumida como correta. Conclusão:

- **A favor:** o apartamento de **1 quarto no Centro** é uma ótima opção —
  **2º melhor ROI** entre os perfis válidos (**10,7%** @ oc. 50%), com a **maior
  amostra de compactos** (65 imóveis no Airbnb) e diária mediana de R$ 524,14.
- **Contra:** **não foi a mais eficiente em capital** — perde para o Morretes
  2 quartos (11,9%) e tem poucos imóveis de 1 quarto à venda no Centro (22).

Por isso a recomendação principal é **Morretes 2 quartos**, e não os compactos
do Centro.

> **Nota de dados:** os registros de "0 quartos" **não representaram studios
> residenciais de forma confiável** (no VivaReal são comerciais/terrenos/outros;
> no Airbnb são heterogêneos). Por isso, o perfil compacto foi tratado como
> **apartamento de 1 quarto**, e não como studio.

---

## 📊 Números que sustentam a decisão

Ranking final por retorno bruto (apenas **apartamentos**, amostra mínima de 15
imóveis no Airbnb, ordenado por ROI @ ocupação 50%):

| Perfil | n Airbnb | n VivaReal | Diária mediana | Preço mediano | ROI 40% | **ROI 50%** | ROI 60% |
|---|---|---|---|---|---|---|---|
| **Morretes 2 quartos** | 31 | 1.037 | R$ 515,28 | R$ 790 mil | 9,5% | **11,9%** | 14,3% |
| **Centro 1 quarto (compacto)** | 65 | 22 | R$ 524,14 | R$ 890 mil | 8,6% | **10,7%** | 12,9% |
| Centro 2 quartos | 44 | 89 | R$ 667,36 | R$ 1,15 M | 8,5% | 10,6% | 12,7% |
| Meia Praia 2 quartos | 74 | 243 | R$ 491,97 | R$ 1,08 M | 6,7% | 8,3% | 10,0% |
| Meia Praia 3 quartos | 173 | 1.697 | R$ 706,51 | R$ 1,88 M | 5,5% | 6,8% | 8,2% |
| Centro 3 quartos | 24 | 437 | R$ 735,07 | R$ 2,10 M | 5,1% | 6,4% | 7,7% |

*(Perfis com amostra pequena no Airbnb — Morretes 1q/3q, Meia Praia 1q — foram
excluídos por amostra inferior ao mínimo definido.)*

Taxa de pareamento: **511 de 514** imóveis de receita (99,4%) foram relacionados
com localização e características no join.

---

## 📄 Onde está a análise completa

- **[`relatorio.md`](relatorio.md)** — recomendação final, respondendo às 4
  perguntas do desafio, metodologia, limitações e avaliação da tese dos compactos.

---

## 🚀 Como rodar os scripts

Pré-requisito: **Node.js ≥ 18** (sem dependências externas — parser CSV próprio).

```bash
npm run consolidate   # consolida os preços de diária (snapshot 2025-01-20)
npm run validate      # valida parser e outputs
npm run perfil        # perfis e bairros (diária/receita)
npm run compactos     # comparação dos compactos no Centro
npm run vivareal      # custo de aquisição (VivaReal) e ROI por perfil
npm run ranking       # ranking final com amostra mínima
```

> **Windows PowerShell:** caso `npm` seja bloqueado pela política de execução
> do `npm.ps1`, use `npm.cmd run <comando>` ou execute os comandos pelo CMD/Git Bash.

Os outputs são gravados em `analysis/output/`. O pipeline é **reprodutível**:
rodar os scripts na ordem acima regenera os mesmos resultados.

---

## 🗂️ Estrutura do projeto

```
.
├── relatorio.md                 # Recomendação final + metodologia
├── README.md                    # Este arquivo
├── analysis/
│   ├── README.md                # Documentação técnica detalhada
│   ├── lib/
│   │   ├── csv.js               # Parser CSV robusto (RFC 4180)
│   │   └── table.js             # Formatação da saída no terminal
│   ├── consolidate.js           # Consolidação do Price_AV (snapshot 2025-01-20)
│   ├── profile_analysis.js      # Bairros e perfis por diária
│   ├── compact_centro.js        # Compactos no Centro vs outros perfis
│   ├── vivareal_analysis.js     # Custo de aquisição (VivaReal)
│   ├── ranking_roi.js           # Ranking final (apartamentos, amostra mínima)
│   ├── validate.js              # Validações automáticas
│   └── output/                  # Resultados processados (CSV/JSON)
├── ai-log/
│   └── opencode-session-completa.json   # Sessão completa exportada do OpenCode
└── data/                        # Base de dados original (Airbnb + VivaReal)
```

---

## ⚠️ Principais limitações da análise

1. **Sem dados de ocupação:** o `Price_AV` tem apenas o **preço de diária
   anunciado**. A receita é uma **estimativa de potencial** — a receita anual é
   apresentada como análise de sensibilidade com cenários explícitos de
   ocupação (40%/50%/60%), e **não** um valor observado.
2. **ROI bruto (comparação inicial):** não inclui custos operacionais
   (condomínio, IPTU, manutenção, taxas de plataforma). Serve como **primeira
   comparação** entre perfis, mas esses custos podem **reduzir o retorno líquido
   e até alterar a ordem entre os perfis**.
3. **Pareamento Airbnb × VivaReal por perfil:** não há chave direta entre os
   anúncios. O custo de compra e a receita foram pareados por **características
   semelhantes** (bairro, nº de quartos, tipo) — é uma **aproximação** por perfil
   representativo, não pelos mesmos imóveis físicos.
4. **Amostras pequenas:** alguns perfis (ex. Morretes 1q/3q, Meia Praia 1q) têm
   poucos imóveis no Airbnb e foram **excluídos** do ranking final por amostra
   inferior ao mínimo definido.
5. **Janela de preços curta:** a análise principal usa um único snapshot de
   captura (**20/01/2025**), com **91 datas de estadia** cobertas até
   **20/04/2025** (cerca de 3 meses de tarifas futuras).
6. **Registros de "0 quartos" não representam studios residenciais de forma
   confiável:** no VivaReal todos os registros com 0 quartos são comerciais,
   terrenos ou "outros"; no Airbnb são heterogêneos (casas, suítes, hostels).
   Por isso o perfil **compacto foi tratado como apartamento de 1 quarto**,
   e não como studio.

---

## ℹ️ Sobre o desafio

O desafio completo está em
**[jovens-talentos-2026-hackathon-data](https://seazone-tech.github.io/jovens-talentos-2026-hackathon-data/)**
(também disponível em [`index.html`](index.html)).

---

*Hackathon Jovens Talentos AI Builder 2026 — Seazone · Análise de investimento em Itapema (SC)*
