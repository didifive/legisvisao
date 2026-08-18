---
trigger: always_on
---

# Guardrails e Diretrizes do Repositório VerCandidato

Este documento estabelece as regras obrigatórias e princípios arquiteturais que **todos os agentes de IA, desenvolvedores e pipelines automatizados devem seguir estritamente**.

---

## 🛡️ 1. Segurança e Proteção de Segredos (Zero Leaks)

- **Proibição Absoluta de Exposição**:
  - **NUNCA** envie, imprima em logs, registre em arquivos de documentação, commits ou respostas nenhum token, chave de API, senha de banco de dados (`DATABASE_URL`, credenciais do Supabase, chaves JWT, tokens do GitHub).
  - Todas as variáveis sensíveis devem residir estritamente no arquivo `.env.local` (ignorado pelo Git) e nos **GitHub Secrets**.
  - O arquivo `.gitignore` deve sempre proteger `.env*` e arquivos temporários de credenciais.

---

## 🔄 2. Retrocompatibilidade e Migração de Dados de Usuário (Import/Export)

- **Tolerância a Versões Anteriores (Legado)**:
  - O sistema opera no modelo *Local-First* onde os usuários realizam backup e restauração dos seus votos em formato JSON.
  - **Qualquer nova versão deve ser 100% retrocompatível** com arquivos exportados em versões anteriores.
  - O parser de importação (`lib/storage.ts`) deve:
    1. Reconhecer formatos legados (ex: dicionário plano `{ "1": "SIM", "2": "NAO" }` e formato estruturado `{ version: "1.0", answers: { ... } }`).
    2. Fazer fallback gracioso para conversão de tipos (IDs numéricos vs strings).
    3. Nunca quebrar a aplicação caso o usuário importe um backup antigo.

---

## 🏛️ 3. Papel da Base de Dados e Origem da Informação

- **Apenas Cache Persistente das Fontes Oficiais**:
  - A base de dados PostgreSQL/Supabase existe primariamente para evitar requisições constantes e sobrecarga às APIs dos órgãos oficiais (**Câmara dos Deputados**, **Senado Federal** e **TSE**).
  - **Nenhum dado legislativo é inventado ou mockado**.
  - A atualização do banco de dados ocorre exclusivamente através dos scripts em `scripts/sync/`, disparados periodicamente pela esteira do **GitHub Actions** (`.github/workflows/sync-data.yml`) ou manualmente.

---

## ⚡ 4. Camada de Cache no Servidor / BFF (Backend For Frontend)

- **Estratégia de Cache de 1 Dia / Invalidação Inteligente**:
  - Para proteger a cota de conexões e pooler do banco de dados (`DATABASE_URL`), as rotas de API do servidor (`/api/projects`, `/api/politicians`, `/api/parties`, etc.) utilizam cache em memória ou revalidação diária baseada no timestamp de `sync_control`.
  - O BFF consulta a data da última atualização (`last_sync`). Se não houver alteração desde o dia anterior, o cache em memória é servido instantaneamente sem gerar novas queries pesadas ao PostgreSQL.
  - Caso haja uma nova sincronização detectada, o cache local do servidor é invalidado e reconstruído.

---

## 💻 5. Qualidade de Código e Build

- Todo código desenvolvido deve passar no `npm run build` sem erros de tipagem TypeScript ou quebras de renderização estática.
- Preservar os padrões visuais e a paleta de cores HSL alinhados ao ecossistema do desenvolvedor Luis Zancanela.
