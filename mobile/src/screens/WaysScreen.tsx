import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Btn, Card, ConfirmBtn, Empty, Field, H2, Input, ListItem, PillRow, Row, Sub, useToast } from '../components/ui';
import { useStore } from '../store';
import { useTheme } from '../theme';

function Block({ type }: { type: 'earn' | 'lose' }) {
  const t = useTheme();
  const { data, remove } = useStore();
  const items = data.activities.filter((a) => a.type === type).sort((a, b) => a.points - b.points || a.label.localeCompare(b.label));
  return (
    <Card style={{ flexGrow: 1, flexBasis: 320 }}>
      <View>
        <H2>{type === 'earn' ? 'Ways to earn' : 'Ways to lose'}</H2>
        <Sub>{type === 'earn' ? 'Chores, school and good behavior.' : 'Points come off for these.'}</Sub>
      </View>
      <View>
        {items.map((a, i) => (
          <ListItem key={a.id} first={i === 0}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.ink }}>{a.label}</Text>
              <Text style={{ color: t.muted, fontSize: 12 }}>Ages {a.minAge ?? 2}–{a.maxAge ?? 16}</Text>
            </View>
            <Text style={{ fontWeight: '800', color: type === 'earn' ? t.earn : t.lose }}>{type === 'earn' ? '+' : '−'}{a.points}</Text>
            <ConfirmBtn onConfirm={() => remove('activities', a.id)} />
          </ListItem>
        ))}
        {!items.length && <Empty>Nothing yet. Add one below.</Empty>}
      </View>
    </Card>
  );
}

export function WaysScreen() {
  const toast = useToast();
  const { addActivity } = useStore();
  const [label, setLabel] = useState('');
  const [pts, setPts] = useState('5');
  const [type, setType] = useState<'earn' | 'lose'>('earn');
  const [min, setMin] = useState('2');
  const [max, setMax] = useState('16');
  const clampAge = (v: string, d: number) => Math.max(2, Math.min(16, Number(v) || d));
  const submit = () => {
    if (!label.trim()) return;
    let mn = clampAge(min, 2), mx = clampAge(max, 16);
    if (mn > mx) [mn, mx] = [mx, mn];
    addActivity({ label: label.trim(), points: Math.abs(Math.round(Number(pts))) || 1, type, minAge: mn, maxAge: mx });
    toast('Added');
    setLabel('');
  };
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <Block type="earn" />
        <Block type="lose" />
      </View>
      <Card>
        <H2>Add a way to earn or lose</H2>
        <Field label="What"><Input value={label} onChangeText={setLabel} maxLength={60} placeholder="e.g. Water the plants" /></Field>
        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="Type"><PillRow options={[{ id: 'earn', label: 'Earn' }, { id: 'lose', label: 'Lose' }]} value={type} onChange={setType} /></Field>
          <Field label="Points" style={{ width: 80 }}><Input value={pts} onChangeText={setPts} keyboardType="number-pad" maxLength={4} /></Field>
          <Field label="From age" style={{ width: 80 }}><Input value={min} onChangeText={setMin} keyboardType="number-pad" maxLength={2} /></Field>
          <Field label="To age" style={{ width: 80 }}><Input value={max} onChangeText={setMax} keyboardType="number-pad" maxLength={2} /></Field>
          <Btn label="Add" variant="cash" onPress={submit} disabled={!label.trim()} />
        </Row>
        <Sub>Age ranges decide which choices show first for each kid.</Sub>
      </Card>
    </View>
  );
}
