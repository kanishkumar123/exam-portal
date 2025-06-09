import React, { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.className = darkMode
      ? "bg-dark text-white"
      : "bg-light text-dark";
  }, [darkMode]);

  return (
    <button
      className={`btn ${darkMode ? "btn-warning" : "btn-dark"}`}
      onClick={() => setDarkMode(!darkMode)}
    >
      {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
    </button>
  );
}
