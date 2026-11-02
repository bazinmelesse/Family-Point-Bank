import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Bar, Btn, Card, H2, Input, Row, useToast } from '../components/ui';
import { useStore } from '../store';
import { useTheme } from '../theme';
import type { CalEvent, Kid } from '../types';
import {
  balance, familyEventsOn, firstName, fmtSpan, isOver, makeGate, money, normAns, relDay, sortKids, upcoming, ymd, eventsOn,
} from '../utils';

const MIN_COL = 230;

function EventLine({ e, dim, day, color }: { e: CalEvent; dim?: boolean; day?: string; color: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', opacity: dim ? 0.45 : 1 }}>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: color }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.ink, fontWeight: '800', fontSize: 16, textDecorationLine: dim ? 'line-through' : 'none' }} numberOfLines={2}>{e.title}</Text>
        <Text style={{ color: t.muted, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {day ? `${relDay(day)} · ` : ''}{fmtSpan(e)}{e.place ? ` · ${e.place}` : ''}
        </Text>
      </View>
    </View>
  );
}

function KidPanel({ kid, width, now }: { kid: Kid; width: number; now: Date }) {
  const t = useTheme();
  const { data } = useStore();
  const today = ymd(now);
  const b = balance(data.log, kid.id);
  const young = (Number(kid.age) || 8) <= 6;
  const goal = data.rewards.find((r) => r.id === kid.goalId);
  const color = t.kids[kid.color];
  const todays = eventsOn(data.events, today, kid.id);
  const next = upcoming(data.events, kid.id, today, 7, 2);
  const canGet = data.rewards.filter((r) => r.cost <= b).length;
  const bigSize = Math.max(56, Math.min(width * 0.36, 150));
  const stars = Math.max(0, Math.min(b, 20));

  return (
    <View style={{ width, backgroundColor: t.surface, borderRadius: 24, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
      <View style={{ backgroundColor: color, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ borderWidth: 3, borderColor: '#fff', borderRadius: 99 }}><Avatar kid={kid} size={44} /></View>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 26, flex: 1 }} numberOfLines={1} adjustsFontSizeToFit>{firstName(kid.name)}</Text>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: bigSize, lineHeight: bigSize * 1.05, fontWeight: '900', color: t.ink, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{b}</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: t.muted }}>{young ? 'stars' : 'points'}</Text>
          {young ? (
            <Text style={{ color: t.accent, fontSize: 20, textAlign: 'center', marginTop: 4 }} accessibilityLabel={`${b} stars`}>
              {'★'.repeat(stars)}{b > 20 ? ` +${b - 20}` : ''}
            </Text>
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.muted, marginTop: 2 }}>worth {money(Math.max(0, b), data.settings)}</Text>
          )}
        </View>

        {goal ? (
          <View style={{ gap: 6 }}>
            <Text style={{ color: t.ink, fontWeight: '800' }} numberOfLines={2}>Saving for: {goal.label}</Text>
            <Bar pct={(b / goal.cost) * 100} height={16} color={color} />
            <Text style={{ color: t.muted, fontWeight: '700', fontSize: 13 }}>
              {b >= goal.cost ? 'You have enough! Ask a grown-up.' : `${goal.cost - b} more to go`}
            </Text>
          </View>
        ) : canGet > 0 ? (
          <Text style={{ color: t.earn, fontWeight: '800', textAlign: 'center' }}>{canGet} reward{canGet === 1 ? '' : 's'} you can get now!</Text>
        ) : null}

        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', letterSpacing: 0.8, color: t.muted }}>TODAY</Text>
          {todays.map((e) => <EventLine key={e.id} e={e} color={color} dim={isOver(e, now)} />)}
          {!todays.length && <Text style={{ color: t.muted, fontWeight: '600' }}>Nothing on the calendar</Text>}
          {next.length > 0 && <Text style={{ fontSize: 12, fontWeight: '900', letterSpacing: 0.8, color: t.muted, marginTop: 4 }}>COMING UP</Text>}
          {next.map(({ e, day }) => <EventLine key={e.id + day} e={e} day={day} color={color} />)}
        </View>
      </View>
    </View>
  );
}

