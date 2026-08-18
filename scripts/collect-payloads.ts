import * as fs from "fs";
import * as path from "path";

const CAMARA_API_BASE = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO_API_BASE = "https://legis.senado.leg.br/dadosabertos";

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "LegisVisao/1.0 (https://legisvisao.com.br; luis@zancanela.dev.br)",
};

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error(`Erro ao buscar ${url}:`, err);
    return null;
  }
}

async function main() {
  console.log("-> Coletando payloads das fontes oficiais...");

  // 1. Legislatura Atual (Câmara)
  const legData = await fetchJson(`${CAMARA_API_BASE}/legislaturas?ordem=DESC&ordenarPor=id&itens=1`);

  // 2. Partidos (Câmara)
  const partyData = await fetchJson(`${CAMARA_API_BASE}/partidos?itens=2&ordem=ASC&ordenarPor=sigla`);

  // 3. Deputados Lista (Câmara)
  const depListData = await fetchJson(`${CAMARA_API_BASE}/deputados?itens=1&ordem=ASC&ordenarPor=nome`);
  const depId = depListData?.dados?.[0]?.id || 204379;

  // 4. Deputado Detalhe (Câmara)
  const depDetailData = await fetchJson(`${CAMARA_API_BASE}/deputados/${depId}`);

  // 5. Proposições Lista (Câmara)
  const propListData = await fetchJson(`${CAMARA_API_BASE}/proposicoes?siglaTipo=PL&ano=2023&itens=1&ordem=ASC&ordenarPor=id`);
  const propId = propListData?.dados?.[0]?.id || 2354516;

  // 6. Proposição Detalhe (Câmara)
  const propDetailData = await fetchJson(`${CAMARA_API_BASE}/proposicoes/${propId}`);

  // 7. Votações da Proposição (Câmara) - buscar uma que tenha votações (ex: PL 2630/2020 ou PLP 68/2024)
  const propComVotoData = await fetchJson(`${CAMARA_API_BASE}/proposicoes?siglaTipo=PLP&ano=2024&numero=68&itens=1`);
  const propComVotoId = propComVotoData?.dados?.[0]?.id || 2419409;
  const votacoesData = await fetchJson(`${CAMARA_API_BASE}/proposicoes/${propComVotoId}/votacoes`);
  const votacaoId = votacoesData?.dados?.[0]?.id || "2419409-1";

  // 8. Votos Nominais da Votação (Câmara)
  const votosNominaisData = votacaoId ? await fetchJson(`${CAMARA_API_BASE}/votacoes/${votacaoId}/votos`) : null;

  // 9. Senadores Lista e Mandato (Senado)
  const senListData = await fetchJson(`${SENADO_API_BASE}/senador/lista/atual`);
  const primeiroSenador = senListData?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar?.[0] || null;

  // Montar Markdown
  let md = `# Payloads das Fontes Oficiais de Dados Abertos

Documentação dos contratos, schemas e exemplos de retorno reais das APIs da **Câmara dos Deputados** e do **Senado Federal**.

---

## 1. Câmara dos Deputados

### 1.1 Legislatura Atual
**Endpoint**: \`GET ${CAMARA_API_BASE}/legislaturas?ordem=DESC&ordenarPor=id&itens=1\`
\`\`\`json
${JSON.stringify(legData, null, 2)}
\`\`\`

### 1.2 Partidos Políticos
**Endpoint**: \`GET ${CAMARA_API_BASE}/partidos?itens=2&ordem=ASC&ordenarPor=sigla\`
\`\`\`json
${JSON.stringify(partyData, null, 2)}
\`\`\`

### 1.3 Deputados (Listagem)
**Endpoint**: \`GET ${CAMARA_API_BASE}/deputados?itens=1&ordem=ASC&ordenarPor=nome\`
\`\`\`json
${JSON.stringify(depListData, null, 2)}
\`\`\`

### 1.4 Deputado (Detalhes e Status Atual)
**Endpoint**: \`GET ${CAMARA_API_BASE}/deputados/{id}\`
\`\`\`json
${JSON.stringify(depDetailData, null, 2)}
\`\`\`

### 1.5 Proposição (Detalhes)
**Endpoint**: \`GET ${CAMARA_API_BASE}/proposicoes/{id}\`
\`\`\`json
${JSON.stringify(propDetailData, null, 2)}
\`\`\`

### 1.6 Votações de uma Proposição
**Endpoint**: \`GET ${CAMARA_API_BASE}/proposicoes/{id}/votacoes\`
\`\`\`json
${JSON.stringify(votacoesData, null, 2)}
\`\`\`

### 1.7 Votos Nominais de uma Votação
**Endpoint**: \`GET ${CAMARA_API_BASE}/votacoes/{id}/votos\`
\`\`\`json
${JSON.stringify(votosNominaisData, null, 2)}
\`\`\`

---

## 2. Senado Federal

### 2.1 Senadores em Exercício e Mandatos
**Endpoint**: \`GET ${SENADO_API_BASE}/senador/lista/atual\`
\`\`\`json
${JSON.stringify(primeiroSenador, null, 2)}
\`\`\`
`;

  const outputPath = path.resolve(process.cwd(), "plans", "payloads-fontes-oficiais.md");
  fs.writeFileSync(outputPath, md, "utf-8");
  console.log(`-> Payloads salvos com sucesso em: ${outputPath}`);
}

main();
