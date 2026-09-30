import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, Easing,
} from 'react-native-reanimated';

import { Chip, Txt } from '../../components/ds';
import { useChat } from '../../hooks/useChat';
import { useTheme } from '../../theme/ThemeProvider';
import type { Palette } from '../../constants/theme';
import { FONTS } from '../../constants/fonts';

const SUGGESTIONS = [
  'What colors suit me best?',
  'Recommend hairstyles for my face shape',
  'What outfits match my aesthetic?',
];

function TypingDot({ delay, color }: { delay: number; color: string }) {
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(delay, withRepeat(
      withTiming(-5, { duration: 400, easing: Easing.inOut(Easing.sin) }),
      -1, true
    ));
  }, [delay]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

function TypingIndicator({ colors }: { colors: Palette }) {
  return (
    <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.typingRow}>
        <TypingDot delay={0} color={colors.gold} />
        <TypingDot delay={150} color={colors.gold} />
        <TypingDot delay={300} color={colors.gold} />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const { messages, isSending, send, inputValue, setInputValue } = useChat();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, isSending]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;
    setInputValue('');
    await send(text);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Txt variant="label" tone="accent" weight="semibold">AI Stylist</Txt>
          <Txt variant="h2" serif accessibilityRole="header" style={{ marginTop: 2 }}>Style Chat</Txt>
        </View>
        <View style={[styles.onlineBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
          <Txt variant="caption" tone="muted" weight="medium">Online</Txt>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Txt variant="title" serif accessibilityRole="header">Ask your stylist</Txt>
            <Txt variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
              Get personalized advice on outfits, colors, hairstyles, and accessories based on your analysis.
            </Txt>
            <View style={styles.suggestionsWrap}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} accent="gold" onPress={() => setInputValue(s)} />
              ))}
            </View>
          </View>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <View
              key={msg.id}
              style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAi]}
            >
              {!isUser && (
                <View style={[styles.avatarDot, { backgroundColor: colors.surfaceAlt, borderColor: colors.gold }]} />
              )}
              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [styles.bubbleUser, { backgroundColor: colors.gold }]
                    : [styles.bubbleAi, { backgroundColor: colors.surface, borderColor: colors.border }],
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { fontFamily: FONTS.sans, color: isUser ? colors.onAccent : colors.text },
                  ]}
                >
                  {msg.content}
                </Text>
                <Text style={[styles.timestamp, { color: isUser ? colors.onAccent : colors.textSubtle, opacity: isUser ? 0.7 : 1 }]}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        })}

        {isSending && (
          <View style={[styles.messageRow, styles.messageRowAi]}>
            <View style={[styles.avatarDot, { backgroundColor: colors.surfaceAlt, borderColor: colors.gold }]} />
            <TypingIndicator colors={colors} />
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderStrong, color: colors.text }]}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Ask your stylist..."
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          accessibilityLabel="Message the stylist"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: colors.gold },
            (!inputValue.trim() || isSending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          activeOpacity={0.75}
          disabled={!inputValue.trim() || isSending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !inputValue.trim() || isSending }}
        >
          <Text style={[styles.sendArrow, { color: colors.onAccent }]}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 62, paddingHorizontal: 20, paddingBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: StyleSheet.hairlineWidth },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 40, gap: 10 },
  emptyState: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, gap: 10 },
  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAi: { justifyContent: 'flex-start' },
  avatarDot: { width: 26, height: 26, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, flexShrink: 0 },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAi: { borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  timestamp: { fontFamily: FONTS.sans, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  typingRow: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, paddingVertical: 10, fontFamily: FONTS.sans, fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.35 },
  sendArrow: { fontFamily: FONTS.sansBold, fontSize: 18, lineHeight: 22 },
});
