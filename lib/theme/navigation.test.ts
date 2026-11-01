import { navigationTheme } from './navigation';
import { colors } from './tokens';

test('navigation chrome uses the dark semantic tokens', () => {
  expect(navigationTheme.dark).toBe(true);
  expect(navigationTheme.colors).toMatchObject({
    background: colors.bg, card: colors.surface, text: colors.text,
    border: colors.line, primary: colors.accent, notification: colors.info,
  });
  expect(navigationTheme.fonts).toBeDefined();
});
