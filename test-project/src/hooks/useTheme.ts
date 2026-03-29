import { Theme } from '@/types';
import { THEME_KEY } from '@utils/constants';

export function useTheme(): { theme: Theme; toggle: () => void } {
  let theme: Theme = (localStorage.getItem(THEME_KEY) as Theme) || 'light';

  return {
    theme,
    toggle: () => {
      theme = theme === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, theme);
    },
  };
}
