import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, ConfirmBtn, Empty, H2, ListItem, PillRow, Sub, useToast } from '../components/ui';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { sortKids } from '../utils';

export function HistoryScreen() {
  const t = useTheme();
  const toast = useToast();
  const { data, remove } = useStore();
  const [kidId, setKidId] = useState('');
  const rows = data.log.filter((e) => !kidId || e.kidId === kidId).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 200);
  const fmt = (ms: number) => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <Card>
      <View>
        <H2>History</H2>
        <Sub>Every change, newest first. Undo removes an entry.</Sub>
      </View>
      <PillRow scroll options={[{ id: '', label: 'All kids' }, ...sortKids(data.kids).map((k) => ({ id: k.id, label: k.name, color: t.kids[k.color] }))]} value={kidId} onChange={setKidId} />
      <View>
        {rows.map((e, i) => {
          const k = data.kids.find((x) => x.id === e.kidId);
          return (
            <ListItem key={e.id} first={i === 0}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.ink }}>{e.label}</Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>
                  {k ? k.name : 'Removed kid'} · {fmt(e.at)}{e.kind === 'redeem' ? ' · cashed in' : ''}
                </Text>
              </View>
              <Text style={{ fontWeight: '800', color: e.points >= 0 ? t.earn : t.lose }}>{e.points >= 0 ? '+' : '−'}{Math.abs(e.points)}</Text>
              <ConfirmBtn label="Undo" onConfirm={() => { remove('log', e.id); toast('Entry undone'); }} />
            </ListItem>
          );
        })}
        {!rows.length && <Empty>No points logged yet. Go to Kids and tap + Points.</Empty>}
      </View>
    </Card>
  );
}
