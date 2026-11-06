// Adds the web address prefix when building the home-screen web app for GitHub Pages
// (set EXPO_BASE_URL=/Family-Point-Bank/app). Everything else comes from app.json.
module.exports = ({ config }) => ({
  ...config,
  ...(process.env.EXPO_BASE_URL ? { experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL } } : {}),
});
