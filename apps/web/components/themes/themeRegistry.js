import { fashionTheme } from './fashion/theme';
import { electronicsTheme } from './electronics/theme';
import { minimalTheme } from './minimal/theme';

export const THEME_REGISTRY = {
  fashion: fashionTheme,
  electronics: electronicsTheme,
  minimal: minimalTheme
};

export function getTheme(themeId) {
  return THEME_REGISTRY[themeId] || THEME_REGISTRY.fashion;
}

export function generateThemeCssVariables(themeConfig) {
  const baseTheme = getTheme(themeConfig?.id || 'fashion');
  const userSettings = themeConfig?.settings || {};

  const vars = { ...baseTheme.cssVariables };

  if (userSettings.primaryColor) {
    vars['--theme-primary'] = userSettings.primaryColor;
  }
  if (userSettings.accentColor) {
    vars['--theme-accent'] = userSettings.accentColor;
  }
  if (userSettings.fontFamily) {
    vars['--theme-font'] = `'${userSettings.fontFamily}', sans-serif`;
  }

  return vars;
}
