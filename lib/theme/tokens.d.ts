export const colors: {
  readonly bg: string;
  readonly surface: string;
  readonly 'surface-2': string;
  readonly 'surface-3': string;
  readonly line: string;
  readonly 'line-soft': string;
  readonly text: string;
  readonly muted: string;
  readonly subtle: string;
  readonly accent: string;
  readonly 'accent-ink': string;
  readonly info: string;
  readonly caution: string;
  readonly danger: string;
};
export const radii: { readonly lg: number; readonly md: number; readonly sm: number };
export const fontFamilies: { readonly display: readonly string[] };
export const textBackgroundPairs: readonly {
  text: keyof typeof colors;
  background: keyof typeof colors;
}[];
