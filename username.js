import React, { useState, useEffect } from 'react';
import {
    Image,
    TouchableOpacity,
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TextInput,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGmailAuth } from './useGmailAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScreenInfo } from './utils/responsive';
import OrientationGuard from './components/OrientationGuard';

export default function Username() {
    const navigation = useNavigation();
    const route = useRoute();
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [screenInfo, setScreenInfo] = useState(getScreenInfo());
    const { updateUsername } = useGmailAuth();
    
    // 라우트에서 받은 사용자 정보
    const routeUserInfo = route.params?.userInfo || null;
    const fromGmailAuth = route.params?.fromGmailAuth || false;
    const fromSignup = route.params?.fromSignup || false;

    // 화면 크기 변경 감지
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', () => {
            setScreenInfo(getScreenInfo());
        });
        return () => subscription?.remove();
    }, []);

    const validateNickname = (text) => {
        // 닉네임 유효성 검사 (2-12자, 한글/영문/숫자만 허용)
        const regex = /^[가-힣a-zA-Z0-9]{2,12}$/;
        return regex.test(text);
    };

    const handleContinue = async () => {
        if (!nickname.trim()) {
            Alert.alert('알림', '닉네임을 입력해주세요.');
            return;
        }

        if (!validateNickname(nickname)) {
            Alert.alert('알림', '닉네임은 2-12자의 한글, 영문, 숫자만 사용 가능합니다.');
            return;
        }

        if (fromGmailAuth && routeUserInfo) {
            // Gmail 인증 사용자의 닉네임 업데이트
            try {
                setLoading(true);
                const result = await updateUsername(nickname);
                
                if (result.success) {
                    // 닉네임 설정 완료 후 바로 메인으로 이동
                    const updatedUserInfo = {
                        ...routeUserInfo,
                        username: nickname,
                        name: nickname
                    };
                    
                    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUserInfo));
                    
                    Alert.alert(
                        '닉네임 설정 완료', 
                        `닉네임이 "${nickname}"으로 설정되었습니다.`,
                        [
                            { 
                                text: '확인', 
                                onPress: () => navigation.navigate('Main')
                            }
                        ]
                    );
                } else {
                    Alert.alert('오류', result.error || '닉네임 설정에 실패했습니다.');
                }
            } catch (error) {
                console.error('닉네임 설정 오류:', error);
                Alert.alert('오류', '닉네임 설정 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        } else if (fromSignup && routeUserInfo) {
            // 일반 회원가입 사용자 - 여기서 실제로 DB에 사용자 생성
            try {
                setLoading(true);
                
                console.log('회원가입 요청:', {
                    email: routeUserInfo.email,
                    username: nickname,
                    password: routeUserInfo.password // 비밀번호가 있어야 함!
                });

                // 실제 회원가입 API 호출 (사용자 생성)
                const response = await fetch('http://192.168.45.53:5000/api/auth/email-register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: routeUserInfo.email,
                        password: routeUserInfo.password, // 중요: 비밀번호 필요!
                        username: nickname
                    })
                });

                const data = await response.json();
                console.log('회원가입 응답:', data);

                if (response.ok && data.success) {
                    Alert.alert(
                        '회원가입 완료', 
                        `"${nickname}"님, 회원가입이 완료되었습니다!\n이제 로그인할 수 있습니다.`,
                        [
                            { 
                                text: '로그인하러 가기', 
                                onPress: () => navigation.navigate('Login')
                            }
                        ]
                    );
                } else {
                    Alert.alert('오류', data.message || '회원가입에 실패했습니다.');
                }
            } catch (error) {
                console.error('회원가입 오류:', error);
                Alert.alert('오류', '회원가입 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        } else {
            // 기본 동작 (사용자 정보가 없는 경우)
            console.log('설정된 닉네임:', nickname);
            navigation.replace('Main');
        }
    };

    // 모바일 전용 레이아웃
    if (screenInfo.isPhone) {
        return (
            <OrientationGuard screenName="닉네임 설정" allowPortrait={true}>
                <SafeAreaView style={styles.safeAreaMobile}>
                    <View style={styles.mobileContainer}>
                        <View style={styles.mobileHeader}>
                            <Text style={styles.mobileLogo}>StudyTime</Text>
                        </View>
                        
                        <View style={styles.mobileContent}>
                            <Text style={styles.mobileTitleMain}>닉네임 설정</Text>
                            
                            {routeUserInfo && fromGmailAuth && (
                                <View style={styles.mobileWelcomeBox}>
                                    <Text style={styles.mobileWelcomeTitle}>안녕하세요, {routeUserInfo.name}님! 👋</Text>
                                    <Text style={styles.mobileWelcomeDesc}>Gmail 인증이 완료되었습니다.</Text>
                                    <Text style={styles.mobileWelcomeDesc}>사용할 닉네임을 설정해주세요.</Text>
                                </View>
                            )}
                            
                            {routeUserInfo && fromSignup && (
                                <View style={styles.mobileWelcomeBox}>
                                    <Text style={styles.mobileWelcomeTitle}>환영합니다! 🎉</Text>
                                    <Text style={styles.mobileWelcomeDesc}>이메일 인증이 완료되었습니다.</Text>
                                    <Text style={styles.mobileWelcomeDesc}>사용할 닉네임을 설정해주세요.</Text>
                                </View>
                            )}
                            
                            <View style={styles.mobileInputSection}>
                                <Text style={styles.mobileInputLabel}>닉네임</Text>
                                <TextInput
                                    style={styles.mobileInput}
                                    placeholder="닉네임을 입력하세요"
                                    placeholderTextColor="#999"
                                    value={nickname}
                                    onChangeText={setNickname}
                                    maxLength={12}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Text style={styles.mobileInputHint}>
                                    2-12자 / 한글, 영문, 숫자만 사용 가능
                                </Text>
                            </View>
                            
                            <TouchableOpacity 
                                style={[
                                    styles.mobileButton,
                                    (!nickname.trim() || loading) && styles.mobileButtonDisabled
                                ]} 
                                onPress={handleContinue}
                                disabled={!nickname.trim() || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.mobileButtonText}>
                                        {fromGmailAuth ? '닉네임 설정 완료' : fromSignup ? '회원가입 완료' : '시작하기'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </OrientationGuard>
        );
    }

    // 데스크톱/태블릿 레이아웃
    return (
        <OrientationGuard screenName="닉네임 설정" allowPortrait={true}>
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.position1}>
                <View style={[
                    styles.hr,
                    screenInfo.isPhone && styles.hrMobile
                ]}></View>
            </View>
            
            <View style={[
                styles.position2,
                screenInfo.isTablet && styles.position2Tablet
            ]}>
                <View style={[
                    styles.position2_1,
                    screenInfo.isTablet && styles.position2_1Tablet
                ]}>
                    <Image 
                        source={require('./assets/s.png')} 
                        style={[
                            styles.img,
                            screenInfo.isTablet && styles.imgTablet
                        ]} 
                        resizeMode="contain" 
                        fadeDuration={0} 
                    />
                </View>
                
                <View style={styles.dividerLine}></View>
                
                <View style={[
                    styles.position2_2,
                    screenInfo.isTablet && styles.position2_2Tablet
                ]}>
                    <View style={styles.contentContainer}>
                        <Text style={[
                            styles.title,
                            screenInfo.isTablet && styles.titleTablet
                        ]}>닉네임 설정</Text>
                        
                        {routeUserInfo && fromGmailAuth && (
                            <View style={styles.welcomeContainer}>
                                <Text style={styles.welcomeText}>안녕하세요, {routeUserInfo.name}님!</Text>
                                <Text style={styles.subText}>Gmail 인증이 완료되었습니다.</Text>
                                <Text style={styles.subText}>사용할 닉네임을 설정해주세요.</Text>
                            </View>
                        )}
                        
                        {routeUserInfo && fromSignup && (
                            <View style={styles.welcomeContainer}>
                                <Text style={styles.welcomeText}>환영합니다!</Text>
                                <Text style={styles.subText}>이메일 인증이 완료되었습니다.</Text>
                                <Text style={styles.subText}>사용할 닉네임을 설정해주세요.</Text>
                            </View>
                        )}
                        
                        <TextInput
                            style={[
                                styles.textInput,
                                screenInfo.isTablet && styles.textInputTablet
                            ]}
                            placeholder="닉네임을 입력하세요 (2-12자)"
                            placeholderTextColor="#999"
                            value={nickname}
                            onChangeText={setNickname}
                            maxLength={12}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        
                        <Text style={styles.guideText}>
                            한글, 영문, 숫자만 사용 가능합니다
                        </Text>
                        
                        <TouchableOpacity 
                            style={[
                                styles.continueButton,
                                screenInfo.isTablet && styles.continueButtonTablet,
                                (!nickname.trim() || loading) && styles.disabledButton
                            ]} 
                            onPress={handleContinue}
                            disabled={!nickname.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={[
                                    styles.continueButtonText,
                                    (!nickname.trim() || loading) && styles.disabledButtonText
                                ]}>
                                    {fromGmailAuth ? '닉네임 설정 완료' : fromSignup ? '회원가입 완료' : '시작하기'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            
            <View style={styles.position3}>
                <View style={[
                    styles.hr,
                    screenInfo.isPhone && styles.hrMobile
                ]}></View>
            </View>
        </SafeAreaView>
        </OrientationGuard>
    );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: 'white' 
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
    position2_1: { 
        flex: 1, 
        display: "flex", 
        justifyContent: 'center', 
        alignItems: "center" 
    },
    position2_2: { 
        flex: 1, 
        display: "flex", 
        flexDirection: 'column', 
        justifyContent: 'center',
        paddingHorizontal: 20
    },
    img: { 
        width: 300, 
        height: 300, 
        marginRight: 10 
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
    },
    title: { 
        fontSize: 48, 
        fontWeight: '500', 
        marginBottom: 30, 
        color: '#333'
    },
    welcomeContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    subText: {
        fontSize: 16,
        color: '#666',
    },
    textInput: { 
        width: '75%', 
        height: 50, 
        borderWidth: 1, 
        borderColor: '#ddd', 
        borderRadius: 8, 
        paddingHorizontal: 15, 
        fontSize: 16, 
        backgroundColor: '#fff',
        textAlign: 'center',
        color: '#000000',
    },
    guideText: {
        fontSize: 14,
        color: '#999',
        marginTop: 10,
        marginBottom: 30,
        textAlign: 'center',
    },
    continueButton: { 
        width: '75%', 
        height: 50, 
        backgroundColor: '#007AFF', 
        borderRadius: 8, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 15,
    },
    continueButtonText: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: '600' 
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    disabledButtonText: {
        color: '#999',
    },
    
    // 모바일 전용 스타일
    safeAreaMobile: {
        flex: 1,
        backgroundColor: '#fff',
    },
    mobileContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    mobileHeader: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    mobileLogo: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
    },
    mobileContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        justifyContent: 'flex-start',
    },
    mobileTitleMain: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000',
        marginBottom: 24,
    },
    mobileWelcomeBox: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 20,
        marginBottom: 32,
    },
    mobileWelcomeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    mobileWelcomeDesc: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
    },
    mobileInputSection: {
        marginBottom: 32,
    },
    mobileInputLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    mobileInput: {
        width: '100%',
        height: 52,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#000000',
    },
    mobileInputHint: {
        fontSize: 13,
        color: '#999',
        marginTop: 8,
    },
    mobileButton: {
        width: '100%',
        height: 52,
        backgroundColor: '#007AFF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mobileButtonDisabled: {
        backgroundColor: '#ccc',
    },
    mobileButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    
    // 태블릿 전용 스타일
    position2Tablet: {
        flexDirection: 'row',
    },
    position2_1Tablet: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imgTablet: {
        width: 250,
        height: 250,
    },
    position2_2Tablet: {
        flex: 1,
        paddingHorizontal: 30,
        justifyContent: 'center',
    },
    titleTablet: {
        fontSize: 42,
        marginBottom: 28,
    },
    textInputTablet: {
        width: '80%',
        height: 48,
        fontSize: 15,
    },
    continueButtonTablet: {
        width: '80%',
        height: 48,
    },
});