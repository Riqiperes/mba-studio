import { useState } from "react";
import { Moon, Sun } from "lucide-react";

// Misma clave que el script de index.html, que aplica el tema guardado
// antes de pintar (sin parpadeo).
const THEME_STORAGE_KEY = "mba-theme";

type Theme = "light" | "dark";

function getCurrentTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Cambia entre tema claro y oscuro; sin eleccion guardada sigue al sistema. */
export function ThemeToggleButton() {
  const [theme, setTheme] = useState<Theme>(getCurrentTheme);
  const isDark = theme === "dark";

  function toggleTheme() {
    const next: Theme = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento (modo privado): el cambio dura solo esta visita.
    }
    setTheme(next);
  }

  return (
    <button
      id="theme-toggle-button"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-texto-suave transition-colors duration-200 hover:bg-suave hover:text-texto focus-visible:outline-2 focus-visible:outline-acento"
    >
      {isDark ? (
        <Sun className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      )}
    </button>
  );
}
