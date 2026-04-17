import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D4AF37', // Premium Gold
          accent: '#C5A059',  // Soft Champagne
        },
        background: {
          DEFAULT: '#0A0A0B', // Sophisticated Off-Black
          card: '#121214',   // Layered Cards
          accent: '#18181B'  // Subtler highlights
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
