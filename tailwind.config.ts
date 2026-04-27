import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          accent: 'var(--primary-accent)',
        },
        background: {
          DEFAULT: 'var(--background)',
          card: 'var(--background-card)',
          accent: 'var(--background-accent)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          border: 'rgb(var(--surface-border) / <alpha-value>)',
        },
        foreground: {
          DEFAULT: 'var(--text-base)',
          muted: 'var(--text-muted)'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '40': '40px',
        '48': '48px',
      }
    },
  },
}
