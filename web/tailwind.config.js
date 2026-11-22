/** ScoutHub design tokens: colours are CSS variables defined in src/styles/index.css. */
/** @type {import('tailwindcss').Config} */
export default {
  // paths relative to this file, not to the current directory
  content: { relative: true, files: ['./index.html', './src/**/*.{ts,tsx}'] },
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--sh-bg) / <alpha-value>)',
        surface: 'rgb(var(--sh-surface) / <alpha-value>)',
        raised: 'rgb(var(--sh-raised) / <alpha-value>)',
        line: 'rgb(var(--sh-line) / <alpha-value>)',
        fg: 'rgb(var(--sh-fg) / <alpha-value>)',
        muted: 'rgb(var(--sh-muted) / <alpha-value>)',
        accent: 'rgb(var(--sh-accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--sh-accent-fg) / <alpha-value>)',
        action: 'rgb(var(--sh-action) / <alpha-value>)',
        danger: 'rgb(var(--sh-danger) / <alpha-value>)',
        warn: 'rgb(var(--sh-warn) / <alpha-value>)',
        info: 'rgb(var(--sh-info) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Barlow', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      borderRadius: { xl: '14px' },
      // Height tiers, so full-screen pages (login, sign-up) compact instead of overflowing.
      // Declared after the width screens, so `short:` wins over `lg:` when both match.
      screens: {
        short: { raw: '(max-height: 860px)' },
        tiny: { raw: '(max-height: 700px)' },
      },
    },
  },
  plugins: [],
}
