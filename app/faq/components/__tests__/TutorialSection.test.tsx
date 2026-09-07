import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TutorialSection } from "../TutorialSection";

describe("TutorialSection - Guia Passo a Passo no FAQ", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("renderiza a seção com o id como-usar e inicia recolhida por padrão", () => {
    const { container } = render(<TutorialSection />);
    const section = container.querySelector("#como-usar");
    expect(section).not.toBeNull();

    // Cabeçalho visível com botão de expansão
    expect(screen.getByText("Tutorial Rápido: Como Usar o LegisVisão")).toBeDefined();
    expect(screen.getByText("Ver tutorial passo a passo")).toBeDefined();

    // Passos recolhidos
    expect(screen.queryByText("Leia a proposta e dê a sua opinião")).toBeNull();
  });

  it("expande e recolhe ao clicar no cabeçalho ou botão de toggle", () => {
    render(<TutorialSection />);

    // Clica para expandir
    const headerToggle = screen.getByRole("button", { name: /tutorial rápido/i });
    fireEvent.click(headerToggle);

    // Agora os passos devem estar visíveis
    expect(screen.getByText("Leia a proposta e dê a sua opinião")).toBeDefined();
    expect(screen.getByText("Opine em destaques e emendas específicas")).toBeDefined();
    expect(screen.getByText("Consulte seu ranking de afinidade real")).toBeDefined();
    expect(screen.getByText("Filtre por estado e preserve sua privacidade")).toBeDefined();
    expect(screen.getByText("Ocultar tutorial")).toBeDefined();

    // Imagens ilustrativas
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(4);
    expect(images[0].getAttribute("src")).toBe("/tutorial/passo-1-opinar.png");
    expect(images[1].getAttribute("src")).toBe("/tutorial/passo-2-destaques.png");
    expect(images[2].getAttribute("src")).toBe("/tutorial/passo-3-afinidade.png");
    expect(images[3].getAttribute("src")).toBe("/tutorial/passo-4-deputados.png");

    // Clica no botão inferior para recolher
    const collapseButton = screen.getByRole("button", { name: /Recolher tutorial/i });
    fireEvent.click(collapseButton);

    // Deve voltar ao estado recolhido
    expect(screen.queryByText("Leia a proposta e dê a sua opinião")).toBeNull();
    expect(screen.getByText("Ver tutorial passo a passo")).toBeDefined();
  });

  it("permite iniciar aberto com defaultOpen={true}", () => {
    render(<TutorialSection defaultOpen={true} />);

    expect(screen.getByText("Leia a proposta e dê a sua opinião")).toBeDefined();
    expect(screen.getByText("Ocultar tutorial")).toBeDefined();

    const startLink = screen.getByRole("link", { name: /Começar Agora/i });
    const affinityLink = screen.getByRole("link", { name: /Ver Afinidade/i });

    expect(startLink.getAttribute("href")).toBe("/opiniao");
    expect(affinityLink.getAttribute("href")).toBe("/afinidade");
  });

  it("abre automaticamente se a URL contiver a âncora #como-usar", () => {
    window.location.hash = "#como-usar";
    render(<TutorialSection />);

    expect(screen.getByText("Leia a proposta e dê a sua opinião")).toBeDefined();
    expect(screen.getByText("Ocultar tutorial")).toBeDefined();
  });
});
