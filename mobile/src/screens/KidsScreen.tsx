import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PointsSheet, type SheetMode } from '../components/PointsSheet';
import { Avatar, Bar, Btn, Card, ConfirmBtn, Field, H2, Input, PillRow, Row, Sheet, Sub, useToast } from '../components/ui';
import { useStore } from '../store';
import { KID_COLORS, useTheme } from '../theme';
import type { Kid, KidColor } from '../types';
import { balance, eventsOn, fmtSpan, money, sortKids, todayYmd } from '../utils';

const AGES = Array.from({ length: 15 }, (_, i) => i + 2);

function KidCard({ kid, onSheet, onGoal }: { kid: Kid; onSheet: (m: SheetMode) => void; onGoal: () => void }) {
  const t = useTheme();
  const { data, remove } = useStore();
  const b = balance(data.log, kid.id);
  const goal = data.rewards.find((r) => r.id === kid.goalId);
  const pct = goal ? Math.round((b / goal.cost) * 100) : 0;
  const today = eventsOn(data.events, todayYmd(), kid.id);
  return (
    <Card style={{ flexGrow: 1, flexBasis: 280, maxWidth: 520 }}>
      <Row style={{ flexWrap: 'nowrap' }}>
        <Avatar kid={kid} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: t.ink }}>{kid.name}</Text>
          <Sub style={{ marginTop: 0 }}>Age {kid.age}</Sub>
        </View>
        <ConfirmBtn onConfirm={() => remove('kids', kid.id)} accessibilityLabel={`Remove ${kid.name}`} />
      </Row>
      <Row style={{ alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontSize: 44, fontWeight: '900', color: t.ink, lineHeight: 48 }}>{b}</Text>
        <Sub>points · worth {money(Math.max(0, b), data.settings)}</Sub>
      </Row>
      <View style={{ gap: 6 }}>
        <Pressable onPress={onGoal} accessibilityRole="button" style={{ borderWidth: 1, borderColor: t.line, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10 }}>
          <Text style={{ color: goal ? t.ink : t.muted, fontWeight: '600' }}>
            {goal ? `Saving for: ${goal.label} (${goal.cost})` : 'Pick a reward to save for'}
          </Text>
        </Pressable>
        {goal && (
          <>
            <Bar pct={pct} />
            <Sub style={{ marginTop: 0 }}>{b >= goal.cost ? 'Ready to cash in!' : `${goal.cost - b} more points to go`}</Sub>
          </>
        )}
      </View>
      {today.length > 0 && (
        <Sub style={{ marginTop: 0 }}>
          Today: {today.map((e) => `${e.title} (${fmtSpan(e)})`).join(', ')}
        </Sub>
      )}
      <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
        <Btn label="+ Points" variant="earn" style={{ flex: 1 }} onPress={() => onSheet('earn')} />
        <Btn label="− Points" variant="lose" style={{ flex: 1 }} onPress={() => onSheet('lose')} />
        <Btn label="Cash in" variant="cash" style={{ flex: 1 }} onPress={() => onSheet('redeem')} />
      </Row>
    </Card>
  );
}

function AddKid() {
  const t = useTheme();
  const toast = useToast();
  const { addKid } = useStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState(6);
  const [color, setColor] = useState<KidColor>('k1');
  const submit = () => {
    const n = name.trim();
    if (!n) return;
    addKid({ name: n, age, color });
    toast(`Added ${n}`);
    setName('');
  };
  return (
    <Card dashed style={{ flexGrow: 1, flexBasis: 280, maxWidth: 520 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: t.ink }}>Add a kid</Text>
      <Field label="Name"><Input value={name} onChangeText={setName} maxLength={30} placeholder="First name" onSubmitEditing={submit} /></Field>
      <Field label="Age"><PillRow scroll options={AGES.map((a) => ({ id: a, label: String(a) }))} value={age} onChange={setAge} /></Field>
      <Field label="Color"><PillRow options={KID_COLORS.map((c) => ({ id: c.id, label: c.name, color: t.kids[c.id] }))} value={color} onChange={setColor} /></Field>
      <Btn label="Add kid" variant="cash" onPress={submit} disabled={!name.trim()} />
    </Card>
  );
}

export function KidsScreen() {
  const t = useTheme();
  const { data, updateKid } = useStore();
  const [sheet, setSheet] = useState<{ kidId: string; mode: SheetMode } | null>(null);
  const [goalFor, setGoalFor] = useState<string | null>(null);
  const goalKid = data.kids.find((k) => k.id === goalFor);
  return (
    <View style={{ gap: 16 }}>
      <View>
        <H2>Kids</H2>
        <Sub>Tap + or − to log points as things happen. Cash in spends points on a reward or money.</Sub>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {sortKids(data.kids).map((k) => (
          <KidCard key={k.id} kid={k} onSheet={(mode) => setSheet({ kidId: k.id, mode })} onGoal={() => setGoalFor(k.id)} />
        ))}
        <AddKid />
      </View>
      {sheet && <PointsSheet kidId={sheet.kidId} mode={sheet.mode} onClose={() => setSheet(null)} />}
      <Sheet visible={!!goalKid} onClose={() => setGoalFor(null)}>
        <H2>What is {goalKid?.name} saving for?</H2>
        {[{ id: '', label: 'No goal', cost: 0 }, ...[...data.rewards].sort((a, b) => a.cost - b.cost)].map((r) => (
          <Pressable
            key={r.id || 'none'}
            accessibilityRole="button"
            onPress={() => { if (goalKid) updateKid(goalKid.id, { goalId: r.id || null }); setGoalFor(null); }}
            style={{ padding: 12, borderRadius: 10, borderWidth: 2, borderColor: (goalKid?.goalId || '') === r.id ? t.accent : t.line, backgroundColor: t.surface, flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text style={{ color: t.ink, fontWeight: '600' }}>{r.label}</Text>
            {!!r.cost && <Text style={{ color: t.ink, fontWeight: '800' }}>{r.cost}</Text>}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
