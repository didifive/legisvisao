import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || searchParams.get("size") || searchParams.get("type");
    const isSquare = format === "square" || format === "1:1";

    const logoFilePath = path.join(process.cwd(), "public", "logo.png");
    let logoDataUrl = "";
    try {
      const logoBuffer = await fs.readFile(logoFilePath);
      logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
      // Fallback gracioso caso o arquivo não seja encontrado em algum ambiente
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
                "radial-gradient(circle at 50% 35%, rgba(34, 197, 94, 0.28) 0%, transparent 65%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.18) 0%, transparent 50%)",
              color: "#ffffff",
              padding: "40px",
              fontFamily: "sans-serif",
              position: "relative",
            }}
          >
            {/* Borda interna decorativa */}
            <div
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                right: 18,
                bottom: 18,
                border: "1px solid rgba(52, 211, 153, 0.25)",
                borderRadius: 28,
                display: "flex",
              }}
            />

            {/* Container do Logo com glow */}
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 32,
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)",
                border: "2px solid rgba(52, 211, 153, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                boxShadow: "0 12px 32px rgba(16, 185, 129, 0.25)",
                padding: 16,
              }}
            >
              {logoDataUrl ? (
                <img
                  src={logoDataUrl}
                  alt="LegisVisão Logo"
                  width={108}
                  height={108}
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: 64 }}>⚖️</span>
              )}
            </div>

            {/* Nome LegisVisão */}
            <div
              style={{
                fontSize: 54,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                background: "linear-gradient(90deg, #a7f3d0 0%, #34d399 100%)",
                backgroundClip: "text",
                color: "transparent",
                marginBottom: 12,
              }}
            >
              LegisVisão
            </div>

            {/* Subtítulo */}
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#e2e8f0",
                textAlign: "center",
                maxWidth: 480,
                lineHeight: 1.4,
                marginBottom: 24,
              }}
            >
              Afinidade Política com Deputados Federais
            </div>

            {/* Badge de Destaque */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#6ee7b7",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                padding: "8px 20px",
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              🔒 100% Local-First e Privado
            </div>

            {/* Rodapé / URL */}
            <div
              style={{
                fontSize: 15,
                color: "#34d399",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              legisvisao.com.br
            </div>
          </div>
        ),
        {
          width: 600,
          height: 600,
        }
      );
    }

    // Landscape (1200 x 630)
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
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 20,
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)",
                border: "1.5px solid rgba(52, 211, 153, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
              }}
            >
              {logoDataUrl ? (
                <img
                  src={logoDataUrl}
                  alt="LegisVisão Logo"
                  width={56}
                  height={56}
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: 36 }}>⚖️</span>
              )}
            </div>
            <div
              style={{
                fontSize: 68,
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
            <div style={{ color: "#34d399", fontWeight: 700 }}>legisvisao.com.br</div>
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
