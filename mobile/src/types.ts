export type KidColor = 'k1' | 'k2' | 'k3' | 'k4' | 'k5' | 'k6';

export interface Kid {
  id: string;
  name: string;
  age: number; // 2–16
  color: KidColor;
  goalId: string | null;
  createdAt: number;
}

export interface Activity {
  id: string;
  label: string;
  points: number;
  type: 'earn' | 'lose';
  minAge: number;
  maxAge: number;
}

export type RewardCategory = 'screen' | 'privilege' | 'outing' | 'time';

export interface Reward {
  id: string;
  label: string;
  cost: number;
  category: RewardCategory;
}

export interface LogEntry {
  id: string;
  kidId: string;
  label: string;
  points: number; // negative for losses and cash-ins
  kind: 'earn' | 'lose' | 'redeem';
  at: number;
}

export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly';

export interface CalEvent {
  id: string;
  title: string;
  kidIds: string[]; // empty means the whole family
  date: string; // YYYY-MM-DD, the first (or only) day
  start?: string; // HH:MM, 24-hour
  end?: string; // HH:MM, 24-hour
  repeat: Repeat;
  until?: string; // YYYY-MM-DD, last day a repeating event happens
  place?: string;
  createdAt: number;
}

export type LockType = 'math1' | 'math2' | 'math3' | 'math4' | 'custom';

export interface Settings {
  pointsPerDollar: number;
  lockType: LockType;
  lockQ: string;
  lockA: string;
}

export interface BankData {
  kids: Kid[];
  activities: Activity[];
  rewards: Reward[];
  log: LogEntry[];
  events: CalEvent[];
  settings: Settings;
}
