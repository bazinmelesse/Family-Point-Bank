import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { Btn, Card, Field, H2, Input, Pill, Row, Sub, useToast } from '../components/ui';
import { normalize, useStore } from '../store';
import { boardSrc } from '../sync';
import { useTheme } from '../theme';
import type { BankData, LockType } from '../types';
import { LOCKS, money, rate } from '../utils';

const STATE_TEXT = {
  local: 'Off',
  connecting: 'Connecting…',
  live: 'On and connected',
  offline: 'On, but this device is offline. Changes will send when it reconnects.',
  error: 'On, but the last change didn\'t save online. Check the database rules.',
} as const;

function SyncCard() {
  const t = useTheme();
  const toast = useToast();
  const { sync, syncState, connectSync, disconnectSync } = useStore();
  const [url, setUrl] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async (mode: 'create' | 'join') => {
    setBusy(true);
    setErr('');
    try {
      await connectSync(url, code, mode);
      toast(mode === 'create' ? 'Sync is on. Use the family code on your other devices.' : 'Joined your family');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  if (sync)
    return (
      <Card>
        <View>
          <H2>Sync between devices</H2>
          <Sub>{STATE_TEXT[syncState]}</Sub>
        </View>
        <Field label="Database">
          <Text selectable style={{ color: t.ink }}>{sync.url}</Text>
        </Field>
        <Field label="Family code">
          <Text selectable style={{ color: t.ink, fontSize: 20, fontWeight: '800', letterSpacing: 1 }}>{sync.code}</Text>
        </Field>
        <Sub>
          On each other phone or iPad, open Settings, enter the same database address and this code, and tap Join. Treat the
          code like a password: anyone who has it can see and change your points.
        </Sub>
        <Field label="Old iPad board address">
          <Text selectable style={{ color: t.muted, fontSize: 13 }}>display.html?src={boardSrc(sync)}</Text>
        </Field>
        <Row>
          <Btn label="Share code" onPress={() => { Share.share({ message: `Family Point Bank\nDatabase: ${sync.url}\nFamily code: ${sync.code}` }).catch(() => {}); }} />
          <Btn label="Turn off sync on this device" variant="ghost" onPress={disconnectSync} />
        </Row>
      </Card>
    );

  return (
    <Card>
      <View>
        <H2>Sync between devices</H2>
        <Sub>Off. Points are saved only on this device. Turn sync on so every parent's phone and the iPad show the same points, live. The setup steps are in the app's README.</Sub>
      </View>
      <Field label="Firebase database address">
        <Input value={url} onChangeText={setUrl} placeholder="https://your-family-default-rtdb.firebaseio.com" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      </Field>
      <Row style={{ alignItems: 'flex-end' }}>
        <Btn label={busy ? 'Working…' : 'Start a new family'} variant="cash" disabled={busy || !url.trim()} onPress={() => go('create')} />
        <Sub style={{ marginTop: 0, flexShrink: 1 }}>On the first device. Uploads this device's kids and points.</Sub>
      </Row>
      <Field label="Or join with a family code">
        <Input value={code} onChangeText={setCode} placeholder="abcd-efgh-jkmn-pqrs-tuvw-xyz2" autoCapitalize="none" autoCorrect={false} />
      </Field>
      <Row>
        <Btn label={busy ? 'Working…' : 'Join'} disabled={busy || !url.trim() || !code.trim()} onPress={() => go('join')} />
        <Sub style={{ marginTop: 0, flexShrink: 1 }}>Replaces this device's data with your family's.</Sub>
      </Row>
      {!!err && <Text style={{ color: t.lose, fontWeight: '700' }}>{err}</Text>}
    </Card>
  );
}

export function SettingsScreen() {
  const toast = useToast();
  const { data, saveSettings, replaceAll } = useStore();
  const s = data.settings;
  const [ppd, setPpd] = useState(String(rate(s)));
  const [lockType, setLockType] = useState<LockType>(s.lockType || 'math1');
  const [lockQ, setLockQ] = useState(s.lockQ || '');
  const [lockA, setLockA] = useState(s.lockA || '');
  const [paste, setPaste] = useState('');

  return (
    <View style={{ gap: 16 }}>
      <SyncCard />

      <Card>
        <H2>Points and money</H2>
        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="Points for $1" style={{ width: 120 }}>
            <Input value={ppd} onChangeText={setPpd} keyboardType="number-pad" maxLength={4} />
          </Field>
          <Btn
            label="Save"
            onPress={() => {
              const v = Math.round(Number(ppd));
              if (v >= 1) { saveSettings({ pointsPerDollar: v }); toast(`Saved: ${v} points per $1`); }
            }}
          />
        </Row>
        <Sub>With {rate(s)} points per $1, a kid with 50 points can cash out {money(50, s)}.</Sub>
      </Card>

      <Card>
        <View>
          <H2>Kid view lock</H2>
          <Sub>Leaving kid view asks this question. Pick something your kids can't answer yet.</Sub>
        </View>
        <View style={{ gap: 6 }}>
          {(Object.keys(LOCKS) as LockType[]).map((k) => (
            <View key={k} style={{ flexDirection: 'row' }}>
              <Pill label={LOCKS[k]} on={lockType === k} onPress={() => setLockType(k)} />
            </View>
          ))}
        </View>
        {lockType === 'custom' && (
          <Row style={{ alignItems: 'flex-end' }}>
            <Field label="Your question" style={{ flexGrow: 2, flexBasis: 220 }}>
              <Input value={lockQ} onChangeText={setLockQ} maxLength={120} placeholder="e.g. What's the grown-up PIN?" />
            </Field>
            <Field label="Answer" style={{ flexGrow: 1, flexBasis: 120 }}>
              <Input value={lockA} onChangeText={setLockA} maxLength={60} autoCapitalize="none" autoCorrect={false} />
            </Field>
          </Row>
        )}
        <Row>
          <Btn
            label="Save lock"
            variant="cash"
            onPress={() => {
              if (lockType === 'custom' && (!lockQ.trim() || !lockA.trim())) { toast('Add both a question and an answer.'); return; }
              saveSettings({ lockType, lockQ: lockQ.trim(), lockA: lockA.trim() });
              toast('Lock saved');
            }}
          />
          <Sub style={{ marginTop: 0 }}>Capital letters and extra spaces don't matter.</Sub>
        </Row>
      </Card>

      <Card>
        <View>
          <H2>Copy or paste data</H2>
          <Sub>A backup, or a way to move data without sync. With sync on, pasting replaces your family's data on every device.</Sub>
        </View>
        <Row>
          <Btn
            label="Copy all data"
            onPress={() => { Share.share({ message: JSON.stringify(data) }).catch(() => toast('Sharing is not available here.')); }}
          />
        </Row>
        <Field label="Paste data from another device or the web app">
          <Input value={paste} onChangeText={setPaste} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} placeholder='{"kids":[...],"log":[...]}' autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Row>
          <Btn
            label="Replace with pasted data"
            variant="lose"
            disabled={!paste.trim()}
            onPress={() => {
              try {
                const parsed = JSON.parse(paste) as Partial<BankData>;
                if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.kids)) throw new Error('bad');
                replaceAll(normalize(parsed));
                setPaste('');
                toast('Data loaded');
              } catch {
                toast("That doesn't look like point bank data.");
              }
            }}
          />
          <Sub style={{ marginTop: 0 }}>This replaces everything.</Sub>
        </Row>
      </Card>
    </View>
  );
}
