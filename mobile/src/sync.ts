import { getRandomBytes } from 'expo-crypto';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, onValue, ref, remove, set, update, type Database } from 'firebase/database';
import type { BankData } from './types';

/**
 * Live sync through a Firebase Realtime Database.
 *
 * Everything for one family lives at /families/<code>, with each collection stored as a map keyed by id
 * (so two parents adding points at the same time never overwrite each other). The family code is long and
 * random; the database rules only allow reading a family when you know its code. See mobile/README.md.
 */

export interface SyncConfig {
  url: string; // e.g. https://my-family-default-rtdb.firebaseio.com
  code: string; // the family code shared by every device
}

export type SyncState = 'local' | 'connecting' | 'live' | 'offline' | 'error';

const COLLS = ['kids', 'activities', 'rewards', 'log', 'events'] as const;

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (i/l/1, o/0)
export function newFamilyCode() {
  const bytes = getRandomBytes(24);
  let out = '';
  for (let i = 0; i < 24; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out.match(/.{4}/g)!.join('-');
}

export const cleanCode = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

/** Accepts the address with or without https:// and a trailing slash. Returns '' when it can't be a database URL. */
export function cleanUrl(s: string) {
  let u = s.trim().replace(/\/+$/, '');
  if (!u) return '';
  if (!/^https?:\/\//.test(u)) u = 'https://' + u;
  try {
    const host = new URL(u).host;
    if (!/\.(firebaseio\.com|firebasedatabase\.app)$/.test(host) && !/^(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(host)) return '';
    return u;
  } catch {
    return '';
  }
}

/** The address the old-iPad web board reads with ?src= */
export const boardSrc = (c: SyncConfig) => `${c.url}/families/${c.code}.json`;

/** Firebase can't store undefined, and an empty array disappears; null deletes a field. */
const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const nullify = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v === undefined ? null : v]));

export function toRemote(d: BankData) {
  const out: Record<string, unknown> = { settings: clean(d.settings) };
  for (const c of COLLS) out[c] = Object.fromEntries((d[c] as { id: string }[]).map((x) => [x.id, clean(x)]));
  return out;
}

export function fromRemote(v: Record<string, unknown> | null): Partial<BankData> | null {
  if (!v) return null;
  const out: Record<string, unknown> = { settings: v.settings || {} };
  for (const c of COLLS) {
    const m = (v[c] || {}) as Record<string, Record<string, unknown>>;
    out[c] = Object.entries(m).map(([id, x]) => ({ ...x, id }));
  }
  return out as Partial<BankData>;
}

export class Remote {
  private app: FirebaseApp;
  private db: Database;
  private base: string;
  private unsubs: (() => void)[] = [];

  constructor(public config: SyncConfig) {
    // A named app per connection, so switching databases starts clean.
    this.app = initializeApp({ databaseURL: config.url, projectId: 'family-point-bank' }, `fpb-${Date.now()}`);
    this.db = getDatabase(this.app);
    this.base = `families/${config.code}`;
  }

  /** Calls onData with the whole family (null when nothing is there yet) and onState as the connection changes. */
  listen(onData: (d: Partial<BankData> | null) => void, onState: (s: SyncState) => void) {
    this.unsubs.push(
      onValue(
        ref(this.db, this.base),
        (snap) => onData(fromRemote(snap.val())),
        () => onState('error'),
      ),
      onValue(ref(this.db, '.info/connected'), (snap) => onState(snap.val() ? 'live' : 'offline')),
    );
  }

  /** Reads the family once. Rejects when the rules refuse (wrong URL or rules not set up). */
  readOnce(): Promise<Partial<BankData> | null> {
    return new Promise((resolve, reject) => {
      const off = onValue(
        ref(this.db, this.base),
        (snap) => { off(); resolve(fromRemote(snap.val())); },
        (err) => reject(err),
        { onlyOnce: true },
      );
    });
  }

  setAll = (d: BankData) => set(ref(this.db, this.base), toRemote(d));
  put = (c: string, item: { id: string }) => set(ref(this.db, `${this.base}/${c}/${item.id}`), clean(item));
  patch = (c: string, id: string, p: Record<string, unknown>) => update(ref(this.db, `${this.base}/${c}/${id}`), nullify(p));
  drop = (c: string, id: string) => remove(ref(this.db, `${this.base}/${c}/${id}`));
  settings = (s: Record<string, unknown>) => update(ref(this.db, `${this.base}/settings`), nullify(s));

  close() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    deleteApp(this.app).catch(() => {});
  }
}
