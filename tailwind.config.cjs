/**
 * Tailwind CSS configuration for the hl-app project.
 * Uses JIT mode (default in Tailwind v3+) and purges unused classes
 * from all source files under `src/` as well as the `public/` folder.
 */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
