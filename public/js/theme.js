// --- THEME SYSTEM -----------------------------------------------------------
// Themes: "theme-blue" (default) and "theme-red"
// Stored in localStorage as "ofr_theme"
// Applied to <html> element

const THEME_KEY = "ofr_theme";
const DEFAULT_THEME = "theme-blue";

// Apply theme immediately on load
(function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
  document.documentElement.className = saved;
})();

// Switch theme + save it
function setTheme(themeName) {
  document.documentElement.className = themeName;
  localStorage.setItem(THEME_KEY, themeName);
}

// Button bindings
document.getElementById("blueTheme")?.addEventListener("click", () => {
  setTheme("theme-blue");
});

document.getElementById("redTheme")?.addEventListener("click", () => {
  setTheme("theme-red");
});
