import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isSquare =
      searchParams.has("square") ||
      searchParams.get("aspect") === "square" ||
      searchParams.get("type") === "square";

    let logoBase64: string | null = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch {
      // Fallback gracioso caso o arquivo não possa ser lido
    }

    if (isSquare) {
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
                "radial-gradient(circle at 50% 40%, rgba(34, 197, 94, 0.28) 0%, transparent 65%), radial-gradient(circle at 85% 85%, rgba(16, 185, 129, 0.20) 0%, transparent 50%)",
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
                top: 28,
                left: 28,
                right: 28,
                bottom: 28,
                border: "1px solid rgba(52, 211, 153, 0.25)",
                borderRadius: 36,
                display: "flex",
              }}
            />

            {/* Logo acima */}
            {logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoBase64}
                alt="LegisVisão Logo"
                width={260}
                height={260}
                style={{
                  borderRadius: 56,
                  objectFit: "contain",
                  marginBottom: 44,
                }}
              />
            ) : (
              <div
                style={{
                  width: 260,
                  height: 260,
                  borderRadius: 56,
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 130,
                  marginBottom: 44,
                }}
              >
                🏛️
              </div>
            )}

            {/* Nome abaixo */}
            <div
              style={{
                fontSize: 94,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                background:
                  "linear-gradient(90deg, #a7f3d0 0%, #34d399 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              LegisVisão
            </div>
          </div>
        ),
        {
          width: 1080,
          height: 1080,
        }
      );
    }

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
              "radial-gradient(circle at 50% 20%, rgba(34, 197, 94, 0.20) 0%, transparent 60%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 40%)",
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
              border: "1px solid rgba(52, 211, 153, 0.25)",
              borderRadius: 24,
              display: "flex",
            }}
          />

          {/* Logo & Título Principal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 16,
            }}
          >
            {logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoBase64}
                alt="LegisVisão Logo"
                width={72}
                height={72}
                style={{
                  borderRadius: 18,
                  objectFit: "contain",
                }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 38,
                }}
              >
                🏛️
              </div>
            )}
            <div
              style={{
                fontSize: 68,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                background:
                  "linear-gradient(90deg, #a7f3d0 0%, #34d399 100%)",
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
              fontSize: 32,
              fontWeight: 500,
              color: "#e2e8f0",
              textAlign: "center",
              maxWidth: 920,
              lineHeight: 1.35,
              marginBottom: 36,
            }}
          >
            Descubra quais Deputados Federais e Partidos votam como você
          </div>

          {/* Badges */}
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 44,
            }}
          >
            <span
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#6ee7b7",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              🏛️ Câmara dos Deputados
            </span>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#6ee7b7",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              🔒 100% Local-First
            </span>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#6ee7b7",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              📊 Votações Nominais Reais
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
            <div style={{ color: "#34d399", fontWeight: 700 }}>
              legisvisao.com.br
            </div>
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
