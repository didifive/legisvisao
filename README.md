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

A aplicação permite que qualquer cidadão opine (**CONCORDO** ou **DISCORDO**) sobre propostas de lei reais (PL, PEC, PLP, MPV votadas no Plenário da Câmara dos Deputados) e compare seus posicionamentos de forma determinística com os votos nominais registrados pelos 513 Deputados Federais e as bancadas partidárias.

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
        timestamp data_apresentacao "Data de protocolo"
        varchar ultimo_status "Situação de tramitação"
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
        bigserial id PK "Chave primária interna"
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
        varchar status "SUCCESS | FAILED | RUNNING"
        int total_deputies "Total de deputados"
        int total_propositions "Total de proposições"
        int total_vote_sessions "Total de sessões"
        int total_votes "Total de votos nominais"
        varchar dataset_version "Timestamp de versão do cache"
        text last_error "Mensagem de erro em caso de falha"
    }
```

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

## 🛠️ Tecnologias Utilizadas

- **Frontend**: [Next.js 16.3 (Turbopack)](https://nextjs.org/) + [React 19](https://react.dev/)
- **Estilização**: [TailwindCSS v4](https://tailwindcss.com/) com paleta HSL dinâmica e suporte a tema Claro/Escuro (`next-themes`)
- **Ícones**: [React Icons (FontAwesome)](https://react-icons.github.io/react-icons/)
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) hospedado no [Supabase](https://supabase.com/)
- **Driver de Conexão**: [postgres.js](https://github.com/porsager/postgres) com pool de conexões otimizado (`prepare: false` para transaction pooler)
- **Pipeline de Ingestão**: Scripts TypeScript com `tsx` e rate limiting nativo

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Node.js**: `20.x` ou superior
- **NPM**: `10.x` ou superior
- **Instância PostgreSQL / Supabase**

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
Execute o script SQL em [`supabase/migrations/20260817000000_init.sql`](supabase/migrations/20260817000000_init.sql) no seu banco de dados ou via Supabase CLI:
```bash
npx supabase db push
```

### 4. Sincronizar os Dados da Câmara dos Deputados
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
| `/api/deputies` | `GET` | Lista deputados federais com suporte a filtros por `state`, `party` e `search` |
| `/api/deputies/[id]` | `GET` | Perfil completo do deputado e histórico de votações |
| `/api/parties` | `GET` | Lista partidos registrados na Câmara e total de membros |
| `/api/parties/[id]` | `GET` | Detalhes do partido, bancada de deputados e histórico de votos |
| `/api/states` | `GET` | Lista de UFs (estados) com deputados federais em exercício |
| `/api/sync-status` | `GET` | Status operacional e contadores da sincronização com a Câmara |
| `/api/system-status` | `GET` | Indicador de prontidão do sistema para a interface |
| `/api/metadata` | `GET` | Versão do dataset e metadados de atualização |

---

## 📄 Licença

Este projeto está licenciado sob os termos da licença [MIT](LICENSE).

Desenvolvido por **[Luis Zancanela](https://zancanela.dev.br)**.
