<div align="center">

# 🏛️ LegisVisão
### Plataforma Cívica de Transparência Legislativa e Análise de Afinidade

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>Compare seu posicionamento cívico com os votos reais do Congresso Nacional.</strong><br>
  Uma aplicação <em>Local-First</em>, determinística, auditável e alimentada exclusivamente por dados públicos oficiais da Câmara dos Deputados e do Senado Federal.
</p>

[🌐 Acessar LegisVisão](https://legisvisao.com.br) • [🐛 Reportar Problema](https://github.com/didifive/legisvisao/issues) • [⭐ Repositório GitHub](https://github.com/didifive/legisvisao)

</div>

---

## 📖 Visão Geral

O **LegisVisão** é uma plataforma cívica de código aberto desenvolvida para aproximar a sociedade civil das decisões do Poder Legislativo Brasileiro (Bicameralismo).

A aplicação permite que qualquer cidadão opine (**CONCORDO** ou **DISCORDO**) sobre proposições legislativas reais (PL, PEC, PLP, MPV deliberadas no Congresso Nacional) e compare seus posicionamentos de forma determinística com os votos nominais registrados por Deputados Federais, Senadores e Partidos Políticos.

A ferramenta é orientada pela **privacidade absoluta (*Local-First*)**: nenhuma resposta do usuário é enviada para servidores ou gravada em bancos de dados remotos.

---

## 🎯 Princípios Fundamentais

1. **Fonte de Verdade Pública**: Os dados provêm exclusivamente das APIs abertas da Câmara dos Deputados e do Senado Federal. O banco de dados relacional funciona estritamente como cache persistente de leitura e normalização.
2. **Cálculo Determinístico e Aberto**: O índice de afinidade é uma divisão aritmética direta (`Concordâncias / Comparações Válidas × 100`). Não há inteligência artificial no cálculo, pesos ocultos ou algoritmos opacos.
3. **Privacidade Local-First**: O armazenamento de respostas ocorre 100% no `localStorage` do navegador do visitante.
4. **Neutralidade Cívica**: A plataforma não emite juízo de valor, não ranqueia representantes por mérito e não faz recomendação eleitoral.

---

## 🏗️ Arquitetura do Sistema (C4 Model)

A arquitetura do **LegisVisão** é documentada seguindo o modelo **C4 (Context & Containers)**, priorizando clareza estrutural e desacoplamento:

### 1. Nível 1: Diagrama de Contexto do Sistema (C1)
Apresenta o ecossistema geral, os usuários e as interações com os sistemas externos de dados abertos governamentais.

```mermaid
C4Context
    title Nível 1 (C1): Diagrama de Contexto do Sistema - LegisVisão

    Person(cidadao, "Cidadão", "Usuário que deseja comparar suas opiniões legislativas com os votos reais do Congresso.")
    
    System(legisvisao, "LegisVisão", "Plataforma cívica web Local-First para análise de afinidade político-partidária e transparência legislativa.")
    
    System_Ext(camara, "API da Câmara dos Deputados", "dadosabertos.camara.leg.br<br/>Fornece proposições, votações nominais e deputados.")
    System_Ext(senado, "API do Senado Federal", "legis.senado.leg.br/dadosabertos<br/>Fornece matérias, votações plenárias, senadores e mandatos.")

    Rel(cidadao, legisvisao, "Opina em propostas, consulta afinidade e perfis", "HTTPS / Web Browser")
    Rel(legisvisao, camara, "Ingere proposições, sessões e votos nominais", "HTTPS / REST JSON")
    Rel(legisvisao, senado, "Ingere matérias, sessões e votos nominais", "HTTPS / REST JSON")
```

---

### 2. Nível 2: Diagrama de Contêineres (C2)
Detalha as aplicações, serviços, orquestradores de dados e armazenamentos que compõem a solução do LegisVisão.

```mermaid
flowchart TB
    %% Estilos no padrão visual C4
    classDef person fill:#08427b,stroke:#073b6f,color:#ffffff;
    classDef ext fill:#999999,stroke:#666666,color:#ffffff;
    classDef container fill:#1168bd,stroke:#0b4884,color:#ffffff;
    classDef db fill:#1168bd,stroke:#0b4884,color:#ffffff;

    cidadao["👤 <b>Cidadão</b><br/><i>[Pessoa]</i><br/>Usuário no navegador web"]:::person

    subgraph ExtSystems ["🌐 Sistemas Externos (Dados Abertos)"]
        camara["🏛️ <b>API Câmara dos Deputados</b><br/><i>[Sistema Externo / REST]</i><br/>Proposições, votações nominais e deputados"]:::ext
        senado["🏛️ <b>API Senado Federal</b><br/><i>[Sistema Externo / REST]</i><br/>Matérias, votações nominais e senadores"]:::ext
    end

    subgraph LegisBoundary ["🏛️ LegisVisão (Container Boundary)"]
        spa["💻 <b>Single-Page / Web App</b><br/><i>[Next.js 16 / React 19 / Tailwind]</i><br/>Interface Local-First responsiva onde o cálculo ocorre 100% no cliente"]:::container
        storage[("💾 <b>Armazenamento Local</b><br/><i>[localStorage]</i><br/>Armazena opiniões do cidadão de forma estritamente local e privada")]:::db
        bff["⚙️ <b>Backend / BFF & APIs</b><br/><i>[Next.js Route Handlers]</i><br/>Serve catálogo canônico, metadados e histórico com cache em memória (TTL)"]:::container
        db[("🗄️ <b>Banco de Dados Relacional</b><br/><i>[PostgreSQL / Supabase]</i><br/>Cache persistente de proposições, votos, parlamentares e mandatos")]:::db
        sync["⚡ <b>Sync Engine (ETL)</b><br/><i>[TSX / Node.js Scripts]</i><br/>Pipeline de ingestão, normalização e carga periódica de dados oficiais"]:::container
    end

    %% Fluxos do Usuário e Frontend
    cidadao -->|"1. Opina e consulta afinidade<br/>[HTTPS]"| spa
    spa <-->|"2. Grava/Lê respostas locais<br/>[Web Storage API]"| storage
    spa -->|"3. Requisita catálogo canônico e votos<br/>[HTTPS / JSON]"| bff

    %% Fluxos de Backend e Persistência
    bff -->|"4. Consulta dados e metadados<br/>[SQL / Connection Pool]"| db

    %% Fluxos da Engine de Ingestão (ETL)
    sync -->|"5. Extrai dados governamentais<br/>[HTTPS / REST]"| camara
    sync -->|"6. Extrai dados governamentais<br/>[HTTPS / REST]"| senado
    sync -->|"7. Persiste dados oficiais normalizados<br/>[SQL / Postgres.js]"| db
```

---

## 🔄 Fluxos de Execução e Sequência

### 1. Jornada do Cidadão (Votação e Afinidade Local-First)
Demonstra o ciclo de vida da navegação, gravação estritamente local e cálculo determinístico no cliente:

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Visitante / Cidadão
    participant UI as Frontend (Next.js / UI)
    participant LocalStorage as Navegador (localStorage)
    participant ClientMatch as Motor de Afinidade (lib/match)
    participant API as BFF / API Routes (/api/*)
    participant DB as PostgreSQL (Cache Oficial)

    Note over Usuario,DB: 1. Acesso e Análise de Propostas
    Usuario->>UI: Acessa a página de Propostas (/opiniao)
    UI->>API: GET /api/projects
    API->>DB: Consulta proposições e sessões de votação
    DB-->>API: Retorna proposições e histórico de deliberações
    API-->>UI: Responde lista de proposições canônicas
    UI-->>Usuario: Exibe proposições com ementas e links oficiais

    loop Para cada proposição avaliada
        Usuario->>UI: Clica em "CONCORDO" ou "DISCORDO"
        UI->>LocalStorage: Salva resposta em legisvisao_user_opinions
    end

    Note over Usuario,DB: 2. Consulta de Resultados e Afinidade
    Usuario->>UI: Navega para a página de Afinidade (/afinidade)
    UI->>LocalStorage: Recupera respostas gravadas
    LocalStorage-->>UI: Retorna mapa de opiniões do usuário
    UI->>API: GET /api/politicians e GET /api/parties
    API->>DB: Consulta parlamentares, mandatos e votos nominais
    DB-->>API: Retorna registros consolidados
    API-->>UI: Responde dados brutos dos parlamentares e legendas
    UI->>ClientMatch: Executa calculatePoliticianMatch() e calculatePartyMatch()
    ClientMatch-->>UI: Retorna índices determinísticos calculados no cliente
    UI-->>Usuario: Exibe afinidades (%) de Deputados, Senadores e Partidos

    Note over Usuario,LocalStorage: 3. Exportação, Limpeza e Restauração de Dados
    Usuario->>UI: Clica em "Exportar Opiniões (.JSON)"
    UI->>LocalStorage: Lê dados salvos
    LocalStorage-->>UI: Retorna opiniões
    UI-->>Usuario: Dispara download do arquivo legisvisao-opinioes-AAAA-MM-DD.json

    Usuario->>UI: Clica em "Limpar Dados Locais"
    UI->>LocalStorage: removeItem(legisvisao_user_opinions)
    UI-->>Usuario: Notifica limpeza e reseta simulador

    Usuario->>UI: Clica em "Importar Opiniões (.JSON)" e seleciona arquivo
    UI->>UI: Valida estrutura do JSON v1 (schema estrito)
    UI->>LocalStorage: Grava respostas normalizadas
    UI-->>Usuario: Restaura sessões e recalcula afinidades automaticamente
```

---

### 2. Pipeline de Ingestão e Sincronização Governamental (ETL)
Demonstra como o orquestrador de sincronização consome os dados abertos, normaliza as votações e controla a versão do dataset:

```mermaid
sequenceDiagram
    autonumber
    participant Cron as ⏰ GitHub Actions / CLI
    participant Engine as ⚡ Sync Engine<br/>(scripts/sync/index.ts)
    participant Parties as 🔄 syncParties
    participant Projects as 🔄 syncProjects
    participant Politicians as 🔄 syncPoliticians
    participant Sessions as 🔄 syncVoteSessions
    participant Votes as 🔄 syncVotes
    participant Camara as 🏛️ API Câmara
    participant Senado as 🏛️ API Senado
    participant DB as 🗄️ PostgreSQL

    Cron->>Engine: npx tsx scripts/sync/index.ts

    rect rgb(59, 130, 246, 0.08)
    Note over Engine,DB: ⚡ Fase 1 — Partidos + Proposições (paralelo)
    par syncParties()
        Engine->>Parties: Inicia
        Parties->>Camara: GET /partidos (lista + detalhe)
        Camara-->>Parties: Siglas, membros, situação
        Parties->>DB: Upsert political_parties
        DB-->>Parties: partyMap (sigla → id)
        Parties-->>Engine: partyMap + contadores
    and syncProjects()
        Engine->>Projects: Inicia
        Projects->>Camara: GET /proposicoes (lista + detalhe + autores)
        Camara-->>Projects: PLs, PECs, PLPs, MPVs
        Projects->>Senado: GET /materia/pesquisa/lista
        Senado-->>Projects: Matérias legislativas
        Projects->>DB: Upsert legislative_projects + project_house_records
        DB-->>Projects: houseRecordsToSyncVotes
        Projects-->>Engine: houseRecords + contadores
    end
    end

    rect rgb(16, 185, 129, 0.08)
    Note over Engine,DB: ⚡ Fase 2 — Parlamentares + Sessões de Votação (paralelo)
    par syncPoliticians(partyMap)
        Engine->>Politicians: partyMap da Fase 1
        Politicians->>Camara: GET /deputados + /deputados/{id}
        Camara-->>Politicians: Deputados, fotos, e-mails
        Politicians->>Camara: GET /deputados/{id}/orgaos (histórico partidário)
        Camara-->>Politicians: Filiações e datas
        Politicians->>Senado: GET /senador/lista/atual + /senador/{cod}/filiacoes
        Senado-->>Politicians: Senadores, filiações
        Politicians->>DB: Upsert politicians + mandates + politician_party_history
        DB-->>Politicians: politicianMap (key → id)
        Politicians-->>Engine: politicianMap + contadores
    and syncVoteSessions(houseRecords)
        Engine->>Sessions: houseRecords da Fase 1
        Sessions->>Camara: GET /proposicoes/{id}/votacoes
        Camara-->>Sessions: Sessões de deliberação
        Sessions->>Senado: GET /materia/{cod}/votacoes
        Senado-->>Sessions: Sessões plenárias
        Sessions->>DB: Upsert vote_sessions (com phase_id e external_vote_id)
        DB-->>Sessions: sessionsToSyncVotes
        Sessions-->>Engine: sessionsToSync + contadores
    end
    end

    rect rgb(245, 158, 11, 0.08)
    Note over Engine,DB: ⚡ Fase 3 — Votos Nominais (sequencial)
    Engine->>Votes: sessionsToSync + politicianMap + partyMap
    Votes->>DB: Carrega chaves existentes (vote_session_id, politician_id)
    DB-->>Votes: existingVoteKeys (dedup)
    Votes->>Camara: GET /votacoes/{id}/votos (batch concorrente)
    Camara-->>Votes: Votos nominais dos deputados
    Votes->>Senado: GET /materia/votacao/{id}/votos (batch concorrente)
    Senado-->>Votes: Votos nominais dos senadores
    Votes->>DB: Batch INSERT politician_votes (party_id histórico, lotes de 500)
    Votes-->>Engine: contadores de votos
    end

    rect rgb(139, 92, 246, 0.08)
    Note over Engine,DB: 📦 Fase Final — Versionamento e Controle
    Engine->>DB: SELECT dataset_version FROM sync_control
    DB-->>Engine: Versão atual
    alt Houve inserções ou atualizações
        Engine->>DB: UPDATE sync_control SET dataset_version, status='SUCCESS'
    else Sem alterações
        Engine->>DB: UPDATE sync_control SET status='SUCCESS' (mantém versão)
    end
    Engine->>Engine: Gera Painel Analítico de Execução (console)
    Engine-->>Cron: ✅ Pipeline finalizado com integridade
    end
```

---

## 🗄️ Modelo de Dados Relacional (DER)

O esquema relacional é projetado para garantir integridade referencial, rastreabilidade temporal de mandatos e fidelidade partidária no exato momento do voto:

```mermaid
erDiagram
    POLITICAL_PARTIES ||--o{ POLITICIAN_PARTY_HISTORY : "registra histórico"
    POLITICAL_PARTIES ||--o{ POLITICIAN_VOTES : "vincula à época da votação"
    POLITICIANS ||--o{ POLITICIAN_PARTY_HISTORY : "possui"
    POLITICIANS ||--o{ MANDATES : "exerce"
    POLITICIANS ||--o{ POLITICIAN_VOTES : "registra"

    LEGISLATIVE_PROJECTS ||--|{ PROJECT_HOUSE_RECORDS : "tramita em"
    PROJECT_HOUSE_RECORDS ||--o{ LEGISLATIVE_PHASES : "possui fases"
    PROJECT_HOUSE_RECORDS ||--o{ VOTE_SESSIONS : "deliberado em"
    LEGISLATIVE_PHASES ||--o{ VOTE_SESSIONS : "contém sessões"
    VOTE_SESSIONS ||--o{ POLITICIAN_VOTES : "contém votos nominais"

    POLITICAL_PARTIES {
        int id PK
        string sigla UK
        string nome
        string uri
        string situacao
        int total_membros
        int total_posse
        int numero_eleitoral
        string logo_url
    }

    POLITICIANS {
        int id PK
        string source
        string external_id
        string name
        string type
        string state
        string photo_url
        string email
        boolean is_active
    }

    POLITICIAN_PARTY_HISTORY {
        int id PK
        int politician_id FK
        int party_id FK
        date start_date
        date end_date
    }

    MANDATES {
        int id PK
        int politician_id FK
        string office
        string house
        date start_date
        date end_date
        int legislature_id
    }

    LEGISLATIVE_PROJECTS {
        int id PK
        string canonical_id UK
        string type
        string number
        int year
        string title
        string description
        string current_status
        timestamp last_updated_at
    }

    PROJECT_HOUSE_RECORDS {
        int id PK
        int project_id FK
        string house
        string external_id
        string official_url
        string full_text_url
        date presentation_date
        string author_name
        string author_party
        string author_state
        string rapporteur_name
        string tramitacao_etapa
        string despacho
        date last_event_date
        timestamp source_updated_at
        timestamp source_read_at
    }

    LEGISLATIVE_PHASES {
        int id PK
        int house_record_id FK
        string phase_name
        int phase_order
        timestamp started_at
        timestamp completed_at
    }

    VOTE_SESSIONS {
        int id PK
        int house_record_id FK
        int phase_id FK
        string external_vote_id
        timestamp date
        string description
        string result
    }

    POLITICIAN_VOTES {
        int id PK
        int vote_session_id FK
        int politician_id FK
        int party_id FK
        string vote_original
    }

    SYNC_CONTROL {
        string source PK
        string name
        string official_url
        timestamp last_sync
        timestamp last_successful_sync
        string status
        int records_count
        int records_updated
        int records_inserted
        string dataset_version
        string last_error
    }
```

---

## 📐 Metodologia de Cálculo e Normalização

### 1. Normalização de Votos
Apenas votos com posicionamento expresso de mérito entram no cômputo:
- **Afirmativos ("SIM")**: `"SIM"`, `"S"`, `"Y"`, `"YES"`, `"CONCORDO"`, `"FAVORAVEL"`, `"SIM-SIM"`.
- **Negativos ("NÃO")**: `"NAO"`, `"NÃO"`, `"N"`, `"NO"`, `"DISCORDO"`, `"CONTRARIO"`, `"NAO-NAO"`.
- **Valores Desconsiderados (`null`)**: Abstenção, Obstrução, Art. 17, Licença, Falta, Ausência, Liberado, Outros.

### 2. Afinidade Individual do Parlamentar
$$\text{Índice Individual (\%)} = \left( \frac{\text{Total de Concordâncias}}{\text{Total de Deliberações Válidas Comparáveis}} \right) \times 100$$

### 3. Afinidade Partidária (com Fidelidade Direta no Voto)
$$\text{Índice do Partido (\%)} = \left( \frac{\text{Total de Concordâncias dos Parlamentares Filiados}}{\text{Total de Votos Comparáveis dos Filiados}} \right) \times 100$$

> **Fidelidade Histórica de Filiação**: Cada voto nominal é atribuído diretamente à legenda partidária em que o parlamentar estava registrado no momento da sessão de deliberação (`politician_votes.party_id`, extraído do painel oficial de votações). Se um político trocou de legenda, seus votos anteriores permanecem vinculados ao partido em que atuava na data do voto, e os novos votos são computados para a sua legenda atual.
>
> **Efeito em Partidos Recentes**: Partidos criados recentemente ou resultantes de fusões, como União Brasil (DEM + PSL) e PRD (PTB + Patriota), são considerados apenas a partir de sua constituição formal. Assim, votos registrados antes da criação da nova legenda permanecem atribuídos aos partidos existentes à época da votação e não são transferidos retroativamente para o partido sucessor. Por exemplo, votos anteriores continuam vinculados a legendas como DEM, PSL, PTB e Patriota.
>
> **Critério de Desempate no Ranking**: Em caso de empate no percentual de afinidade entre legendas ou parlamentares, o primeiro critério de desempate é o maior número de votos comparáveis considerados, privilegiando resultados baseados em uma amostra mais ampla e estatisticamente mais robusta.

---

## 🏛️ Fontes de Dados Oficiais e Rastreabilidade

O **LegisVisão** é alimentado exclusivamente por dados públicos governamentais oficiais de acordo com a **Lei de Acesso à Informação (Lei nº 12.527/2011)**. Todas as proposições, sessões e votos nominais possuem links diretos de auditoria para os portais oficiais de cada Casa Legislativa:

| Casa Legislativa | Portal de Dados Abertos | Endpoints Utilizados | Rastreabilidade no Frontend |
| :--- | :--- | :--- | :--- |
| **🏛️ Câmara dos Deputados** | [dadosabertos.camara.leg.br](https://dadosabertos.camara.leg.br/) | `/proposicoes`, `/votacoes`, `/deputados`, `/partidos` | Link direto para a **Ficha de Tramitação Oficial** e PDF do **Inteiro Teor**. |
| **🏛️ Senado Federal** | [legis.senado.leg.br/dadosabertos](https://legis.senado.leg.br/dadosabertos/) | `/materia/pesquisa/lista`, `/materia/votacoes`, `/senador/lista/atual` | Link direto para a **Página da Matéria no Senado** e resultado de deliberação. |

> 🔗 **Transparência Auditável**: Em cada página de detalhes de proposição (`/projetos/[id]`) e nos cards de votação, o cidadão encontra botões diretos para inspecionar o documento original e as atas oficiais de votação diretamente nos sites da Câmara e do Senado.

---

## 🤖 Engenharia e Desenvolvimento Acelerado por IA

A concepção, arquitetura, design de interface e implementação do **LegisVisão** foram desenvolvidos utilizando práticas modernas de **Engenharia de Software Aumentada por Inteligência Artificial (AI-Assisted Engineering)**, combinando as seguintes ferramentas:

- **🚀 Google Antigravity & Google Gemini**: Utilizados como agente autônomo principal de programação em par (pair programming), estruturação da arquitetura em camadas, implementação do design system (Tailwind CSS e Dark Mode), refatoração modular dos adaptadores de sincronização e otimização de batch upserts no banco de dados.
- **💻 GitHub Copilot**: Utilizado no ambiente de desenvolvimento para geração contextual de código TypeScript, validação de tipagens estritas, criação de rotas de API e aceleração de testes de componentes React.
- **📊 Microsoft 365 Copilot**: Utilizado na fase de planejamento estratégico, levantamento de requisitos de transparência pública, refinamento da metodologia de cálculo e elaboração da documentação técnica e cívica.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Linguagem**: [TypeScript 5](https://www.typescriptlang.org/)
- **Interface**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/) e [React Icons](https://react-icons.github.io/react-icons/)
- **Banco de Dados**: [PostgreSQL (Supabase)](https://supabase.com/) com driver `postgres` (Postgres.js)
- **Ingestão e Batch ETL**: [TSX](https://github.com/privatenumber/tsx)
- **Assistência de IA**: Google Antigravity, Google Gemini, GitHub Copilot e Microsoft 365 Copilot
- **Fontes de Dados**:
  - [API da Câmara dos Deputados](https://dadosabertos.camara.leg.br/swagger/api.html)
  - [API do Senado Federal](https://legis.senado.leg.br/dadosabertos/docs/ui/index.html)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: v20+
- **NPM**, **PNPM** ou **Yarn**
- Instância **PostgreSQL** ou projeto no **Supabase**

### 1. Clonar o Repositório
```bash
git clone https://github.com/didifive/legisvisao.git
cd legisvisao
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz:
```env
DATABASE_URL="postgresql://postgres:[SENHA]@[HOST]:5432/postgres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Aplicar Migrations no Banco de Dados
```bash
npm run migrate:push
```

### 5. Sincronizar Dados Oficiais (Câmara & Senado)
Execute o orquestrador completo para ingestão dos dados governamentais com batching de alta performance:
```bash
npx tsx scripts/sync/index.ts
```

### 6. Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 7. Validação de Tipos e Build de Produção
```bash
npx tsc --noEmit
npm run build
npm run start
```

---

## 📁 Estrutura de Diretórios

```
├── app/
│   ├── afinidade/           # Página de Visualização de Afinidades e Filtros
│   ├── api/                 # Endpoints REST (BFF com cache)
│   │   ├── metadata/        # Metadados e contagens globais
│   │   ├── parties/         # Consulta e detalhes de partidos e bancadas
│   │   ├── politicians/     # Consulta de parlamentares e histórico nominal
│   │   ├── projects/        # Catálogo de proposições e sessões de voto
│   │   ├── states/          # Lista de UFs disponíveis
│   │   ├── sync-status/     # Monitor de atualização das fontes oficiais
│   │   └── version/         # Versão do dataset canônico ativo
│   ├── components/          # Componentes visuais globais (Header, Footer, ThemeToggle)
│   ├── faq/                 # Página de Transparência, FAQ e Monitor de Fontes
│   ├── opiniao/             # Simulador de Votação e Revisão de Opiniões
│   ├── partidos/            # Páginas de Detalhes dos Partidos
│   ├── politicos/           # Páginas de Detalhes e Votações Nominais dos Parlamentares
│   ├── projetos/            # Rota /projetos/[id] (Detalhes da Proposição, Votos Nominais e Selo Bicameral)
│   ├── globals.css          # Design tokens, tema escuro/claro e utilitários
│   ├── layout.tsx           # Layout raiz com ThemeProvider
│   └── page.tsx             # Página inicial institucional
├── lib/
│   ├── match/               # Motor de cálculo determinístico e normalização
│   ├── cache.ts             # Cache client-side em memória com TTL
│   ├── db.ts                # Conexão singleton com PostgreSQL
│   ├── server-cache.ts      # Cache server-side em memória com TTL
│   ├── storage.ts           # Gerenciamento de localStorage e JSON v1
│   └── useDataVersion.ts    # Hook de invalidação automática de cache
├── scripts/
│   ├── sync/                # Rotinas de ingestão das APIs governamentais
│   │   ├── adapters/        # Adaptadores desacoplados de APIs públicas
│   │   │   ├── camara.ts    # Conector e parsers da API da Câmara dos Deputados
│   │   │   └── senado.ts    # Conector e parsers da API do Senado Federal
│   │   ├── client.ts        # Conexão Postgres, retentativas e concorrência
│   │   ├── index.ts         # Orquestrador geral de sincronização
│   │   ├── sync-parties.ts  # Ingestão de partidos políticos
│   │   ├── sync-politicians.ts # Ingestão de deputados e senadores
│   │   ├── sync-projects.ts # Ingestão de proposições canônicas e batch upserts
│   │   ├── sync-vote-sessions.ts # Ingestão de sessões de deliberação em lote
│   │   └── sync-votes.ts    # Ingestão de votos nominais em lote (batch 500)
├── supabase/
│   └── migrations/          # Migrations SQL versionadas
└── types/
    └── db.ts                # Tipagens TypeScript do schema de dados
```

---

## ⚖️ Termos de Uso e Neutralidade Cívica

> **Esta ferramenta não recomenda representantes. Apenas compara dados públicos.**

- **Finalidade Cívica e Educacional**: O **LegisVisão** é uma ferramenta de transparência pública, sem fins lucrativos ou vínculos com partidos políticos.
- **Vedações**: É estritamente vedado o uso desta plataforma, de seus relatórios, marca ou índices para fins de **propaganda eleitoral, campanhas político-partidárias ou promoção de candidaturas**.
- **Auditoria de Código**: O código-fonte é aberto sob a licença MIT para permitir auditoria independente de toda a lógica e dos dados coletados.

---

## 📄 Licença

Este projeto é licenciado sob a [MIT License](LICENSE).

---

## 👨‍💻 Autor

Desenvolvido por **Luis Zancanela**.

- 🌐 Website: [zancanela.dev.br](https://zancanela.dev.br)
- 💼 LinkedIn: [linkedin.com/in/luis-zancanela](https://www.linkedin.com/in/luis-zancanela)
- 🐙 GitHub: [@didifive](https://github.com/didifive)
- 📧 Contato: [luis@zancanela.dev.br](mailto:luis@zancanela.dev.br)
