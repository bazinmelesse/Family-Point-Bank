import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STARTER } from './starter';
import { cleanCode, cleanUrl, newFamilyCode, Remote, type SyncConfig, type SyncState } from './sync';
import type { Activity, BankData, CalEvent, Kid, LogEntry, Reward, Settings } from './types';
import { rid } from './utils';

const DATA_KEY = 'fpb-data';
const PREFS_KEY = 'fpb-prefs';
const SYNC_KEY = 'fpb-sync';

export interface Prefs {
  kidMode: boolean;
  tab: string;
}

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

type Coll = 'kids' | 'activities' | 'rewards' | 'log' | 'events';

interface Store {
  ready: boolean;
  data: BankData;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
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
  sync: SyncConfig | null;
  syncState: SyncState;
  /** 'create' starts a new family from this device's data; 'join' uses the family already online. */
  connectSync: (url: string, code: string, mode: 'create' | 'join') => Promise<void>;
  disconnectSync: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<BankData>(STARTER);
  const [prefs, setPrefsState] = useState<Prefs>({ kidMode: false, tab: 'kids' });
  const [sync, setSync] = useState<SyncConfig | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('local');
  const loaded = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const remote = useRef<Remote | null>(null);

  const startRemote = useCallback((r: Remote) => {
    remote.current?.close();
    remote.current = r;
    setSyncState('connecting');
    r.listen(
      (d) => { if (d && remote.current === r) setData(normalize(d)); },
      (st) => { if (remote.current === r) setSyncState(st); },
    );
  }, []);

  useEffect(() => {
    (async () => {
      let cfg: SyncConfig | null = null;
      try {
        const [d, p, sc] = await Promise.all([AsyncStorage.getItem(DATA_KEY), AsyncStorage.getItem(PREFS_KEY), AsyncStorage.getItem(SYNC_KEY)]);
        // The saved copy shows right away; with sync on, the online copy replaces it once it arrives.
        if (d) setData(normalize(JSON.parse(d)));
        if (p) setPrefsState((old) => ({ ...old, ...JSON.parse(p) }));
        if (sc) cfg = JSON.parse(sc);
      } catch {
        // Start fresh from the starter lists if saved data can't be read.
      }
      loaded.current = true;
      setReady(true);
      if (cfg?.url && cfg.code) {
        setSync(cfg);
        try { startRemote(new Remote(cfg)); } catch { setSyncState('error'); }
      }
    })();
    return () => remote.current?.close();
  }, [startRemote]);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(DATA_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs]);

  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((old) => ({ ...old, ...p })), []);

  const connectSync = useCallback(async (rawUrl: string, rawCode: string, mode: 'create' | 'join') => {
    const url = cleanUrl(rawUrl);
    if (!url) throw new Error("That doesn't look like a Firebase database address. It ends in firebaseio.com or firebasedatabase.app.");
    const code = mode === 'create' ? newFamilyCode() : cleanCode(rawCode);
    if (code.length < 20) throw new Error('Family codes are 29 characters, like abcd-efgh-jkmn-pqrs-tuvw-xyz2.');
    const cfg = { url, code };
    const r = new Remote(cfg);
    let online: Partial<BankData> | null;
    try {
      online = await Promise.race([
        r.readOnce(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
      ]);
    } catch (e) {
      r.close();
      throw new Error(
        String(e).includes('timeout')
          ? "Couldn't reach the database. Check the address and your internet connection."
          : 'The database said no. Check that the rules from the setup steps are published.',
      );
    }
    if (mode === 'join' && !online) {
      r.close();
      throw new Error('No family with that code yet. Check the code, or tap Start a new family on the first device.');
    }
    if (mode === 'create') await r.setAll(dataRef.current);
    else setData(normalize(online));
    await AsyncStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
    setSync(cfg);
    startRemote(r);
  }, [startRemote]);

  const disconnectSync = useCallback(() => {
    remote.current?.close();
    remote.current = null;
    setSync(null);
    setSyncState('local');
    AsyncStorage.removeItem(SYNC_KEY).catch(() => {});
  }, []);

  const store = useMemo<Store>(() => {
    // Every change applies here right away and, with sync on, is also written online.
    const send = (fn: (r: Remote) => Promise<unknown>) => {
      const r = remote.current;
      if (r) fn(r).catch(() => setSyncState('error'));
    };
    const push = <C extends Coll>(c: C, item: BankData[C][number]) => {
      setData((d) => ({ ...d, [c]: [...d[c], item] }));
      send((r) => r.put(c, item));
    };
    const patch = <C extends Coll>(c: C, id: string, p: Partial<BankData[C][number]>) => {
      setData((d) => ({ ...d, [c]: (d[c] as BankData[C][number][]).map((x) => (x.id === id ? { ...x, ...p } : x)) }));
      send((r) => r.patch(c, id, p as Record<string, unknown>));
    };
    return {
      ready, data, prefs, setPrefs, sync, syncState, connectSync, disconnectSync,
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
            if (e.kidIds.length === 1) send((r) => r.drop('events', e.id));
            else send((r) => r.patch('events', e.id, { kidIds: e.kidIds.filter((k) => k !== id) }));
          }
        send((r) => r.drop(c, id));
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
        send((r) => r.settings(p as Record<string, unknown>));
      },
      replaceAll: (d) => {
        const n = normalize(d);
        setData(n);
        send((r) => r.setAll(n));
      },
    };
  }, [ready, data, prefs, setPrefs, sync, syncState, connectSync, disconnectSync]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
