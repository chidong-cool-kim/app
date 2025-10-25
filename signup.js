import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MobileSafeArea from './components/MobileSafeArea';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import { getScreenInfo, responsive } from './utils/responsive';
import emailService from './emailService';
import database from './database';

export default function Signup() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());

  // 화면 크기 변경 감지
  useEffect(() => {
        const subscription = Dimensions.addEventListener('change', () => {
            setScreenInfo(getScreenInfo());
        });

        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(timer - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    // Gmail 인증코드 발송
    const sendVerificationCode = async () => {
        if (!email.trim()) {
            Alert.alert('오류', 'Gmail 주소를 입력해주세요.');
            return;
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('오류', '올바른 이메일 형식을 입력해주세요.');
            return;
        }

        if (!email.toLowerCase().endsWith('@gmail.com')) {
            Alert.alert('오류', 'Gmail 주소만 사용 가능합니다.');
            return;
        }

        setIsLoading(true);

        try {
            // 서버 API로 인증코드 발송
            const response = await fetch('http://192.168.45.53:5000/api/auth/send-verification-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase()
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                setIsCodeSent(true);
                setTimer(300); // 5분 타이머
                Alert.alert('성공', 'Gmail로 인증코드가 전송되었습니다.\n메일함을 확인해주세요.');
            } else {
                throw new Error(result.error || '인증코드 전송에 실패했습니다.');
            }
        } catch (error) {
            console.error('인증코드 전송 오류:', error);
            Alert.alert('오류', `인증코드 전송에 실패했습니다.\n${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 인증코드 확인
    const verifyCode = async () => {
        if (!verificationCode.trim()) {
            Alert.alert('오류', '인증코드를 입력해주세요.');
            return;
        }

        if (verificationCode.trim().length !== 6) {
            Alert.alert('오류', '인증코드는 6자리입니다.');
            return;
        }

        setIsLoading(true);

        try {
            console.log('인증코드 검증 시도:', {
                email: email.trim().toLowerCase(),
                code: verificationCode.trim()
            });
            
            // 서버 API로 인증코드 확인
            const response = await fetch('http://192.168.45.53:5000/api/auth/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    code: verificationCode.trim()
                })
            });

            const result = await response.json();
            
            console.log('인증코드 검증 결과:', result);
            
            if (response.ok && result.success) {
                setIsEmailVerified(true);
                setTimer(0);
                Alert.alert('성공', '이메일 인증이 완료되었습니다!');
            } else {
                console.error('인증코드 검증 실패:', result);
                Alert.alert('오류', result.error || '인증코드가 올바르지 않습니다.\n다시 시도해주세요.');
            }
        } catch (error) {
            console.error('인증코드 확인 오류:', error);
            Alert.alert('오류', '서버 연결에 실패했습니다.\n네트워크 상태를 확인해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const resendVerificationCode = () => {
        if (timer > 0) {
            Alert.alert('알림', `${Math.floor(timer / 60)}분 ${timer % 60}초 후에 재발송 가능합니다.`);
            return;
        }
        sendVerificationCode();
    };

    // 최종 회원가입
    const handleSignUp = async () => {
        if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            Alert.alert('오류', '모든 필수 정보를 입력해주세요.');
            return;
        }
        
        if (!isEmailVerified) {
            Alert.alert('오류', '이메일 인증을 완료해주세요.');
            return;
        }
        
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
            // 임시 데이터만 저장 (DB에는 아직 저장 안 함!)
            const tempUserData = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: password,
                provider: 'email',
                providerId: email.trim().toLowerCase(),
            };

            console.log('임시 사용자 데이터 생성:', { ...tempUserData, password: '***' });

            // 닉네임 설정 화면으로 이동 (DB 저장은 아직 안 함)
            Alert.alert('성공', '닉네임을 설정해주세요.', [
                {
                    text: '닉네임 설정하기',
                    onPress: () => {
                        navigation.navigate('Username', { 
                            userInfo: tempUserData,
                            fromSignup: true // 회원가입 중임을 표시
                        });
                    }
                }
            ]);
        } catch (error) {
            console.error('회원가입 오류:', error);
            Alert.alert('오류', `회원가입에 실패했습니다.\n${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const goToLogin = () => {
        navigation.navigate('Login');
    };

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 반응형 스타일 선택
    const styles = useMemo(() => {
        if (screenInfo.isTablet) return tabletStyles;
        if (screenInfo.isPhone) return phoneStyles;
        return baseStyles;
    }, [screenInfo]);

    return (
        <OrientationLock isNoteScreen={false}>
            <SafeAreaView style={styles.safeArea}>
            {/* 상단 바 */}
            <View style={[
                styles.position1,
                screenInfo.isPhone && styles.position1Mobile
            ]}>
                <View style={[
                    styles.hr,
                    screenInfo.isPhone && styles.hrMobile
                ]}></View>
            </View>
            
            <View style={styles.position2}>
                {/* 로고 영역 - 모바일에서 숨김 */}
                {!screenInfo.isPhone && (
                    <>
                        <View style={styles.position2_1}>
                            <Image source={require('./assets/s.png')} style={styles.img} resizeMode="contain" fadeDuration={0} />
                        </View>
                        
                        <View style={styles.dividerLine}></View>
                    </>
                )}
                
                <View style={styles.position2_2}>
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Sign Up</Text>
                        
                        {/* 이름 입력 */}
                        <TextInput
                            style={styles.textInput}
                            placeholder="이름을 입력하세요"
                            placeholderTextColor="#999"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                        
                        {/* Gmail 입력 */}
                        <View style={styles.emailContainer}>
                            <TextInput
                                style={[styles.textInput, styles.emailInput]}
                                placeholder="Gmail 주소"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!isEmailVerified}
                            />
                            <TouchableOpacity
                                style={[styles.verifyButton, isEmailVerified && styles.verifiedButton]}
                                onPress={sendVerificationCode}
                                disabled={isLoading || isEmailVerified}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.verifyButtonText}>
                                        {isEmailVerified ? '완료' : '발송'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* 인증코드 입력 */}
                        {isCodeSent && !isEmailVerified && (
                            <View style={styles.verificationContainer}>
                                <TextInput
                                    style={[styles.textInput, styles.codeInput]}
                                    placeholder="6자리 인증코드"
                                    placeholderTextColor="#999"
                                    value={verificationCode}
                                    onChangeText={setVerificationCode}
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                                <TouchableOpacity
                                    style={styles.verifyCodeButton}
                                    onPress={verifyCode}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.verifyButtonText}>확인</Text>
                                    )}
                                </TouchableOpacity>
                                
                                <View style={styles.timerContainer}>
                                    {timer > 0 ? (
                                        <Text style={styles.timerText}>
                                            남은 시간: {formatTimer(timer)}
                                        </Text>
                                    ) : (
                                        <TouchableOpacity onPress={resendVerificationCode}>
                                            <Text style={styles.resendText}>인증코드 재발송</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* 비밀번호 입력 */}
                        {isEmailVerified && (
                            <>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="비밀번호 (6자 이상)"
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                                
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="비밀번호 확인"
                                    placeholderTextColor="#999"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </>
                        )}
                        
                        <TouchableOpacity onPress={goToLogin} style={styles.loginLink}>
                            <Text style={styles.loginLinkText}>이미 계정이 있으신가요?</Text>
                        </TouchableOpacity>
                        
                        {/* 회원가입 버튼 */}
                        {isEmailVerified && (
                            <TouchableOpacity 
                                style={[styles.signUpButton, isLoading && styles.disabledButton]} 
                                onPress={handleSignUp}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.signUpButtonText}>회원가입</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
            
            {/* 하단 바 */}
            <View style={[
                styles.position3,
                screenInfo.isPhone && styles.position3Mobile
            ]}>
                <View style={[
                    styles.hr,
                    screenInfo.isPhone && styles.hrMobile
                ]}></View>
            </View>
            </SafeAreaView>
        </OrientationLock>
    );
}

// 데스크톱 기본 스타일
const baseStyles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#ffffff',
        paddingTop: 20,
    },
    dividerLine: { 
        width: 1, 
        backgroundColor: '#e0e0e0', 
        height: '100%' 
    },
    hr: { 
        height: 30, 
        backgroundColor: '#000', 
        marginVertical: 5, 
        width: '100%' 
    },
    position1: { 
        width: '100%', 
        justifyContent: 'center', 
        alignSelf: 'flex-start', 
        marginTop: 10 
    },
    position2: { 
        width: '100%', 
        flex: 1, 
        flexDirection: 'row' 
    },
    position3: { 
        width: '100%', 
        justifyContent: 'center', 
        alignSelf: 'flex-end', 
        marginBottom: 10 
    },
    position2_1: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0'
    },
    position2_2: { 
        flex: 1, 
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 60,
        paddingVertical: 40
    },
    formContainer: {
        width: '100%',
        maxWidth: 450,
        alignItems: 'center',
        alignSelf: 'center',
        justifyContent: 'center'
    },
    title: { 
        fontSize: 48, 
        fontWeight: '700', 
        marginBottom: 32, 
        color: '#1a1a1a',
        alignSelf: 'center',
        textAlign: 'center',
        width: '100%'
    },
    textInput: { 
        width: '100%', 
        height: 52, 
        borderWidth: 1, 
        borderColor: '#e0e0e0', 
        borderRadius: 10, 
        paddingHorizontal: 16, 
        marginVertical: 8, 
        fontSize: 15, 
        backgroundColor: '#fff',
        color: '#000'
    },
    emailContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
        gap: 10
    },
    emailInput: {
        flex: 1,
        marginVertical: 0
    },
    verifyButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        height: 52,
        borderRadius: 10,
        minWidth: 90,
        justifyContent: 'center',
        alignItems: 'center'
    },
    verifiedButton: {
        backgroundColor: '#34C759'
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600'
    },
    verificationContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12
    },
    codeInput: {
        textAlign: 'center',
        fontSize: 20,
        letterSpacing: 4
    },
    verifyCodeButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 12
    },
    timerContainer: {
        marginTop: 12,
        alignItems: 'center'
    },
    timerText: {
        color: '#666',
        fontSize: 15
    },
    resendText: {
        color: '#007AFF',
        fontSize: 15,
        textDecorationLine: 'underline'
    },
    loginLink: { 
        marginTop: 16,
        marginBottom: 12
    },
    loginLinkText: {
        color: '#007AFF',
        fontSize: 15,
        fontWeight: '500'
    },
    signUpButton: { 
        width: '100%', 
        height: 52, 
        backgroundColor: '#007AFF', 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 24 
    },
    disabledButton: {
        opacity: 0.5
    },
    signUpButtonText: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: '600' 
    },
    img: { 
        width: 280, 
        height: 280
    }
});

