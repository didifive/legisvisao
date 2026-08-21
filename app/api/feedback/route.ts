import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FeedbackPayload {
  description: string;
  category?: string;
  propositionId?: number | string;
  propositionTitle?: string;
  sessionId?: string;
  sessionTitle?: string;
  reportedSummary?: string;
  pageUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeedbackPayload;
    const {
      description,
      category = "RESUMO_INCORRETO",
      propositionId,
      propositionTitle,
      sessionId,
      sessionTitle,
      reportedSummary,
      pageUrl,
    } = body;

    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return NextResponse.json(
        { error: "A descrição do relato deve ter pelo menos 5 caracteres." },
        { status: 400 }
      );
    }

    if (description.length > 3000) {
      return NextResponse.json(
        { error: "A descrição não pode exceder 3.000 caracteres." },
        { status: 400 }
      );
    }

    // Identifica o token de acesso do GitHub (Secrets ou .env.local)
    const githubToken = process.env.GITHUB_FEEDBACK_TOKEN || process.env.GITHUB_TOKEN || process.env.RELEASE_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER || "didifive";
    const repoName = process.env.GITHUB_REPO_NAME || "legisvisao";

    if (!githubToken) {
      return NextResponse.json(
        {
          error: "O serviço de envio direto de relatos está temporariamente indisponível no momento.",
        },
        { status: 503 }
      );
    }

    // Título da Issue
    const targetTitle = propositionTitle || (propositionId ? `Proposição ID ${propositionId}` : "Resumo Geral de IA");
    const categoryLabels: Record<string, string> = {
      RESUMO_INCORRETO: "Resumo Incorreto ou Impreciso",
      VIES_POLITICO: "Possível Viés ou Falta de Neutralidade",
      ERRO_SESSAO: "Erro na Deliberação ou Mérito Votado",
      OUTRO: "Outro / Sugestão de Melhoria",
    };
    const categoryLabel = categoryLabels[category] || "Relato de Usuário";
    const issueTitle = `[Feedback IA] ${categoryLabel}: ${targetTitle}`;

    // Corpo estruturado em Markdown da Issue
    const issueBody = `### 🤖 Relato de Problema em Resumo de IA

**Categoria:** ${categoryLabel}
**Data do Relato:** ${new Date().toISOString()}

---

### 📝 Descrição Enviada pelo Cidadão:
${description.trim()}

---

### 🔍 Contexto da Matéria Legislativa:
- **Proposição:** ${propositionTitle || "Não especificado"} ${propositionId ? `(ID Oficial: ${propositionId})` : ""}
${sessionId ? `- **Sessão / Deliberação:** ${sessionTitle || "Não especificado"} (ID Votação: ${sessionId})` : ""}
${pageUrl ? `- **Página de Origem:** ${pageUrl}` : ""}
${propositionId ? `- **Ficha Oficial da Câmara:** https://www.camara.leg.br/propostas-legislativas/${propositionId}` : ""}

${
  reportedSummary
    ? `### 📄 Resumo Exibido no Momento do Relato:\n> ${reportedSummary.replace(/\n/g, "\n> ")}\n`
    : ""
}

---
*Este relato foi gerado automaticamente a partir do formulário de feedback cívico do LegisVisão.*
`;

    // URL direta pré-formatada para o GitHub como fallback
    const directFallbackUrl = `https://github.com/${repoOwner}/${repoName}/issues/new?title=${encodeURIComponent(
      issueTitle
    )}&body=${encodeURIComponent(issueBody)}&labels=feedback-ia`;

    if (!githubToken) {
      return NextResponse.json(
        {
          error: "O serviço de envio direto de relatos está temporariamente indisponível no momento.",
          fallbackUrl: directFallbackUrl,
        },
        { status: 503 }
      );
    }

    // Cria a Issue diretamente na API do GitHub
    const ghResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "LegisVisao-Feedback-Bot/1.0",
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ["triage", "feedback-ia"],
      }),
    });

    if (!ghResponse.ok) {
      const ghError = await ghResponse.text();
      console.error("Erro ao criar issue no GitHub:", ghResponse.status, ghError);
      return NextResponse.json(
        {
          error: "Não foi possível registrar o chamado no momento. Tente novamente mais tarde.",
          fallbackUrl: directFallbackUrl,
        },
        { status: 502 }
      );
    }

    const ghData = await ghResponse.json();
    return NextResponse.json({
      success: true,
      issueUrl: ghData.html_url,
      issueNumber: ghData.number,
      message: "Relato enviado com sucesso! Uma issue foi criada para análise no GitHub.",
    });
  } catch (error) {
    console.error("Erro interno no endpoint POST /api/feedback:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro interno ao processar o seu relato. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}
