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

## 🔄 2. Retrocompatibilidade Estrita e Migração de Dados (Import/Export e LocalStorage)

- **Tolerância Absoluta a Versões Anteriores (Legado)**:
  - O sistema opera no modelo *Local-First* onde os usuários realizam backup, restauração e persistência de dados localmente (localStorage / arquivos JSON exportados).
  - **Qualquer nova versão deve ser 100% retrocompatível** com arquivos exportados em versões anteriores e com schemas salvos no `localStorage` de usuários de versões passadas.
- **Protocolo de Verificação Preventiva e Alinhamento Obrigatório**:
  - Antes de implementar qualquer alteração em tipos, chaves de armazenamento, formatos de serialização ou fluxo de dados de usuário, o agente **DEVE avaliar o risco de quebra de retrocompatibilidade**.
  - **Sempre perguntar e validar com o usuário**: Caso uma alteração pretendida possa tocar em chaves do `localStorage`, formato de import/export de votos ou estrutura de respostas salvas, o agente deve alertar explicitamente o usuário, apresentar os possíveis impactos e propor os caminhos viáveis (ex: manter suporte direto ou introduzir migração/conversão automática transparente).
- **Adaptação Obrigatória em Mudanças Estruturantes**:
  - Caso haja qualquer alteração estruturante no esquema de dados ou formato de respostas, o parser e serializador em `lib/storage.ts` **deve ser adaptado para converter automaticamente os dados antigos**.
  - O estado carregado do `localStorage` deve ser normalizado graciosamente durante a leitura, garantindo que usuários com dados legados no navegador não sofram travamento (white-screen), erros silenciosos ou perda das informações já salvas.
- **Regras do Parser de Importação (`lib/storage.ts`)**:
  1. Reconhecer formatos legados (ex: dicionário plano `{ "1": "SIM", "2": "NAO" }` e formato estruturado `{ version: "1.0", answers: { ... } }`).
  2. Fazer fallback gracioso e coerção segura de tipos (IDs numéricos vs strings, strings legadas como "SIM"/"NAO" para "CONCORDO"/"DISCORDO").
  3. **Nunca quebrar a aplicação**: Caso algum registro legado pontual não possa ser convertido, o sistema deve importar todas as respostas válidas e emitir um aviso transparente e amigável ao usuário, sem travar ou corromper o estado local.

---

## 🌿 3. Política de Branches, Commits e Pull Requests (Main Protegida)

- **Proibição de Commits Sem Aprovação Explícita**:
  - **NUNCA execute `git commit` de forma autônoma sem antes solicitar e obter aprovação explícita do usuário**.
  - O agente deve sempre finalizar as alterações, executar a validação de testes e tipos, apresentar o resumo do que foi feito e perguntar explicitamente se o usuário autoriza a criação do commit.
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

## 🗄️ 4. Governança do Banco de Dados, Migrations e Ingestão de Dados

- **Apenas Cache Persistente das Fontes Oficiais**:
  - A base de dados PostgreSQL/Supabase existe primariamente para evitar requisições constantes e sobrecarga às APIs dos órgãos oficiais (**Câmara dos Deputados**, **Senado Federal** e **TSE**).
  - **Nenhum dado legislativo é inventado ou mockado**.
  - A atualização do banco de dados ocorre exclusivamente através dos scripts em `scripts/sync/`, disparados periodicamente pela esteira do **GitHub Actions** (`.github/workflows/sync-data.yml`) ou manualmente.

- **Proibição Absoluta de Alterações Estruturais Diretas (DDL)**:
  - **NUNCA** execute scripts ou comandos ad-hoc para alterar a estrutura de tabelas ou do banco de dados diretamente (ex: `ALTER TABLE`, `CREATE TABLE`, `DROP COLUMN`, `ADD COLUMN`).
  - Qualquer alteração de esquema/estrutura deve ser realizada **exclusivamente via arquivos de migração versionados** dentro do diretório `supabase/migrations/` (com timestamp e descrição no nome do arquivo SQL).

- **Protocolo para Ingestão, Manipulação ou Exclusão de Dados (DML)**:
  - Para tarefas de ingestão, reset, manipulação ou exclusão de registros no banco de dados, o agente **NÃO deve executar comandos destrutivos ou mutações em massa de forma autônoma**.
  - O agente deve **apenas fornecer o script SQL correspondente e perguntar/confirmar o caminho e autorização** com o usuário antes de qualquer ação.

