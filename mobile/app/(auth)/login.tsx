import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { loginWithEmail } from '../../src/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const handleLogin = async () => {
    const trimEmail = email.trim().toLowerCase();
    const trimPass = password.trim();
    if (!trimEmail || !trimPass) {
      Alert.alert('Заповніть поля', 'Введіть email та пароль.');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await loginWithEmail(trimEmail, trimPass);
      signIn(token, user);
    } catch (error) {
      Alert.alert('Не вдалося увійти', error instanceof Error ? error.message : 'Перевірте дані та спробуйте знову');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#050810' }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 52 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 22,
            backgroundColor: '#0a2e1f',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 1, borderColor: '#1a4535',
          }}>
            <Text style={{ fontSize: 34 }}>💬</Text>
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#f0f4ff', letterSpacing: -1 }}>
            MoneyTalks
          </Text>
          <Text style={{ marginTop: 8, fontSize: 15, color: '#4a5568', textAlign: 'center' }}>
            Твої фінанси під контролем
          </Text>
        </View>

        {/* Form */}
        <View>
          <Text style={{
            fontSize: 22, fontWeight: '700', color: '#f0f4ff',
            marginBottom: 6, letterSpacing: -0.5,
          }}>Вхід</Text>
          <Text style={{ fontSize: 14, color: '#4a5568', marginBottom: 28 }}>
            Введіть дані свого акаунта
          </Text>

          {/* Email */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{
              color: '#8896b0', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
            }}>Email</Text>
            <TextInput
              style={{
                backgroundColor: '#0a1020',
                borderWidth: 1.5,
                borderColor: focusedField === 'email' ? '#34d399' : '#1a2234',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 15,
                fontSize: 16,
                color: '#f0f4ff',
              }}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#2d3748"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{
              color: '#8896b0', fontSize: 11, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
            }}>Пароль</Text>
            <TextInput
              style={{
                backgroundColor: '#0a1020',
                borderWidth: 1.5,
                borderColor: focusedField === 'password' ? '#34d399' : '#1a2234',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 15,
                fontSize: 16,
                color: '#f0f4ff',
              }}
              value={password}
              onChangeText={setPassword}
              placeholder="Мінімум 8 символів"
              placeholderTextColor="#2d3748"
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Login button */}
          <Pressable
            style={({ pressed }) => ({
              backgroundColor: '#34d399',
              borderRadius: 16, paddingVertical: 17,
              alignItems: 'center',
              opacity: loading || pressed ? 0.85 : 1,
              marginBottom: 14,
            })}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#042918" />
              : <Text style={{ fontSize: 16, fontWeight: '700', color: '#042918', letterSpacing: -0.2 }}>Увійти</Text>}
          </Pressable>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1a2234' }} />
            <Text style={{ fontSize: 13, color: '#2d3748' }}>або</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1a2234' }} />
          </View>

          {/* Register link */}
          <Pressable
            style={({ pressed }) => ({
              borderWidth: 1.5, borderColor: '#1a2234',
              borderRadius: 16, paddingVertical: 16,
              alignItems: 'center',
              backgroundColor: pressed ? '#0a1020' : 'transparent',
            })}
            onPress={() => router.push('/(auth)/register')}
            disabled={loading}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#8896b0' }}>Створити акаунт</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
