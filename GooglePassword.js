import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiCall, API_ENDPOINTS } from './config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GooglePassword() {
    const navigation = useNavigation();
    const route = useRoute();
    const { googleUserInfo } = route.params;
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSetPassword = async () => {
        if (password !== confirmPassword) {
            Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('오류', '비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                ...googleUserInfo,
                password: password,
            };

            const response = await apiCall(API_ENDPOINTS.GOOGLE_LOGIN, {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '비밀번호 설정에 실패했습니다.');
            }

            if (data.success) {
                const userInfo = {
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    username: data.user.username,
                                    provider: data.user.provider,
                                    createdAt: data.user.createdAt,
                                    studyGroups: data.user.studyGroups,                };

                await AsyncStorage.setItem('currentUser', JSON.stringify(userInfo));
                await AsyncStorage.setItem('is_authenticated', 'true');

                Alert.alert('성공', '로그인 되었습니다.', [
                    {
                        text: '확인',
                        onPress: () => navigation.navigate('Main'),
                    },
                ]);
            }
        } catch (error) {
            console.error('비밀번호 설정 오류:', error);
            Alert.alert('오류', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.formContainer}>
                <Text style={styles.title}>비밀번호 설정</Text>
                <Text style={styles.subtitle}>
                    Google 계정으로 로그인하려면 비밀번호를 설정해야 합니다.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="비밀번호 (6자 이상)"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TextInput
                    style={styles.input}
                    placeholder="비밀번호 확인"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.disabledButton]}
                    onPress={handleSetPassword}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>비밀번호 설정 및 로그인</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginVertical: 8,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
