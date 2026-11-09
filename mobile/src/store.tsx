import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut,
} from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as cloud from './cloud';
import { FamilyLink, type FamilyMeta, type Member, type SyncState } from './cloud';
import { fb } from './firebase';
import { isConfigured } from './firebaseConfig';
import { STARTER } from './starter';
import type { Activity, BankData, CalEvent, Kid, LogEntry, Reward, Settings } from './types';
import { balance, rid } from './utils';

const LOCAL_KEY = 'fpb-data'; // this-device-only data (and what a new family starts from)
const PREFS_KEY = 'fpb-prefs';
const familyCacheKey = (fid: string) => `fpb-family-${fid}`;

export interface Prefs {
  kidMode: boolean;
  tab: string;
  /** Chose "use on this device only" instead of signing in. */
  localOnly: boolean;
}

/** loading → (signedOut | local) or (noFamily → family) */
export type Mode = 'loading' | 'signedOut' | 'local' | 'noFamily' | 'family';

/** Fills in anything missing, so data saved by the web app (or an older version) still loads. */
export function normalize(raw: Partial<BankData> | null | undefined): BankData {
  const src = raw || {};
  return {
    kids: Array.isArray(src.kids) ? src.kids.map((k) => ({ ...k, goalId: k.goalId ?? null, id: k.id || rid() })) : [],
    activities: Array.isArray(src.activities) ? src.activities.map((a) => ({ ...a, id: a.id || rid() })) : STARTER.activities,
    rewards: Array.isArray(src.rewards) ? src.rewards.map((r) => ({ ...r, id: r.id || rid() })) : STARTER.rewards,
    log: Array.isArray(src.log) ? src.log.map((e) => ({ ...e, id: e.id || rid() })) : [],
    events: Array.isArray(src.events) ? src.events.map((e) => ({ ...e, kidIds: e.kidIds ?? [], repeat: e.repeat ?? 'none', id: e.id || rid() })) : [],
    settings: { ...STARTER.settings, ...(src.settings || {}) },
  };
}

/** Turns Firebase sign-in errors into plain sentences. */
function authMessage(e: unknown) {
  const code = (e as { code?: string })?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-email': "That email address doesn't look right.",
    'auth/missing-password': 'Enter a password.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/email-already-in-use': 'There is already an account with that email. Tap "I have an account" to sign in.',
    'auth/invalid-credential': "That email and password don't match. Try again or reset your password.",
    'auth/wrong-password': "That email and password don't match. Try again or reset your password.",
    'auth/user-not-found': 'No account with that email yet. Tap "Create an account".',
    'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
    'auth/requires-recent-login': 'For your safety, sign out, sign back in, and try again.',
    'auth/network-request-failed': "Couldn't connect. Check your internet connection.",
    'auth/operation-not-allowed': 'Email sign-in is not turned on in Firebase yet (Authentication → Email/Password).',
  };
  return map[code] || (e instanceof Error ? e.message : 'Something went wrong. Try again.');
}

type Coll = 'kids' | 'activities' | 'rewards' | 'log' | 'events';

interface Store {
  mode: Mode;
  data: BankData;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  // account
  configured: boolean;
  email: string | null;
  uid: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the account and its online data, after checking the password again. */
  deleteAccount: (password: string) => Promise<void>;
  // family
  familyId: string | null;
  meta: FamilyMeta | null;
  members: Member[];
  syncState: SyncState;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (code: string) => Promise<void>;
  leaveFamily: () => Promise<void>;
  newInvite: () => Promise<void>;
  removeMember: (uid: string) => Promise<void>;
  renameFamily: (name: string) => void;
  setBoard: (on: boolean) => Promise<void>;
  // data
  addKid: (k: Omit<Kid, 'id' | 'createdAt' | 'goalId'>) => void;
  updateKid: (id: string, patch: Partial<Kid>) => void;
  addActivity: (a: Omit<Activity, 'id'>) => void;
  addReward: (r: Omit<Reward, 'id'>) => void;
  logPoints: (e: Omit<LogEntry, 'id' | 'at'>) => void;
  addEvent: (e: Omit<CalEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, patch: Partial<CalEvent>) => void;
  remove: (c: Coll, id: string) => void;
  saveSettings: (patch: Partial<Settings>) => void;
  replaceAll: (d: BankData) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const configured = isConfigured();
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>({ kidMode: false, tab: 'kids', localOnly: false });
  const [user, setUser] = useState<{ uid: string; email: string } | null | undefined>(configured ? undefined : null);
  const [familyId, setFamilyId] = useState<string | null | undefined>(undefined);
  const [meta, setMeta] = useState<FamilyMeta | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [syncState, setSyncState] = useState<SyncState>('connecting');
  const [data, setData] = useState<BankData>(STARTER);
  const dataRef = useRef(data);
  dataRef.current = data;
  const link = useRef<FamilyLink | null>(null);
  // Where `data` is saved on this device; null while switching so nothing is written to the wrong place.
  const cacheKey = useRef<string | null>(null);

