<div align="center">

# 🏛️ LegisVisão
### Plataforma Cívica de Transparência Legislativa e Análise de Afinidade

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-6E9F18?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[![Netlify Status](https://api.netlify.com/api/v1/badges/4168480c-025c-45cc-8217-f0f40fbed713/deploy-status)](https://app.netlify.com/projects/legisvisao/deploys)

<p align="center">
  <strong>Descubra quais Deputados Federais e Partidos votam como você.</strong><br>
  Uma aplicação <em>Local-First</em>, determinística, auditável e alimentada exclusivamente por dados públicos oficiais da Câmara dos Deputados.
</p>

[🌐 Acessar LegisVisão](https://legisvisao.com.br) • [🐛 Reportar Problema](https://github.com/didifive/legisvisao/issues) • [⭐ Repositório GitHub](https://github.com/didifive/legisvisao)

</div>

---

## 📖 Visão Geral

O **LegisVisão** é uma plataforma cívica de código aberto desenvolvida para aproximar a sociedade civil das deliberações do Poder Legislativo Brasileiro.

A aplicação permite que qualquer cidadão opine (**CONCORDO** ou **DISCORDO**) sobre propostas de lei reais (PL, PEC, PLP, MPV votadas no Plenário da Câmara dos Deputados) e compare seus posicionamentos de forma determinística com os votos nominais registrados pelos 513 Deputados Federais e as bancadas partidárias da 57ª Legislatura (2023–2027).

A ferramenta opera sob o modelo **Local-First (Privacidade Absoluta)**: nenhuma escolha, voto ou preferência do visitante é enviada para servidores ou gravada em bancos de dados remotos.

---

## 💡 Diferenciais do LegisVisão

1. **O ponto de partida é você:** Em vez de exigir que você pesquise números de leis ou nomes de políticos, você apenas responde como votaria nas principais propostas do país.
2. **Afinidade baseada em fatos reais:** Comparamos sua posição diretamente com o registro oficial do painel eletrônico da Câmara dos Deputados, revelando a atuação real de cada parlamentar sem depender de discursos de campanha ou redes sociais.
3. **Privacidade absoluta (Local-First):** Suas opiniões políticas ficam salvas exclusivamente no seu próprio navegador e nunca são enviadas para nenhum servidor ou banco de dados.

---

## 🎯 Princípios Fundamentais

1. **Fonte de Verdade Pública Oficial**: Os dados legislativos provêm diretamente da API de Dados Abertos da **Câmara dos Deputados** (`https://dadosabertos.camara.leg.br/api/v2`). O banco de dados PostgreSQL atua estritamente como um cache persistente e camada de indexação de alta velocidade.
2. **Cálculo Determinístico e Aberto**: O índice de afinidade é uma divisão aritmética transparente (`Concordâncias / Comparações Válidas × 100`). Não há pesos ocultos, algoritmos opacos ou inteligência artificial intermediando o resultado.
3. **Privacidade Local-First**: O armazenamento de respostas ocorre 100% no `localStorage` do dispositivo do visitante, com funcionalidade nativa de backup e restauração em arquivo `.json`.
4. **Neutralidade Cívica**: A plataforma não emite juízo de valor, não ranqueia representantes por mérito e não faz recomendação eleitoral. Ela apenas confronta posições expressas com votos nominais públicos.

---

## 🏗️ Arquitetura do Sistema (C4 Model)

### 1. Nível 1: Diagrama de Contexto (C1)

```mermaid
C4Context
    title Nível 1 (C1): Diagrama de Contexto do Sistema - LegisVisão

    Person(cidadao, "Cidadão / Eleitor", "Cidadão que deseja comparar suas opiniões com as votações dos Deputados Federais.")
    
    System(legisvisao, "LegisVisão", "Plataforma web Local-First para análise de afinidade cívica e transparência legislativa.")
    
    System_Ext(camara, "API da Câmara dos Deputados", "dadosabertos.camara.leg.br<br/>Fornece proposições, deputados e votações nominais.")

    Rel(cidadao, legisvisao, "Opina em propostas, consulta afinidade e perfis", "HTTPS / Web Browser")
    Rel(legisvisao, camara, "Ingere proposições, sessões e votos nominais", "HTTPS / REST JSON")
```

---

### 2. Nível 2: Diagrama de Contêineres (C2)

```mermaid
flowchart TB
    classDef person fill:#08427b,stroke:#073b6f,color:#ffffff;
    classDef ext fill:#999999,stroke:#666666,color:#ffffff;
    classDef container fill:#1168bd,stroke:#0b4884,color:#ffffff;
    classDef db fill:#1168bd,stroke:#0b4884,color:#ffffff;

    cidadao["👤 <b>Cidadão</b><br/><i>[Pessoa]</i><br/>Usuário no navegador web"]:::person

    subgraph ExtSystems ["🌐 Sistemas Externos (Dados Abertos e IA)"]
        camara["🏛️ <b>API da Câmara dos Deputados</b><br/><i>[Sistema Externo / REST]</i><br/>Proposições, sessões e votos nominais"]:::ext
        gemini["🤖 <b>Google AI Studio (Gemini)</b><br/><i>[Sistema Externo / GenAI]</i><br/>Gera resumos cívicos neutros (PDF e deliberações)"]:::ext
    end

    subgraph LegisBoundary ["🏛️ LegisVisão (Container Boundary)"]
        spa["💻 <b>Single-Page / Web App</b><br/><i>[Next.js 16 / React 19 / Tailwind]</i><br/>Interface Local-First responsiva onde o cálculo ocorre 100% no cliente"]:::container
        storage[("💾 <b>Armazenamento Local</b><br/><i>[localStorage]</i><br/>Armazena opiniões do cidadão de forma estritamente local e privada")]:::db
        bff["⚙️ <b>Backend / BFF & APIs</b><br/><i>[Next.js Route Handlers]</i><br/>Serve catálogo de proposições, deputados e histórico com cache em memória"]:::container
        db[("🗄️ <b>Banco de Dados Relacional</b><br/><i>[PostgreSQL / Supabase]</i><br/>Cache estruturado com resumos cívicos e alta performance")]:::db
        sync["⚡ <b>Sync & Enrich Engine (CLI)</b><br/><i>[TSX / Node.js Scripts]</i><br/>Pipeline de ingestão oficial e enriquecimento por IA"]:::container
    end

    %% Fluxos do Usuário e Frontend
    cidadao -->|"1. Opina e consulta afinidade<br/>[HTTPS]"| spa
    spa <-->|"2. Grava/Lê respostas locais<br/>[Web Storage API]"| storage
    spa -->|"3. Requisita propostas e votos nominais<br/>[HTTPS / JSON]"| bff

    %% Fluxos de Backend e Persistência
    bff -->|"4. Consulta dados com cache inteligente<br/>[SQL / Connection Pool]"| db
    sync -->|"5. Coleta dados oficiais e PDFs da Câmara<br/>[HTTPS / REST JSON]"| camara
    sync -->|"6. Envia PDFs e deliberações para resumo neutro<br/>[HTTPS / Gemini API]"| gemini
    sync -->|"7. Atualiza tabelas e sync_control<br/>[PostgreSQL / SQL]"| db
```

---

## 🔄 Fluxos de Execução e Diagramas de Sequência

### 1. Jornada do Cidadão (Votação, Afinidade e Classificação Determinística)
Demonstra o ciclo de vida completo da navegação, gravação estritamente local no navegador, classificação determinística de múltiplas deliberações e cálculo no cliente:

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Visitante / Cidadão
    participant UI as Frontend (Next.js / Skeletons)
    participant LocalStorage as Navegador (localStorage)
    participant Classifier as Classificador (lib/match)
    participant ClientMatch as Motor de Afinidade (lib/match)
    participant API as BFF / API Routes (/api/*)
    participant DB as PostgreSQL (Cache Oficial)

    Note over Usuario,DB: 1. Acesso e Análise de Propostas
    Usuario->>UI: Acessa a página de Propostas (/opiniao)
    UI->>API: GET /api/propositions (apenas com votos nominais válidos)
    API->>DB: Consulta proposições com votos nominais registrados
    DB-->>API: Retorna proposições e sessões nominais
    API-->>UI: Responde catálogo filtrado
    UI-->>Usuario: Exibe proposições com ementas e links oficiais

    loop Para cada proposição avaliada
        Usuario->>UI: Clica em "CONCORDO" ou "DISCORDO"
        UI->>LocalStorage: Salva resposta em legisvisao_user_opinions
    end

    Note over Usuario,DB: 2. Consulta de Resultados e Afinidade
    Usuario->>UI: Navega para a página de Afinidade (/afinidade)
    UI->>LocalStorage: Recupera respostas gravadas
    LocalStorage-->>UI: Retorna mapa de opiniões do usuário
    UI->>API: GET /api/deputies e GET /api/parties
    API->>DB: Consulta deputados, legendas e votos nominais
    DB-->>API: Retorna registros consolidados
    API-->>UI: Responde dados dos deputados e bancadas
    UI->>ClientMatch: Executa calculatePoliticianMatch() e calculatePartyMatch()
    ClientMatch-->>UI: Retorna índices determinísticos calculados no cliente
    UI-->>Usuario: Exibe afinidades (%) de Deputados Federais e Partidos

    Note over Usuario,DB: 3. Inspeção de Perfil e Múltiplas Votações
    Usuario->>UI: Acessa perfil do deputado (/politicos/[id]) ou projeto (/projetos/[id])
    UI->>Classifier: Executa sortVoteSessionsDeterministic()
    Classifier-->>UI: Elege Votação Principal (Mérito) e agrupa Destaques/Emendas
    UI-->>Usuario: Exibe resumo colapsável, placar e histórico transparente

    Note over Usuario,LocalStorage: 4. Exportação, Limpeza e Restauração de Dados
    Usuario->>UI: Clica em "Exportar" (JSON)
    UI->>LocalStorage: Lê dados salvos
    LocalStorage-->>UI: Retorna opiniões
    UI-->>Usuario: Dispara download do arquivo legisvisao-opinioes-AAAA-MM-DD.json

    Usuario->>UI: Clica em "Limpar" (Ícone de Lixeira)
    UI->>LocalStorage: clearStoredAnswers()
    UI-->>Usuario: Notifica limpeza e reseta simulador

    Usuario->>UI: Clica em "Importar" e seleciona arquivo .json
    UI->>UI: Valida estrutura do JSON (retrocompatível com v1 legada)
    UI->>LocalStorage: Grava respostas normalizadas
    UI-->>Usuario: Restaura sessões e recalcula afinidades instantaneamente

    Note over Usuario,DB: 5. Auditoria Cívica e Relato de Problemas em Resumos
    Usuario->>UI: Clica em "Relatar problema" no resumo de IA
    UI->>Usuario: Abre modal interativo com contexto pré-preenchido
    Usuario->>UI: Descreve o problema e clica em "Enviar Relato"
    UI->>API: POST /api/feedback { description, propositionId, sessionId, category }
    API->>API: Formata payload estruturado em Markdown com links da Câmara
    API->>DB: Dispara criação de Issue na API do GitHub (com GITHUB_FEEDBACK_TOKEN)
    DB-->>API: Retorna número da issue (#X) e link público
    API-->>UI: Responde { success: true, issueUrl, issueNumber }
    UI-->>Usuario: Exibe confirmação com link público da issue aberta no GitHub
```

---

### 2. Pipeline de Ingestão e Sincronização Governamental (ETL)
Demonstra como o orquestrador de sincronização consome os dados abertos da Câmara, aplica verificação ativa em cache, executa paginação completa até 40 páginas por trimestre, insere lotes otimizados (bulk insert) e versiona o dataset:

```mermaid
sequenceDiagram
    autonumber
    participant Cron as ⏰ GitHub Actions / CLI
    participant Engine as ⚡ Sync Engine<br/>(scripts/sync/index.ts)
    participant Parties as 🔄 syncParties
    participant Deputies as 🔄 syncDeputies
    participant Props as 🔄 syncPropositions
    participant Votes as 🔄 syncVotes
    participant Camara as 🏛️ API da Câmara dos Deputados
    participant DB as 🗄️ PostgreSQL (Supabase)

    Cron->>Engine: npx tsx scripts/sync/index.ts
    Engine->>DB: updateSyncStatus({ status: 'RUNNING' })

    rect rgb(59, 130, 246, 0.08)
    Note over Engine,DB: ⚡ [1/4] Partidos Políticos
    Engine->>Parties: syncParties()
    Parties->>Camara: GET /partidos?itens=100
    Camara-->>Parties: Lista de siglas e legendas oficiais
    Parties->>DB: Batch Insert em parties (ON CONFLICT DO UPDATE)
    Parties-->>Engine: partyMap + contadores
    end

    rect rgb(16, 185, 129, 0.08)
    Note over Engine,DB: ⚡ [2/4] Deputados Federais (57ª Legislatura)
    Engine->>Deputies: syncDeputies(partyMap)
    Deputies->>Camara: GET /deputados?idLegislatura=57
    Camara-->>Deputies: 513 parlamentares, fotos e e-mails
    Deputies->>DB: Batch Insert em deputies (ON CONFLICT DO UPDATE)
    Deputies->>DB: UPDATE parties (total_membros agregado em 1 query)
    Deputies-->>Engine: deputyMap + contadores
    end

    rect rgb(245, 158, 11, 0.08)
    Note over Engine,DB: ⚡ [3/4] Proposições e Sessões de Votação (Paginação Completa)
    Engine->>Props: syncPropositions()
    Props->>DB: Consulta proposições e sessões existentes (cache)
    Props->>Camara: GET /votacoes (janelas trimestrais com paginação até 40 páginas)
    Camara-->>Props: Sessões deliberadas no Plenário
    Props->>Camara: GET /proposicoes/{id} (detalhes pendentes)
    Props->>DB: Batch Insert em propositions (lotes de 100)
    Props->>DB: Batch Insert em vote_sessions (lotes de 200)
    Props-->>Engine: sessionsToSyncVotes + contadores
    end

    rect rgb(139, 92, 246, 0.08)
    Note over Engine,DB: ⚡ [4/4] Votos Nominais Individuais (Streaming em Lote)
    Engine->>Votes: syncVotes(sessions, deputyMap)
    Votes->>DB: SELECT votacao_id FROM deputy_votes (skip de consolidadas)
    loop Para cada sessão pendente
        Votes->>Camara: GET /votacoes/{id}/votos
        Camara-->>Votes: Votos nominais dos deputados
        Votes->>DB: Batch Insert em deputy_votes (lotes de 1.000 a 2.000)
    end
    Votes-->>Engine: totalVotes + contadores
    end

    Note over Engine,DB: 🏁 Finalização e Versionamento
    Engine->>DB: updateSyncStatus({ status: 'SUCCESS', datasetVersion })
    Engine-->>Cron: Pipeline finalizado com integridade garantida
```

---

## 🗄️ Esquema do Banco de Dados (PostgreSQL)

O banco de dados do LegisVisão é modelado com **apenas 5 tabelas centrais + 1 tabela de controle operacional**:

```mermaid
erDiagram
    PARTIES ||--o{ DEPUTIES : "filia"
    PARTIES ||--o{ DEPUTY_VOTES : "registra sigla"
    PROPOSITIONS ||--o{ VOTE_SESSIONS : "deliberada em"
    VOTE_SESSIONS ||--o{ DEPUTY_VOTES : "contem"
    DEPUTIES ||--o{ DEPUTY_VOTES : "vota"

    PARTIES {
        int id PK "ID oficial da Câmara"
        varchar sigla UK "Sigla partidária (ex: PL, PT, NOVO)"
        varchar nome "Nome oficial da legenda"
        text logo_url "URL do logotipo oficial"
        int total_membros "Total de deputados filiados"
    }

    DEPUTIES {
        int id PK "ID oficial da Câmara"
        varchar nome "Nome civil"
        varchar nome_eleitoral "Nome parlamentar de urna"
        varchar sigla_partido FK "Sigla do partido"
        varchar sigla_uf "Estado (UF)"
        text url_foto "URL da foto oficial parlamentar"
        varchar email "E-mail funcional na Câmara"
        varchar situacao "Situação do mandato"
        int legislatura "Número da legislatura (57)"
        boolean is_active "Deputado em exercício"
    }

    PROPOSITIONS {
        int id PK "ID oficial da Câmara"
        varchar sigla_tipo "Tipo (PL, PEC, PLP, MPV)"
        int numero "Número da matéria"
        int ano "Ano de apresentação"
        varchar titulo "Identificação (ex: PL 2630/2020)"
        text ementa "Ementa resumida"
        text ementa_detalhada "Texto explicativo"
        varchar tema "Classificação temática"
        text url_inteiro_teor "Link para PDF oficial"
        text url_camara "Página da proposição na Câmara"
        date data_apresentacao "Data de apresentação"
        text ultimo_status "Situação da tramitação"
        text resumo_geral "Resumo geral explicativo da lei (IA)"
        boolean ai_processed "Flag de processamento por IA"
        timestamp ai_processed_at "Data de geração do resumo"
        text ai_error "Log de erro em caso de falha"
    }

    VOTE_SESSIONS {
        varchar id PK "ID da votação (ex: 2255678-120)"
        int proposicao_id FK "ID da proposição"
        timestamp data_hora "Data e hora da votação"
        text descricao "Objeto e ata da votação"
        varchar resultado "Resultado (Aprovado / Rejeitado)"
        varchar sigla_orgao "Órgão deliberativo (PLEN)"
        varchar tipo_deliberacao "MERITO | DESTAQUE | EMENDA | REQUERIMENTO"
        text titulo_amigavel "Título simplificado da pauta"
        text resumo_simplificado "Explicação da deliberação específica (IA)"
        text pergunta_cidadao "Pergunta contextualizada"
        boolean ai_processed "Flag de processamento por IA"
        timestamp ai_processed_at "Data de processamento por IA"
        text ai_error "Log de erro em caso de falha"
    }

    DEPUTY_VOTES {
        serial id PK "Chave primária interna"
        varchar votacao_id FK "ID da sessão de votação"
        int deputado_id FK "ID do deputado votante"
        varchar sigla_partido FK "Partido no momento do voto"
        varchar voto_original "Voto registrado (Sim, Não, etc.)"
    }

    SYNC_CONTROL {
        varchar source PK "CAMARA"
        varchar name "Nome da fonte"
        text official_url "URL do portal"
        timestamp last_sync "Última sincronização"
        varchar status "SUCCESS | FAILED | RUNNING | PENDING"
        int total_deputies "Total de deputados"
        int total_propositions "Total de proposições"
        int total_vote_sessions "Total de sessões"
        int total_votes "Total de votos nominais"
        varchar dataset_version "Timestamp de versão do cache"
        text last_error "Mensagem de erro em caso de falha"
    }
```

---

## 🔗 Rastreabilidade de Dados e Fontes Oficiais

| Entidade / Dado | Origem Primária Oficial | Endpoint da API Pública | Aplicação no LegisVisão |
|---|---|---|---|
| **Partidos Políticos** | Câmara dos Deputados | `/partidos` | Identificação das legendas e agregação da média partidária |
| **Deputados Federais** | Câmara dos Deputados | `/deputados` | 513 parlamentares da 57ª Legislatura, fotos oficiais e e-mails |
| **Proposições Legislativas** | Câmara dos Deputados | `/proposicoes` e `/proposicoes/{id}` | Projetos com deliberação no Plenário, ementas e íntegras |
| **Sessões de Votação** | Câmara dos Deputados | `/votacoes` e `/votacoes/{id}` | Data, hora, resultado e descrição oficial do objeto deliberado |
| **Votos Nominais** | Câmara dos Deputados | `/votacoes/{id}/votos` | Registros auditáveis de cada deputado (Sim, Não, Abstenção) |

> 🔍 **Auditoria Cívica Direta**: Cada página de proposição (`/projetos/[id]`) e cada perfil de parlamentar (`/politicos/[id]`) contém links diretos para a respectiva página oficial no portal da Câmara dos Deputados (`camara.leg.br`).

---

## 📐 Fórmula Determinística de Afinidade e Classificação

### 1. Cálculo Aritmético de Afinidade
O motor de cálculo (`lib/match/`) cruza determinística e pontualmente cada resposta do usuário com os votos nominais dos deputados:

$$\text{Índice de Afinidade}\;(\%) = \left( \frac{\text{Concordâncias}}{\text{Votações Comparáveis}} \right) \times 100$$

- **Concordância**: Usuário **CONCORDO** $\leftrightarrow$ Deputado **SIM** / Usuário **DISCORDO** $\leftrightarrow$ Deputado **NÃO**.
- **Divergência**: Usuário **CONCORDO** $\leftrightarrow$ Deputado **NÃO** / Usuário **DISCORDO** $\leftrightarrow$ Deputado **SIM**.
- **Não comparável** (ignorado do denominador): *Abstenção*, *Obstrução*, *Artigo 17* ou *Ausente*.
- **Afinidade Partidária**: Média aritmética dos índices de convergência de todos os deputados filiados à legenda nas matérias avaliadas.

### 2. Hierarquia Determinística de Eleição da Votação Principal (`classifyVoteSession`)
Para proposições com múltiplas deliberações (Texto-Base, Destaques, Emendas e Requerimentos), o sistema elege a sessão principal com base em 4 níveis de desempate estrito:
1. **Nível 1 (Mérito Substantivo):** Prioridade 1 (Texto-Base, Substitutivos, 1º e 2º Turnos de PEC, Projetos de Lei de Conversão) $>$ Prioridade 2 (Emendas) $>$ Prioridade 3 (Destaques / DTQ / DVS) $>$ Prioridade 4 (Requerimentos de Pauta). Expressões de praxe regimental como *"ressalvado o destaque"* são tratadas com precisão sintática para não rebaixar textos de mérito legítimo.
2. **Nível 2 (Presença Obrigatória de Votos Nominais):** Exige quórum nominal registrado no painel eletrônico (Sim/Não). Matérias com texto-base aprovado simbolicamente (0 votos nominais) não são computadas no cálculo de afinidade e são disponibilizadas apenas em modo consulta.
3. **Nível 3 (Atualidade Temporal):** `data_hora DESC` (deliberação mais recente que consolidou a decisão final da Câmara, como o 2º turno sobre o 1º turno).
4. **Nível 4 (Desempate Alfanumérico):** `ID da Sessão` (`localeCompare` determinístico).

### 3. Heurística de Relevância Cívica das Proposições (`sortPropositionsByRelevance`)
No Simulador de Votação (`/opiniao`), as matérias são apresentadas por padrão ordenadas por impacto e representatividade no Plenário:
1. **Maior Quórum Total (`total_sim + total_nao + total_outros` decrescente):** Prioriza grandes deliberações de plenário (480 a 505 deputados presentes).
2. **Menor Abstenção e Outros Votos (`total_outros` crescente):** Prioriza votações com posicionamento categórico dos parlamentares em Sim ou Não.
3. **Menor Margem de Votos (`|total_sim - total_nao|` crescente):** Destaca matérias mais disputadas voto a voto e politicamente acirradas.
4. **Desempate:** Data da deliberação mais recente e ID da proposição decrescente.

---

## 🧠 Destaques de Engenharia Backend, Arquitetura e Tradeoffs

Esta seção detalha as principais decisões de design de software e infraestrutura adotadas no LegisVisão, acompanhadas de suas respectivas motivações de negócio e da matriz de compensações técnicas (tradeoffs).

### 1. Estratégia de Cache Multi-Camadas (Client-Side + BFF + PostgreSQL Indexado)
- **Implementação Técnica:**
  - **Camada 1 (Client-Side):** `sessionStorage` no navegador com TTL de 3 minutos para catálogo de deputados, propostas e legendas, evitando requisições repetidas na mesma navegação.
  - **Camada 2 (Server-Side / BFF):** Cache em memória nas rotas de API do Next.js com invalidação inteligente orientada a eventos. O servidor monitora a coluna `dataset_version` da tabela `sync_control` a cada 15 minutos; se o dataset não foi modificado, as consultas são resolvidas em memória (sub-5ms) sem onerar o PostgreSQL.
  - **Camada 3 (Database):** PostgreSQL atua como repositório persistente indexado com driver `postgres.js` configurado em modo direto (`prepare: false`) para operação ideal com poolers de transação.
- **Justificativa de Negócio:**
  - Custo operacional de infraestrutura próximo de zero, permitindo manter o projeto 100% no free-tier.
  - Latência imperceptível para o cidadão e proteção contra bloqueios por rate-limit da API governamental da Câmara.

### 2. Pipeline de Ingestão e Sincronização de Alto Rendimento (ETL)
- **Implementação Técnica:**
  - **Extração de Prefixo em Memória:** As sessões da Câmara utilizam o padrão `{propId}-{seq}` (ex: `2618177-71`). O script mapeia os IDs de proposição diretamente em memória, eliminando mais de 18.000 requisições HTTP redundantes que seriam necessárias para descobrir a qual projeto cada votação pertence.
  - **Workers Concorrentes e Rate Limiting:** Pool de 25 workers paralelos com controle de vazão e logs em tempo real de taxa de transferência (requisições/segundo).
  - **Fila Serializada com Mutex e Resiliência TCP:** Inserções de votos nominais em lotes de 1.000 a 2.000 registros gerenciadas por uma fila com promessa encadeada (`flushQueue`), acompanhada de 3 tentativas automáticas com backoff exponencial para absorver quedas transitórias de socket (`ECONNRESET`) em poolers de nuvem.
- **Justificativa de Negócio:**
  - Capacidade de processar e normalizar quase meio milhão de votos nominais em minutos, viabilizando execuções confiáveis em esteiras de automação (GitHub Actions) sem estourar limites de tempo de execução.

### 3. Arquitetura Local-First e Anonimato Absoluto do Usuário
- **Implementação Técnica:**
  - As preferências e respostas do cidadão são gravadas exclusivamente no `localStorage` do navegador (`lib/storage.ts`).
  - O motor de cálculo de afinidade (`lib/match/calculatePoliticianMatch.ts` e `calculatePartyMatch.ts`) executa integralmente no cliente via JavaScript puro, consumindo zero ciclos de CPU do servidor para comparar votos.
- **Justificativa de Negócio:**
  - **Imunidade Regulatória Total (LGPD / GDPR):** Nenhum dado pessoal sensível (posicionamento político, ideológico ou identificador de eleitor) transita pela rede ou é gravado em servidores. Não há risco de vazamento de dados de usuários.
  - **Escalabilidade Extrema:** Como o processamento pesado de cálculo é distribuído na ponta (dispositivo do usuário), a aplicação pode atender milhões de usuários simultâneos sem aumento proporcional de custos de servidor.

### 4. Portabilidade de Dados e Retrocompatibilidade Resiliente (Import/Export JSON)
- **Implementação Técnica:**
  - Mecanismo nativo de exportação e importação de arquivo JSON estruturado.
  - O parser de importação possui tolerância retrocompatível automática: reconhece tanto formatos legados (dicionário plano de IDs) quanto esquemas modernos versionados (`{ version: "1.0", answers: { ... } }`), aplicando coerção segura de tipos numéricos e strings.
- **Justificativa de Negócio:**
  - Soberania e liberdade para o cidadão manter seu histórico de análises cívicas entre diferentes computadores ou celulares sem a necessidade de criar contas, cadastrar e-mails ou fornecer senhas.

### 5. Motor de Classificação Determinística (Sem Dependência de IA em Tempo de Execução)
- **Implementação Técnica:**
  - Árvore de decisão estrita baseada em regras textuais dos atos regimentais da Câmara dos Deputados (`classifyVoteSession.ts`), categorizando deliberações em 4 tiers bem definidos (Mérito, Emendas, Destaques e Requerimentos).
- **Justificativa de Negócio:**
  - **Neutralidade Inquestionável e Auditabilidade:** Em ferramentas cívicas, algoritmos estatísticos ou modelos de linguagem (LLMs) geram desconfiança pública devido a possíveis alucinações ou vieses. A abordagem determinística garante que o mesmo voto sempre produza o mesmo resultado exato e auditável.

### 6. Pipeline de Versionamento Semântico e Release Automática (CI/CD)
- **Implementação Técnica:**
  - Script autônomo em Node.js (`scripts/release/bump-version.js`) e workflow do GitHub Actions (`.github/workflows/auto-release.yml`) disparados exclusivamente no fechamento e mesclagem de Pull Requests na branch `main`.
  - Classificação inteligente baseada em metadados da PR (branch, título e corpo):
    - **MAJOR (`+1.0.0`)**: Mudanças estruturantes (`breaking change`, `mudanças que quebram`, `nova versão`, `feat!:`).
    - **PATCH (`0.0.+1`)**: Correções e manutenções (`fix:`, `hotfix:`, `docs:`, `chore:`, `[patch]`, `[docs]`, `[chore]`).
    - **MINOR (`0.+1.0`)**: Padrão para novas funcionalidades e telas (`feature/*`, `feat:`, `refactor:*`).
  - Utilização do secret `RELEASE_TOKEN` no ambiente `prd` para atualizar o `package.json` na `main` protegida, criar a Git Tag (`vX.Y.Z`) e gerar a GitHub Release oficial com changelog automático.
- **Justificativa de Negócio:**
  - Ciclo de entrega contínua (CD) profissional e sem atrito humano. Histórico de versões 100% auditável, rastreabilidade total de quais PRs originaram cada release e eliminação de falhas manuais de versionamento.

### 7. Pipeline Assíncrono de Enriquecimento por IA (Google AI Studio Free-Tier + GitHub Actions)
- **Implementação Técnica:**
  - **Processamento em Lote Desacoplado (Offline/Background):** Script TypeScript (`scripts/sync/enrich-sessions-ai.ts`) orquestrado diariamente por cron do GitHub Actions (`.github/workflows/enrich-ai.yml`) às 04:00 UTC, desacoplando totalmente a geração de resumos da navegação em tempo real do usuário.
  - **Ingestão Multimodal e Agrupamento por Projeto:** O script efetua o download em memória do PDF oficial do inteiro teor direto da Câmara e envia em uma única requisição multimodal a lei e todas as suas sessões vinculadas para a família Gemini (`gemini-3.5-flash-lite`, `gemini-3.5-flash`), reduzindo até 80% do consumo de requisições (RPM).
  - **Seleção Incremental e Resiliência de Quota:** O banco de dados PostgreSQL persiste os resumos nas tabelas `propositions` (`resumo_geral`) e `vote_sessions` (`tipo_deliberacao`, `titulo_amigavel`, `resumo_simplificado`, `pergunta_cidadao`), sinalizando `ai_processed = TRUE`. O pipeline busca automaticamente apenas matérias pendentes, garantindo que novas sessões ou leis adicionadas sejam capturadas sem reprocessar o histórico existente.
- **Justificativa de Negócio:**
  - Traduz o jargão legislativo hermético e ementas burocráticas para uma linguagem cidadã clara, acessível e rigorosamente neutra.
  - Mantém o custo de inteligência artificial em **R$ 0,00**, aproveitando a cota gratuita diária do Google AI Studio (500 requisições/dia) alimentada progressivamente pela automação.

### 8. Canal de Auditoria Cívica Integrado ao GitHub (Transparência Pública Sem Custos de Servidor)
- **Implementação Técnica:**
  - Rota de API BFF (`app/api/feedback/route.ts`) autenticada com a API REST do GitHub via secret `GITHUB_FEEDBACK_TOKEN`.
  - Componente modal interativo (`app/components/AiFeedbackModal.tsx`) integrado diretamente nos cards de resumos de IA e deliberações de mérito.
  - O backend formata automaticamente um relatório estruturado em Markdown com a ementa original, identificadores oficiais da Câmara, categoria do apontamento e descrição enviada pelo usuário, criando a issue pública rotulada (`feedback-ia`, `triage`).
  - O usuário recebe instantaneamente o link direto da issue pública aberta para acompanhar o ciclo de correção.
- **Justificativa de Negócio:**
  - Transparência radical e engajamento comunitário em projeto de código aberto (Open Source).
  - Elimina totalmente custos com serviços pagos de envio de e-mail (servidores SMTP transacionais) e dispensa a criação de tabelas de suporte ou moderação no banco de dados.

---

### ⚖️ Matriz de Tradeoffs de Arquitetura

| Decisão de Arquitetura | Ganhos e Vantagens (Prós) | Tradeoffs e Limitações (Contras) | Mitigação Adotada |
| :--- | :--- | :--- | :--- |
| **Local-First (Cálculo no Cliente)** | Privacidade máxima; conformidade total com a LGPD; custo de processamento no servidor reduzido a zero. | Impossibilidade de gerar métricas globais agregadas no backend (ex: ranking de propostas mais apoiadas). | Usuário possui controle total e pode exportar/importar seu arquivo de votos livremente. |
| **PostgreSQL como Cache Persistente** | Consultas sub-milissegundo; integridade relacional; imunidade a instabilidades na API da Câmara. | Necessidade de pipeline periódico de sincronização para manter a base atualizada. | Pipeline automatizado via GitHub Actions com detecção inteligente de atualizações pendentes. |
| **Cache em Memória no BFF** | Redução massiva de queries ao PostgreSQL; latência quase nula para rotas públicas. | O cache local reside na memória do processo e requer sincronia entre instâncias. | Invalidação automática e verificação leve a cada 15 minutos via `sync_control.dataset_version`. |
| **Classificador Determinístico por Regras** | 100% auditável, transparente e sem custos de inferência de IA em produção. | Necessidade de cobrir variações de redação das atas e termos regimentais da Câmara. | Mapeamento extensivo das expressões oficiais da Câmara com testes automatizados para casos complexos. |
| **Enriquecimento Assíncrono por IA (Free-Tier Diário)** | Resumos em linguagem cidadã de alta qualidade a custo computacional zero em produção; enriquecimento contínuo sem onerar a navegação do usuário. | Limites diários de requisições por minuto (RPM) e dia (RPD) da cota gratuita do Google AI Studio. | Pipeline em lote desacoplado no GitHub Actions rodando 1 vez ao dia (às 04:00 UTC), com agrupamento de 1 projeto + todas as sessões por chamada e seleção incremental apenas de itens pendentes (`ai_processed = FALSE`). |
| **Auditoria Cívica via GitHub Issues** | Transparência pública total; custo zero de infraestrutura; histórico auditável e aberto no repositório; sem necessidade de servidor de e-mail (SMTP) ou banco para mensagens. | Usuários não técnicos podem não conhecer a plataforma do GitHub e não há resposta automática para a caixa de entrada pessoal de e-mail do cidadão. | O modal de feedback explica em linguagem simples que o GitHub é o quadro público onde os desenvolvedores organizam as correções do site e entrega o link direto para acompanhar a issue criada. |
| **Mapeamento de Prefixos no ETL** | Eliminação de 18.000 requisições HTTP no pipeline; execução ordens de grandeza mais rápida. | Dependência do padrão de nomenclatura de IDs da API da Câmara (`{propId}-{seq}`). | Verificação e tratamento de fallback para garantir integridade caso surjam IDs fora do padrão. |
| **Release Semântico Automatizado via PR** | Governança estrita; changelog rastreável; eliminação de intervenção manual no deploy. | Exige padronização dos títulos de PR ou nomes de branch pela equipe. | Regras flexíveis com suporte a múltiplos sinônimos em português, conventional commits e tags explícitas. |

---

## 🤖 Engenharia e Desenvolvimento Acelerado por IA

A concepção, arquitetura, design de interface e implementação do **LegisVisão** foram desenvolvidos utilizando práticas modernas de **Engenharia de Software Aumentada por Inteligência Artificial (AI-Assisted Engineering)**, combinando as seguintes ferramentas:

- **🚀 Google Antigravity & Google Gemini**: Utilizados como agente autônomo principal de programação em par (pair programming), estruturação da arquitetura em camadas, implementação do design system (Tailwind CSS e Dark Mode), refatoração modular dos scripts de sincronização e otimização de batch inserts no banco de dados.
- **⚡ Google AI Studio**: Utilizado para prototipagem rápida, engenharia e validação de prompts multimodais (análise de PDFs do inteiro teor de leis e deliberações legislativas), calibração de parâmetros de temperatura e inferência neutra, além de testes comparativos de desempenho e cotas entre modelos da família Gemini (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`).
- **💻 GitHub Copilot**: Utilizado no ambiente de desenvolvimento para geração contextual de código TypeScript, validação de tipagens estritas, criação de rotas de API e aceleração de testes de componentes React.
- **📊 Microsoft 365 Copilot**: Utilizado na fase de planejamento estratégico, levantamento de requisitos de transparência pública, refinamento da metodologia de cálculo e elaboração da documentação técnica e cívica.

---

## 🧪 Testes Automatizados e Garantia de Qualidade

A integridade do sistema, a precisão do classificador determinístico, a renderização dos componentes e a retrocompatibilidade dos dados são validadas por uma suíte de testes automatizados com **Vitest** e **React Testing Library**:

```bash
# Executar todos os testes unitários e de integração
npm run test

# Executar testes em modo interativo com hot-reload (Watch Mode)
npm run test:watch

# Validação estrita de tipagem TypeScript
npx tsc --noEmit

# Validação do build de produção (Turbopack)
npm run build
```

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: [Next.js 16.3 (Turbopack)](https://nextjs.org/) + [React 19](https://react.dev/)
- **Estilização**: [TailwindCSS v4](https://tailwindcss.com/) com paleta HSL dinâmica e suporte a tema Claro/Escuro (`next-themes`)
- **Testes Automatizados**: [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/) + [jsdom](https://github.com/jsdom/jsdom)
- **Ícones**: [React Icons (FontAwesome)](https://react-icons.github.io/react-icons/)
- **Performance & UX**: Loading Skeletons por rota dinâmica (`loading.tsx`), barra de progresso em tempo real (`NavigationProgressBar`) e preloading de imagens
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) hospedado no [Supabase](https://supabase.com/)
- **Driver de Conexão**: [postgres.js](https://github.com/porsager/postgres) com pool de conexões otimizado (`prepare: false` para transaction pooler)
- **Pipeline de Ingestão**: Scripts TypeScript com `tsx`, rate limiting nativo e paginação completa até 40 páginas
- **SEO & Metadados**: OpenGraph dinâmico com `@vercel/og`, sitemap XML dinâmico e Web App Manifest (PWA)

---

## 📁 Estrutura de Diretórios

```
├── app/
│   ├── afinidade/           # Visualização de Afinidades por Deputado e Partido (com loading.tsx)
│   ├── api/                 # Endpoints REST (BFF com cache inteligente)
│   │   ├── deputies/        # Consulta e perfil de Deputados Federais
│   │   ├── feedback/        # Endpoint para criação de issues de feedback no GitHub
│   │   ├── metadata/        # Metadados e versão do dataset ativo
│   │   ├── parties/         # Consulta de legendas e bancadas
│   │   ├── politicians/     # Rota de compatibilidade para deputados
│   │   ├── projects/        # Rota de compatibilidade para proposições
│   │   ├── propositions/    # Catálogo de proposições e sessões nominais (filtro nominal)
│   │   ├── states/          # Lista de UFs representadas
│   │   ├── sync-status/     # Monitor de atualização das fontes oficiais
│   │   ├── system-status/   # Indicador de prontidão do sistema
│   │   └── version/         # Versão do dataset ativo
│   ├── components/          # Componentes visuais globais
│   │   ├── ui/              # Componentes base (Button, ConfirmationModal, NavigationProgressBar)
│   │   ├── AiFeedbackModal.tsx # Modal acessível de relato cívico e auditoria
│   │   ├── Footer.tsx       # Rodapé institucional e links cívicos
│   │   ├── Header.tsx       # Barra de navegação responsiva com logo e menu móvel
│   │   ├── SystemStatusProvider.tsx # Provedor de prontidão das fontes públicas
│   │   ├── ThemeProvider.tsx        # Provedor de tema claro/escuro
│   │   └── ThemeToggle.tsx          # Alternador de tema acessível
│   ├── faq/                 # Metodologia, FAQ e Monitor de Fontes da Câmara
│   ├── og-image/            # Gerador dinâmico de imagem Open Graph (@vercel/og)
│   ├── opiniao/             # Simulador de Votação e Minhas Opiniões (com loading.tsx e revisao/)
│   │   └── revisao/__tests__/ # Testes da página de revisão de opiniões
│   ├── partidos/            # Páginas de Detalhes dos Partidos e Bancadas (com loading.tsx)
│   │   └── __tests__/       # Testes da página de detalhes do partido (filtros e bancada)
│   ├── politicos/           # Páginas de Perfil e Votações Nominais dos Deputados (com loading.tsx)
│   │   └── __tests__/       # Testes de detalhes do deputado (busca, ordenação e paginação)
│   ├── projetos/            # Detalhes da Proposição, Votações e Lista de Deputados (com loading.tsx)
│   ├── globals.css          # Design tokens HSL, tema escuro/claro, animações e utilitários
│   ├── layout.tsx           # Layout raiz com preloading de logo, ThemeProvider e NavigationProgressBar
│   ├── loading.tsx          # Skeleton de carregamento global do app
│   ├── manifest.ts          # Web App Manifest (PWA)
│   ├── page.tsx             # Página inicial institucional e hero
│   ├── robots.ts            # Configuração de indexação para buscadores
│   └── sitemap.ts           # Sitemap XML dinâmico (deputados, projetos, partidos)
├── lib/
│   ├── __tests__/           # Testes unitários de storage e retrocompatibilidade de dados
│   ├── ai/                  # Integração com Google AI Studio (Gemini API)
│   │   └── gemini.ts        # Modelos dinâmicos, resumo de PDF multimodal e deliberações
│   ├── match/               # Motor de cálculo determinístico, classificador de sessões e votos
│   │   ├── calculatePartyMatch.ts       # Cálculo de afinidade de partidos políticos
│   │   ├── calculatePoliticianMatch.ts  # Cálculo de afinidade de deputados federais
│   │   ├── classifyVoteSession.ts       # Classificador oficial e ordenador determinístico
│   │   └── normalizeVotes.ts            # Normalizador de votos nominais (Sim, Não, Abstenção)
│   ├── cache.ts             # Cache client-side (sessionStorage) com TTL de 3 minutos
│   ├── db.ts                # Conexão singleton com PostgreSQL (postgres.js)
│   ├── metadata.ts          # Configurações globais de SEO e Open Graph
│   ├── server-cache.ts      # Cache server-side em memória com TTL de 15 minutos
│   ├── storage.ts           # Gerenciamento Local-First de votos (localStorage com retrocompatibilidade)
│   └── urls.ts              # Configuração centralizada de URLs e contatos
├── public/
│   └── logo.png             # Logotipo oficial em alta resolução
├── scripts/
│   └── sync/                # Pipeline de ingestão da API de Dados Abertos da Câmara
│       ├── client.ts        # Cliente Postgres, controle de concorrência e rate-limiting
│       ├── enrich-sessions-ai.ts # Enriquecimento semântico e resumos por IA (Gemini)
│       ├── index.ts         # Orquestrador linear de sincronização
│       ├── sync-deputies.ts # Ingestão dos 513 deputados federais da 57ª legislatura
│       ├── sync-parties.ts  # Ingestão de partidos políticos com representação
│       ├── sync-propositions.ts # Ingestão de proposições e sessões nominais (paginação completa)
│       └── sync-votes.ts    # Ingestão em lote dos votos nominais individuais
├── supabase/
│   └── migrations/          # Migrations SQL do PostgreSQL (schema, índices e campos de IA)
├── types/
│   └── db.ts                # Tipagens TypeScript estritas do schema e domínio
└── vitest.config.ts         # Configuração da suíte de testes (Vitest + JSDOM)
```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: `20.x` ou superior
- **NPM**: `10.x` ou superior
- **Instância PostgreSQL** ou projeto no **Supabase**
- **Chave de API do Google AI Studio (Gemini)** (opcional para gerar resumos de IA)

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/didifive/legisvisao.git
cd legisvisao
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto:
```env
DATABASE_URL="postgresql://postgres.[REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GEMINI_API_KEY="sua_chave_do_google_ai_studio"
```

### 3. Aplicar o Esquema do Banco de Dados
Execute as migrations com o Supabase CLI ou via script:
```bash
npm run migrate:push 
# ou 'npm run db:reset' para resetar o banco de dados e recriar com as migrações
```

### 4. Sincronizar os Dados Oficiais da Câmara dos Deputados
Execute o pipeline de ingestão linear para popular os 513 deputados, partidos, proposições e votos nominais:
```bash
npm run sync
```

### 5. Enriquecer Proposições e Sessões com Resumos por IA (Opcional)
Execute o gerador de resumos em linguagem cidadã com o modelo Gemini (1 projeto + todas as sessões por requisição multimodal):
```bash
# Listar modelos disponíveis e limites de tokens
npm run enrich:ai -- --models

# Enriquecer projetos e suas respectivas deliberações
npm run enrich:ai -- --limit=100 --concurrency=3
```

### 6. Executar Testes Automatizados (Vitest)
```bash
# Executar toda a suíte de testes unitários e de integração
npm run test

# Modo interativo (watch mode com hot-reload)
npm run test:watch
```

### 7. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 8. Build de Produção
```bash
npm run build
npm run start
```

---

## 📡 Rotas de API (Backend For Frontend)

| Rota | Método | Descrição |
|---|---|---|
| `/api/propositions` | `GET` | Lista proposições com deliberação no Plenário para o questionário |
| `/api/propositions/[id]` | `GET` | Detalhes da proposição, sessões de votação e votos nominais |
| `/api/deputies` | `GET` | Lista deputados federais com filtros por `state`, `party` e `search` |
| `/api/deputies/[id]` | `GET` | Perfil completo do deputado e histórico de votações nominais |
| `/api/parties` | `GET` | Lista partidos registrados na Câmara e total de membros |
| `/api/parties/[id]` | `GET` | Detalhes do partido, bancada de deputados e histórico de votos |
| `/api/states` | `GET` | Lista de UFs (estados) com deputados federais em exercício |
| `/api/sync-status` | `GET` | Status operacional e contadores da sincronização com a Câmara |
| `/api/system-status` | `GET` | Indicador de prontidão do sistema para a interface |
| `/api/metadata` | `GET` | Versão do dataset e metadados de atualização |
| `/api/feedback` | `POST` | Dispara issues no GitHub com relatos de inconsistências em resumos de IA |

---

## ⚖️ Termos de Uso e Neutralidade Cívica

> **Esta ferramenta não recomenda representantes. Apenas compara dados públicos.**

- **Finalidade Cívica e Educacional**: O **LegisVisão** é uma ferramenta de transparência pública, sem fins lucrativos ou vínculos com partidos políticos.
- **Vedações**: É estritamente vedado o uso desta plataforma, de seus relatórios, marca ou índices para fins de **propaganda eleitoral, campanhas político-partidárias ou promoção de candidaturas**.
- **Auditoria de Código**: O código-fonte é 100% aberto sob a licença MIT para permitir auditoria independente de toda a lógica e dos dados coletados.

---

## 📄 Licença

Este projeto está licenciado sob os termos da licença [MIT](LICENSE).

---

## 👨‍💻 Autor

Desenvolvido por **Luis Zancanela**.

- 🌐 **Website**: [zancanela.dev.br](https://zancanela.dev.br)
- 💼 **LinkedIn**: [linkedin.com/in/luis-zancanela](https://www.linkedin.com/in/luis-zancanela)
- 🐙 **GitHub**: [@didifive](https://github.com/didifive)
- 📧 **E-mail**: [luis@zancanela.dev.br](mailto:luis@zancanela.dev.br)
