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
          DEFAULT: '#020202', // Slightly deeper black
          card: '#0A0A0A',   // Thinner cards
          accent: '#111111'  // Subtler highlights
        }
      },
      fontFamily: {
        sans: ['Spline Sans', 'sans-serif'],
      },
      borderRadius: {
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
      }
    },
  },
}
