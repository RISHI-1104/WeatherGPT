/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        glass: {
          white: 'rgba(255,255,255,0.12)',
          border: 'rgba(255,255,255,0.18)',
          hover: 'rgba(255,255,255,0.20)',
        },
      },
      backdropBlur: {
        glass: '16px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulse_ring: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        count_up: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        float: 'float 3s ease-in-out infinite',
        pulse_ring: 'pulse_ring 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        count_up: 'count_up 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
