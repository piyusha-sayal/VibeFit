/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0c0a07',
        surface: '#1c1914',
        surface2: '#272219',
        surface3: '#322c22',
        gold: '#c9a87c',
        'gold-light': '#e8d5a8',
        amber: '#d4892a',
        text: '#f2ede4',
        'text-muted': '#8a7e6e',
        'text-subtle': '#4a4236',
        green: '#6db886',
      },
      fontFamily: {
        serif: ['DMSerifDisplay_400Regular', 'Georgia', 'serif'],
        'serif-italic': ['DMSerifDisplay_400Regular_Italic', 'Georgia', 'serif'],
        sans: ['PlusJakartaSans_400Regular', 'system-ui', 'sans-serif'],
        'sans-medium': ['PlusJakartaSans_500Medium', 'system-ui', 'sans-serif'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold', 'system-ui', 'sans-serif'],
        'sans-bold': ['PlusJakartaSans_700Bold', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
