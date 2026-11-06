import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import type { Kid } from '../types';
import { initial } from '../utils';

/* ---------- text ---------- */
export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ fontSize: 22, fontWeight: '800', color: t.ink }, style]}>{children}</Text>;
}
export function Sub({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ fontSize: 14, color: t.muted, marginTop: 2 }, style]}>{children}</Text>;
}
export function Group({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: t.muted, marginTop: 6 }}>
      {children}
    </Text>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.muted, fontSize: 14, paddingVertical: 8 }}>{children}</Text>;
}

/* ---------- containers ---------- */
export function Card({ children, style, dashed }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; dashed?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: dashed ? 'transparent' : t.surface, borderColor: t.line, borderWidth: 1, borderStyle: dashed ? 'dashed' : 'solid', borderRadius: 18, padding: 16, gap: 12 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function ListItem({ children, first }: { children: React.ReactNode; first?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: t.line }}>
      {children}
    </View>
  );
}

/* ---------- buttons ---------- */
type Variant = 'plain' | 'earn' | 'lose' | 'cash' | 'ghost';

export function Btn({
  label, onPress, variant = 'plain', disabled, style, big, accessibilityLabel,
}: {
  label: string; onPress?: PressableProps['onPress']; variant?: Variant; disabled?: boolean;
  style?: StyleProp<ViewStyle>; big?: boolean; accessibilityLabel?: string;
}) {
  const t = useTheme();
  const v = {
    plain: { bg: t.surface, border: t.line, fg: t.ink },
    earn: { bg: t.earn, border: t.earn, fg: '#fff' },
    lose: { bg: 'transparent', border: t.lose, fg: t.lose },
    cash: { bg: t.accent, border: t.accent, fg: t.accentInk },
    ghost: { bg: 'transparent', border: 'transparent', fg: t.muted },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        {
          backgroundColor: v.bg, borderColor: v.border, borderWidth: 1, borderRadius: 10,
          paddingVertical: big ? 12 : 9, paddingHorizontal: variant === 'ghost' ? 8 : 12,
          alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: v.fg, fontWeight: '700', fontSize: big ? 16 : 14 }}>{label}</Text>
    </Pressable>
  );
}

/** A remove button that needs a second tap within 3 seconds. */
export function ConfirmBtn({ label = 'Remove', onConfirm, accessibilityLabel }: { label?: string; onConfirm: () => void; accessibilityLabel?: string }) {
  const t = useTheme();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={() => {
        if (armed) { setArmed(false); onConfirm(); return; }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), 3000);
      }}
      style={{ paddingVertical: 6, paddingHorizontal: 8 }}
    >
      <Text style={{ color: armed ? t.lose : t.muted, fontWeight: '700', fontSize: 14 }}>{armed ? 'Tap to confirm' : label}</Text>
    </Pressable>
  );
}

/** A pill that can be on or off; rows of these stand in for dropdowns. */
export function Pill({ label, on, onPress, color }: { label: string; on: boolean; onPress: () => void; color?: string }) {
  const t = useTheme();
  const c = color || t.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, borderWidth: 2,
        borderColor: on ? c : t.line, backgroundColor: on ? c : t.surface,
      }}
    >
      <Text style={{ fontWeight: '700', fontSize: 14, color: on ? (color ? '#fff' : t.accentInk) : t.ink }}>{label}</Text>
    </Pressable>
  );
}

export function PillRow<T extends string | number>({
  options, value, onChange, scroll,
}: { options: { id: T; label: string; color?: string }[]; value: T; onChange: (v: T) => void; scroll?: boolean }) {
  const pills = options.map((o) => <Pill key={String(o.id)} label={o.label} color={o.color} on={o.id === value} onPress={() => onChange(o.id)} />);
  if (scroll)
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {pills}
      </ScrollView>
    );
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{pills}</View>;
}

/* ---------- inputs ---------- */
export function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ gap: 4 }, style]}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: t.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.muted}
      {...props}
      style={[{ borderWidth: 1, borderColor: t.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 16, color: t.ink, backgroundColor: t.surface, minWidth: 0 }, props.style]}
    />
  );
}

/* ---------- kid bits ---------- */
export function Avatar({ kid, size = 44 }: { kid: Pick<Kid, 'name' | 'color'>; size?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.kids[kid.color] || t.kids.k1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.48 }}>{initial(kid.name)}</Text>
    </View>
  );
}

export function Bar({ pct, height = 10, color }: { pct: number; height?: number; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ height, borderRadius: 99, backgroundColor: t.sunk, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 99, backgroundColor: color || t.accent }} />
    </View>
  );
}

/* ---------- sheet (bottom on phones, centered on tablets) ---------- */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }} pointerEvents="box-none">
        <View style={{ backgroundColor: t.bg, width: '100%', maxWidth: 600, maxHeight: '88%', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 20 + insets.bottom, gap: 14 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {!!msg && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 20 + insets.bottom, alignItems: 'center' }}>
          <View style={{ backgroundColor: t.ink, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 }}>
            <Text style={{ color: t.bg, fontWeight: '700' }}>{msg}</Text>
          </View>
        </View>
      )}
    </ToastCtx.Provider>
  );
}
