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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import MobileSafeArea from './components/MobileSafeArea';
import OrientationLock from './components/OrientationLock';
import OrientationGuard from './components/OrientationGuard';
import { getScreenInfo, responsive } from './utils/responsive';
import { useGmailAuth } from './useGmailAuth';
import { useGoogleOAuth } from './hooks/useGoogleOAuth';
import { apiCall, API_ENDPOINTS } from './config/api';

import kakaoLogo from './assets/kakaoLogo.png';
import naverLogo from './assets/naverLogo.webp';
import googleLogo from './assets/googleLogo.png';
import appleLogo from './assets/appleLogo.webp';

const { width, height } = Dimensions.get('window');

export default function Login() {
    const [screenInfo, setScreenInfo] = useState(getScreenInfo());
    const isLandscape = screenInfo.isLandscape && screenInfo.isPhone;
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Gmail 인증 훅 사용
    const {
        isAuthenticated,
        userInfo,
        loading: gmailLoading,
        error: gmailError,
        signInWithGmail,
        signOut,
        checkStoredAuth,
        sendVerificationCode,
        verifyCode,
        codeSent,
        clearError
    } = useGmailAuth();

    // Google OAuth 훅 사용
    const {
        userInfo: googleUserInfo,
        loading: googleLoading,
        error: googleError,
        signInWithGoogle,
        signOut: googleSignOut,
        checkStoredAuth: checkGoogleAuth,
        clearError: clearGoogleError,
    } = useGoogleOAuth();

    // 화면 크기 변경 감지
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', () => {
            setScreenInfo(getScreenInfo());
        });
        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        const checkAuthAndNavigate = async () => {
            await checkStoredAuth();
            
            try {
                const currentUser = await AsyncStorage.getItem('currentUser');
                if (currentUser) {
                    navigation.replace('Main');
                    return;
                }
            } catch (error) {
                console.log('사용자 정보 확인 실패:', error);
            }
            
            setTimeout(() => {
                setIsInitialLoad(false);
            }, 500);
        };
        
        checkAuthAndNavigate();
    }, []);

    useEffect(() => {
        if (isAuthenticated && userInfo && !isInitialLoad) {
            console.log('Gmail 인증 성공! 사용자 정보:', userInfo);
            
            setTimeout(() => {
                signOut();
                setShowCodeInput(false);
                setVerificationCode('');
            }, 100);
            
            Alert.alert(
                '닉네임 설정',
                '사용할 닉네임을 입력해주세요.',
                [
                    {
                        text: '확인',
                        onPress: () => {
                            navigation.navigate('Signup', { 
                                email: userInfo.email,
                                name: userInfo.name,
                                provider: 'gmail'
                            });
                        }
                    }
                ]
            );
        }
    }, [isAuthenticated, userInfo, isInitialLoad]);

    useEffect(() => {
        if (gmailError) {
            Alert.alert('인증 오류', gmailError, [
                { text: '확인', onPress: clearError }
            ]);
        }
    }, [gmailError]);

    useEffect(() => {
        if (codeSent) {
            setShowCodeInput(true);
            Alert.alert('인증코드 발송', 'Gmail로 인증코드가 발송되었습니다. 확인해주세요.');
        }
    }, [codeSent]);

    // Google OAuth 에러 처리
    useEffect(() => {
        if (googleError) {
            Alert.alert('Google 로그인 오류', googleError, [
                { text: '확인', onPress: clearGoogleError }
            ]);
        }
    }, [googleError]);

    // Google OAuth 성공 처리
    useEffect(() => {
        const handleGoogleAuthSuccess = async () => {
            if (googleUserInfo && !isInitialLoad) {
                console.log('Google OAuth 성공! 사용자 정보:', googleUserInfo);
                
                // 닉네임이 없는 경우
                if (!googleUserInfo.username) {
                    Alert.alert(
                        '닉네임 설정',
                        '사용할 닉네임을 입력해주세요.',
                        [
                            {
                                text: '확인',
                                onPress: () => {
                                    navigation.navigate('Username', { 
                                        userInfo: googleUserInfo,
                                        fromGoogleAuth: true
                                    });
                                }
                            }
                        ]
                    );
                } else {
                    // 닉네임이 있는 경우 바로 메인으로
                    Alert.alert('로그인 성공', `환영합니다, ${googleUserInfo.username}님!`, [
                        { text: '확인', onPress: () => navigation.navigate('Main') }
                    ]);
                }
            }
        };
        
        handleGoogleAuthSuccess();
    }, [googleUserInfo, isInitialLoad]);

    const handleSendCode = async () => {
        if (!email.trim()) {
            Alert.alert('오류', '이메일 주소를 입력해주세요.');
            return;
        }

        if (!email.includes('@gmail.com')) {
            Alert.alert('오류', 'Gmail 주소만 사용 가능합니다.');
            return;
        }

        try {
            const result = await sendVerificationCode(email);
            if (result.success) {
                Alert.alert('성공', result.message);
            }
        } catch (error) {
            console.error('인증코드 발송 실패:', error);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode.trim()) {
            Alert.alert('오류', '인증코드를 입력해주세요.');
            return;
        }

        try {
            const result = await verifyCode(verificationCode);
            if (result.success) {
                Alert.alert('성공', 'Gmail 인증이 완료되었습니다!');
            }
        } catch (error) {
            console.error('인증코드 확인 실패:', error);
        }
    };

    const handleResendCode = async () => {
        if (!email.trim()) {
            Alert.alert('오류', '이메일 주소를 입력해주세요.');
            return;
        }

        try {
            const result = await sendVerificationCode(email);
            if (result.success) {
                Alert.alert('성공', '인증코드가 재발송되었습니다.');
            }
        } catch (error) {
            console.error('인증코드 재발송 실패:', error);
        }
    };

    const finishLogin = async () => {
        if (!email.trim()) {
            Alert.alert('오류', '이메일을 입력해주세요.');
            return;
        }

        try {
            await AsyncStorage.removeItem('currentUser');
            await AsyncStorage.removeItem('is_authenticated');
            userDataService.clearCurrentUser();

            const gmailResponse = await apiCall(API_ENDPOINTS.GMAIL_LOGIN, {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim()
                })
            });

            if (gmailResponse.ok) {
                const gmailData = await gmailResponse.json();
                
                if (!gmailData.user.username) {
                    const userInfo = {
                        id: gmailData.user.id,
                        name: gmailData.user.name,
                        email: gmailData.user.email,
                        provider: gmailData.user.provider,
                        createdAt: gmailData.user.createdAt
                    };
                    
                    Alert.alert('닉네임 설정 필요', '닉네임을 설정해주세요.', [
                        { 
                            text: '확인', 
                            onPress: () => navigation.navigate('Username', { 
                                userInfo,
                                fromGmailAuth: true
                            })
                        }
                    ]);
                    return;
                }
                
                const userInfo = {
                    id: gmailData.user.id,
                    name: gmailData.user.name,
                    email: gmailData.user.email,
                    username: gmailData.user.username,
                    provider: gmailData.user.provider,
                    createdAt: gmailData.user.createdAt,
                    notesCount: gmailData.user.notesCount,
                    dailyStudyMinutes: gmailData.user.dailyStudyMinutes,
                    plannersCount: gmailData.user.plannersCount
                };

                userDataService.clearCurrentUser();
                await AsyncStorage.setItem('currentUser', JSON.stringify(userInfo));
                await AsyncStorage.setItem('is_authenticated', 'true');

                Alert.alert('로그인 성공', `환영합니다, ${gmailData.user.username}님!`, [
                    { text: '확인', onPress: () => navigation.navigate('Main') }
                ]);
                return;
            }

            if (!password.trim()) {
                Alert.alert('오류', '일반 사용자는 비밀번호가 필요합니다.');
                return;
            }

            const emailResponse = await apiCall(API_ENDPOINTS.EMAIL_LOGIN, {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim(),
                    password: password
                })
            });

            const emailData = await emailResponse.json();

            if (!emailResponse.ok) {
                Alert.alert('로그인 실패', emailData.message);
                return;
            }

            const userInfo = {
                id: emailData.user.id,
                name: emailData.user.name,
                email: emailData.user.email,
                username: emailData.user.username,
                provider: emailData.user.provider,
                createdAt: emailData.user.createdAt,
                notesCount: emailData.user.notesCount,
                dailyStudyMinutes: emailData.user.dailyStudyMinutes,
                plannersCount: emailData.user.plannersCount
            };

            userDataService.clearCurrentUser();

            await AsyncStorage.setItem('currentUser', JSON.stringify(userInfo));
            await AsyncStorage.setItem('is_authenticated', 'true');

            Alert.alert('로그인 성공', `환영합니다, ${emailData.user.username}님!`, [
                { text: '확인', onPress: () => navigation.navigate('Main') }
            ]);

        } catch (error) {
            console.error('로그인 오류:', error);
            Alert.alert('오류', '로그인 중 오류가 발생했습니다.');
        }
    };

    const goToSignUp = () => {
        navigation.navigate('SignUp');
    };

    // 반응형 스타일 선택
    const getStyles = () => {
        if (screenInfo.isPhone) {
            return baseStyles; // 모바일은 기본 스타일 + 모바일 스타일 사용
        } else if (screenInfo.isTablet) {
            return baseStyles; // 태블릿도 기본 스타일 사용 (태블릿 전용 스타일은 조건부로 적용)
        }
        return baseStyles;
    };
    
    const styles = getStyles();

    return (
        <OrientationLock isNoteScreen={false}>
            <MobileSafeArea style={styles.safeArea} backgroundColor="#ffffff">
            {/* 상단 바 */}
            <View style={[
                styles.position1,
                screenInfo.isPhone && !isLandscape && styles.position1Mobile
            ]}>
                <View style={[
                    styles.hr,
                    screenInfo.isPhone && !isLandscape && styles.hrMobile
                ]}></View>
            </View>
            
            <View style={[
                styles.mainContent, 
                screenInfo.isPhone && !isLandscape && styles.mainContentMobile, 
                screenInfo.isTablet && styles.mainContentTablet,
                isLandscape && styles.mainContentLandscape
            ]}>
                {/* 로고 영역 - 모바일에서 숨김 */}
                {!(screenInfo.isPhone && !isLandscape) && (
                    <View style={[
                        styles.leftSection, 
                        screenInfo.isTablet && styles.leftSectionTablet,
                        isLandscape && styles.leftSectionLandscape
                    ]}>
                        <Image 
                            source={require('./assets/s.png')} 
                            style={[
                                styles.img, 
                                screenInfo.isTablet && styles.imgTablet,
                                isLandscape && styles.imgLandscape
                            ]} 
                            resizeMode="contain" 
                            fadeDuration={0} 
                        />
                    </View>
                )}

                {/* 로그인 폼 */}
                <View style={[
                    styles.rightSection, 
                    screenInfo.isPhone && !isLandscape && styles.rightSectionMobile,
                    screenInfo.isTablet && styles.rightSectionTablet,
                    isLandscape && styles.rightSectionLandscape
                ]}>
                    <View style={[
                        styles.formContainer, 
                        screenInfo.isPhone && !isLandscape && styles.formContainerMobile,
                        screenInfo.isTablet && styles.formContainerTablet,
                        isLandscape && styles.formContainerLandscape
                    ]}>
                        <Text style={[
                            styles.title, 
                            screenInfo.isPhone && styles.titleMobile,
                            screenInfo.isTablet && styles.titleTablet
                        ]}>Log In</Text>
                        
                        <TextInput
                            style={[
                                styles.input, 
                                screenInfo.isPhone && styles.inputMobile,
                                screenInfo.isTablet && styles.inputTablet
                            ]}
                            placeholder="이메일을 입력하세요"
                            placeholderTextColor="#aaa"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        
                        <TextInput
                            style={[
                                styles.input, 
                                screenInfo.isPhone && styles.inputMobile,
                                screenInfo.isTablet && styles.inputTablet
                            ]}
                            placeholder="비밀번호를 입력하세요"
                            placeholderTextColor="#aaa"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        
                        <TouchableOpacity onPress={goToSignUp} style={styles.signupLinkContainer}>
                            <Text style={styles.signupLink}>계정이 없으신가요?</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[
                            styles.loginButton, 
                            screenInfo.isPhone && styles.loginButtonMobile,
                            screenInfo.isTablet && styles.loginButtonTablet
                        ]} onPress={finishLogin}>
                            <Text style={styles.loginButtonText}>로그인</Text>
                        </TouchableOpacity>

                        {/* OR 구분선 */}
                        <View style={[
                            styles.dividerContainer, 
                            screenInfo.isPhone && styles.dividerContainerMobile,
                            screenInfo.isTablet && styles.dividerContainerTablet
                        ]}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* 소셜 로그인 버튼들 */}
                        {/* Google OAuth 버튼 */}
                        <TouchableOpacity
                            style={[
                                styles.socialButton, 
                                screenInfo.isPhone && styles.socialButtonMobile,
                                screenInfo.isTablet && styles.socialButtonTablet
                            ]}
                            onPress={signInWithGoogle}
                            disabled={googleLoading}
                        >
                            {googleLoading ? (
                                <ActivityIndicator size="small" color="#333" />
                            ) : (
                                <View style={styles.socialButtonContent}>
                                    <Image source={googleLogo} style={styles.socialIcon} resizeMode="contain" />
                                    <Text style={styles.socialButtonText}>Sign in with Google</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Gmail 인증코드 방식 (기존 방식 - 숨김 처리 가능) */}
                        {false && (
                        <TouchableOpacity
                            style={[
                                styles.socialButton, 
                                screenInfo.isPhone && styles.socialButtonMobile,
                                screenInfo.isTablet && styles.socialButtonTablet
                            ]}
                            onPress={showCodeInput ? handleVerifyCode : handleSendCode}
                            disabled={gmailLoading}
                        >
                            {gmailLoading ? (
                                <ActivityIndicator size="small" color="#333" />
                            ) : (
                                <View style={styles.socialButtonContent}>
                                    <Image source={googleLogo} style={styles.socialIcon} resizeMode="contain" />
                                    <Text style={styles.socialButtonText}>
                                        {showCodeInput ? 'Gmail 인증코드 확인' : 'Gmail 인증코드 로그인'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        )}

                        {showCodeInput && (
                            <View style={styles.codeInputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="인증코드 6자리 입력"
                                    placeholderTextColor="#aaa"
                                    value={verificationCode}
                                    onChangeText={setVerificationCode}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                                <TouchableOpacity
                                    style={styles.resendButton}
                                    onPress={handleResendCode}
                                >
                                    <Text style={styles.resendButtonText}>재발송</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity style={[
                            styles.socialButton, 
                            screenInfo.isPhone && styles.socialButtonMobile,
                            screenInfo.isTablet && styles.socialButtonTablet
                        ]}>
                            <View style={styles.socialButtonContent}>
                                <Image source={kakaoLogo} style={styles.socialIcon} resizeMode="contain" />
                                <Text style={styles.socialButtonText}>Start with Kakao</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[
                            styles.socialButton, 
                            screenInfo.isPhone && styles.socialButtonMobile,
                            screenInfo.isTablet && styles.socialButtonTablet
                        ]}>
                            <View style={styles.socialButtonContent}>
                                <Image source={appleLogo} style={styles.appleSocialIcon} resizeMode="contain" />
                                <Text style={styles.socialButtonText}>Start with Apple</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[
                            styles.socialButton, 
                            screenInfo.isPhone && styles.socialButtonMobile,
                            screenInfo.isTablet && styles.socialButtonTablet
                        ]}>
                            <View style={styles.socialButtonContent}>
                                <Image source={naverLogo} style={styles.socialIcon} resizeMode="contain" />
                                <Text style={styles.socialButtonText}>Start with Naver</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            
            {/* 하단 바 */}
            <View style={[
                styles.position3,
                screenInfo.isPhone && !isLandscape && styles.position3Mobile
            ]}>
                <View style={[
                    styles.hr,
                    screenInfo.isPhone && !isLandscape && styles.hrMobile
                ]}></View>
            </View>
            </MobileSafeArea>
        </OrientationLock>
    );
}

const baseStyles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingTop: 20,
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
    position1: {
        width: '100%',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        marginTop: 25,
    },
    position3: {
        width: '100%',
        justifyContent: 'center',
        alignSelf: 'flex-end',
        marginBottom: 25,
    },
    mainContent: {
        flex: 1,
        flexDirection: 'row',
        position: 'relative',
    },
    leftSection: {
        width: '50%',
        backgroundColor: '#fbfcfd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    img: {
        width: 300,
        height: 300,
    },
    rightSection: {
        width: '50%',
        backgroundColor: '#ffffff',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 60,
    },
    formContainer: {
        width: '100%',
        maxWidth: 430,
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 52,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 26,
        alignSelf: 'flex-start',
        textAlign: 'left',
    },
    input: {
        width: '100%',
        height: 52,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 11,
        paddingHorizontal: 17,
        fontSize: 14,
        marginBottom: 15,
        backgroundColor: '#ffffff',
        color: '#000000',
    },
    signupLinkContainer: {
        alignSelf: 'flex-end',
        marginBottom: 12,
        marginTop: 4,
    },
    signupLink: {
        color: '#0A84FF',
        fontSize: 12,
        fontWeight: '400',
    },
    loginButton: {
        width: '100%',
        height: 52,
        backgroundColor: '#0A84FF',
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 22,
        marginBottom: 22,
        width: '100%',
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    dividerText: {
        marginHorizontal: 15,
        fontSize: 13,
        color: '#888888',
        fontWeight: '500',
    },
    socialButton: {
        width: '100%',
        height: 52,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    socialButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    socialIcon: {
        width: 30,
        height: 30,
        marginRight: 11,
    },
    appleSocialIcon: {
        width: 34,
        height: 34,
        marginRight: 11,
    },
    socialButtonText: {
        fontSize: 17,
        color: '#333333',
        fontWeight: '600',
    },
    codeInputWrapper: {
        width: '100%',
        marginBottom: 14,
    },
    resendButton: {
        alignSelf: 'flex-end',
        marginTop: 8,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    resendButtonText: {
        color: '#0A84FF',
        fontSize: 14,
        fontWeight: '500',
    },
    
    // 모바일 전용 스타일
    mainContentMobile: {
        flexDirection: 'column',
    },
    leftSectionMobile: {
        width: '100%',
        height: 120,
        borderRightWidth: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingTop: 25,
        paddingBottom: 10,
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
    },
    imgMobile: {
        width: 100,
        height: 100,
        alignSelf: 'center',
    },
    rightSectionMobile: {
        width: '100%',
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleMobile: {
        fontSize: 36,
        marginBottom: 20,
        textAlign: 'left',
        alignSelf: 'flex-start',
        fontWeight: '700',
    },
    formContainerMobile: {
        width: '96%',
        maxWidth: 380,
        alignSelf: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    inputMobile: {
        height: 52,
        fontSize: 16,
        marginBottom: 12,
        paddingHorizontal: 18,
        borderRadius: 10,
        color: '#000000',
    },
    loginButtonMobile: {
        height: 52,
        marginBottom: 0,
        borderRadius: 10,
    },
    socialButtonMobile: {
        height: 52,
        marginBottom: 12,
        borderRadius: 10,
    },
    dividerContainerMobile: {
        marginTop: 20,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    position1Mobile: {
        marginTop: 10,
    },
    position3Mobile: {
        marginBottom: 10,
    },
    
    // 가로모드 전용 스타일
    mainContentLandscape: {
        flexDirection: 'row',
    },
    leftSectionLandscape: {
        width: '35%',
        height: '100%',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
        borderBottomWidth: 0,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    imgLandscape: {
        width: 80,
        height: 80,
    },
    rightSectionLandscape: {
        width: '65%',
        height: '100%',
        paddingHorizontal: 15,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    formContainerLandscape: {
        width: '95%',
        maxWidth: 400,
        alignSelf: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    
    // 태블릿 전용 스타일 (기존 스타일의 85% 크기와 간격)
    mainContentTablet: {
        flexDirection: 'row',
        flex: 1,
    },
    leftSectionTablet: {
        width: '45%',
        backgroundColor: '#f0f4f8',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 34,
        borderBottomWidth: 0,
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    imgTablet: {
        width: 250,
        height: 250,
        alignSelf: 'center',
    },
    rightSectionTablet: {
        width: '55%',
        flex: 1,
        paddingHorizontal: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleTablet: {
        fontSize: 45,
        marginBottom: 34,
        textAlign: 'left',
        alignSelf: 'flex-start',
        fontWeight: '700',
    },
    formContainerTablet: {
        width: '100%',
        maxWidth: 425,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 17,
        paddingVertical: 40,
    },
    inputTablet: {
        height: 51,
        fontSize: 15,
        marginBottom: 17,
        paddingHorizontal: 21,
        borderRadius: 11,
    },
    loginButtonTablet: {
        height: 51,
        marginBottom: 0,
        borderRadius: 11,
    },
    socialButtonTablet: {
        height: 51,
        marginBottom: 13,
        borderRadius: 11,
    },
    dividerContainerTablet: {
        marginTop: 25,
        marginBottom: 25,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});