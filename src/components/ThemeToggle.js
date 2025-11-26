import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-4 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 shadow-md transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Moon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      ) : (
        <Sun className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      )}
    </button>
  );
};

export default ThemeToggle;

