import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STARTER } from './starter';
import type { Activity, BankData, CalEvent, Kid, LogEntry, Reward, Settings } from './types';
import { rid } from './utils';

const DATA_KEY = 'fpb-data';
const PREFS_KEY = 'fpb-prefs';

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
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<BankData>(STARTER);
  const [prefs, setPrefsState] = useState<Prefs>({ kidMode: false, tab: 'kids' });
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [d, p] = await Promise.all([AsyncStorage.getItem(DATA_KEY), AsyncStorage.getItem(PREFS_KEY)]);
        if (d) setData(normalize(JSON.parse(d)));
        if (p) setPrefsState((old) => ({ ...old, ...JSON.parse(p) }));
      } catch {
        // Start fresh from the starter lists if saved data can't be read.
      }
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(DATA_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs]);

  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((old) => ({ ...old, ...p })), []);

  const store = useMemo<Store>(() => {
    const push = <C extends Coll>(c: C, item: BankData[C][number]) =>
      setData((d) => ({ ...d, [c]: [...d[c], item] }));
    const patch = <C extends Coll>(c: C, id: string, p: Partial<BankData[C][number]>) =>
      setData((d) => ({ ...d, [c]: (d[c] as BankData[C][number][]).map((x) => (x.id === id ? { ...x, ...p } : x)) }));
    return {
      ready, data, prefs, setPrefs,
      addKid: (k) => push('kids', { ...k, id: rid(), createdAt: Date.now(), goalId: null }),
      updateKid: (id, p) => patch('kids', id, p),
      addActivity: (a) => push('activities', { ...a, id: rid() }),
      addReward: (r) => push('rewards', { ...r, id: rid() }),
      logPoints: (e) => push('log', { ...e, id: rid(), at: Date.now() }),
      addEvent: (e) => push('events', { ...e, id: rid(), createdAt: Date.now() }),
      updateEvent: (id, p) => patch('events', id, p),
      remove: (c, id) =>
        setData((d) => {
          const next = { ...d, [c]: (d[c] as { id: string }[]).filter((x) => x.id !== id) } as BankData;
          // Removing a kid takes them off calendar activities, and drops activities that were only theirs.
          if (c === 'kids')
            next.events = next.events
              .filter((e) => !(e.kidIds.length === 1 && e.kidIds[0] === id))
              .map((e) => ({ ...e, kidIds: e.kidIds.filter((k) => k !== id) }));
          return next;
        }),
      saveSettings: (p) => setData((d) => ({ ...d, settings: { ...d.settings, ...p } })),
      replaceAll: (d) => setData(normalize(d)),
    };
  }, [ready, data, prefs, setPrefs]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
