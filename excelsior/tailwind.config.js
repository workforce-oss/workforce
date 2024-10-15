/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./index.html", "./src/**/*.{js,ts,tsx,jsx}"],
  darkMode: "media",
  important: true,
  safelist: [{ pattern: /hljs+/ }],
  // corePlugins: {
  //   preflight: false,
  // },
  /* html {
    --text-000: 60 6.7% 97.1%;
    --text-100: 50 23.1% 94.9%;
    --text-200: 60 5.5% 89.2%;
    --text-300: 47 8.4% 79%;
    --text-400: 48 9.6% 69.2%;
    --text-500: 45 6.3% 62.9%;
    --accent-main-000: 18 50.4% 47.5%;
    --accent-main-100: 18 56.8% 43.5%;
    --accent-main-200: 19 58.3% 40.4%;
    --accent-secondary-000: 210 74.8% 57%;
    --accent-secondary-100: 210 74.8% 49.8%;
    --accent-secondary-200: 210 74.2% 42.1%;
    --accent-secondary-900: 210 19.5% 18%;
    --accent-pro-000: 251 84.6% 74.5%;
    --accent-pro-100: 251 40.2% 54.1%;
    --accent-pro-200: 251 40% 45.1%;
    --accent-pro-900: 250 25.3% 19.4%;
    --oncolor-100: 0 0% 100%;
    --bg-000: 60 1.8% 22%;
    --bg-100: 60 3.3% 17.8%;
    --bg-200: 45 4.9% 16.1%;
    --bg-300: 48 8.2% 12%;
    --bg-400: 48 10.6% 9.2%;
    --bg-500: 60 7.1% 5.5%;
    --accent-main-900: 16 41.3% 18%;
    --border-100: 50 5.8% 40%;
    --border-200: 50 5.9% 40%;
    --border-300: 50 5.9% 40%;
    --oncolor-200: 60 6.7% 97.1%;
    --oncolor-300: 60 6.7% 97.1%;
    --border-400: 50 5.9% 40%;
    --danger-000: 5 69.4% 72.9%;
    --danger-100: 5 79.4% 70.8%;
    --danger-200: 5 53.6% 44.8%;
    --danger-900: 0 21.4% 17.6%;
} */
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: "var(--text-000)",
          }
        },
        sm: {
          css: {
            color: "var(--text-000)",
          }
        },
        lg: {
          css: {
            color: "var(--text-000)",
          }
        },
        xl: {
          css: {
            color: "var(--text-000)",
          }
        },

      },
      fontFamily: {
        "excelsior-message": ["Inter var,ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji"],
        "user-message": ["Inter var,ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji"],
        "excelsior": ["Oswald"],
      },
      borderWidth: {
        '0.5': '0.5px',
      },
      colors: {
        bg: {
          '000' : 'hsl(200 10.8% 15%)',
          '100' : 'hsl(200 13.3% 13.8%)',
          '200' : 'hsl(200 16.9% 12.1%)',
          '300' : 'hsl(220 20.2% 8%)',
          '400' : 'hsl(228 22.6% 6.2%)',
          '500' : 'hsl(218 25.1% 5.5%)',
        },
        text: {
          '000' : 'hsl(60 6.7% 97.1%)',
          '100' : 'hsl(50 23.1% 94.9%)',
          '200' : 'hsl(60 5.5% 89.2%)',
          '300' : 'hsl(47 8.4% 79%)',
          '400' : 'hsl(48 9.6% 69.2%)',
          '500' : 'hsl(45 6.3% 62.9%)',
        },
        border: {
          '100' : 'hsl(200 5.8% 40%)',
          '200' : 'hsl(200 5.9% 40%)',
          '300' : 'hsl(200 5.9% 40%)',
          '400' : 'hsl(200 5.9% 40%)',
        },
        'accent-main': {
          '000' : 'hsl(18 50.4% 47.5%)',
          '100' : 'hsl(18 56.8% 43.5%)',
          '200' : 'hsl(19 58.3% 40.4%)',
          '900' : 'hsl(16 41.3% 18%)',
        },
        'accent-secondary': {
          '000' : 'hsl(210 74.8% 57%)',
          '100' : 'hsl(210 74.8% 49.8%)',
          '200' : 'hsl(210 74.2% 42.1%)',
          '900' : 'hsl(210 19.5% 18%)',
        },
        'accent-pro': {
          '000' : 'hsl(251 84.6% 74.5%)',
          '100' : 'hsl(251 40.2% 54.1%)',
          '200' : 'hsl(251 40% 45.1%)',
          '900' : 'hsl(250 25.3% 19.4%)',
        },
        'danger': {
          '000' : 'hsl(5 69.4% 72.9%)',
          '100' : 'hsl(5 79.4% 70.8%)',
          '200' : 'hsl(5 53.6% 44.8%)',
          '900' : 'hsl(0 21.4% 17.6%)',
        },
        oncolor: {
          '100' : 'hsl(0 0% 100%)',
          '200' : 'hsl(200 6.7% 97.1%)',
          '300' : 'hsl(300 6.7% 97.1%)',
        }
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    // require('tailwind-highlightjs')
  ],
  //   require("@tailwindcss/forms")({
  //     strategy: "class", // only generate classes
  //   }),
  //   plugin(function ({ addUtilities }) {
  //   // //   addUtilities({
  //   // //     ".scrollbar-hide": {
  //   // //       /* IE and Edge */
  //   // //       "-ms-overflow-style": "none",
  //   // //       /* Firefox */
  //   // //       "scrollbar-width": "none",
  //   // //       /* Safari and Chrome */
  //   // //       "&::-webkit-scrollbar": {
  //   // //         display: "none",
  //   // //       },
  //   // //     },
  //   // //     ".arrow-hide": {
  //   // //       "&::-webkit-inner-spin-button": {
  //   // //         "-webkit-appearance": "none",
  //   // //         margin: 0,
  //   // //       },
  //   // //       "&::-webkit-outer-spin-button": {
  //   // //         "-webkit-appearance": "none",
  //   // //         margin: 0,
  //   // //       },
  //   // //     },
  //   // //     ".password": {
  //   // //       "-webkit-text-security": "disc",
  //   // //       "font-family": "text-security-disc",
  //   // //     },
  //   // //     ".stop": {
  //   // //       "-webkit-animation-play-state": "paused",
  //   // //       "-moz-animation-play-state": "paused",
  //   // //       "animation-play-state": "paused",
  //   // //     },
  //   // //     ".custom-scroll": {
  //   // //       "&::-webkit-scrollbar": {
  //   // //         width: "8px",
  //   // //       },
  //   // //       "&::-webkit-scrollbar-track": {
  //   // //         backgroundColor: "#f1f1f1",
  //   // //       },
  //   // //       "&::-webkit-scrollbar-thumb": {
  //   // //         backgroundColor: "#ccc",
  //   // //         borderRadius: "999px",
  //   // //       },
  //   // //       "&::-webkit-scrollbar-thumb:hover": {
  //   // //         backgroundColor: "#bbb",
  //   // //       },
  //   // //     },
  //   // //     ".dark .theme-attribution .react-flow__attribution": {
  //   // //       backgroundColor: "rgba(255, 255, 255, 0.2)",
  //   // //     },
  //   // //     ".dark .theme-attribution .react-flow__attribution a": {
  //   // //       color: "black",
  //   // //     },
  //   // //   });
  //   // // }),
  //   // require("@tailwindcss/typography"),
  // ],
};
