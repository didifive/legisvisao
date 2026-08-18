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

    subgraph ExtSystems ["🌐 Sistemas Externos (Dados Abertos)"]
        camara["🏛️ <b>API da Câmara dos Deputados</b><br/><i>[Sistema Externo / REST]</i><br/>Proposições, sessões e votos nominais"]:::ext
    end

    subgraph LegisBoundary ["🏛️ LegisVisão (Container Boundary)"]
        spa["💻 <b>Single-Page / Web App</b><br/><i>[Next.js 16 / React 19 / Tailwind]</i><br/>Interface Local-First responsiva onde o cálculo ocorre 100% no cliente"]:::container
        storage[("💾 <b>Armazenamento Local</b><br/><i>[localStorage]</i><br/>Armazena opiniões do cidadão de forma estritamente local e privada")]:::db
        bff["⚙️ <b>Backend / BFF & APIs</b><br/><i>[Next.js Route Handlers]</i><br/>Serve catálogo de proposições, deputados e histórico com cache em memória"]:::container
        db[("🗄️ <b>Banco de Dados Relacional</b><br/><i>[PostgreSQL / Supabase]</i><br/>Cache estruturado de 5 tabelas enxutas e alta performance")]:::db
        sync["⚡ <b>Sync Engine (CLI)</b><br/><i>[TSX / Node.js Scripts]</i><br/>Pipeline de ingestão e normalização rápida dos dados oficiais da Câmara"]:::container
    end

    %% Fluxos do Usuário e Frontend
    cidadao -->|"1. Opina e consulta afinidade<br/>[HTTPS]"| spa
    spa <-->|"2. Grava/Lê respostas locais<br/>[Web Storage API]"| storage
    spa -->|"3. Requisita propostas e votos nominais<br/>[HTTPS / JSON]"| bff

    %% Fluxos de Backend e Persistência
    bff -->|"4. Consulta dados com cache inteligente<br/>[SQL / Connection Pool]"| db
    sync -->|"5. Coleta dados oficiais da Câmara<br/>[HTTPS / REST JSON]"| camara
    sync -->|"6. Atualiza tabelas e sync_control<br/>[PostgreSQL / SQL]"| db
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
    }

    VOTE_SESSIONS {
        varchar id PK "ID da votação (ex: 2255678-120)"
        int proposicao_id FK "ID da proposição"
        timestamp data_hora "Data e hora da votação"
        text descricao "Objeto da votação"
        varchar resultado "Resultado (Aprovado / Rejeitado)"
        varchar sigla_orgao "Órgão deliberativo (PLEN)"
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

## 📐 Fórmula Determinística de Afinidade

O motor de cálculo (`lib/match/`) cruza determinística e pontualmente cada resposta do usuário com os votos nominais dos deputados:

$$\text{Afinidade}(\%) = \left( \frac{\sum \text{Concordâncias}}{\text{Total de Votações Comparáveis}} \right) \times 100$$

### Regras de Normalização de Votos:
- **Concordância**:
  - Usuário escolheu **CONCORDO** e Deputado votou **SIM**.
  - Usuário escolheu **DISCORDO** e Deputado votou **NÃO**.
- **Divergência**:
  - Usuário escolheu **CONCORDO** e Deputado votou **NÃO**.
  - Usuário escolheu **DISCORDO** e Deputado votou **SIM**.
- **Não comparável** (ignorado do denominador):
  - Deputado registrou *Abstenção*, *Obstrução*, *Artigo 17* ou esteve *Ausente*.
- **Afinidade Partidária**:
  - Média aritmética dos índices de convergência de todos os deputados filiados à legenda nas matérias avaliadas.

---

## 🤖 Engenharia e Desenvolvimento Acelerado por IA

A concepção, arquitetura, design de interface e implementação do **LegisVisão** foram desenvolvidos utilizando práticas modernas de **Engenharia de Software Aumentada por Inteligência Artificial (AI-Assisted Engineering)**, combinando as seguintes ferramentas:

- **🚀 Google Antigravity & Google Gemini**: Utilizados como agente autônomo principal de programação em par (pair programming), estruturação da arquitetura em camadas, implementação do design system (Tailwind CSS e Dark Mode), refatoração modular dos scripts de sincronização e otimização de batch inserts no banco de dados.
- **💻 GitHub Copilot**: Utilizado no ambiente de desenvolvimento para geração contextual de código TypeScript, validação de tipagens estritas, criação de rotas de API e aceleração de testes de componentes React.
- **📊 Microsoft 365 Copilot**: Utilizado na fase de planejamento estratégico, levantamento de requisitos de transparência pública, refinamento da metodologia de cálculo e elaboração da documentação técnica e cívica.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: [Next.js 16.3 (Turbopack)](https://nextjs.org/) + [React 19](https://react.dev/)
- **Estilização**: [TailwindCSS v4](https://tailwindcss.com/) com paleta HSL dinâmica e suporte a tema Claro/Escuro (`next-themes`)
- **Ícones**: [React Icons (FontAwesome)](https://react-icons.github.io/react-icons/)
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) hospedado no [Supabase](https://supabase.com/)
- **Driver de Conexão**: [postgres.js](https://github.com/porsager/postgres) com pool de conexões otimizado (`prepare: false` para transaction pooler)
- **Pipeline de Ingestão**: Scripts TypeScript com `tsx` e rate limiting nativo
- **SEO & Metadados**: OpenGraph dinâmico com `@vercel/og`, sitemap XML dinâmico e Web App Manifest (PWA)

---

## 📁 Estrutura de Diretórios

```
├── app/
│   ├── afinidade/           # Visualização de Afinidades por Deputado e Partido
│   ├── api/                 # Endpoints REST (BFF com cache inteligente)
│   │   ├── deputies/        # Consulta e perfil de Deputados Federais
│   │   ├── metadata/        # Metadados e versão do dataset ativo
│   │   ├── parties/         # Consulta de legendas e bancadas
│   │   ├── politicians/     # Rota de compatibilidade para deputados
│   │   ├── projects/        # Rota de compatibilidade para proposições
│   │   ├── propositions/    # Catálogo de proposições e sessões nominais
│   │   ├── states/          # Lista de UFs representadas
│   │   ├── sync-status/     # Monitor de atualização das fontes oficiais
│   │   ├── system-status/   # Indicador de prontidão do sistema
│   │   └── version/         # Versão do dataset ativo
│   ├── components/          # Componentes visuais globais (Header, Footer, ThemeToggle)
│   ├── faq/                 # Metodologia, FAQ e Monitor de Fontes da Câmara
│   ├── og-image/            # Gerador dinâmico de imagem Open Graph (@vercel/og)
│   ├── opiniao/             # Simulador de Votação e Minhas Opiniões (Revisão)
│   ├── partidos/            # Páginas de Detalhes dos Partidos e Bancadas
│   ├── politicos/           # Páginas de Perfil e Votações Nominais dos Deputados
│   ├── projetos/            # Detalhes da Proposição, Texto Integral e Votos Nominais
│   ├── globals.css          # Design tokens HSL, tema escuro/claro e utilitários
│   ├── layout.tsx           # Layout raiz com ThemeProvider e SystemStatusProvider
│   ├── manifest.ts          # Web App Manifest (PWA)
│   ├── page.tsx             # Página inicial institucional e hero
│   ├── robots.ts            # Configuração de indexação para buscadores
│   └── sitemap.ts           # Sitemap XML dinâmico (deputados, projetos, partidos)
├── lib/
│   ├── match/               # Motor de cálculo determinístico e normalização de votos
│   ├── cache.ts             # Cache client-side (sessionStorage) com TTL de 3 minutos
│   ├── db.ts                # Conexão singleton com PostgreSQL (postgres.js)
│   ├── metadata.ts          # Configurações globais de SEO e Open Graph
│   ├── server-cache.ts      # Cache server-side em memória com TTL de 15 minutos
│   ├── storage.ts           # Gerenciamento Local-First de votos (localStorage)
│   └── urls.ts              # Configuração centralizada de URLs e contatos
├── scripts/
│   └── sync/                # Pipeline de ingestão da API de Dados Abertos da Câmara
│       ├── client.ts        # Cliente Postgres, controle de concorrência e rate-limiting
│       ├── index.ts         # Orquestrador linear de sincronização
│       ├── sync-deputies.ts # Ingestão dos 513 deputados federais da 57ª legislatura
│       ├── sync-parties.ts  # Ingestão de partidos políticos com representação
│       ├── sync-propositions.ts # Ingestão de proposições e sessões nominais do Plenário
│       └── sync-votes.ts    # Ingestão em lote dos votos nominais individuais
├── supabase/
│   └── migrations/          # Migration SQL minimalista do PostgreSQL (5 tabelas)
└── types/
    └── db.ts                # Tipagens TypeScript estritas do schema e domínio
```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: `20.x` ou superior
- **NPM**: `10.x` ou superior
- **Instância PostgreSQL** ou projeto no **Supabase**

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
```

### 3. Aplicar o Esquema do Banco de Dados
Execute a migration inicial com o Supabase CLI ou via script:
```bash
npm run db:reset
# ou npx supabase db push
```

### 4. Sincronizar os Dados Oficiais da Câmara dos Deputados
Execute o pipeline de ingestão linear para popular os 513 deputados, partidos, proposições e votos nominais:
```bash
npm run sync
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 6. Build de Produção
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
