<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes do Projeto e Aprendizados de Qualidade de Código

Para mais detalhes e diretrizes estruturais completas, consulte [.agents/rules/guardrails.md](file:///e:/CODE/pessoais/legisvisao/.agents/rules/guardrails.md).

## Boas Práticas e Qualidade (SonarQube / Linter)

1. **Web APIs Modernas (DOM & File/Blob)**:
   - Preferir `childNode.remove()` diretamente em vez de `parentNode.removeChild(childNode)`.
   - Preferir `await file.text()` ou `await blob.text()` diretamente em vez do padrão legado com eventos assíncronos de `FileReader#readAsText()`.

2. **Complexidade Cognitiva Reduzida**:
   - Evitar funções extensas com aninhamentos de loops, try/catch e condicionais que excedam complexidade cognitiva 15.
   - Extrair funções utilitárias puras e menores para parsing, coerção e validação de dados.

3. **Encadeamento Opcional (Sonar typescript:S6582)**:
   - Priorizar encadeamento opcional (*optional chaining*, ex: `objeto?.propriedade`, `array?.[index]`, `funcao?.()`) em vez de encadeamento redundante com operador lógico AND (`objeto && objeto.propriedade`).

4. **Convenções de Texto e Estilo**:
   - Não utilizar travessão em textos de cópia e documentação.
