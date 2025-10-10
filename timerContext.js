// timerContext.js -  외부 라이브러리 없는 백그라운드 타이머
import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Alert, AppState } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import studyTimeService from './services/StudyTimeService';

const TimerContext = createContext();

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export const TimerProvider = ({ children }) => {
  // 타이머 상태
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isBreak, setIsBreak] = useState(false);
  
  // 설정값
  const [focusTime, setFocusTime] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  
  // 미니 타이머 표시 상태
  const [showMiniTimer, setShowMiniTimer] = useState(false);
  
  // 오늘의 공부시간 상태
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  
  // 백그라운드 추적을 위한 시작 시간
  const [startTime, setStartTime] = useState(null);
  const [originalTimeLeft, setOriginalTimeLeft] = useState(null);
  
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // 초기화
  useEffect(() => {
    const initialize = async () => {
      await configureAudio();
      await restoreTimerState();
      await loadTodayStudyTime();
    };

    initialize();

    // AppState 변화 감지
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // 앱이 포그라운드로 돌아옴
        restoreFromBackground();
      } else if (nextAppState.match(/inactive|background/)) {
        // 앱이 백그라운드로 감
        saveToBackground();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 로컬 자정 감지하여 오늘 공부시간 즉시 갱신
  useEffect(() => {
    const getLocalDateStr = (d = new Date()) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let lastDate = getLocalDateStr();
    console.log(`🕐 자정 감지 시작 - 초기 날짜: ${lastDate}`);
    
    const tick = async () => {
      const nowDate = getLocalDateStr();
      console.log(`🕐 자정 체크 - 이전: ${lastDate}, 현재: ${nowDate}`);
      
      if (nowDate !== lastDate) {
        console.log(`🌅 날짜 변경 감지! ${lastDate} → ${nowDate}`);
        lastDate = nowDate;
        // UI 즉시 리셋을 위해 0으로 초기 표시 후, 서비스/서버 동기화로 보정
        console.log(`📊 오늘 공부시간 0으로 리셋`);
        setTodayStudyTime(0);
        try {
          console.log(`🔄 새로운 날짜의 공부시간 로드 시작`);
          await loadTodayStudyTime();
        } catch (e) {
          console.error(`❌ 새 날짜 공부시간 로드 실패:`, e);
          // 실패해도 다음 interval에서 재시도
        }
      }
    };

    const id = setInterval(tick, 30000); // 30초마다 체크
    
    // 즉시 한 번 실행해서 현재 상태 확인
    tick();
    
    return () => clearInterval(id);
  }, []);

  // 오디오 설정
  const configureAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
    } catch (error) {
      console.log('오디오 모드 설정 실패:', error);
    }
  };

  // 백그라운드로 갈 때 상태 저장
  const saveToBackground = async () => {
    if (isRunning && startTime) {
      // 백그라운드로 갈 때 현재까지의 공부 시간 저장 (집중 시간만)
      if (!isBreak) {
        const actualElapsed = Math.floor((Date.now() - startTime) / 1000);
        const studyMinutes = Math.floor(actualElapsed / 60);
        
        if (studyMinutes > 0) {
          console.log(`백그라운드 전환! 현재까지 공부한 시간: ${studyMinutes}분 (${actualElapsed}초)`);
          await saveStudyTime(studyMinutes);
        }
      }
      
      const timerState = {
        isRunning: true,
        startTime,
        originalTimeLeft,
        isBreak,
        focusTime,
        breakTime,
        backgroundTime: Date.now(),
      };
      
      try {
        await AsyncStorage.setItem('timerState', JSON.stringify(timerState));
        console.log('백그라운드 상태 저장됨');
      } catch (error) {
        console.error('백그라운드 상태 저장 실패:', error);
      }
    }
  };

  // 포그라운드로 돌아올 때 상태 복원 (현재 세션에서 실행 중인 타이머만)
  const restoreFromBackground = async () => {
    try {
      // 현재 세션에서 타이머가 실행 중이었을 때만 복원
      if (isRunning && startTime) {
        const savedState = await AsyncStorage.getItem('timerState');
        if (savedState) {
          const timerState = JSON.parse(savedState);
          
          if (timerState.isRunning && timerState.startTime) {
            // 실제 경과 시간 계산
            const actualElapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
            const newTimeLeft = Math.max(0, timerState.originalTimeLeft - actualElapsed);
            
            console.log(`백그라운드 복원: ${actualElapsed}초 경과, 남은 시간: ${newTimeLeft}초`);
            
            if (newTimeLeft > 0) {
              setTimeLeft(newTimeLeft);
              setIsBreak(timerState.isBreak);
              setIsRunning(true);
              setStartTime(timerState.startTime);
              setOriginalTimeLeft(timerState.originalTimeLeft);
              setShowMiniTimer(true);
            } else {
              // 백그라운드에서 타이머가 완료됨
              await handleTimerComplete(timerState.isBreak);
            }
          }
        }
      }
    } catch (error) {
      console.error('타이머 상태 복원 실패:', error);
    }
  };

  // 앱 시작 시 저장된 상태 복원 (실행 중인 타이머도 복원)
  const restoreTimerState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('timerState');
      if (savedState) {
        const timerState = JSON.parse(savedState);
        
        // 설정값 복원
        setFocusTime(timerState.focusTime || 25);
        setBreakTime(timerState.breakTime || 5);
        
        // 타이머가 실행 중이었다면 백그라운드 시간 계산해서 복원
        if (timerState.isRunning && timerState.startTime && timerState.originalTimeLeft) {
          const actualElapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
          const newTimeLeft = Math.max(0, timerState.originalTimeLeft - actualElapsed);
          
          console.log(`앱 재시작 - 백그라운드에서 ${actualElapsed}초 경과, 남은 시간: ${newTimeLeft}초`);
          
          if (newTimeLeft > 0) {
            // 타이머가 아직 남아있음 - 계속 실행
            setIsRunning(true);
            setTimeLeft(newTimeLeft);
            setIsBreak(timerState.isBreak);
            setStartTime(timerState.startTime);
            setOriginalTimeLeft(timerState.originalTimeLeft);
            setShowMiniTimer(true);
            console.log('타이머 실행 상태 복원됨');
          } else {
            // 백그라운드에서 타이머가 완료됨
            console.log('백그라운드에서 타이머 완료됨');
            await handleTimerComplete(timerState.isBreak);
          }
        } else {
          // 타이머가 실행 중이 아니었음 - 기본 상태로 설정
          setIsRunning(false);
          setTimeLeft((timerState.focusTime || 25) * 60);
          setIsBreak(timerState.isBreak || false);
          setShowMiniTimer(false);
          setStartTime(null);
          setOriginalTimeLeft(null);
          console.log('타이머 정지 상태로 복원됨');
        }
      } else {
        // 저장된 상태가 없으면 기본값으로 초기화
        setIsRunning(false);
        setTimeLeft(25 * 60);
        setIsBreak(false);
        setShowMiniTimer(false);
        setStartTime(null);
        setOriginalTimeLeft(null);
        console.log('타이머 기본값으로 초기화됨');
      }
    } catch (error) {
      console.error('타이머 상태 복원 실패:', error);
    }
  };

  // 오늘의 공부시간 불러오기
  const loadTodayStudyTime = async () => {
    try {
      console.log('📊 공부시간 로드 시작 (로컬 데이터만 사용)...');
      
      // 로컬 타임존 기준 오늘 날짜 계산
      const getLocalDateStr = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      
      const today = getLocalDateStr();
      console.log(`📅 로컬 기준 오늘 날짜: ${today}`);
      
      // StudyTimeService에서 오늘 날짜의 학습시간 가져오기
      const weeklyData = studyTimeService.getWeeklyStudyData();
      const todayData = weeklyData.find(day => day.isToday);
      const studyTimeFromService = todayData ? todayData.studyTime : 0;
      
      console.log('📊 StudyTimeService 오늘 공부시간:', studyTimeFromService);
      console.log('📊 주간 데이터:', weeklyData);
      
      // 🔥 서버에서 오늘의 공부시간 확인 (dailyStudy 사용)
      try {
        const currentUser = await userDataService.getCurrentUser();
        if (currentUser) {
          // getWeeklyStudyTime()이 이제 dailyStudy도 포함해서 반환
          const serverData = await userDataService.getWeeklyStudyTime();
          console.log(`📊 서버 데이터:`, serverData);
          
          // 서버의 dailyStudy.date와 로컬 날짜가 일치하는지 확인
          if (serverData?.dailyStudy && serverData.dailyStudy.date === today) {
            const serverDailyMinutes = serverData.dailyStudy.totalMinutes || 0;
            
            // 로컬과 서버 중 더 큰 값 사용
            const finalMinutes = Math.max(serverDailyMinutes, studyTimeFromService);
            setTodayStudyTime(finalMinutes);
            
            console.log(`📊 🔥 오늘 공부시간 동기화: 서버=${serverDailyMinutes}분, 로컬=${studyTimeFromService}분, 최종=${finalMinutes}분`);
          } else {
            // 서버 날짜와 로컬 날짜가 다르면 로컬 데이터만 사용
            setTodayStudyTime(studyTimeFromService);
            console.log(`📊 ⚠️ 서버 날짜 불일치 - 서버: ${serverData?.dailyStudy?.date}, 로컬: ${today}, 로컬 데이터만 사용: ${studyTimeFromService}분`);
          }
        } else {
          setTodayStudyTime(studyTimeFromService);
          console.log('📊 로그인되지 않음 - 로컬 데이터만 사용');
        }
      } catch (error) {
        console.log('❌ 서버 동기화 실패, 로컬 데이터 사용:', error.message);
        setTodayStudyTime(studyTimeFromService);
      }
      
      console.log(`📊 오늘의 공부시간 로드 완료: ${studyTimeFromService}분`);
    } catch (error) {
      console.error('공부시간 로드 실패:', error);
      
      // 오류 발생 시 0으로 설정
      setTodayStudyTime(0);
      console.log('오류 발생으로 공부시간을 0으로 설정');
    }
  };

  // 공부 시간 저장 (로컬 + 서버)
  const saveStudyTime = async (minutes) => {
    try {
      console.log(`💾 공부 시간 저장 시도: ${minutes}분 (로컬 + 서버)`);
      
      // StudyTimeService에 공부시간 추가 (레벨업 시스템 + 로컬 저장 + 서버 저장)
      await studyTimeService.addStudyTime(minutes);
      
      // 로컬 상태 업데이트
      setTodayStudyTime(prev => {
        const newTotal = prev + minutes;
        console.log(`📊 로컬 공부시간 업데이트: ${prev}분 → ${newTotal}분`);
        return newTotal;
      });
    } catch (error) {
      console.error('공부 시간 저장 실패:', error);
      console.error('오류 상세:', error.message);
      // 저장 실패해도 사용자에게는 알리지 않음 (UX 고려)
    }
  };

  // 타이머 완료 처리
  const handleTimerComplete = async (wasBreak) => {
    setIsRunning(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 집중 시간이 끝났을 때만 DB에 저장 (휴식 시간은 저장하지 않음)
    if (!wasBreak) {
      console.log(`타이머 완료! 저장할 공부 시간: ${focusTime}분, 휴식시간: ${wasBreak}`);
      await saveStudyTime(focusTime);
    }

    // 시작 시간 초기화
    setStartTime(null);
    setOriginalTimeLeft(null);

    // 알림음 재생 (Alert 전에 먼저 재생)
    const sound = await playNotificationSound();
    
    // 완료 알림 표시 (알람음 끄기 버튼 포함)
    Alert.alert(
      '⏰ 타이머 완료!',
      wasBreak ? '휴식시간이 끝났습니다!\n다시 집중할 시간입니다.' : '집중시간이 끝났습니다!\n잠깐 휴식을 취하세요.',
      [
        { 
          text: '🔇 알람 끄기', 
          style: 'destructive',
          onPress: () => {
            if (sound) {
              sound.stopAsync();
              sound.unloadAsync();
            }
          }
        },
        { 
          text: '확인', 
          style: 'default',
          onPress: () => {
            if (sound) {
              sound.stopAsync();
              sound.unloadAsync();
            }
          }
        }
      ],
      { cancelable: false }
    );
    
    // 다음 모드로 자동 전환
    const nextIsBreak = !wasBreak;
    const nextTime = nextIsBreak ? breakTime : focusTime;
    
    setIsBreak(nextIsBreak);
    setTimeLeft(nextTime * 60);

    // 상태 저장
    await saveCurrentState();
  };

  // 현재 상태 저장
  const saveCurrentState = async () => {
    const timerState = {
      isRunning,
      timeLeft,
      isBreak,
      focusTime,
      breakTime,
      startTime,
      originalTimeLeft,
      lastSaved: Date.now(),
    };
    
    try {
      await AsyncStorage.setItem('timerState', JSON.stringify(timerState));
    } catch (error) {
      console.error('타이머 상태 저장 실패:', error);
    }
  };

  // 알림음 재생 함수
  const playNotificationSound = async () => {
    try {
      console.log('알람음 재생 시작...');
      // 커스텀 알람음 사용
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/sounds/song.wav'),
        { 
          shouldPlay: true, 
          volume: 0.8,
          isLooping: true // 반복 재생으로 설정
        }
      );
      
      console.log('알람음 로드 완료, 재생 중...');
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish && !status.isLooping) {
          sound.unloadAsync();
        }
      });
      
      return sound; // sound 객체 반환
    } catch (error) {
      console.log('오디오 재생 실패:', error);
      return null;
    }
  };

  // 타이머 시작/정지
  const toggleTimer = async () => {
    const newIsRunning = !isRunning;
    
    if (!newIsRunning && isRunning && startTime && !isBreak) {
      // 타이머를 정지할 때 - 집중 시간만 저장
      const actualElapsed = Math.floor((Date.now() - startTime) / 1000);
      const studyMinutes = Math.floor(actualElapsed / 60);
      
      if (studyMinutes > 0) {
        console.log(`타이머 정지! 실제 공부한 시간: ${studyMinutes}분 (${actualElapsed}초)`);
        await saveStudyTime(studyMinutes);
      }
    }
    
    setIsRunning(newIsRunning);
    
    if (newIsRunning) {
      // 타이머 시작 - 현재 시간과 남은 시간 기록
      const now = Date.now();
      setStartTime(now);
      setOriginalTimeLeft(timeLeft);
      setShowMiniTimer(true);
      console.log('타이머 시작:', formatTime(timeLeft));
    } else {
      // 타이머 정지 - 미니타이머 숨기기
      setShowMiniTimer(false);
      setStartTime(null);
      setOriginalTimeLeft(null);
      console.log('타이머 정지');
    }
    
    await saveCurrentState();
  };

  // 타이머 리셋
  const resetTimer = async () => {
    // 리셋할 때도 실행 중이었다면 공부 시간 저장
    if (isRunning && startTime && !isBreak) {
      const actualElapsed = Math.floor((Date.now() - startTime) / 1000);
      const studyMinutes = Math.floor(actualElapsed / 60);
      
      if (studyMinutes > 0) {
        console.log(`타이머 리셋! 실제 공부한 시간: ${studyMinutes}분 (${actualElapsed}초)`);
        await saveStudyTime(studyMinutes);
      }
    }
    
    setIsRunning(false);
    setTimeLeft(isBreak ? breakTime * 60 : focusTime * 60);
    setShowMiniTimer(false);
    setStartTime(null);
    setOriginalTimeLeft(null);
    
    await saveCurrentState();
    console.log('타이머 리셋');
  };

  // 모드 전환
  const switchMode = async () => {
    const newIsBreak = !isBreak;
    setIsBreak(newIsBreak);
    setTimeLeft(newIsBreak ? breakTime * 60 : focusTime * 60);
    setIsRunning(false);
    setStartTime(null);
    setOriginalTimeLeft(null);
    
    await saveCurrentState();
  };

  // 설정 업데이트
  const updateSettings = async (newFocusTime, newBreakTime) => {
    setFocusTime(newFocusTime);
    setBreakTime(newBreakTime);
    
    if (!isRunning) {
      setTimeLeft(isBreak ? newBreakTime * 60 : newFocusTime * 60);
    }
    
    await saveCurrentState();
  };

  // 시간 포맷
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 타이머 실행 효과
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            handleTimerComplete(isBreak);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // 상태 변경 시 자동 저장
  useEffect(() => {
    if (startTime) { // 타이머가 실행 중일 때만 저장
      saveCurrentState();
    }
  }, [timeLeft, isRunning, isBreak]);

  // 디버깅용: 강제로 자정 리셋 테스트
  const forceResetTodayStudyTime = async () => {
    console.log(`🔧 [DEBUG] 강제 자정 리셋 테스트 시작`);
    setTodayStudyTime(0);
    try {
      await loadTodayStudyTime();
      console.log(`🔧 [DEBUG] 강제 리셋 완료`);
    } catch (e) {
      console.error(`🔧 [DEBUG] 강제 리셋 실패:`, e);
    }
  };

  const value = {
    isRunning,
    timeLeft,
    isBreak,
    focusTime,
    breakTime,
    showMiniTimer,
    setShowMiniTimer,
    setIsRunning,
    setIsBreak,
    setTimeLeft,
    toggleTimer,
    resetTimer,
    switchMode,
    updateSettings,
    formatTime,
    playNotificationSound,
    todayStudyTime,
    loadTodayStudyTime,
    forceResetTodayStudyTime // 디버깅용
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};

export default TimerContext;