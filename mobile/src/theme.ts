import { useColorScheme } from 'react-native';
import type { KidColor } from './types';

const light = {
  bg: '#F2F6FA', surface: '#FFFFFF', sunk: '#E8EEF4', ink: '#14304A', muted: '#5A7085', line: '#D6E0EA',
  accent: '#F2A516', accentInk: '#3A2600', earn: '#1C8A57', lose: '#C4442D', scrim: 'rgba(5,15,25,0.45)',
  kids: { k1: '#3D7DD8', k2: '#D9508A', k3: '#2FA37A', k4: '#8C5BD6', k5: '#E07A2E', k6: '#1F9BB0' } as Record<KidColor, string>,
};
const dark: typeof light = {
  bg: '#0E1B27', surface: '#162736', sunk: '#112130', ink: '#E5EEF6', muted: '#94A9BB', line: '#26394B',
  accent: '#F5B73F', accentInk: '#2B1B00', earn: '#4CC48B', lose: '#F07B64', scrim: 'rgba(0,0,0,0.6)',
  kids: { k1: '#6FA2F0', k2: '#EE7BAA', k3: '#4FC79A', k4: '#AE87EE', k5: '#F29A55', k6: '#47BFD3' },
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const KID_COLORS: { id: KidColor; name: string }[] = [
  { id: 'k1', name: 'Blue' }, { id: 'k2', name: 'Pink' }, { id: 'k3', name: 'Green' },
  { id: 'k4', name: 'Purple' }, { id: 'k5', name: 'Orange' }, { id: 'k6', name: 'Teal' },
];
