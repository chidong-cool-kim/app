import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useTimer } from './timerContext';
import OrientationGuard from './components/OrientationGuard';
import MobileSafeArea from './components/MobileSafeArea';
import { getScreenInfo, responsive, createResponsiveStyles } from './utils/responsive';
import userDataService from './userDataService';
import Svg, { Circle } from 'react-native-svg';

const suneungSchedule = [
  { name: '1교시: 국어', duration: 80 * 60, break: 10 * 60 },
  { name: '2교시: 수학', duration: 100 * 60, break: 20 * 60 },
  { name: '3교시: 영어', duration: 70 * 60, break: 10 * 60 },
  { name: '4교시: 한국사/탐구', duration: 102 * 60, break: 0 },
];

const subjects = [
  '홈',
  '타이머',
  '플래너',
  'AI',
  '스터디그룹 찾기',
  '커뮤니티',
  '스토어',
];

export default function Timer() {
  const navigation = useNavigation();
  
  const {
    isRunning,
    timeLeft,
    isBreak,
    focusTime,
    breakTime,
    toggleTimer,
    resetTimer,
    switchMode,
    updateSettings,
    formatTime,
    setShowMiniTimer,
    setIsRunning,
    setIsBreak,
    setTimeLeft
  } = useTimer();

  const [isSuneungMode, setIsSuneungMode] = useState(false);
  const [suneungStep, setSuneungStep] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [tempFocusTime, setTempFocusTime] = useState(focusTime);
  const [tempBreakTime, setTempBreakTime] = useState(breakTime);
  const [searchText, setSearchText] = useState('');
  const [activeSubject, setActiveSubject] = useState('타이머');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [isLoading, setIsLoading] = useState(true);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setScreenInfo(getScreenInfo());
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    setShowMiniTimer(false);
    loadCurrentUser();
    return () => {
      if (isRunning) {
        setShowMiniTimer(true);
      }
    };
  }, []);

  // 화면 포커스 시 사용자 정보 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentUser();
    });

    return unsubscribe;
  }, [navigation]);

  const loadCurrentUser = async () => {
    try {
      const updatedUser = await userDataService.refreshCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    } finally {
      // 데이터 로딩 완료 후 로딩 상태 해제
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  useEffect(() => {
    const totalTime = isSuneungMode 
      ? isBreak 
        ? suneungSchedule[suneungStep - 1]?.break || breakTime * 60
        : suneungSchedule[suneungStep]?.duration || focusTime * 60
      : isBreak 
        ? breakTime * 60 
        : focusTime * 60;
    const progress = 1 - (timeLeft / totalTime);
    
    Animated.timing(progressAnim, {
      toValue: isNaN(progress) ? 0 : progress,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [timeLeft, focusTime, breakTime, isBreak, isSuneungMode, suneungStep]);

  // 수능 모드에서 타이머 완료 감지
  useEffect(() => {
    if (isSuneungMode && timeLeft === 0 && !isRunning) {
      // 타이머가 완료되었을 때
      if (isBreak) {
        // 휴식 시간이 끝났으면 다음 과목으로
        if (suneungStep < suneungSchedule.length - 1) {
          setSuneungStep(prev => prev + 1);
          setIsBreak(false);
        } else {
          // 모든 과목 완료
          setIsSuneungMode(false);
          setSuneungStep(0);
          setIsBreak(false);
        }
      } else {
        // 집중 시간이 끝났으면 휴식 시간으로
        if (suneungSchedule[suneungStep]?.break > 0) {
          setIsBreak(true);
        } else {
          // 휴식 시간이 없으면 다음 과목으로
          if (suneungStep < suneungSchedule.length - 1) {
            setSuneungStep(prev => prev + 1);
          } else {
            // 모든 과목 완료
            setIsSuneungMode(false);
            setSuneungStep(0);
          }
        }
      }
    }
  }, [timeLeft, isRunning, isSuneungMode, isBreak, suneungStep]);

  // 수능 단계나 휴식 상태가 변경될 때 타이머 시간 업데이트
  useEffect(() => {
    if (isSuneungMode && !isRunning) {
      const newTime = isBreak 
        ? suneungSchedule[suneungStep - 1]?.break || 0
        : suneungSchedule[suneungStep]?.duration || 0;
      
      if (newTime > 0) {
        setTimeLeft(newTime);
      }
    }
  }, [isSuneungMode, suneungStep, isBreak, isRunning]);

  const playNotificationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/sounds/song.wav'),
        { shouldPlay: true, volume: 0.8, isLooping: true }
      );

      Alert.alert(
        '🔊 알람음 테스트',
        '알람음이 재생 중입니다.',
        [
          { 
            text: '🔇 알람 끄기', 
            style: 'destructive',
            onPress: () => {
              sound.stopAsync();
              sound.unloadAsync();
            }
          },
          { 
            text: '확인', 
            style: 'default',
            onPress: () => {
              sound.stopAsync();
              sound.unloadAsync();
            }
          }
        ],
        { cancelable: false }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish && !status.isLooping) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      Alert.alert('🔔 알림', '알람음 재생에 실패했습니다.', [{ text: '확인', style: 'default' }]);
    }
  };

  const saveSettings = async () => {
    await updateSettings(tempFocusTime, tempBreakTime);
    setShowSettings(false);
  };

  const cancelSettings = () => {
    setTempFocusTime(focusTime);
    setTempBreakTime(breakTime);
    setShowSettings(false);
  };

  const toggleSuneungMode = () => {
    if (isSuneungMode) {
      Alert.alert(
        '수능 모드 종료',
        '정말로 수능모드를 종료하고 다시 돌아가시겠습니까?',
        [
          { text: '아니오', style: 'cancel' },
          {
            text: '예',
            onPress: () => {
              setIsRunning(false);
              setIsSuneungMode(false);
              setSuneungStep(0);
              setIsBreak(false);
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      setIsRunning(false);
      setIsSuneungMode(true);
      setSuneungStep(0);
      setIsBreak(false);
      // 첫 번째 과목 시간으로 설정
      setTimeLeft(suneungSchedule[0].duration);
    }
  };
  
  const handleSubjectPress = (subjectName) => {
    setActiveSubject(subjectName);
    
    switch(subjectName) {
      case '홈':
        navigation.navigate('Main');
        break;
      case '타이머':
        break;
      case '플래너':
        navigation.navigate('Planner');
        break;
      case 'AI':
        navigation.navigate('AI');
        break;
      case '스터디그룹 찾기':
        navigation.navigate('StudyGroup');
        break;
      case '커뮤니티':
        navigation.navigate('Community');
        break;
      case '스토어':
        navigation.navigate('Store');
        break;
      default:
        break;
    }
  };

  const getContainerStyles = () => {
    if (isSuneungMode) {
      return {
        safeArea: { flex: 1, backgroundColor: '#1C1C1E' },
        header: { ...styles.header, backgroundColor: '#2C2C2E', borderBottomColor: '#444' },
        title: { ...styles.title, color: 'white' },
        homeText: { ...styles.homeText, color: 'white' },
        container: { flex: 1, flexDirection: 'row', backgroundColor: '#1C1C1E' },
        sidebar: { ...styles.sidebar, backgroundColor: '#2C2C2E', borderRightColor: '#444' },
        searchContainer: { ...styles.searchContainer, backgroundColor: '#3A3A3C' },
        searchInput: { ...styles.searchInput, color: 'white' },
        subjectText: { ...styles.subjectText, color: '#999' },
        activeSubjectText: { ...styles.activeSubjectText, color: 'white' },
        subjectItem: { ...styles.subjectItem },
        activeSubjectItem: { ...styles.activeSubjectItem, backgroundColor: '#444' },
        dot: { ...styles.dot, backgroundColor: '#555' },
        activeDot: { ...styles.activeDot, backgroundColor: '#999' },
        mainContent: { ...styles.mainContent },
        timerContainer: { ...styles.timerContainer, backgroundColor: '#2C2C2E' },
        timeText: { ...styles.timeText, color: 'white' },
        statusText: { ...styles.statusText, color: '#999' },
        controlButton: { ...styles.controlButton, backgroundColor: '#3A3A3C' },
        controlIcon: { ...styles.controlIcon, color: '#999' },
        playButton: { ...styles.playButton },
        settingsButton: { ...styles.settingsButton, backgroundColor: '#3A3A3C' },
        settingsIcon: { ...styles.settingsIcon, color: '#999' },
        statCard: { ...styles.statCard, backgroundColor: '#2C2C2E' },
        statTitle: { ...styles.statTitle, color: 'white' },
        statValue: { ...styles.statValue, color: 'white' },
        statDescription: { ...styles.statDescription, color: '#999' },
        suneungButtonText: { ...styles.suneungButtonText, color: '#BB86FC' },
        suneungButtonActive: { ...styles.suneungButtonActive, backgroundColor: '#BB86FC' },
        suneungButtonTextActive: { ...styles.suneungButtonTextActive, color: 'white' },
      };
    } else {
      return {
        safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
        header: { ...styles.header, backgroundColor: 'white', borderBottomColor: '#E5E5E5' },
        title: { ...styles.title, color: '#000' },
        homeText: { ...styles.homeText, color: '#000' },
        container: { flex: 1, flexDirection: 'row' },
        sidebar: { ...styles.sidebar, backgroundColor: 'white', borderRightColor: '#E5E5E5' },
        searchContainer: { ...styles.searchContainer, backgroundColor: '#F5F5F5' },
        searchInput: { ...styles.searchInput, color: '#000' },
        subjectText: { ...styles.subjectText, color: '#666' },
        activeSubjectText: { ...styles.activeSubjectText, color: '#000' },
        subjectItem: { ...styles.subjectItem },
        activeSubjectItem: { ...styles.activeSubjectItem, backgroundColor: '#F0F0F0' },
        dot: { ...styles.dot, backgroundColor: '#D0D0D0' },
        activeDot: { ...styles.activeDot, backgroundColor: '#666' },
        mainContent: { ...styles.mainContent },
        timerContainer: { ...styles.timerContainer, backgroundColor: 'white' },
        timeText: { ...styles.timeText, color: '#1F2937' },
        statusText: { ...styles.statusText, color: '#6B7280' },
        controlButton: { ...styles.controlButton, backgroundColor: '#F3F4F6' },
        controlIcon: { ...styles.controlIcon, color: '#6B7280' },
        playButton: { ...styles.playButton },
        settingsButton: { ...styles.settingsButton, backgroundColor: '#F3F4F6' },
        settingsIcon: { ...styles.settingsIcon },
        statCard: { ...styles.statCard, backgroundColor: 'white' },
        statTitle: { ...styles.statTitle, color: '#1F2937' },
        statValue: { ...styles.statValue, color: '#1F2937' },
        statDescription: { ...styles.statDescription, color: '#6B7280' },
        suneungButtonText: { ...styles.suneungButtonText, color: '#3B82F6' },
        suneungButtonActive: { ...styles.suneungButtonActive, backgroundColor: '#3B82F6' },
        suneungButtonTextActive: { ...styles.suneungButtonTextActive, color: 'white' },
      };
    }
  };

  const currentStyles = getContainerStyles();

  return (
    <SafeAreaView style={currentStyles.safeArea}>
      <View style={currentStyles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.hamburgerButton} onPress={() => setSidebarVisible(!sidebarVisible)}>
            <View style={[styles.hamburgerLine, isSuneungMode && { backgroundColor: '#999' }]} />
            <View style={[styles.hamburgerLine, isSuneungMode && { backgroundColor: '#999' }]} />
            <View style={[styles.hamburgerLine, isSuneungMode && { backgroundColor: '#999' }]} />
          </TouchableOpacity>
          <Text style={currentStyles.title}>StudyTime</Text>
          <Text style={currentStyles.homeText}>타이머</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileIcon}
          onPress={() => navigation.navigate('Settings')}
        >
          {currentUser?.profileImage ? (
            <Image 
              source={{ uri: currentUser.profileImage }} 
              style={styles.profileImage}
              onError={(error) => {
                console.log('타이머 프로필 이미지 로드 실패:', error.nativeEvent.error);
                console.log('이미지 URL:', currentUser.profileImage);
              }}
              onLoad={() => {
                console.log('타이머 프로필 이미지 로드 성공:', currentUser.profileImage);
              }}
            />
          ) : (
            <View style={styles.defaultProfileIcon}>
              <Text style={styles.profileText}>
                {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={currentStyles.container}>
        {sidebarVisible && (
          <View style={currentStyles.sidebar}>
            <View style={currentStyles.searchContainer}>
              <Text style={styles.searchIconText}>🔍</Text>
              <TextInput
                style={currentStyles.searchInput}
                placeholder="검색"
                placeholderTextColor={isSuneungMode ? '#666' : '#999'}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            <View style={styles.subjectList}>
              {subjects.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[currentStyles.subjectItem, activeSubject === name && currentStyles.activeSubjectItem]}
                  onPress={() => handleSubjectPress(name)}
                >
                  <Text style={[currentStyles.subjectText, activeSubject === name && currentStyles.activeSubjectText]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.bottomDots}>
              <View style={[currentStyles.dot, currentStyles.activeDot]} />
              <View style={currentStyles.dot} />
              <View style={currentStyles.dot} />
            </View>
          </View>
        )}

        <ScrollView 
          style={[currentStyles.mainContent, !sidebarVisible && styles.mainContentExpanded]} 
          contentContainerStyle={[styles.scrollContentContainer, screenInfo.isPhone && styles.scrollContentContainerMobile]} 
          showsVerticalScrollIndicator={false}
        >
          <View style={[currentStyles.timerContainer, screenInfo.isPhone && styles.timerContainerMobile]}>
            <View style={[styles.modeIndicator, isBreak ? styles.breakMode : styles.focusMode]}>
              <View style={[styles.modeDot, isBreak ? styles.breakDot : styles.focusDot]} />
              <Text style={[styles.modeText, isBreak ? styles.breakModeText : styles.focusModeText]}>
                {isSuneungMode
                  ? isBreak
                    ? '쉬는 시간'
                    : suneungSchedule[suneungStep].name
                  : isBreak
                    ? '휴식 시간'
                    : '집중 시간'}
              </Text>
            </View>

            <View style={[styles.circularProgress, screenInfo.isPhone && styles.circularProgressMobile]}>
              <Svg 
                width={screenInfo.isPhone ? 220 : 260} 
                height={screenInfo.isPhone ? 220 : 260}
                viewBox="0 0 220 220"
              >
                <Circle
                  cx="110"
                  cy="110"
                  r="95"
                  stroke="#F1F5F9"
                  strokeWidth="6"
                  fill="none"
                />
                <Circle
                  cx="110"
                  cy="110"
                  r="95"
                  stroke={isSuneungMode ? '#BB86FC' : isBreak ? '#10B981' : '#3B82F6'}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${95 * 2 * Math.PI}`}
                  strokeDashoffset={progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [95 * 2 * Math.PI, 0],
                  })}
                  strokeLinecap="round"
                  transform="rotate(-90 110 110)"
                />
              </Svg>
              <View style={styles.timeDisplay}>
                <Text style={[currentStyles.timeText, screenInfo.isPhone && styles.timeTextMobile]}>
                  {formatTime(timeLeft)}
                </Text>
                <Text style={[currentStyles.statusText, screenInfo.isPhone && styles.statusTextMobile]}>
                  {isRunning ? (isBreak ? '휴식 중' : '집중 중') : '일시정지'}
                </Text>
              </View>
            </View>

            <View style={[styles.controls, screenInfo.isPhone && styles.controlsMobile]}>
              <TouchableOpacity onPress={resetTimer} style={[currentStyles.controlButton, screenInfo.isPhone && styles.controlButtonMobile]}>
                <Text style={[currentStyles.controlIcon, screenInfo.isPhone && styles.controlIconMobile]}>↻</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleSuneungMode}
                style={[
                  styles.suneungModeButton,
                  screenInfo.isPhone && styles.suneungModeButtonMobile,
                  isSuneungMode ? currentStyles.suneungButtonActive : currentStyles.controlButton,
                ]}
              >
                <Text style={[
                  styles.suneungModeButtonText,
                  isSuneungMode ? currentStyles.suneungButtonTextActive : currentStyles.suneungButtonText,
                ]}>
                  {isSuneungMode ? '타이머' : '수능'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleTimer}
                style={[
                  currentStyles.playButton,
                  screenInfo.isPhone && styles.playButtonMobile,
                  isSuneungMode ? styles.suneungPlayButton : isBreak ? styles.breakPlayButton : styles.focusPlayButton,
                ]}
              >
                {isRunning ? (
                  <View style={styles.pauseIcon}>
                    <View style={styles.pauseBar} />
                    <View style={styles.pauseBar} />
                  </View>
                ) : (
                  <Text style={styles.playIcon}>▶</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!isSuneungMode) {
                    switchMode();
                  }
                }}
                style={[currentStyles.controlButton, screenInfo.isPhone && styles.controlButtonMobile]}
                disabled={isSuneungMode}
              >
                <View style={[
                  styles.switchDot, 
                  isSuneungMode ? styles.suneungDot : isBreak ? styles.breakDot : styles.focusDot, 
                  isSuneungMode && { backgroundColor: '#BB86FC' }
                ]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                style={[currentStyles.settingsButton, screenInfo.isPhone && styles.controlButtonMobile]}
              >
                <Text style={[currentStyles.settingsIcon, screenInfo.isPhone && styles.controlIconMobile]}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statsContainer, screenInfo.isPhone && styles.statsContainerMobile]}>
            <View style={[currentStyles.statCard, screenInfo.isPhone && styles.statCardMobile]}>
              <View style={styles.statHeader}>
                <View style={[styles.focusDot, isSuneungMode && { backgroundColor: '#BB86FC' }]} />
                <Text style={currentStyles.statTitle}>{isSuneungMode ? '현재 과목' : '집중 시간'}</Text>
              </View>
              <Text style={currentStyles.statValue}>
                {isSuneungMode ? suneungSchedule[suneungStep]?.name || '알 수 없음' : `${focusTime}분`}
              </Text>
              <Text style={currentStyles.statDescription}>
                {isSuneungMode ? '진행 중인 수능 과목' : '현재 설정된 집중 시간'}
              </Text>
            </View>
            <View style={[currentStyles.statCard, screenInfo.isPhone && styles.statCardMobile]}>
              <View style={styles.statHeader}>
                <View style={[styles.breakDot, isSuneungMode && { backgroundColor: '#BB86FC' }]} />
                <Text style={currentStyles.statTitle}>{isSuneungMode ? '다음 과목' : '휴식 시간'}</Text>
              </View>
              <Text style={currentStyles.statValue}>
                {isSuneungMode
                  ? suneungSchedule[suneungStep + 1]?.name || '종료'
                  : `${breakTime}분`}
              </Text>
              <Text style={currentStyles.statDescription}>
                {isSuneungMode ? '다음으로 진행할 수능 과목' : '현재 설정된 휴식 시간'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal visible={showSettings} transparent={true} animationType="fade" onRequestClose={cancelSettings}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isSuneungMode && styles.suneungModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isSuneungMode && { color: 'white' }]}>타이머 설정</Text>
              <TouchableOpacity onPress={cancelSettings} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, isSuneungMode && { color: '#666' }]}>✕</Text>
              </TouchableOpacity>
            </View>
            {isSuneungMode ? (
              <View style={styles.suneungModalMessageContainer}>
                <Text style={styles.suneungModalMessage}>
                  수능모드에서는 {'\n'}시간을 조절 할 수 없습니다.
                </Text> 
              </View>
            ) : (
              <>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>집중 시간 (분)</Text>
                  <View style={styles.timeAdjuster}>
                    <TouchableOpacity onPress={() => setTempFocusTime(Math.max(1, tempFocusTime - 5))} style={styles.adjustButton}>
                      <Text style={styles.adjustButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{tempFocusTime}</Text>
                    <TouchableOpacity onPress={() => setTempFocusTime(Math.min(180, tempFocusTime + 5))} style={styles.adjustButton}>
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>휴식 시간 (분)</Text>
                  <View style={styles.timeAdjuster}>
                    <TouchableOpacity onPress={() => setTempBreakTime(Math.max(1, tempBreakTime - 1))} style={styles.adjustButton}>
                      <Text style={styles.adjustButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{tempBreakTime}</Text>
                    <TouchableOpacity onPress={() => setTempBreakTime(Math.min(60, tempBreakTime + 1))} style={styles.adjustButton}>
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity onPress={playNotificationSound} style={styles.testSoundButton}>
                  <Text style={styles.testSoundText}>🔊 소리 테스트</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={cancelSettings} style={[styles.modalButton, styles.cancelButton]}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              {!isSuneungMode && (
                <TouchableOpacity onPress={saveSettings} style={[styles.modalButton, styles.saveButton]}>
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  title: { fontSize: 26, fontWeight: '700', color: '#000' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburgerButton: { width: 24, height: 24, justifyContent: 'space-between', paddingVertical: 2 },
  hamburgerLine: { width: '100%', height: 3, backgroundColor: '#333', borderRadius: 2 },
  homeText: { fontSize: 16, fontWeight: '500', color: '#000' },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  defaultProfileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  container: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 280, paddingHorizontal: 18, paddingVertical: 20, borderRightWidth: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, marginBottom: 20, paddingHorizontal: 14, height: 40 },
  searchIconText: { fontSize: 13, color: '#999', marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14 },
  subjectList: { flex: 1, gap: 3 },
  subjectItem: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8 },
  activeSubjectItem: {},
  subjectText: { fontSize: 15, fontWeight: '400' },
  activeSubjectText: { fontWeight: '600' },
  bottomDots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeDot: {},
  mainContent: { flex: 1 },
  mainContentExpanded: { paddingLeft: 14 },
  scrollContentContainer: { 
    padding: 24, 
    gap: 24, 
    paddingBottom: 50 
  },
  timerContainer: { 
    borderRadius: 20, 
    padding: 24, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 3 
  },
  modeIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: 18, 
    marginBottom: 20, 
    alignSelf: 'center' 
  },
  focusMode: { backgroundColor: '#DBEAFE' },
  breakMode: { backgroundColor: '#D1FAE5' },
  modeDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 7 },
  focusDot: { backgroundColor: '#3B82F6' },
  breakDot: { backgroundColor: '#10B981' },
  modeText: { fontSize: 13, fontWeight: '600' },
  focusModeText: { color: '#1E40AF' },
  breakModeText: { color: '#047857' },
  circularProgress: { 
    width: 280, 
    height: 280, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, 
    position: 'relative' 
  },
  progressSvg: { position: 'absolute' },
  timeDisplay: { 
    alignItems: 'center', 
    position: 'absolute',
    justifyContent: 'center',
  },
  timeText: { fontSize: 52, fontWeight: '700', letterSpacing: -2 },
  statusText: { fontSize: 15, marginTop: 4 },
  controls: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    justifyContent: 'center',
  },
  controlButton: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  controlIcon: { fontSize: 22, fontWeight: '600' },
  playButton: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  focusPlayButton: { backgroundColor: '#3B82F6' },
  breakPlayButton: { backgroundColor: '#10B981' },
  suneungPlayButton: { backgroundColor: '#BB86FC' },
  playIcon: { fontSize: 26, color: 'white', marginLeft: 3 },
  pauseIcon: { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  pauseBar: { width: 5, height: 22, backgroundColor: 'white', borderRadius: 2 },
  switchDot: { width: 12, height: 12, borderRadius: 6 },
  suneungDot: { backgroundColor: '#BB86FC' },
  settingsButton: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsIcon: { fontSize: 22 },
  statsContainer: { 
    flexDirection: 'row', 
    gap: 14,
  },
  statCard: { 
    flex: 1, 
    borderRadius: 16, 
    padding: 18, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 2 
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statTitle: { fontSize: 14, fontWeight: '600', marginLeft: 7 },
  statValue: { fontSize: 24, fontWeight: '700', marginBottom: 3 },
  statDescription: { fontSize: 11, lineHeight: 16 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    padding: 24, 
    width: '100%', 
    maxWidth: 400 
  },
  suneungModalContent: { backgroundColor: '#2C2C2E' },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
  closeButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 18, color: '#6B7280' },
  settingItem: { marginBottom: 24 },
  settingLabel: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 12 },
  timeAdjuster: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 16 
  },
  adjustButton: { 
    width: 44, 
    height: 44, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  adjustButtonText: { fontSize: 20, fontWeight: '600', color: '#6B7280' },
  timeValue: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    minWidth: 60, 
    textAlign: 'center' 
  },
  testSoundButton: { 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16, 
    alignItems: 'center' 
  },
  testSoundText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  cancelButton: { backgroundColor: '#F3F4F6' },
  saveButton: { backgroundColor: '#3B82F6' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  suneungModeButton: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  suneungModeButtonText: { fontSize: 14, fontWeight: '600' },
  suneungButtonText: { color: '#3B82F6' },
  suneungButtonActive: { backgroundColor: '#BB86FC' },
  suneungButtonTextActive: { color: 'white' },
  suneungModalMessageContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40 
  },
  suneungModalMessage: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: 'white' 
  },
  
  // 모바일 스타일
  scrollContentContainerMobile: {
    padding: 8,
    gap: 8,
    paddingBottom: 20,
  },
  timerContainerMobile: {
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  circularProgressMobile: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    marginBottom: 8,
  },
  timeTextMobile: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
  },
  statusTextMobile: {
    fontSize: 15,
    marginTop: 6,
  },
  controlsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  playButtonMobile: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  controlButtonMobile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  controlIconMobile: {
    fontSize: 20,
    fontWeight: '600',
  },
  suneungModeButtonMobile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statsContainerMobile: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
  },
  statCardMobile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
});