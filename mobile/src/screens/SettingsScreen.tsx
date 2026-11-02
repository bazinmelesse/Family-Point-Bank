import React, { useState } from 'react';
import { Share, View } from 'react-native';
import { Btn, Card, Field, H2, Input, Pill, Row, Sub, useToast } from '../components/ui';
import { normalize, useStore } from '../store';
import type { BankData, LockType } from '../types';
import { LOCKS, money, rate } from '../utils';

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
          <H2>Where your data lives</H2>
          <Sub>Everything is saved on this device. To move it to another phone or iPad, copy it here and paste it there.</Sub>
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
          <Sub style={{ marginTop: 0 }}>This replaces everything on this device.</Sub>
        </Row>
      </Card>
    </View>
  );
}
