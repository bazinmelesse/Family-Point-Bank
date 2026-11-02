import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar, Btn, Card, ConfirmBtn, Empty, Field, H2, Input, Pill, PillRow, Row, Sheet, Sub, useToast } from '../components/ui';
import { useStore } from '../store';
import { useTheme } from '../theme';
import type { CalEvent, Repeat } from '../types';
import {
  addDays, dayLabel, fmtSpan, fmtTime, occursOn, parseTime, parseYmd, REPEATS, sortKids, todayYmd, ymd,
} from '../utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s).getTime()) && ymd(parseYmd(s)) === s;

type Draft = { id?: string; title: string; kidIds: string[]; date: string; start: string; end: string; repeat: Repeat; until: string; place: string };

function EventForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const { data, addEvent, updateEvent, remove } = useStore();
  const [d, setD] = useState<Draft>(draft);
  // Shown inside the sheet, since a toast would sit behind it.
  const [err, setErr] = useState('');
  const set = (p: Partial<Draft>) => setD((old) => ({ ...old, ...p }));
  const kids = sortKids(data.kids);
  const toggleKid = (id: string) => set({ kidIds: d.kidIds.includes(id) ? d.kidIds.filter((k) => k !== id) : [...d.kidIds, id] });

  const save = () => {
    const title = d.title.trim();
    if (!title) { setErr('Give the activity a name.'); return; }
    if (!isYmd(d.date)) { setErr('Use a date like 2026-11-14.'); return; }
    const start = parseTime(d.start), end = parseTime(d.end);
    if (start === null || end === null) { setErr('Use a time like 3:30 pm.'); return; }
    if (end && !start) { setErr('Add a start time too.'); return; }
    if (d.until && !isYmd(d.until)) { setErr('Use an end date like 2027-06-01.'); return; }
    const ev: Omit<CalEvent, 'id' | 'createdAt'> = {
      title, kidIds: d.kidIds, date: d.date, start: start || undefined, end: end || undefined,
      repeat: d.repeat, until: d.repeat !== 'none' && d.until ? d.until : undefined, place: d.place.trim() || undefined,
    };
    if (d.id) updateEvent(d.id, ev); else addEvent(ev);
    toast(d.id ? 'Saved' : `Added ${title}`);
    onClose();
  };

  return (
    <Sheet visible onClose={onClose}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <H2 style={{ flex: 1 }}>{d.id ? 'Edit activity' : 'Add an activity'}</H2>
        <Btn label="Close" variant="ghost" onPress={onClose} />
      </Row>
      <Field label="What"><Input value={d.title} onChangeText={(v) => set({ title: v })} maxLength={60} placeholder="e.g. Soccer practice" /></Field>
      <Field label="Who">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Pill label="Whole family" on={d.kidIds.length === 0} onPress={() => set({ kidIds: [] })} />
          {kids.map((k) => <Pill key={k.id} label={k.name} color={t.kids[k.color]} on={d.kidIds.includes(k.id)} onPress={() => toggleKid(k.id)} />)}
        </View>
      </Field>
      <Row style={{ alignItems: 'flex-end' }}>
        <Field label="Date" style={{ width: 140 }}><Input value={d.date} onChangeText={(v) => set({ date: v })} placeholder="2026-11-14" maxLength={10} autoCapitalize="none" /></Field>
        <Field label="Starts" style={{ width: 110 }}><Input value={d.start} onChangeText={(v) => set({ start: v })} placeholder="3:30 pm" maxLength={8} autoCapitalize="none" /></Field>
        <Field label="Ends" style={{ width: 110 }}><Input value={d.end} onChangeText={(v) => set({ end: v })} placeholder="5 pm" maxLength={8} autoCapitalize="none" /></Field>
      </Row>
      <Sub style={{ marginTop: -6 }}>Leave the times blank for an all-day item.</Sub>
      <Field label="Repeats">
        <PillRow options={(Object.keys(REPEATS) as Repeat[]).map((r) => ({ id: r, label: REPEATS[r] }))} value={d.repeat} onChange={(r) => set({ repeat: r })} />
      </Field>
      {d.repeat !== 'none' && (
        <Field label="Last day (optional)" style={{ width: 160 }}>
          <Input value={d.until} onChangeText={(v) => set({ until: v })} placeholder="2027-06-01" maxLength={10} autoCapitalize="none" />
        </Field>
      )}
      <Field label="Where (optional)"><Input value={d.place} onChangeText={(v) => set({ place: v })} maxLength={60} placeholder="e.g. Lincoln Park field 2" /></Field>
      {!!err && <Text style={{ color: t.lose, fontWeight: '700' }}>{err}</Text>}
      <Row style={{ justifyContent: 'space-between' }}>
        <Btn label={d.id ? 'Save' : 'Add to calendar'} variant="cash" big onPress={save} />
        {!!d.id && <ConfirmBtn label={d.repeat === 'none' ? 'Delete' : 'Delete every time'} onConfirm={() => { remove('events', d.id!); toast('Deleted'); onClose(); }} />}
      </Row>
    </Sheet>
  );
}

