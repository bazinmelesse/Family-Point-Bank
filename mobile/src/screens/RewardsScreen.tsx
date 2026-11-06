import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Btn, Card, ConfirmBtn, Empty, Field, H2, Input, ListItem, PillRow, Row, Sub, useToast } from '../components/ui';
import { useStore } from '../store';
import { useTheme } from '../theme';
import type { RewardCategory } from '../types';
import { rate, REWARD_CATS } from '../utils';

export function RewardsScreen() {
  const t = useTheme();
  const toast = useToast();
  const { data, addReward, remove } = useStore();
  const [label, setLabel] = useState('');
  const [cost, setCost] = useState('30');
  const [cat, setCat] = useState<RewardCategory>('privilege');
  const items = [...data.rewards].sort((a, b) => a.cost - b.cost);
  const submit = () => {
    if (!label.trim()) return;
    addReward({ label: label.trim(), cost: Math.abs(Math.round(Number(cost))) || 1, category: cat });
    toast('Reward added');
    setLabel('');
  };
  return (
    <View style={{ gap: 16 }}>
      <Card>
        <View>
          <H2>Rewards</H2>
          <Sub>Kids spend points on these. Money is always available at {rate(data.settings)} points per $1.</Sub>
        </View>
        <View>
          {items.map((r, i) => (
            <ListItem key={r.id} first={i === 0}>
              <Text style={{ flex: 1, color: t.ink }}>{r.label}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: t.muted, backgroundColor: t.sunk, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, overflow: 'hidden' }}>
                {REWARD_CATS[r.category] || 'Other'}
              </Text>
              <Text style={{ fontWeight: '800', color: t.ink, minWidth: 34, textAlign: 'right' }}>{r.cost}</Text>
              <ConfirmBtn onConfirm={() => remove('rewards', r.id)} />
            </ListItem>
          ))}
          {!items.length && <Empty>No rewards yet. Add the first one below.</Empty>}
        </View>
      </Card>
      <Card>
        <H2>Add a reward</H2>
        <Field label="Reward"><Input value={label} onChangeText={setLabel} maxLength={60} placeholder="e.g. Pizza night pick" /></Field>
        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="Cost (points)" style={{ width: 110 }}><Input value={cost} onChangeText={setCost} keyboardType="number-pad" maxLength={5} /></Field>
          <Field label="Kind">
            <PillRow options={(Object.keys(REWARD_CATS) as RewardCategory[]).map((k) => ({ id: k, label: REWARD_CATS[k] }))} value={cat} onChange={setCat} />
          </Field>
          <Btn label="Add" variant="cash" onPress={submit} disabled={!label.trim()} />
        </Row>
      </Card>
    </View>
  );
}
