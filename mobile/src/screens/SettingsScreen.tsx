import React, { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { Btn, Card, ConfirmBtn, Field, H2, Input, ListItem, Pill, Row, Sub, useToast } from '../components/ui';
import { normalize, useStore } from '../store';
import { boardUrl } from '../firebase';
import { LINKS, openLink } from '../links';
import { useTheme } from '../theme';
import type { BankData, LockType } from '../types';
import { LOCKS, money, rate } from '../utils';

const STATE_TEXT = {
  connecting: 'Connecting…',
  live: 'Synced live with everyone in your family.',
  offline: "This device is offline. Changes will send when it's back online.",
  error: "The last change didn't save online. Check your connection.",
} as const;

function FamilyCard() {
  const t = useTheme();
  const toast = useToast();
  const { mode, configured, email, uid, meta, members, syncState, newInvite, removeMember, leaveFamily, signOut, setBoard, renameFamily, setPrefs } = useStore();
  const [name, setName] = useState(meta?.name || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(meta?.name || ''); }, [meta?.name]);

  if (mode === 'local')
    return (
      <Card>
        <View>
          <H2>Share with your family</H2>
          <Sub>Right now everything is saved only on this device. Create a free account to use the same points on every parent's phone and the iPad, and to invite the other parent.</Sub>
        </View>
        {configured ? (
          <Row>
            <Btn label="Create an account or sign in" variant="cash" onPress={() => setPrefs({ localOnly: false })} />
          </Row>
        ) : (
          <Sub style={{ marginTop: 0 }}>Accounts turn on once the app's Firebase settings are filled in (src/firebaseConfig.ts).</Sub>
        )}
        <Sub style={{ marginTop: 0 }}>The kids and points on this device come with you when you start a family.</Sub>
      </Card>
    );

  const run = async (fn: () => Promise<void>, done?: string) => {
    setBusy(true);
    try { await fn(); if (done) toast(done); } catch { toast("That didn't work. Check your connection and try again."); }
    setBusy(false);
  };
  const appLink = LINKS.webApp;
  const invite = meta?.inviteCode || '…';
  const board = meta?.boardKey ? `display.html?src=${boardUrl(meta.boardKey)}` : '';

  return (
    <Card>
      <View>
        <H2>{meta?.name || 'Your family'}</H2>
        <Sub>{STATE_TEXT[syncState]}</Sub>
      </View>
      <Row style={{ alignItems: 'flex-end' }}>
        <Field label="Family name" style={{ flexGrow: 1, flexBasis: 200 }}>
          <Input value={name} onChangeText={setName} maxLength={40} />
        </Field>
        <Btn label="Save" disabled={!name.trim() || name.trim() === meta?.name} onPress={() => { renameFamily(name.trim()); toast('Saved'); }} />
      </Row>

      <Field label="Invite code">
        <Text selectable style={{ color: t.ink, fontSize: 24, fontWeight: '900', letterSpacing: 2 }}>{invite}</Text>
      </Field>
      <Sub style={{ marginTop: -6 }}>
        Give this to the other parent (or use it on the iPad). They open the app, create an account, tap Join, and enter the code.
        Anyone with the code can join, so make a new one if it gets out.
      </Sub>
      <Row>
        <Btn
          label="Share invite"
          variant="cash"
          onPress={() => {
            Share.share({ message: `Join our family on Family Point Bank.\n1. Get the Family Point Bank app from the App Store or Google Play (or open ${appLink})\n2. Create an account\n3. Tap Join and enter this code: ${invite}` }).catch(() => {});
          }}
        />
        <Btn label="Make a new code" disabled={busy} onPress={() => run(newInvite, 'New invite code made. The old one no longer works.')} />
      </Row>

      <Field label={`Grown-ups in this family (${members.length})`}>
        <View>
          {[...members].sort((a, b) => a.joinedAt - b.joinedAt).map((m, i) => (
            <ListItem key={m.uid} first={i === 0}>
              <Text style={{ flex: 1, color: t.ink }} numberOfLines={1}>
                {m.email}{m.uid === uid ? ' (you)' : ''}{m.uid === meta?.owner ? ' · started the family' : ''}
              </Text>
              {m.uid !== uid && <ConfirmBtn onConfirm={() => run(() => removeMember(m.uid), 'Removed')} accessibilityLabel={`Remove ${m.email}`} />}
            </ListItem>
          ))}
        </View>
      </Field>

      <Field label="Old iPad board">
        <Sub style={{ marginTop: 0 }}>
          {board
            ? 'On. Open this address on the old iPad to show live point totals (only names, colors and totals are shared, readable by anyone with the address):'
            : "Turn this on to show live point totals on an older iPad that can't run the app."}
        </Sub>
        {!!board && <Text selectable style={{ color: t.muted, fontSize: 12 }}>{appLink.replace('/app/', '/')}{board}</Text>}
      </Field>
      <Row>
        <Btn label={board ? 'Turn off old iPad board' : 'Turn on old iPad board'} disabled={busy} onPress={() => run(() => setBoard(!board))} />
      </Row>

      <Field label="Account">
        <Text style={{ color: t.ink }}>Signed in as {email}</Text>
      </Field>
      <Row>
        <Btn label="Sign out" onPress={() => run(signOut)} />
        <ConfirmBtn label="Leave this family" onConfirm={() => run(leaveFamily, 'You left the family')} />
      </Row>
      <DeleteAccount />
    </Card>
  );
}

/**
 * Deletes the account and its online data. App Store and Google Play both require this inside the app.
 * Used here in Settings and on the start-or-join-a-family screen.
 */
export function DeleteAccount() {
  const t = useTheme();
  const { members, uid, familyId, deleteAccount } = useStore();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const alone = !members.some((m) => m.uid !== uid);
  if (!open)
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
        <Text style={{ color: t.lose, fontWeight: '700' }}>Delete my account</Text>
      </Pressable>
    );
  return (
    <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12 }}>
      <H2 style={{ fontSize: 18 }}>Delete my account</H2>
      <Sub style={{ marginTop: 0 }}>
        {!familyId
          ? 'This permanently deletes your account. It cannot be undone.'
          : alone
          ? 'This permanently deletes your account and your family: every kid, point, reward and calendar item, the invite code and the iPad board. It cannot be undone.'
          : 'This permanently deletes your account and takes you out of the family. The family, its kids and points stay for the other grown-ups.'}
      </Sub>
      <Field label="Type your password to confirm">
        <Input value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" />
      </Field>
      {!!err && <Text style={{ color: t.lose, fontWeight: '700' }}>{err}</Text>}
      <Row>
        <Btn
          label={busy ? 'Deleting…' : 'Delete forever'}
          variant="lose"
          disabled={busy || !pw}
          onPress={async () => {
            setBusy(true); setErr('');
            try { await deleteAccount(pw); } catch (e) { setErr(e instanceof Error ? e.message : "That didn't work. Try again."); setBusy(false); }
          }}
        />
        <Btn label="Cancel" disabled={busy} onPress={() => { setOpen(false); setPw(''); setErr(''); }} />
      </Row>
    </View>
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
      <FamilyCard />

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
          <Sub>A backup, or a way to bring in data from the old web app. In a family, pasting replaces the data on every device.</Sub>
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

      <Card>
        <H2>Help and privacy</H2>
        <Row>
          <Btn label="Privacy policy" onPress={() => openLink(LINKS.privacy)} />
          <Btn label="Help and contact" onPress={() => openLink(LINKS.support)} />
        </Row>
      </Card>
    </View>
  );
}
