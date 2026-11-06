import { getRandomBytes } from 'expo-crypto';
import { get, onValue, push, ref, remove, set, update } from 'firebase/database';
import { fb } from './firebase';
import type { BankData } from './types';

/**
 * Online data layout (Firebase Realtime Database). See firebase-rules.json for who may read and write what.
 *
 *   users/<uid>                 { familyId }                  each person's pointer to their family
 *   invites/<code>              "<familyId>"                  invite codes; anyone signed in can look one up
 *   boards/<key>                { familyId, kids: [...] }     public totals for the old-iPad web board (optional)
 *   families/<familyId>/
 *     meta                      { name, owner, inviteCode, boardKey?, createdAt }
 *     members/<uid>             { email, joinedAt }
 *     kids|activities|rewards|log|events/<id>   one object per item, keyed by id
 *     settings                  { pointsPerDollar, lockType, ... }
 */

export interface FamilyMeta {
  name: string;
  owner: string;
  inviteCode: string;
  boardKey?: string;
  createdAt: number;
}

export interface Member {
  uid: string;
  email: string;
  joinedAt: number;
}

export type SyncState = 'connecting' | 'live' | 'offline' | 'error';

const COLLS = ['kids', 'activities', 'rewards', 'log', 'events'] as const;

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alikes (I/L/1, O/0)
function randomCode(n: number) {
  const bytes = getRandomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
/** Invite codes look like K7MP-2QXR-9TWD. */
export const newInviteCode = () => randomCode(12).match(/.{4}/g)!.join('-');
export const cleanInviteCode = (s: string) => {
  const raw = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length === 12 ? raw.match(/.{4}/g)!.join('-') : raw;
};

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

const r = (path: string) => ref(fb().db, path);

/** The family a person belongs to, or null. */
export async function myFamilyId(uid: string): Promise<string | null> {
  const snap = await get(r(`users/${uid}/familyId`));
  return snap.exists() ? String(snap.val()) : null;
}

/** Starts a new family owned by this person, filled with `data`. Returns its id. */
export async function createFamily(uid: string, email: string, name: string, data: BankData) {
  const familyId = push(r('families')).key!;
  const inviteCode = newInviteCode();
  const now = Date.now();
  await set(r(`families/${familyId}`), {
    ...toRemote(data),
    meta: { name, owner: uid, inviteCode, createdAt: now },
    members: { [uid]: { email, joinedAt: now } },
  });
  await set(r(`invites/${inviteCode}`), familyId);
  await set(r(`users/${uid}`), { familyId });
  return familyId;
}

/** Joins the family an invite code belongs to. Throws a readable message when the code is wrong. */
export async function joinFamily(uid: string, email: string, code: string) {
  const inviteCode = cleanInviteCode(code);
  const snap = await get(r(`invites/${inviteCode}`)).catch(() => null);
  if (!snap || !snap.exists()) throw new Error("That invite code didn't work. Check it with the person who sent it.");
  const familyId = String(snap.val());
  await set(r(`families/${familyId}/members/${uid}`), { email, joinedAt: Date.now(), via: inviteCode });
  await set(r(`users/${uid}`), { familyId });
  return familyId;
}

/** Replaces the invite code, so the old one stops working. People already in the family stay in. */
export async function rotateInvite(familyId: string, oldCode: string) {
  const code = newInviteCode();
  await set(r(`invites/${code}`), familyId);
  await update(r(`families/${familyId}/meta`), { inviteCode: code });
  await remove(r(`invites/${oldCode}`)).catch(() => {});
  return code;
}

export async function removeMember(familyId: string, uid: string) {
  await remove(r(`families/${familyId}/members/${uid}`));
}

/** Forgets the family pointer for this person (after being removed from it). */
export const clearMyFamily = (uid: string) => set(r(`users/${uid}`), null);

/** Leaves the family on this account (the family and its data stay for everyone else). */
export async function leaveFamily(familyId: string, uid: string) {
  await set(r(`users/${uid}`), null);
  await remove(r(`families/${familyId}/members/${uid}`));
}

/** Turns on the public points board for the old iPad and returns its key. */
export async function enableBoard(familyId: string) {
  const key = randomCode(16).toLowerCase();
  await set(r(`boards/${key}`), { familyId, kids: [] });
  await update(r(`families/${familyId}/meta`), { boardKey: key });
  return key;
}

export async function disableBoard(familyId: string, key: string) {
  await update(r(`families/${familyId}/meta`), { boardKey: null });
  await remove(r(`boards/${key}`)).catch(() => {});
}

/** Writes just names, colors and totals, which is all the public board needs. */
export function writeBoard(familyId: string, key: string, kids: { id: string; name: string; color: string; createdAt: number; points: number }[]) {
  return set(r(`boards/${key}`), { familyId, kids: clean(kids) });
}

/** Live connection to one family's data. */
export class FamilyLink {
  private unsubs: (() => void)[] = [];
  private base: string;

  constructor(public familyId: string) {
    this.base = `families/${familyId}`;
  }

  listen(
    onData: (d: Partial<BankData> | null) => void,
    onMeta: (m: FamilyMeta | null, members: Member[]) => void,
    onState: (s: SyncState) => void,
    onDenied: () => void,
  ) {
    this.unsubs.push(
      onValue(
        r(this.base),
        (snap) => {
          const v = snap.val() as Record<string, unknown> | null;
          onData(fromRemote(v));
          const mem = (v?.members || {}) as Record<string, { email: string; joinedAt: number }>;
          onMeta((v?.meta as FamilyMeta) || null, Object.entries(mem).map(([uid, m]) => ({ uid, email: m.email, joinedAt: m.joinedAt })));
        },
        // Refused means this person is no longer a member (someone removed them).
        (err) => (String(err).toLowerCase().includes('permission') ? onDenied() : onState('error')),
      ),
      onValue(r('.info/connected'), (snap) => onState(snap.val() ? 'live' : 'offline')),
    );
  }

  setAll = (d: BankData) => update(r(this.base), toRemote(d));
  put = (c: string, item: { id: string }) => set(r(`${this.base}/${c}/${item.id}`), clean(item));
  patch = (c: string, id: string, p: Record<string, unknown>) => update(r(`${this.base}/${c}/${id}`), nullify(p));
  drop = (c: string, id: string) => remove(r(`${this.base}/${c}/${id}`));
  settings = (s: Record<string, unknown>) => update(r(`${this.base}/settings`), nullify(s));
  rename = (name: string) => update(r(`${this.base}/meta`), { name });

  close() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }
}
