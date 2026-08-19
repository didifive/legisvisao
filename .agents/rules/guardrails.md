---
trigger: always_on
---

# Guardrails e Diretrizes do Repositório LegisVisão

Este documento estabelece as regras obrigatórias e princípios arquiteturais que **todos os agentes de IA, desenvolvedores e pipelines automatizados devem seguir estritamente**.

---

## 🛡️ 1. Segurança e Proteção de Segredos (Zero Leaks)

- **Proibição Absoluta de Exposição**:
  - **NUNCA** envie, imprima em logs, registre em arquivos de documentação, commits ou respostas nenhum token, chave de API, senha de banco de dados (`DATABASE_URL`, credenciais do Supabase, chaves JWT, tokens do GitHub).
  - Todas as variáveis sensíveis devem residir estritamente no arquivo `.env.local` (ignorado pelo Git) e nos **GitHub Secrets**.
  - O arquivo `.gitignore` deve sempre proteger `.env*` e arquivos temporários de credenciais.

---

## 🔄 2. Retrocompatibilidade Estrita e Migração de Dados (Import/Export)

- **Tolerância Absoluta a Versões Anteriores (Legado)**:
  - O sistema opera no modelo *Local-First* onde os usuários realizam backup e restauração dos seus votos em formato JSON.
  - **Qualquer nova versão deve ser 100% retrocompatível** com arquivos exportados em versões anteriores.
- **Adaptação Obrigatória em Mudanças Estruturantes**:
  - Caso haja qualquer alteração estruturante no esquema de dados ou formato de respostas, o parser e serializador em `lib/storage.ts` **deve ser adaptado para converter automaticamente os dados antigos**.
- **Regras do Parser de Importação (`lib/storage.ts`)**:
  1. Reconhecer formatos legados (ex: dicionário plano `{ "1": "SIM", "2": "NAO" }` e formato estruturado `{ version: "1.0", answers: { ... } }`).
  2. Fazer fallback gracioso e coerção segura de tipos (IDs numéricos vs strings, strings legadas como "SIM"/"NAO" para "CONCORDO"/"DISCORDO").
  3. **Nunca quebrar a aplicação**: Caso algum registro legado pontual não possa ser convertido, o sistema deve importar todas as respostas válidas e emitir um aviso transparente e amigável ao usuário, sem travar ou corromper o estado local.

---

## 🌿 3. Política de Branches e Pull Requests (Main Protegida)

- **Push Direto Bloqueado na Main**:
  - A branch `main` é estritamente protegida contra pushes e commits diretos.
- **Fluxo de Trabalho Obrigatório**:
  - Todo novo desenvolvimento, ajuste ou refatoração deve ser iniciado em uma branch temática nomeada com o prefixo apropriado:
    - `feature/nome-da-funcionalidade` (novos recursos e telas)
    - `fix/nome-da-correcao` (correções de bugs)
    - `refactor/nome-da-melhoria` (otimizações de arquitetura e performance)
- **Integração Exclusiva via Pull Request (PR)**:
  - A mesclagem para a `main` ocorre exclusivamente via Pull Request após validação completa de tipagem (`npx tsc --noEmit`) e build de produção (`npm run build`).

---

## 🏛️ 4. Papel da Base de Dados e Origem da Informação

- **Apenas Cache Persistente das Fontes Oficiais**:
  - A base de dados PostgreSQL/Supabase existe primariamente para evitar requisições constantes e sobrecarga às APIs dos órgãos oficiais (**Câmara dos Deputados**, **Senado Federal** e **TSE**).
  - **Nenhum dado legislativo é inventado ou mockado**.
  - A atualização do banco de dados ocorre exclusivamente através dos scripts em `scripts/sync/`, disparados periodicamente pela esteira do **GitHub Actions** (`.github/workflows/sync-data.yml`) ou manualmente.

---

## ⚡ 5. Camada de Cache no Servidor / BFF (Backend For Frontend)

- **Estratégia de Cache e Invalidação Inteligente**:
  - Para proteger a cota de conexões e o pooler do banco de dados (`DATABASE_URL`), as rotas de API do servidor (`/api/propositions`, `/api/deputies`, `/api/parties`, etc.) utilizam cache em memória monitorando a versão do dataset (`sync_control.dataset_version`).
  - O BFF consulta a versão ativa a cada intervalo regular. Se não houver alteração, o cache em memória é servido instantaneamente (sub-5ms) sem gerar novas queries pesadas ao PostgreSQL.
  - Caso haja uma nova sincronização detectada, o cache do servidor é automaticamente invalidado e reconstruído.

---

## 💻 6. Qualidade de Código, Estilo e Build

- Todo código desenvolvido deve passar no `npm run build` e `npx tsc --noEmit` sem erros de tipagem TypeScript ou quebras de renderização estática.
- Preservar os padrões visuais e a paleta de cores HSL alinhados ao ecossistema do desenvolvedor Luis Zancanela.
- Não utilizar travessão em textos de cópia e documentação.
