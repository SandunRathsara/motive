import { DarkTheme } from 'expo-router';
import { colors } from './tokens';

export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.line,
    primary: colors.accent,
    notification: colors.info,
  },
};
