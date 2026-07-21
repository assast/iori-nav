/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './public/**/*.html',
    './public/**/*.js',
    './functions/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN.md — Notion Purple scale（primary CTA）
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#5645d4',
          600: '#4534b3',
          700: '#3a2a99',
          800: '#2e227a',
          900: '#241c5c',
          950: '#16103a',
        },
        // DESIGN.md — surface / hairline 中性阶
        secondary: {
          50: '#fafaf9',
          100: '#f6f5f4',
          200: '#ede9e4',
          300: '#e5e3df',
          400: '#c8c4be',
          500: '#a4a097',
          600: '#787671',
          700: '#5d5b54',
          800: '#37352f',
          900: '#1a1a1a',
          950: '#0a0a0a',
        },
        // DESIGN.md — brand-green / semantic-success（Toast / 成功态）
        accent: {
          50: '#eefbf1',
          100: '#d9f3e1',
          200: '#b3e7c3',
          300: '#7ad492',
          400: '#3fc35d',
          500: '#1aae39',
          600: '#148a2d',
          700: '#116f25',
          800: '#0f5820',
          900: '#0d481c',
          950: '#06280e',
        },
        brand: {
          navy: '#0a1530',
          'navy-deep': '#070f24',
          'navy-mid': '#1a2a52',
          orange: '#dd5b00',
          pink: '#ff64c8',
          purple: '#7b3ff2',
          teal: '#2a9d99',
          green: '#1aae39',
          yellow: '#f5d75e',
          brown: '#523410',
        },
        surface: {
          DEFAULT: '#f6f5f4',
          soft: '#fafaf9',
          canvas: '#ffffff',
        },
        hairline: {
          DEFAULT: '#e5e3df',
          soft: '#ede9e4',
          strong: '#c8c4be',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          deep: '#000000',
          charcoal: '#37352f',
          slate: '#5d5b54',
          steel: '#787671',
          stone: '#a4a097',
          muted: '#bbb8b1',
        },
        tint: {
          peach: '#ffe8d4',
          rose: '#fde0ec',
          mint: '#d9f3e1',
          lavender: '#e6e0f5',
          sky: '#dcecfa',
          yellow: '#fef7d6',
          'yellow-bold': '#f9e79f',
          cream: '#f8f5e8',
          gray: '#f0eeec',
        },
      },
      fontFamily: {
        // DESIGN.md — Notion Sans（Inter-based）+ 中文回退
        sans: [
          'Inter',
          'Noto Sans SC',
          '-apple-system',
          'system-ui',
          'Segoe UI',
          'Helvetica',
          'sans-serif',
        ],
      },
      borderRadius: {
        // DESIGN.md rounded scale（覆盖默认值以对齐 8px 按钮 / 12px 卡片）
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'elevation-1': 'rgba(15, 15, 15, 0.04) 0px 1px 2px 0px',
        'elevation-2': 'rgba(15, 15, 15, 0.08) 0px 4px 12px 0px',
        'elevation-3': 'rgba(15, 15, 15, 0.20) 0px 24px 48px -8px',
        'elevation-4': 'rgba(15, 15, 15, 0.16) 0px 16px 48px -8px',
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
}
