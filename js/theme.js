const THEME_KEY = 'mediaTracker-theme';

window.getStoredTheme = () => localStorage.getItem(THEME_KEY) || 'dark';

function updateThemeIcons(theme) {
    document.querySelectorAll('.theme-toggle-icon').forEach(el => {
        el.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
}

window.applyTheme = (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
    updateThemeIcons(theme);
};

window.toggleTheme = () => {
    const next = window.getStoredTheme() === 'dark' ? 'light' : 'dark';
    window.applyTheme(next);
    if (typeof window.onThemeChange === 'function') window.onThemeChange(next);
};

window.applyTheme(window.getStoredTheme());

document.addEventListener('DOMContentLoaded', () => updateThemeIcons(window.getStoredTheme()));