export function CalendarScreen() {
  const t = useTheme();
  const { data } = useStore();
  const today = todayYmd();
  const [sel, setSel] = useState(today);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [kidFilter, setKidFilter] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const kids = sortKids(data.kids);
  const kidColor = (id: string) => { const k = data.kids.find((x) => x.id === id); return k ? t.kids[k.color] : t.muted; };

  const visible = useMemo(
    () => (kidFilter ? data.events.filter((e) => e.kidIds.length === 0 || e.kidIds.includes(kidFilter)) : data.events),
    [data.events, kidFilter],
  );

  // 6 rows × 7 days starting on the Sunday on or before the 1st.
  const cells = useMemo(() => {
    const first = ymd(month);
    const start = addDays(first, -month.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);
  const monthKey = ymd(month).slice(0, 7);

  const dayList = visible.filter((e) => occursOn(e, sel)).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const newDraft = (): Draft => ({ title: '', kidIds: kidFilter ? [kidFilter] : [], date: sel, start: '', end: '', repeat: 'none', until: '', place: '' });
  const editDraft = (e: CalEvent): Draft => ({
    id: e.id, title: e.title, kidIds: e.kidIds, date: e.date, start: e.start ? fmtTime(e.start) : '', end: e.end ? fmtTime(e.end) : '',
    repeat: e.repeat, until: e.until || '', place: e.place || '',
  });

  const shiftMonth = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <View style={{ gap: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1 }}>
          <H2>Calendar</H2>
          <Sub>Activities and schedules for each kid. Today's show on the kid view.</Sub>
        </View>
        <Btn label="+ Add activity" variant="cash" onPress={() => setDraft(newDraft())} />
      </Row>
      <PillRow scroll options={[{ id: '', label: 'Everyone' }, ...kids.map((k) => ({ id: k.id, label: k.name, color: t.kids[k.color] }))]} value={kidFilter} onChange={setKidFilter} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        <Card style={{ flexGrow: 1, flexBasis: 320, maxWidth: 560 }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Btn label="‹" variant="ghost" onPress={() => shiftMonth(-1)} accessibilityLabel="Previous month" />
            <Pressable onPress={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSel(today); }} accessibilityRole="button" accessibilityLabel="Go to today">
              <Text style={{ fontSize: 18, fontWeight: '800', color: t.ink }}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
            </Pressable>
            <Btn label="›" variant="ghost" onPress={() => shiftMonth(1)} accessibilityLabel="Next month" />
          </Row>
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((w) => <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: t.muted }}>{w}</Text>)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day) => {
              const inMonth = day.slice(0, 7) === monthKey;
              const evs = visible.filter((e) => occursOn(e, day));
              const dots = [...new Set(evs.flatMap((e) => (e.kidIds.length ? e.kidIds : ['family'])))].slice(0, 4);
              const isSel = day === sel, isToday = day === today;
              return (
                <Pressable
                  key={day}
                  onPress={() => setSel(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(day)}, ${evs.length} activities`}
                  style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}
                >
                  <View style={{
                    flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 3,
                    backgroundColor: isSel ? t.accent : 'transparent', borderWidth: isToday && !isSel ? 2 : 0, borderColor: t.accent,
                  }}>
                    <Text style={{ fontWeight: isToday || isSel ? '800' : '600', color: isSel ? t.accentInk : inMonth ? t.ink : t.muted, opacity: inMonth ? 1 : 0.5 }}>
                      {parseYmd(day).getDate()}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 2, height: 6 }}>
                      {dots.map((id) => <View key={id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: id === 'family' ? (isSel ? t.accentInk : t.muted) : kidColor(id) }} />)}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={{ flexGrow: 1, flexBasis: 300 }}>
          <View>
            <H2 style={{ fontSize: 19 }}>{sel === today ? 'Today' : dayLabel(sel)}</H2>
            {sel === today && <Sub>{dayLabel(sel)}</Sub>}
          </View>
          {dayList.map((e) => {
            const who = e.kidIds.map((id) => data.kids.find((k) => k.id === id)).filter(Boolean);
            return (
              <Pressable key={e.id} onPress={() => setDraft(editDraft(e))} accessibilityRole="button" accessibilityHint="Edit this activity"
                style={{ flexDirection: 'row', gap: 10, padding: 10, borderRadius: 12, backgroundColor: t.sunk, alignItems: 'center' }}>
                <View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: e.kidIds.length ? kidColor(e.kidIds[0]) : t.muted }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: t.ink, fontSize: 16 }}>{e.title}</Text>
                  <Text style={{ color: t.muted, fontSize: 13 }}>
                    {fmtSpan(e)}{e.place ? ` · ${e.place}` : ''}{e.repeat !== 'none' ? ` · ${REPEATS[e.repeat]}` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {who.length ? who.map((k) => <Avatar key={k!.id} kid={k!} size={26} />) : <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>Family</Text>}
                </View>
              </Pressable>
            );
          })}
          {!dayList.length && <Empty>Nothing planned. Tap + Add activity to put something on this day.</Empty>}
          {dayList.length > 0 && <Sub>Tap an activity to change or delete it.</Sub>}
        </Card>
      </View>
      {draft && <EventForm draft={draft} onClose={() => setDraft(null)} />}
    </View>
  );
}

