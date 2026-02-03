/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cosmic': {
          black: '#000000',
          red: '#FF0000',
          green: '#00FF41',
          blue: '#00F3FF',
        }
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 8s linear infinite',
        'flicker': 'flicker 2s infinite',
        'glitch': 'glitch 1s infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '33%': { transform: 'translate(-2px, 2px)' },
          '66%': { transform: 'translate(2px, -2px)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neon-red': '0 0 10px #FF0000, 0 0 20px #FF0000, 0 0 30px #FF0000',
        'neon-green': '0 0 10px #00FF41, 0 0 20px #00FF41, 0 0 30px #00FF41',
        'neon-blue': '0 0 10px #00F3FF, 0 0 20px #00F3FF, 0 0 30px #00F3FF',
      }
    },
  },
  plugins: [],
}