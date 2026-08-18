import { ImageResponse } from "next/og";

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0d1f14",
            backgroundImage:
              "radial-gradient(circle at 50% 20%, rgba(34, 197, 94, 0.18) 0%, transparent 60%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.12) 0%, transparent 40%)",
            color: "#ffffff",
            padding: "60px",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          {/* Borda interna decorativa */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              right: 24,
              bottom: 24,
              border: "1px solid rgba(52, 211, 153, 0.2)",
              borderRadius: 24,
              display: "flex",
            }}
          />

          {/* Logo & Título Principal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
              }}
            >
              ⚖️
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                background: "linear-gradient(90deg, #a7f3d0 0%, #34d399 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              LegisVisão
            </div>
          </div>

          {/* Subtítulo */}
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: "#e2e8f0",
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.35,
              marginBottom: 36,
            }}
          >
            Transparência Legislativa e Afinidade com Propostas Reais
          </div>

          {/* Badges */}
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 40,
            }}
          >
            <span
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#6ee7b7",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                padding: "8px 20px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              🏛️ Congresso Nacional
            </span>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#6ee7b7",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                padding: "8px 20px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              🔒 100% Local & Privado
            </span>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#6ee7b7",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                padding: "8px 20px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              📊 Afinidade Política
            </span>
          </div>

          {/* Rodapé da imagem */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              maxWidth: 1000,
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: 20,
              fontSize: 18,
              color: "#94a3b8",
            }}
          >
            <div>Desenvolvido por Luis Zancanela • zancanela.dev.br</div>
            <div style={{ color: "#34d399", fontWeight: 600 }}>legisvisao</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao gerar imagem";
    return new Response(`Failed to generate OG image: ${msg}`, { status: 500 });
  }
}
