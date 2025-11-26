import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark">
      {children}
    </NextThemesProvider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  return context;
};

export default ThemeProvider;