// 모바일 전용 스타일
const phoneStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 20,
  },
  position1: {
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  position1Mobile: {
    marginTop: 15,
  },
  hr: {
    height: 20,
    backgroundColor: '#000',
    marginVertical: 5,
    width: '100%',
  },
  hrMobile: {
    height: 20,
  },
  position2: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  position2_1: {
    display: 'none',
  },
  position2_2: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 28,
    color: '#1a1a1a',
    alignSelf: 'center',
    textAlign: 'center',
    width: '100%',
  },
  textInput: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginVertical: 6,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#000',
  },
  emailContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    gap: 10,
  },
  emailInput: {
    flex: 1,
    marginVertical: 0,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 10,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedButton: {
    backgroundColor: '#34C759',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  verificationContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 3,
  },
  verifyCodeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  timerContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  timerText: {
    color: '#666',
    fontSize: 14,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loginLink: {
    marginTop: 16,
    marginBottom: 8,
  },
  loginLinkText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
  },
  signUpButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  img: {
    width: 100,
    height: 100,
  },
  dividerLine: {
    display: 'none',
  },
  position3: {
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  position3Mobile: {
    marginBottom: 15,
  },
});

// 태블릿 전용 스타일 (기존 유지)
const tabletStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 20,
  },
  dividerLine: {
    width: 1,
    backgroundColor: '#e0e0e0',
    height: '100%'
  },
  hr: {
    height: 30,
    backgroundColor: '#000',
    marginVertical: 5,
    width: '100%'
  },
  position1: {
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 10
  },
  position2: {
    width: '100%',
    flex: 1,
    flexDirection: 'row'
  },
  position3: {
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 10
  },
  position2_1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0'
  },
  position2_2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 50,
    paddingVertical: 40
  },
  formContainer: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 52,
    fontWeight: '700',
    marginBottom: 36,
    color: '#1a1a1a',
    alignSelf: 'center',
    textAlign: 'center',
    width: '100%'
  },
  textInput: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 18,
    marginVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000'
  },
  emailContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 12
  },
  emailInput: {
    flex: 1,
    marginVertical: 0
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 28,
    height: 56,
    borderRadius: 12,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center'
  },
  verifiedButton: {
    backgroundColor: '#34C759'
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  verificationContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 5
  },
  verifyCodeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 14
  },
  timerContainer: {
    marginTop: 14,
    alignItems: 'center'
  },
  timerText: {
    color: '#666',
    fontSize: 16
  },
  resendText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline'
  },
  loginLink: {
    marginTop: 18,
    marginBottom: 14
  },
  loginLinkText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '500'
  },
  signUpButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28
  },
  disabledButton: {
    opacity: 0.5
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600'
  },
  img: {
    width: 320,
    height: 320
  }
});