import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import type { Activity } from '../types';
import { balance, firstName, money, rate } from '../utils';
import { Btn, Empty, Field, Group, H2, Input, Row, Sheet, Sub, useToast } from './ui';

export type SheetMode = 'earn' | 'lose' | 'redeem';

function Chip({ label, right, rightColor, onPress, disabled, note }: { label: string; right: string; rightColor?: string; onPress: () => void; disabled?: boolean; note?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexGrow: 1, flexBasis: 160, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: t.line,
        backgroundColor: t.surface, opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.ink, fontWeight: '600' }}>{label}</Text>
        {!!note && <Text style={{ color: t.muted, fontSize: 12 }}>{note}</Text>}
      </View>
      <Text style={{ color: rightColor || t.ink, fontWeight: '800', fontSize: 16 }}>{right}</Text>
    </Pressable>
  );
}

export function PointsSheet({ kidId, mode, onClose }: { kidId: string | null; mode: SheetMode; onClose: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const { data, logPoints } = useStore();
  const [note, setNote] = useState('');
  const [pts, setPts] = useState('5');
  const [dollars, setDollars] = useState('1');
  const kid = data.kids.find((k) => k.id === kidId);
  const b = kid ? balance(data.log, kid.id) : 0;

  useEffect(() => {
    setNote('');
    setPts('5');
    setDollars(String(Math.max(0.5, Math.min(5, Math.floor((b / rate(data.settings)) * 2) / 2))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId, mode]);

  if (!kid) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;
  const age = Number(kid.age) || 8;
  const title = { earn: 'Add points', lose: 'Take away points', redeem: 'Cash in' }[mode];

  const logAct = (a: Activity) => {
    const p = mode === 'earn' ? a.points : -a.points;
    logPoints({ kidId: kid.id, label: a.label, points: p, kind: mode });
    toast(`${p > 0 ? '+' : '−'}${Math.abs(p)} for ${kid.name}: ${a.label}`);
    onClose();
  };

  let body: React.ReactNode;
  if (mode === 'earn' || mode === 'lose') {
    const list = data.activities.filter((a) => a.type === mode);
    const fits = (a: Activity) => age >= (a.minAge ?? 2) && age <= (a.maxAge ?? 16);
    const chips = (arr: Activity[]) => (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {arr.map((a) => (
          <Chip key={a.id} label={a.label} right={`${mode === 'earn' ? '+' : '−'}${a.points}`} rightColor={mode === 'earn' ? t.earn : t.lose} onPress={() => logAct(a)} />
        ))}
      </View>
    );
    const fit = list.filter(fits), other = list.filter((a) => !fits(a));
    const n = Math.abs(Math.round(Number(pts))) || 0;
    body = (
      <>
        {fit.length > 0 && <><Group>Good for age {age}</Group>{chips(fit)}</>}
        {other.length > 0 && <><Group>Other ages</Group>{chips(other)}</>}
        {!list.length && <Empty>No choices yet. Add some under Earn &amp; lose, or use a custom amount.</Empty>}
        <Group>Custom</Group>
        <Row style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
          <Field label="Reason" style={{ flex: 2 }}>
            <Input value={note} onChangeText={setNote} maxLength={60} placeholder={mode === 'earn' ? 'e.g. Helped grandma' : 'e.g. Left bike in the rain'} />
          </Field>
          <Field label="Points" style={{ flex: 1 }}>
            <Input value={pts} onChangeText={setPts} keyboardType="number-pad" maxLength={4} />
          </Field>
          <Btn
            label={mode === 'earn' ? 'Add' : 'Take away'}
            variant={mode === 'earn' ? 'earn' : 'lose'}
            disabled={!n}
            onPress={() => {
              const p = mode === 'earn' ? n : -n;
              logPoints({ kidId: kid.id, label: note.trim() || (p > 0 ? 'Bonus points' : 'Points taken away'), points: p, kind: mode });
              toast(`${p > 0 ? '+' : '−'}${n} for ${kid.name}`);
              onClose();
            }}
          />
        </Row>
      </>
    );
  } else {
    const rs = [...data.rewards].sort((x, y) => x.cost - y.cost);
    const d = Number(dollars) || 0;
    const cost = Math.round(d * rate(data.settings));
    body = (
      <>
        <Group>Rewards</Group>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {rs.map((r) => (
            <Chip
              key={r.id}
              label={r.label}
              right={String(r.cost)}
              disabled={r.cost > b}
              note={r.cost > b ? `${r.cost - b} more needed` : undefined}
              onPress={() => {
                logPoints({ kidId: kid.id, label: r.label, points: -r.cost, kind: 'redeem' });
                toast(`${kid.name} cashed in ${r.label}`);
                onClose();
              }}
            />
          ))}
          {!rs.length && <Empty>No rewards yet.</Empty>}
        </View>
        <Group>Money</Group>
        <Row style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
          <Field label="Dollars" style={{ width: 100 }}>
            <Input value={dollars} onChangeText={setDollars} keyboardType="decimal-pad" maxLength={7} />
          </Field>
          <Sub style={{ flex: 1, marginBottom: 10 }}>
            {cost > b ? `Needs ${cost} points, ${cost - b} more than ${firstName(kid.name)} has.` : `Uses ${cost} of ${b} points.`}
          </Sub>
          <Btn
            label="Cash out"
            variant="cash"
            disabled={!cost || cost > b}
            onPress={() => {
              logPoints({ kidId: kid.id, label: `Cashed out $${d.toFixed(2)}`, points: -cost, kind: 'redeem' });
              toast(`${kid.name} cashed out $${d.toFixed(2)}`);
              onClose();
            }}
          />
        </Row>
      </>
    );
  }

  return (
    <Sheet visible onClose={onClose}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}>
          <H2>{title} · {kid.name}</H2>
          <Sub>Balance {b} points ({money(Math.max(0, b), data.settings)})</Sub>
        </View>
        <Btn label="Close" variant="ghost" onPress={onClose} />
      </Row>
      {body}
    </Sheet>
  );
}
