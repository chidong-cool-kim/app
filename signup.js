import React, { useState, useEffect, useMemo } from 'react';
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
import OrientationGuard from './components/OrientationGuard';
import { getScreenInfo, responsive } from './utils/responsive';
import emailService from './emailService';
import database from './database';

export default function SignUp() {
    const navigation = useNavigation();
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

        // 이미 가입된 이메일인지 확인
        const existingUser = await database.getUserByEmail(email.trim().toLowerCase());
        if (existingUser) {
            Alert.alert('오류', '이미 가입된 이메일입니다.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await emailService.sendVerificationCode(email.trim().toLowerCase());
            
            if (result.success) {
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
            
            const result = await emailService.verifyCode(email.trim().toLowerCase(), verificationCode.trim());
            
            console.log('인증코드 검증 결과:', result);
            
            if (result.success) {
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
            const userData = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: password, // 실제로는 해시화해야 함
                provider: 'email',
                providerId: email.trim().toLowerCase(),
            };

            const newUser = await database.createUser(userData);
            
            Alert.alert('성공', '회원가입이 완료되었습니다!\n닉네임을 설정해주세요.', [
                {
                    text: '닉네임 설정하기',
                    onPress: () => {
                        navigation.navigate('Username', { 
                            userInfo: { 
                                name: newUser.name, 
                                email: newUser.email,
                                id: newUser._id || newUser.id
                            },
                            fromSignup: true // 일반 회원가입에서 왔다는 표시
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
    const styles = screenInfo.isPhone ? phoneStyles : baseStyles;

    return (
        <OrientationGuard screenName="회원가입" allowPortrait={true}>
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
                                placeholder="Gmail 주소를 입력하세요"
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
                                        {isEmailVerified ? '인증완료' : '인증코드 발송'}
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
        </OrientationGuard>
    );
}

const baseStyles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: 'white',
        paddingTop: 20,
    },
    dividerLine: { 
        width: 1, 
        backgroundColor: '#ddd', 
        height: '100%' 
    },
    hr: { 
        height: 30, 
        backgroundColor: 'black', 
        marginVertical: 5, 
        width: '100%' 
    },
    hrMobile: {
        height: 20,
    },
    position1: { 
        width: '100%', 
        justifyContent: 'center', 
        alignSelf: 'flex-start', 
        marginTop: 25 
    },
    position1Mobile: {
        marginTop: 10,
    },
    position2: { 
        width: "100%", 
        flex: 1, 
        flexDirection: 'row' 
    },
    position3: { 
        width: "100%", 
        justifyContent: 'center', 
        alignSelf: 'flex-end', 
        marginBottom: 25 
    },
    position3Mobile: {
        marginBottom: 10,
    },
    position2_1: { 
        flex: 1, 
        display: "flex", 
        justifyContent: 'center', 
        alignItems: "center",
        backgroundColor: '#fbfcfd'
    },
    position2_2: { 
        flex: 1, 
        display: "flex", 
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center'
    },
    title: { 
        fontSize: 52, 
        fontWeight: '700', 
        marginBottom: 30, 
        color: '#333',
        alignSelf: 'flex-start',
        textAlign: 'left'
    },
    textInput: { 
        width: '100%', 
        height: 50, 
        borderWidth: 1, 
        borderColor: '#ddd', 
        borderRadius: 8, 
        paddingHorizontal: 15, 
        marginVertical: 8, 
        fontSize: 16, 
        backgroundColor: '#fff',
        color: '#000000'
    },
    emailContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8
    },
    emailInput: {
        flex: 1,
        marginRight: 10,
        marginVertical: 0
    },
    verifyButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center'
    },
    verifiedButton: {
        backgroundColor: '#28a745'
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
    },
    verificationContainer: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 10
    },
    codeInput: {
        textAlign: 'center',
        fontSize: 18,
        letterSpacing: 2
    },
    verifyCodeButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10
    },
    timerContainer: {
        marginTop: 10,
        alignItems: 'center'
    },
    timerText: {
        color: '#666',
        fontSize: 14
    },
    resendText: {
        color: '#007AFF',
        fontSize: 14,
        textDecorationLine: 'underline'
    },
    loginLink: { 
        marginTop: 15,
        marginBottom: 10
    },
    loginLinkText: {
        color: "#007AFF",
        fontSize: 16
    },
    signUpButton: { 
        width: '100%', 
        height: 50, 
        backgroundColor: '#007AFF', 
        borderRadius: 8, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 20 
    },
    disabledButton: {
        opacity: 0.6
    },
    signUpButtonText: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: '600' 
    },
    img: { 
        width: 300, 
        height: 300, 
        marginRight: 10 
    }
});

// 핸드폰용 반응형 스타일
const phoneStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  position1: {
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 25,
  },
  position1Mobile: {
    marginTop: 10,
  },
  hr: {
    height: 30,
    backgroundColor: 'black',
    marginVertical: 5,
    width: '100%',
  },
  hrMobile: {
    height: 20,
  },
  position2: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    justifyContent: 'center',
  },
  position2_1: {
    display: 'none',
  },
  position2_2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
    color: '#333',
    alignSelf: 'flex-start',
    textAlign: 'left',
  },
  textInput: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginVertical: 8,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#000000',
  },
  emailContainer: {
    width: '100%',
    flexDirection: 'column',
    marginVertical: 8,
  },
  emailInput: {
    marginBottom: 8,
    marginVertical: 0,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  verifiedButton: {
    backgroundColor: '#28a745',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  verificationContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 2,
  },
  verifyCodeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
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
    marginTop: 15,
    marginBottom: 10,
  },
  loginLinkText: {
    color: '#007AFF',
    fontSize: 15,
  },
  signUpButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  img: {
    width: 120,
    height: 120,
  },
  dividerLine: {
    display: 'none',
  },
  position3: {
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  position3Mobile: {
    marginBottom: 10,
  },
});