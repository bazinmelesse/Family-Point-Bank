import { Linking } from 'react-native';

/** Where the GitHub Pages site lives (see .github/workflows/pages.yml). The store listings link to the same pages. */
export const SITE = 'https://bazinmelesse.github.io/Family-Point-Bank';

export const LINKS = {
  webApp: `${SITE}/app/`,
  privacy: `${SITE}/privacy.html`,
  support: `${SITE}/support.html`,
  deleteAccount: `${SITE}/delete-account.html`,
};

export const openLink = (url: string) => { Linking.openURL(url).catch(() => {}); };
