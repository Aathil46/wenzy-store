/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#000000',
        charcoal: '#0A0A0A',
        surface: '#F5F5F5',
        'surface-subtle': '#FAFAFA',
        border: '#E5E5E5',
        muted: '#737373',
        sale: '#E11D48',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'sans-serif'],
        accent: ['"Bricolage Grotesque"', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.02em',
        widest: '0.25em',
      },
    },
  },
  plugins: [],
}