---

## ⚡ 5. Camada de Cache no Servidor / BFF (Backend For Frontend)

- **Estratégia de Cache e Invalidação Inteligente**:
  - Para proteger a cota de conexões e o pooler do banco de dados (`DATABASE_URL`), as rotas de API do servidor (`/api/propositions`, `/api/deputies`, `/api/parties`, etc.) utilizam cache em memória monitorando a versão do dataset (`sync_control.dataset_version`).
  - O BFF consulta a versão ativa a cada intervalo regular. Se não houver alteração, o cache em memória é servido instantaneamente (sub-5ms) sem gerar novas queries pesadas ao PostgreSQL.
  - Caso haja uma nova sincronização detectada, o cache do servidor é automaticamente invalidado e reconstruído.

---

## 💻 6. Qualidade de Código, Estilo e Build

- Todo código desenvolvido deve passar no `npm run build` e `npx tsc --noEmit` sem erros de tipagem TypeScript ou quebras de renderização estática.
- **Cobertura Máxima e Relevância de Testes Unitários**:
  - Sempre buscar e manter a máxima cobertura de testes unitários nas lógicas de aplicação, cálculo de afinidade, parsers, hooks e utilitários.
  - **Foco no Domínio e Valor de Negócio**: Evitar testes puramente superficiais ou meramente cosméticos. Os testes unitários devem exercitar cenários reais de negócio, casos de borda legislativos, formatos legados, coerção de dados e robustez de fluxo do usuário.
- **Boas Práticas de Código e SonarQube**:
  - **Complexidade Cognitiva (<= 15)**: Manter funções e componentes com complexidade cognitiva reduzida (limite estrito <= 15).
    - Extrair blocos lógicos de parsing, validação, ordenação e coerção em funções utilitárias puras fora do componente.
    - Em componentes com renderização extensa de cartões ou listas (ex: `RevisaoPage`, `VoteForm`, `ProjectDetailsClient`), extrair subcomponentes dedicados (ex: `AnsweredPropositionCard`, `UnvotedPropositionCard`, `SessionsSelectorGrid`).
  - **typescript:S3358 (Operadores Ternários Aninhados)**: Proibido o uso de operadores ternários aninhados (`cond1 ? a : cond2 ? b : c`). Extrair funções utilitárias isoladas (`getStatusBadgeClass`, `getToastTypeClass`) com cláusulas `if/return` claras.
  - **typescript:S6582 (Encadeamento Opcional)**: Sempre priorizar o uso de encadeamento opcional (*optional chaining*, ex: `objeto?.propriedade`, `array?.[index]`, `funcao?.()`) em vez de encadeamento redundante com operador lógico AND (`objeto && objeto.propriedade`), mantendo o código mais conciso, limpo e legível.
  - **typescript:S6571 (Ordenação com localeCompare)**: Ao utilizar `.sort()` em listas de strings, fornecer obrigatoriamente um comparador com `a.localeCompare(b, "pt-BR")` para assegurar ordenação correta e sensível a acentos no idioma português.
  - **typescript:S6578 (Busca com Set.has)**: Em filtros que buscam pertinência em arrays dentro de iterações, converter coleções para `new Set(...)` e utilizar `set.has(item)` em vez de `array.includes(item)`.
  - **typescript:S6557 (Type Aliases para Uniões)**: Criar `type` aliases explícitos para uniões de literais repetidas (ex: `type SortOption = "relevance" | "recent" | "oldest";`).
  - **Espaçamento Explícito em JSX**: Evitar espaços soltos ao final de linhas antes de tags inline (`<strong>`, `<span>`). Utilizar `{" "}` explicitamente para prevenir avisos de espaçamento ambíguo.
  - **Web APIs Modernas (DOM & File/Blob)**:
    - Preferir `childNode.remove()` diretamente em vez de `parentNode.removeChild(childNode)`.
    - Preferir `await file.text()` ou `await blob.text()` (Promises modernas) em vez do padrão legado com eventos assíncronos de `FileReader#readAsText()`.
- Preservar os padrões visuais e a paleta de cores HSL alinhados ao ecossistema do desenvolvedor Luis Zancanela.
- Não utilizar travessão em textos de cópia e documentação.