function Gate({ visible, onClose, onPass }: { visible: boolean; onClose: () => void; onPass: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const { data } = useStore();
  const [gate, setGate] = useState(() => makeGate(data.settings));
  const [ans, setAns] = useState('');
  const [wrong, setWrong] = useState(false);
  useEffect(() => { if (visible) { setGate(makeGate(data.settings)); setAns(''); setWrong(false); } }, [visible, data.settings]);
  const check = () => {
    if (normAns(ans) === normAns(gate.ans)) { onPass(); toast('Grown-up mode'); }
    else { setAns(''); setWrong(true); }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: t.scrim, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <H2>Grown-ups only</H2>
          <Text style={{ color: t.ink, fontSize: 18 }}>{gate.q}</Text>
          <Input
            value={ans}
            onChangeText={setAns}
            keyboardType={gate.text ? 'default' : 'number-pad'}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onSubmitEditing={check}
            accessibilityLabel="Answer"
          />
          {wrong && <Text style={{ color: t.lose, fontWeight: '700' }}>Not quite. Ask a grown-up!</Text>}
          <Row>
            <Btn label="Unlock" variant="cash" onPress={check} />
            <Btn label="Cancel" variant="ghost" onPress={onClose} />
          </Row>
        </Card>
      </View>
    </Modal>
  );
}

/** Every kid side by side on one screen, with today's calendar. Made for a wall iPad. */
export function KidBoard({ onExit }: { onExit: () => void }) {
  const t = useTheme();
  // Keep the screen on while the board is showing (best effort; some browsers don't allow it).
  useEffect(() => {
    const tag = 'kid-board';
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => { deactivateKeepAwake(tag).catch(() => {}); };
  }, []);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data } = useStore();
  const [now, setNow] = useState(() => new Date());
  const [gate, setGate] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const kids = sortKids(data.kids);
  const pad = 16, gap = 14;
  const inner = width - pad * 2 - insets.left - insets.right;
  const cols = Math.max(1, Math.min(kids.length || 1, Math.floor((inner + gap) / (MIN_COL + gap))));
  const colW = Math.min(480, Math.floor((inner - gap * (cols - 1)) / cols));
  const today = ymd(now);
  const family = familyEventsOn(data.events, today);
  const familyNext = upcoming(data.events, null, today, 7, 3);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingLeft: pad + insets.left, paddingRight: pad + insets.right, gap: 16 }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 30, fontWeight: '900', color: t.ink }}>
              {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: t.muted }}>
              {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
          <Pressable onPress={() => setGate(true)} accessibilityRole="button" accessibilityLabel="Grown-ups" style={{ padding: 10 }}>
            <Text style={{ color: t.muted, fontWeight: '700' }}>Grown-ups</Text>
          </Pressable>
        </Row>

        {kids.length === 0 ? (
          <Card style={{ alignItems: 'center' }}>
            <H2>No kids here yet</H2>
            <Text style={{ color: t.muted }}>A grown-up can add kids from the Kids tab.</Text>
          </Card>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start', justifyContent: 'center' }}>
            {kids.map((k) => <KidPanel key={k.id} kid={k} width={colW} now={now} />)}
          </View>
        )}

        {(family.length > 0 || familyNext.length > 0) && (
          <Card>
            <Text style={{ fontSize: 12, fontWeight: '900', letterSpacing: 0.8, color: t.muted }}>WHOLE FAMILY</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {family.map((e) => <View key={e.id} style={{ flexBasis: 220, flexGrow: 1 }}><EventLine e={e} color={t.accent} dim={isOver(e, now)} /></View>)}
              {familyNext.map(({ e, day }) => <View key={e.id + day} style={{ flexBasis: 220, flexGrow: 1 }}><EventLine e={e} day={day} color={t.accent} /></View>)}
            </View>
          </Card>
        )}
      </ScrollView>
      <Gate visible={gate} onClose={() => setGate(false)} onPass={() => { setGate(false); onExit(); }} />
    </View>
  );
}
