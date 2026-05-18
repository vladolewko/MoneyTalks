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
import { registerWithEmail } from '../../src/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);

  const handleRegister = async () => {
    const trimName = name.trim();
    const trimEmail = email.trim().toLowerCase();
    const trimPass = password.trim();

    if (!trimName || !trimEmail || !trimPass) {
      Alert.alert('Заповніть поля', "Введіть ім'я, email та пароль.");
      return;
    }
    if (trimPass.length < 8) {
      Alert.alert('Пароль занадто короткий', 'Пароль повинен мати мінімум 8 символів.');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await registerWithEmail(trimName, trimEmail, trimPass);
      signIn(token, user);
    } catch (error) {
      Alert.alert('Помилка реєстрації', error instanceof Error ? error.message : 'Не вдалося зареєструватися');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: typeof focusedField) => ({
    backgroundColor: '#0a1020',
    borderWidth: 1.5,
    borderColor: focusedField === field ? '#34d399' : '#1a2234',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: '#f0f4ff' as const,
  });

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
            Починай відстежувати вже сьогодні
          </Text>
        </View>

        {/* Form */}
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#f0f4ff', marginBottom: 6, letterSpacing: -0.5 }}>
            Реєстрація
          </Text>
          <Text style={{ fontSize: 14, color: '#4a5568', marginBottom: 28 }}>
            Безкоштовно та без зайвих даних
          </Text>

          {[
            { key: 'name' as const, label: "Ім'я", placeholder: 'Як тебе звати?', keyboardType: 'default' as const, autoCapitalize: 'words' as const, value: name, setValue: setName, secure: false },
            { key: 'email' as const, label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address' as const, autoCapitalize: 'none' as const, value: email, setValue: setEmail, secure: false },
            { key: 'password' as const, label: 'Пароль', placeholder: 'Мінімум 8 символів', keyboardType: 'default' as const, autoCapitalize: 'none' as const, value: password, setValue: setPassword, secure: true },
          ].map(({ key, label, placeholder, keyboardType, autoCapitalize, value, setValue, secure }) => (
            <View key={key} style={{ marginBottom: 14 }}>
              <Text style={{ color: '#8896b0', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                {label}
              </Text>
              <TextInput
                style={inputStyle(key)}
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                placeholderTextColor="#2d3748"
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                autoCorrect={false}
                secureTextEntry={secure}
                returnKeyType={key === 'password' ? 'done' : 'next'}
                onSubmitEditing={key === 'password' ? handleRegister : undefined}
                onFocus={() => setFocusedField(key)}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          ))}

          <View style={{ height: 14 }} />

          <Pressable
            style={({ pressed }) => ({
              backgroundColor: '#34d399',
              borderRadius: 16, paddingVertical: 17,
              alignItems: 'center',
              opacity: loading || pressed ? 0.85 : 1,
              marginBottom: 14,
            })}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#042918" />
              : <Text style={{ fontSize: 16, fontWeight: '700', color: '#042918', letterSpacing: -0.2 }}>Зареєструватися</Text>}
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1a2234' }} />
            <Text style={{ fontSize: 13, color: '#2d3748' }}>вже є акаунт?</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1a2234' }} />
          </View>

          <Pressable
            style={({ pressed }) => ({
              borderWidth: 1.5, borderColor: '#1a2234',
              borderRadius: 16, paddingVertical: 16,
              alignItems: 'center',
              backgroundColor: pressed ? '#0a1020' : 'transparent',
            })}
            onPress={() => router.push('/(auth)/login')}
            disabled={loading}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#8896b0' }}>Увійти</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
