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

[🌐 Acessar LegisVisão](https://legisvisao.zancanela.dev.br) • [🐛 Reportar Problema](https://github.com/didifive/legisvisao/issues) • [⭐ Repositório GitHub](https://github.com/didifive/legisvisao)

</div>

---

## 📖 Visão Geral

O **LegisVisão** é uma plataforma cívica de código aberto desenvolvida para aproximar a sociedade civil das decisões do Poder Legislativo Brasileiro (Bicameralismo).

A aplicação permite que qualquer cidadão opine (**CONCORDO** ou **DISCORDO**) sobre proposições legislativas reais (PL, PEC, PLP, MPV deliberadas no Congresso Nacional) e compare seus posicionamentos de forma determinística com os votos nominais registrados por Deputados Federais, Senadores e Partidos Políticos.

A ferramenta é orientada pela **privacidade absoluta (*Local-First*)**: nenhuma resposta do usuário é enviada para servidores ou gravada em bancos de dados remotos.

---

## 🎯 Princípios Fundamentais

1. **Fonte de Verdade Pública**: Os dados provêm exclusivamente das APIs abertas da Câmara dos Deputados e do Senado Federal. O banco de dados local funciona estritamente como cache persistente de leitura.
2. **Cálculo Determinístico e Aberto**: O índice de afinidade é uma divisão aritmética direta (`Concordâncias / Comparações Válidas × 100`). Não há inteligência artificial no cálculo, pesos ocultos ou algoritmos opacos.
3. **Privacidade Local-First**: O armazenamento de respostas ocorre 100% no `localStorage` do navegador do visitante.
4. **Neutralidade Cívica**: A plataforma não emite juízo de valor, não ranqueia representantes por mérito e não faz recomendação eleitoral.

---

## 🔄 Fluxos de Uso da Aplicação

### 1. Diagrama de Sequência: Jornada do Usuário (Caminho Feliz)

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

## 🏗️ Arquitetura do Sistema e Componentes

### 2. Diagrama de Componentes e Fontes Oficiais

```mermaid
flowchart TB
    subgraph FontesOficiais["🌐 Fontes de Dados Governamentais Oficiais"]
        CamaraAPI["🏛️ API Câmara dos Deputados<br/>(dadosabertos.camara.leg.br)<br/>• Proposições, Autores e Tramitações<br/>• Sessões de Votação e Votos Nominais<br/>• Deputados Federais, Partidos e Legislaturas"]
        SenadoAPI["🏛️ API Senado Federal<br/>(legis.senado.leg.br/dadosabertos)<br/>• Senadores em Exercício<br/>• Mandatos e Legislaturas"]
    end

    subgraph SyncEngine["⚙️ Orquestrador de Sincronização (scripts/sync/)"]
        SyncIndex["index.ts<br/>(Controle de Versão e Execução)"]
        SyncParties["sync-parties.ts"]
        SyncPoliticians["sync-politicians.ts"]
        SyncProjects["sync-projects.ts"]
        SyncSessions["sync-vote-sessions.ts"]
        SyncVotes["sync-votes.ts"]
        SyncClient["client.ts<br/>(fetchWithRetry, sql postgres)"]
    end

    subgraph Database["🗄️ Banco de Dados Relacional (PostgreSQL / Supabase)"]
        direction TB
        T_Parties["political_parties"]
        T_Politicians["politicians"]
        T_Mandates["mandates"]
        T_History["politician_party_history"]
        T_Projects["legislative_projects"]
        T_Records["project_house_records"]
        T_Phases["legislative_phases"]
        T_Sessions["vote_sessions"]
        T_Votes["politician_votes"]
        T_Sync["sync_control"]
    end

    subgraph BackendBFF["🚀 Backend / BFF (Next.js API Routes com Cache Server-side)"]
        API_Projects["/api/projects & /api/projects/[id]"]
        API_Politicians["/api/politicians & /api/politicians/[id]"]
        API_Parties["/api/parties & /api/parties/[id]"]
        API_SyncStatus["/api/sync-status"]
        API_Metadata["/api/metadata & /api/version"]
        ServerCache["lib/server-cache.ts (Cache em memória + TTL)"]
    end

    subgraph ClientSide["💻 Aplicação Frontend (Next.js 16 + React 19 + Local-First)"]
        direction TB
        subgraph Pages["Rotas da Aplicação"]
            PageHome["Início (/)"]
            PageOpiniao["Análise de Propostas (/opiniao)"]
            PageRevisao["Revisão de Opiniões (/opiniao/revisao)"]
            PageAfinidade["Resultados de Afinidade (/afinidade)"]
            PagePolitico["Perfil do Parlamentar (/politicos/[id])"]
            PagePartido["Perfil do Partido (/partidos/[id])"]
            PageFAQ["FAQ e Fontes (/faq)"]
        end

        subgraph ClientModules["Módulos Locais e Motor de Cálculo"]
            Storage["lib/storage.ts<br/>(localStorage, export/import JSON v1)"]
            ClientCache["lib/cache.ts<br/>(cachedFetch com TTL)"]
            MatchCalc["lib/match/<br/>• calculatePoliticianMatch<br/>• calculatePartyMatch<br/>• normalizeVotes<br/>• attachProjectId"]
        end
    end

    %% Relações de Ingestão (Sync)
    CamaraAPI -->|"JSON REST API"| SyncClient
    SenadoAPI -->|"JSON REST API"| SyncClient
    SyncClient --> SyncParties & SyncPoliticians & SyncProjects & SyncSessions & SyncVotes
    SyncParties --> T_Parties
    SyncPoliticians --> T_Politicians & T_Mandates & T_History
    SyncProjects --> T_Projects & T_Records & T_Phases
    SyncSessions --> T_Sessions
    SyncVotes --> T_Votes
    SyncIndex --> T_Sync

    %% Relações do Banco com o BFF
    Database --> ServerCache
    ServerCache --> BackendBFF

    %% Relações do BFF com o Frontend
    BackendBFF -->|"JSON Responses"| ClientCache
    ClientCache --> Pages

    %% Relações Internas do Frontend
    PageOpiniao -->|"Persiste Votos"| Storage
    PageRevisao -->|"Gerencia / Limpa"| Storage
    Storage -->|"Fornece Votos"| MatchCalc
    Pages --> MatchCalc
    MatchCalc --> PageAfinidade
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

### 3. Afinidade Partidária (com Fidelidade Temporal)
$$\text{Índice do Partido (\%)} = \left( \frac{\text{Total de Concordâncias dos Parlamentares Filiados}}{\text{Total de Votos Comparáveis dos Filiados}} \right) \times 100$$

> **Fidelidade Histórica de Filiação**: Cada voto nominal é atribuído à legenda em que o parlamentar estava filiado na data da sessão de deliberação (cruzamento temporal de `vote_sessions.date` com `politician_party_history.start_date` e `end_date`). Se um político trocou de partido, seus votos passados permanecem com o partido da época, e os novos votos são computados para o partido atual.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Linguagem**: [TypeScript 5](https://www.typescriptlang.org/)
- **Interface**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/) e [React Icons](https://react-icons.github.io/react-icons/)
- **Banco de Dados**: [PostgreSQL (Supabase)](https://supabase.com/) com driver `postgres` (Postgres.js)
- **Ingestão e Scripts**: [TSX](https://github.com/privatenumber/tsx)
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

### 5. Sincronizar Dados Oficiais
Execute o orquestrador completo para ingestão dos dados governamentais:
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
│   │   ├── client.ts        # Cliente HTTP com retentativas e logger
│   │   ├── index.ts         # Orquestrador geral de sincronização
│   │   ├── sync-parties.ts  # Ingestão de partidos políticos
│   │   ├── sync-politicians.ts # Ingestão de deputados federais e senadores
│   │   ├── sync-projects.ts # Ingestão de proposições canônicas
│   │   ├── sync-vote-sessions.ts # Ingestão de sessões de deliberação
│   │   └── sync-votes.ts    # Ingestão de votos nominais brutos
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
- 📧 Contato: [contato@zancanela.dev.br](mailto:contato@zancanela.dev.br)
