import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Field, H2, Input, Sub } from '../components/ui';
import { useStore } from '../store';
import { useTheme } from '../theme';

function Shell({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16 }}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: t.accentInk, fontWeight: '900', fontSize: 30 }}>★</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: t.ink }}>Family Point Bank</Text>
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ paddingVertical: 6, alignSelf: 'center' }}>
      <Text style={{ color: t.ink, fontWeight: '700', textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}

function ErrorText({ msg }: { msg: string }) {
  const t = useTheme();
  return msg ? <Text style={{ color: t.lose, fontWeight: '700' }}>{msg}</Text> : null;
}

/** Sign in, create an account, or reset a password. */
export function AuthScreen() {
  const t = useTheme();
  const { signIn, signUp, resetPassword, setPrefs } = useStore();
  const [view, setView] = useState<'signup' | 'signin' | 'reset'>('signup');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(''); setNote('');
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  const go = (v: typeof view) => { setView(v); setErr(''); setNote(''); };

  const submit = () => {
    if (view === 'reset')
      return run(async () => { await resetPassword(email); setNote('Check your email for a link to set a new password. Look in spam too.'); });
    if (view === 'signup' && pw !== pw2) { setErr("The two passwords don't match."); return; }
    return run(() => (view === 'signup' ? signUp(email, pw) : signIn(email, pw)));
  };

  return (
    <Shell>
      <Card>
        <View>
          <H2>{view === 'signup' ? 'Create your account' : view === 'signin' ? 'Sign in' : 'Reset your password'}</H2>
          <Sub>
            {view === 'signup'
              ? "Points, rewards and the calendar for your kids, shared live with the other grown-ups in your family."
              : view === 'signin' ? 'Welcome back.' : "Enter your email and we'll send you a link."}
          </Sub>
        </View>
        <Field label="Email">
          <Input value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" />
        </Field>
        {view !== 'reset' && (
          <Field label="Password">
            <Input value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" autoComplete={view === 'signup' ? 'new-password' : 'current-password'} textContentType={view === 'signup' ? 'newPassword' : 'password'} placeholder={view === 'signup' ? 'At least 6 characters' : ''} onSubmitEditing={view === 'signin' ? submit : undefined} />
          </Field>
        )}
        {view === 'signup' && (
          <Field label="Password again">
            <Input value={pw2} onChangeText={setPw2} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
          </Field>
        )}
        <ErrorText msg={err} />
        {!!note && <Text style={{ color: t.earn, fontWeight: '700' }}>{note}</Text>}
        <Btn
          big
          variant="cash"
          label={busy ? 'One moment…' : view === 'signup' ? 'Create account' : view === 'signin' ? 'Sign in' : 'Send reset link'}
          disabled={busy || !email.trim() || (view !== 'reset' && !pw)}
          onPress={submit}
        />
        {view === 'signup' && <LinkText label="I have an account" onPress={() => go('signin')} />}
        {view === 'signin' && (
          <>
            <LinkText label="Forgot password?" onPress={() => go('reset')} />
            <LinkText label="Create an account" onPress={() => go('signup')} />
          </>
        )}
        {view === 'reset' && <LinkText label="Back to sign in" onPress={() => go('signin')} />}
      </Card>
      <Pressable onPress={() => setPrefs({ localOnly: true })} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
        <Text style={{ color: t.muted, fontWeight: '600', textAlign: 'center' }}>
          Or try it without an account. Everything stays on this device.
        </Text>
      </Pressable>
    </Shell>
  );
}

/** Signed in, but not part of a family yet. */
export function FamilySetupScreen() {
  const t = useTheme();
  const { email, createFamily, joinFamily, signOut, data } = useStore();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'' | 'create' | 'join'>('');
  const [err, setErr] = useState('');
  const run = async (which: 'create' | 'join') => {
    setBusy(which); setErr('');
    try { await (which === 'create' ? createFamily(name) : joinFamily(code)); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy('');
  };
  const kidsHere = data.kids.length;
  return (
    <Shell>
      <Sub style={{ textAlign: 'center' }}>Signed in as {email}</Sub>
      <Card>
        <View>
          <H2>Start your family</H2>
          <Sub>
            For the first grown-up. You'll get an invite code to share with the other parent.
            {kidsHere ? ` The ${kidsHere} kid${kidsHere === 1 ? '' : 's'} already on this device come along.` : ''}
          </Sub>
        </View>
        <Field label="Family name">
          <Input value={name} onChangeText={setName} maxLength={40} placeholder="e.g. The Melesse family" />
        </Field>
        <Btn big variant="cash" label={busy === 'create' ? 'One moment…' : 'Start a family'} disabled={!!busy} onPress={() => run('create')} />
      </Card>
      <Card>
        <View>
          <H2>Join your family</H2>
          <Sub>Someone already started it? Enter the invite code they gave you.</Sub>
        </View>
        <Field label="Invite code">
          <Input value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="K7MP-2QXR-9TWD" maxLength={20} />
        </Field>
        <Btn big label={busy === 'join' ? 'One moment…' : 'Join'} disabled={!!busy || !code.trim()} onPress={() => run('join')} />
      </Card>
      <ErrorText msg={err} />
      <Pressable onPress={signOut} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
        <Text style={{ color: t.muted, fontWeight: '700' }}>Sign out</Text>
      </Pressable>
    </Shell>
  );
}
