import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Force light theme - clear any existing theme
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.className = document.documentElement.className.replace(/\b(light|dark)\b/g, '');
    document.body.classList.remove("light", "dark");
    document.documentElement.style.colorScheme = "light";
    setTheme("light");
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove("light", "dark");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return { theme, toggleTheme };
}
