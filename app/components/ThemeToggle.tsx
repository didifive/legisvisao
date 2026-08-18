"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { FaMoon, FaSun } from "react-icons/fa";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDarkTheme = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
      className="w-9 h-9 transition-smooth hover:bg-muted"
      title={isDarkTheme ? "Mudar para modo claro" : "Mudar para modo escuro"}
      aria-label="Alternar tema"
    >
      {isDarkTheme ? (
        <FaSun className="h-4 w-4 text-amber-400" />
      ) : (
        <FaMoon className="h-4 w-4 text-slate-700" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
};
