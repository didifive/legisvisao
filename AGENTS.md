<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes: APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes do Projeto e Aprendizados de Qualidade de Código

Para mais detalhes e diretrizes estruturais completas, consulte [.agents/rules/guardrails.md](file:///e:/CODE/pessoais/legisvisao/.agents/rules/guardrails.md).

## Boas Práticas e Qualidade (SonarQube / Linter)

1. **Web APIs Modernas (DOM & File/Blob)**:
   - Preferir `childNode.remove()` diretamente em vez de `parentNode.removeChild(childNode)`.
   - Preferir `await file.text()` ou `await blob.text()` diretamente em vez do padrão legado com eventos assíncronos de `FileReader#readAsText()`.

2. **Complexidade Cognitiva Reduzida (<= 15)**:
   - Evitar funções extensas com aninhamentos de loops, try/catch e condicionais que excedam complexidade cognitiva 15.
   - Extrair funções utilitárias puras fora dos componentes para filtros, parsing, coerção e validação de dados.
   - Em componentes com renderização extensa de cards ou listas, extrair subcomponentes dedicados (ex: `AnsweredPropositionCard`, `UnvotedPropositionCard`).

3. **Operadores Ternários Aninhados (Sonar typescript:S3358)**:
   - Proibido aninhar ternários inline em JSX ou retornos de função (`cond1 ? a : cond2 ? b : c`).
   - Extrair funções auxiliares puras com `if/return` para classes de badge, toast ou formatação (ex: `getStatusBadgeClass`, `getToastTypeClass`).

4. **Encadeamento Opcional (Sonar typescript:S6582)**:
   - Priorizar encadeamento opcional (*optional chaining*, ex: `objeto?.propriedade`, `array?.[index]`, `funcao?.()`) em vez de encadeamento redundante com operador lógico AND (`objeto && objeto.propriedade`).

5. **Ordenação de Strings com localeCompare (Sonar typescript:S6571)**:
   - Sempre fornecer comparador `a.localeCompare(b, "pt-BR")` em `.sort()` de listas alfabéticas para garantir ordenação correta com acentuação.

6. **Coleções e Busca com Set (Sonar typescript:S6578)**:
   - Para checagem de existência de elementos em arrays dentro de filtros, instanciar `Set` e utilizar `set.has(item)` em vez de `array.includes(item)`.

7. **Aliases para Tipos de União (Sonar typescript:S6557)**:
   - Extrair tipos de união repetidos em `type` aliases explícitos (ex: `type SortOption = "relevance" | "recent" | "oldest"`).

8. **Espaçamento Explícito em Textos JSX**:
   - Utilizar `{" "}` antes ou depois de tags como `<strong>` ou `<span>` em vez de espaços soltos no final de linhas.

9. **Convenções de Texto e Estilo**:
   - Não utilizar travessão em textos de cópia e documentação.
