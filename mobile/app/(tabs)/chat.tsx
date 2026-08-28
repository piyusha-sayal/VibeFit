import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, Easing,
} from 'react-native-reanimated';
import { useChat } from '../../hooks/useChat';
import { FloatingNav } from '../../components/ui/FloatingNav';
import { Lbl } from '../../components/ui/Lbl';
import { C } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

function TypingDot({ delay }: { delay: number }) {
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(delay, withRepeat(
      withTiming(-5, { duration: 400, easing: Easing.inOut(Easing.sin) }),
      -1, true
    ));
  }, [delay]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

function TypingIndicator() {
  return (
    <View style={styles.bubbleAi}>
      <View style={styles.typingRow}>
        <TypingDot delay={0} />
        <TypingDot delay={150} />
        <TypingDot delay={300} />
      </View>
    </View>
  );
}

export default function ChatScreen() {
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Lbl>AI Stylist</Lbl>
          <Text style={styles.headerTitle}>Style Chat</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
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
            <Text style={styles.emptyTitle}>Ask your stylist</Text>
            <Text style={styles.emptyText}>
              Get personalized advice on outfits, colors, hairstyles, and accessories based on your analysis.
            </Text>
            <View style={styles.suggestionsWrap}>
              {[
                'What colors suit me best?',
                'Recommend hairstyles for my face shape',
                'What outfits match my aesthetic?',
              ].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestion}
                  onPress={() => { setInputValue(s); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
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
              {!isUser && <View style={styles.avatarDot} />}
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                  {msg.content}
                </Text>
                <Text style={styles.timestamp}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        })}

        {isSending && (
          <View style={[styles.messageRow, styles.messageRowAi]}>
            <View style={styles.avatarDot} />
            <TypingIndicator />
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Ask your stylist..."
          placeholderTextColor={C.textSubtle}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputValue.trim() || isSending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          activeOpacity={0.75}
          disabled={!inputValue.trim() || isSending}
        >
          <Text style={styles.sendArrow}>↑</Text>
        </TouchableOpacity>
      </View>

      <FloatingNav />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: 62, paddingHorizontal: 20, paddingBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderBottomWidth: 0.5, borderBottomColor: C.white06,
  },
  headerTitle: { fontFamily: FONTS.serif, fontSize: 26, color: C.text, marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: C.white06 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  onlineText: { fontFamily: FONTS.sansMedium, fontSize: 11, color: C.textMuted },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 160, gap: 10 },
  emptyState: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, gap: 10 },
  emptyTitle: { fontFamily: FONTS.serif, fontSize: 22, color: C.text },
  emptyText: { fontFamily: FONTS.sans, fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  suggestionsWrap: { gap: 8, width: '100%', marginTop: 8 },
  suggestion: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 0.5, borderColor: C.goldBorder, padding: 12 },
  suggestionText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: C.gold },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAi: { justifyContent: 'flex-start' },
  avatarDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.goldBorder, flexShrink: 0 },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: C.gold, borderBottomRightRadius: 4 },
  bubbleAi: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.white06, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { fontFamily: FONTS.sans, color: '#0c0a07' },
  bubbleTextAi: { fontFamily: FONTS.sans, color: C.text },
  timestamp: { fontFamily: FONTS.sans, fontSize: 10, color: C.textSubtle, marginTop: 4, alignSelf: 'flex-end' },
  typingRow: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24,
    borderTopWidth: 0.5, borderTopColor: C.white06, backgroundColor: C.bg,
  },
  input: {
    flex: 1, backgroundColor: C.surface, borderRadius: 20, borderWidth: 0.5, borderColor: C.white08,
    paddingHorizontal: 16, paddingVertical: 10, fontFamily: FONTS.sans, fontSize: 14,
    color: C.text, maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.35 },
  sendArrow: { fontFamily: FONTS.sansBold, fontSize: 18, color: '#0c0a07', lineHeight: 22 },
});
