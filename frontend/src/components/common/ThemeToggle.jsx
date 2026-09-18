import { useEffect, useState } from 'react';

import {
  Moon,
  Sun
} from 'lucide-react';

const THEME_STORAGE_KEY =
  'essential-theme';

function getInitialDarkMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const savedTheme = localStorage.getItem(
    THEME_STORAGE_KEY
  );

  if (savedTheme === 'dark') {
    return true;
  }

  if (savedTheme === 'light') {
    return false;
  }

  return window.matchMedia?.(
    '(prefers-color-scheme: dark)'
  ).matches || false;
}

export default function ThemeToggle() {
  const [
    darkMode,
    setDarkMode
  ] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      darkMode
    );

    document.body.classList.toggle(
      'dark-mode',
      darkMode
    );

    localStorage.setItem(
      THEME_STORAGE_KEY,
      darkMode ? 'dark' : 'light'
    );
  }, [darkMode]);

  function toggleTheme() {
    setDarkMode(value => !value);
  }

  return (
    <button
      type="button"
      className={`theme-toggle ${
        darkMode ? 'theme-toggle-dark' : ''
      }`}
      onClick={toggleTheme}
      aria-label={
        darkMode
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      title={
        darkMode
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      aria-pressed={darkMode}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">
          {darkMode ? (
            <Moon size={15} />
          ) : (
            <Sun size={15} />
          )}
        </span>
      </span>
    </button>
  );
}