  /* ---------- prefs ---------- */
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((p) => { if (p) setPrefsState((old) => ({ ...old, ...JSON.parse(p) })); })
      .catch(() => {})
      .finally(() => setPrefsLoaded(true));
  }, []);
  useEffect(() => {
    if (prefsLoaded) AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs, prefsLoaded]);
  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((old) => ({ ...old, ...p })), []);

  /* ---------- auth ---------- */
  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(fb().auth, (u) => {
      setFamilyId(undefined);
      setUser(u ? { uid: u.uid, email: u.email || '' } : null);
    });
  }, [configured]);

  // Find the signed-in person's family.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    cloud.myFamilyId(user.uid)
      .then((fid) => { if (alive) setFamilyId(fid); })
      .catch(() => { if (alive) setFamilyId(null); });
    return () => { alive = false; };
  }, [user]);

  const mode: Mode =
    !prefsLoaded || user === undefined ? 'loading'
    : !user ? (prefs.localOnly || !configured ? 'local' : 'signedOut')
    : familyId === undefined ? 'loading'
    : familyId ? 'family' : 'noFamily';

  /* ---------- load the right data for the mode ---------- */
  const startLink = useCallback((fid: string) => {
    link.current?.close();
    const l = new FamilyLink(fid);
    link.current = l;
    setSyncState('connecting');
    l.listen(
      (d) => { if (link.current === l && d) setData(normalize(d)); },
      (m, mem) => { if (link.current === l) { setMeta(m); setMembers(mem); } },
      (st) => { if (link.current === l) setSyncState(st); },
      () => {
        if (link.current !== l) return;
        l.close();
        link.current = null;
        AsyncStorage.removeItem(familyCacheKey(fid)).catch(() => {});
        const u = fb().auth.currentUser;
        if (u) cloud.clearMyFamily(u.uid).catch(() => {});
        setFamilyId(null);
      },
    );
  }, []);

  useEffect(() => {
    cacheKey.current = null;
    let alive = true;
    const key = mode === 'family' && familyId ? familyCacheKey(familyId) : mode === 'local' || mode === 'noFamily' ? LOCAL_KEY : null;
    if (mode !== 'family') { link.current?.close(); link.current = null; setMeta(null); setMembers([]); }
    if (!key) return;
    AsyncStorage.getItem(key)
      .then((saved) => {
        if (!alive) return;
        setData(saved ? normalize(JSON.parse(saved)) : STARTER);
        cacheKey.current = key;
        if (mode === 'family' && familyId) startLink(familyId);
      })
      .catch(() => { if (alive) { cacheKey.current = key; if (mode === 'family' && familyId) startLink(familyId); } });
    return () => { alive = false; };
  }, [mode, familyId, startLink]);

  useEffect(() => () => link.current?.close(), []);

  // Save a copy on the device so the app opens instantly and works offline.
  useEffect(() => {
    if (cacheKey.current) AsyncStorage.setItem(cacheKey.current, JSON.stringify(data)).catch(() => {});
  }, [data]);

  // Keep the public old-iPad board's totals current.
  const lastBoard = useRef('');
  useEffect(() => {
    if (mode !== 'family' || !familyId || !meta?.boardKey) return;
    const kids = data.kids.map((k) => ({ id: k.id, name: k.name, color: k.color, createdAt: k.createdAt, points: balance(data.log, k.id) }));
    const json = meta.boardKey + JSON.stringify(kids);
    if (json === lastBoard.current) return;
    const t = setTimeout(() => {
      lastBoard.current = json;
      cloud.writeBoard(familyId, meta.boardKey!, kids).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [mode, familyId, meta?.boardKey, data]);

  /* ---------- account and family actions ---------- */
  const signUp = useCallback(async (email: string, password: string) => {
    try { await createUserWithEmailAndPassword(fb().auth, email.trim(), password); } catch (e) { throw new Error(authMessage(e)); }
  }, []);
  const signIn = useCallback(async (email: string, password: string) => {
    try { await signInWithEmailAndPassword(fb().auth, email.trim(), password); } catch (e) { throw new Error(authMessage(e)); }
  }, []);
  const resetPassword = useCallback(async (email: string) => {
    try { await sendPasswordResetEmail(fb().auth, email.trim()); } catch (e) { throw new Error(authMessage(e)); }
  }, []);
  const signOut = useCallback(async () => {
    link.current?.close();
    link.current = null;
    setPrefs({ localOnly: false, kidMode: false });
    if (configured) await fbSignOut(fb().auth);
    else setUser(null);
  }, [configured, setPrefs]);

  const deleteAccount = useCallback(async (password: string) => {
    const u = fb().auth.currentUser;
    if (!u || !u.email) return;
    // Firebase only deletes an account that signed in recently, so confirm the password first.
    try { await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password)); } catch (e) { throw new Error(authMessage(e)); }
    const fid = familyId ?? null;
    link.current?.close();
    link.current = null;
    await cloud.deleteMyData(u.uid, fid);
    if (fid) AsyncStorage.removeItem(familyCacheKey(fid)).catch(() => {});
    try { await deleteUser(u); } catch (e) { throw new Error(authMessage(e)); }
    setPrefs({ localOnly: false, kidMode: false });
  }, [familyId, setPrefs]);

  const createFamily = useCallback(async (name: string) => {
    if (!user) return;
    // A new family starts with whatever this device already has (kids added while trying it out), or the starter lists.
    const fid = await cloud.createFamily(user.uid, user.email, name.trim() || 'Our family', dataRef.current);
    setFamilyId(fid);
  }, [user]);
  const joinFamily = useCallback(async (code: string) => {
    if (!user) return;
    const fid = await cloud.joinFamily(user.uid, user.email, code);
    setFamilyId(fid);
  }, [user]);
  const leaveFamily = useCallback(async () => {
    if (!user || !familyId) return;
    link.current?.close();
    link.current = null;
    await cloud.leaveFamily(familyId, user.uid);
    AsyncStorage.removeItem(familyCacheKey(familyId)).catch(() => {});
    setFamilyId(null);
  }, [user, familyId]);
  const newInvite = useCallback(async () => {
    if (familyId && meta) await cloud.rotateInvite(familyId, meta.inviteCode);
  }, [familyId, meta]);
  const removeMember = useCallback(async (uid: string) => {
    if (familyId) await cloud.removeMember(familyId, uid);
  }, [familyId]);
  const setBoard = useCallback(async (on: boolean) => {
    if (!familyId) return;
    lastBoard.current = '';
    if (on) await cloud.enableBoard(familyId);
    else if (meta?.boardKey) await cloud.disableBoard(familyId, meta.boardKey);
  }, [familyId, meta?.boardKey]);

  /* ---------- data actions: apply here right away, and write online in family mode ---------- */
  const store = useMemo<Store>(() => {
    const send = (fn: (l: FamilyLink) => Promise<unknown>) => {
      const l = link.current;
      if (l) fn(l).catch(() => setSyncState('error'));
    };
    const push = <C extends Coll>(c: C, item: BankData[C][number]) => {
      setData((d) => ({ ...d, [c]: [...d[c], item] }));
      send((l) => l.put(c, item));
    };
    const patch = <C extends Coll>(c: C, id: string, p: Partial<BankData[C][number]>) => {
      setData((d) => ({ ...d, [c]: (d[c] as BankData[C][number][]).map((x) => (x.id === id ? { ...x, ...p } : x)) }));
      send((l) => l.patch(c, id, p as Record<string, unknown>));
    };
    return {
      mode, data, prefs, setPrefs,
      configured, email: user?.email ?? null, uid: user?.uid ?? null,
      signUp, signIn, resetPassword, signOut, deleteAccount,
      familyId: familyId ?? null, meta, members, syncState,
      createFamily, joinFamily, leaveFamily, newInvite, removeMember, setBoard,
      renameFamily: (name) => send((l) => l.rename(name)),
      addKid: (k) => push('kids', { ...k, id: rid(), createdAt: Date.now(), goalId: null }),
      updateKid: (id, p) => patch('kids', id, p),
      addActivity: (a) => push('activities', { ...a, id: rid() }),
      addReward: (r) => push('rewards', { ...r, id: rid() }),
      logPoints: (e) => push('log', { ...e, id: rid(), at: Date.now() }),
      addEvent: (e) => push('events', { ...e, id: rid(), createdAt: Date.now() }),
      updateEvent: (id, p) => patch('events', id, p),
      remove: (c, id) => {
        if (c === 'kids')
          for (const e of dataRef.current.events.filter((x) => x.kidIds.includes(id))) {
            if (e.kidIds.length === 1) send((l) => l.drop('events', e.id));
            else send((l) => l.patch('events', e.id, { kidIds: e.kidIds.filter((k) => k !== id) }));
          }
        send((l) => l.drop(c, id));
        setData((d) => {
          const next = { ...d, [c]: (d[c] as { id: string }[]).filter((x) => x.id !== id) } as BankData;
          // Removing a kid takes them off calendar activities, and drops activities that were only theirs.
          if (c === 'kids')
            next.events = next.events
              .filter((e) => !(e.kidIds.length === 1 && e.kidIds[0] === id))
              .map((e) => ({ ...e, kidIds: e.kidIds.filter((k) => k !== id) }));
          return next;
        });
      },
      saveSettings: (p) => {
        setData((d) => ({ ...d, settings: { ...d.settings, ...p } }));
        send((l) => l.settings(p as Record<string, unknown>));
      },
      replaceAll: (d) => {
        const n = normalize(d);
        setData(n);
        send((l) => l.setAll(n));
      },
    };
  }, [mode, data, prefs, setPrefs, configured, user, signUp, signIn, resetPassword, signOut, deleteAccount, familyId, meta, members, syncState,
      createFamily, joinFamily, leaveFamily, newInvite, removeMember, setBoard]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
