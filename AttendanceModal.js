import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const AttendanceModal = ({ visible, onClose, userId }) => {
  const [attendanceData, setAttendanceData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    lastCheckIn: null,
    checkInDates: [],
  });
  const [todayChecked, setTodayChecked] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      loadAttendanceData();
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  // 자정 체크 - 날짜가 바뀌면 오늘 출석 여부만 초기화 (모달은 표시 안 함)
  useEffect(() => {
    const checkMidnight = setInterval(async () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // 자정(00:00)이면 오늘 출석 여부 초기화
      if (hours === 0 && minutes === 0) {
        setTodayChecked(false);
        // 모달 표시 기록 삭제 (다음 앱 실행 시 표시되도록)
        if (userId) {
          await AsyncStorage.removeItem(`attendance_last_shown_${userId}`);
        }
      }
    }, 60000); // 1분마다 체크

    return () => clearInterval(checkMidnight);
  }, [userId]);

  const loadAttendanceData = async () => {
    try {
      console.log('📋 출석 데이터 로드 시작, userId:', userId);
      
      // 먼저 로컬 데이터 로드
      const localData = await AsyncStorage.getItem(`attendance_${userId}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        setAttendanceData(parsed);
        const today = new Date().toDateString();
        const lastCheck = parsed.lastCheckIn ? new Date(parsed.lastCheckIn).toDateString() : null;
        setTodayChecked(today === lastCheck);
        console.log('💾 로컬 데이터 로드 성공:', parsed);
      }
      
      // 서버에서 출석 데이터 가져오기
      const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';
      console.log('🌐 API 요청:', `${API_URL}/api/attendance/${userId}`);
      
      const response = await fetch(`${API_URL}/api/attendance/${userId}`);
      console.log('📡 서버 응답 상태:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 서버 데이터:', result);
        
        if (result.success && result.data) {
          setAttendanceData(result.data);
          
          // 로컬에도 저장
          await AsyncStorage.setItem(`attendance_${userId}`, JSON.stringify(result.data));
          
          const today = new Date().toDateString();
          const lastCheck = result.data.lastCheckIn ? new Date(result.data.lastCheckIn).toDateString() : null;
          setTodayChecked(today === lastCheck);
        }
      } else {
        console.error('❌ 서버 응답 오류:', response.status);
      }
    } catch (error) {
      console.error('❌ 출석 데이터 로드 실패:', error);
      console.error('에러 상세:', error.message);
    }
  };

  const handleCheckIn = async () => {
    try {
      console.log('👆 출석체크 시도, userId:', userId);
      
      // 오늘 이미 체크했는지 확인
      if (todayChecked) {
        alert('오늘은 이미 출석체크를 완료했습니다!');
        return;
      }

      // 서버에 출석 체크 요청
      const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';
      console.log('🌐 출석체크 API 요청:', `${API_URL}/api/attendance/check-in`);
      console.log('📦 요청 데이터:', { userId });
      
      const response = await fetch(`${API_URL}/api/attendance/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      console.log('📡 서버 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 서버 오류 응답:', errorText);
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ 출석체크 결과:', result);
      
      if (result.success) {
        // 서버에서 받은 데이터로 UI 업데이트
        setAttendanceData(result.data);
        setTodayChecked(true);
        
        // 로컬에도 저장
        await AsyncStorage.setItem(`attendance_${userId}`, JSON.stringify(result.data));
        console.log('💾 로컬 저장 완료');

        // 축하 애니메이션
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        
        alert('🎉 출석체크 성공!');
      } else {
        console.error('❌ 출석체크 실패:', result.message);
        alert(result.message || '출석체크에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ 출석체크 실패:', error);
      console.error('에러 상세:', error.message);
      alert(`서버 연결에 실패했습니다.\n${error.message}`);
    }
  };

  const getWeekCalendar = () => {
    const today = new Date();
    const week = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toDateString();
      const isChecked = attendanceData.checkInDates?.some(
        checkDate => new Date(checkDate).toDateString() === dateString
      );
      
      week.push({
        date,
        day: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
        isChecked,
        isToday: dateString === today.toDateString(),
      });
    }
    
    return week;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            isTablet && styles.modalContainerTablet,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={[styles.title, isTablet && styles.titleTablet]}>
                오늘의 출석체크
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* 연속 출석 표시 */}
            <View style={[styles.streakContainer, isTablet && styles.streakContainerTablet]}>
              <View style={styles.streakBox}>
                <Text style={[styles.streakNumber, isTablet && styles.streakNumberTablet]}>
                  {attendanceData.currentStreak}
                </Text>
                <Text style={[styles.streakLabel, isTablet && styles.streakLabelTablet]}>
                  연속 출석
                </Text>
              </View>
              
              <View style={styles.streakBox}>
                <Text style={[styles.streakNumber, isTablet && styles.streakNumberTablet]}>
                  {attendanceData.longestStreak}
                </Text>
                <Text style={[styles.streakLabel, isTablet && styles.streakLabelTablet]}>
                  최장 기록
                </Text>
              </View>
              
              <View style={styles.streakBox}>
                <Text style={[styles.streakNumber, isTablet && styles.streakNumberTablet]}>
                  {attendanceData.totalDays}
                </Text>
                <Text style={[styles.streakLabel, isTablet && styles.streakLabelTablet]}>
                  총 출석일
                </Text>
              </View>
            </View>

            {/* 연속 출석 메시지 */}
            {attendanceData.currentStreak > 0 && (
              <View style={styles.messageContainer}>
                <Text style={[styles.messageText, isTablet && styles.messageTextTablet]}>
                  {attendanceData.currentStreak}일 연속 공부 중
                </Text>
                {attendanceData.currentStreak >= 7 && (
                  <Text style={[styles.subMessage, isTablet && styles.subMessageTablet]}>
                    훌륭합니다! 계속 이어가세요
                  </Text>
                )}
              </View>
            )}

            {/* 주간 캘린더 */}
            <View style={styles.calendarContainer}>
              <Text style={[styles.calendarTitle, isTablet && styles.calendarTitleTablet]}>
                최근 7일
              </Text>
              <View style={styles.weekContainer}>
                {getWeekCalendar().map((day, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.dayBox,
                      isTablet && styles.dayBoxTablet,
                      day.isToday && styles.dayBoxToday,
                    ]}
                  >
                    <Text style={[
                      styles.dayText,
                      isTablet && styles.dayTextTablet,
                      day.isToday && styles.dayTextToday,
                    ]}>
                      {day.day}
                    </Text>
                    <View style={[
                      styles.checkMark,
                      isTablet && styles.checkMarkTablet,
                      day.isChecked && styles.checkMarkActive,
                    ]}>
                      {day.isChecked && (
                        <View style={styles.checkMarkDot} />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 출석 버튼 */}
            <TouchableOpacity
              style={[
                styles.checkInButton,
                isTablet && styles.checkInButtonTablet,
                todayChecked && styles.checkInButtonDisabled,
              ]}
              onPress={handleCheckIn}
              disabled={todayChecked}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.checkInButtonText, 
                isTablet && styles.checkInButtonTextTablet,
                todayChecked && styles.checkInButtonTextDisabled
              ]}>
                {todayChecked ? '오늘 출석 완료' : '출석 체크하기'}
              </Text>
            </TouchableOpacity>

            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={[styles.confirmButton, isTablet && styles.confirmButtonTablet]}
              onPress={onClose}
            >
              <Text style={[styles.confirmButtonText, isTablet && styles.confirmButtonTextTablet]}>
                확인
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: height * 0.85,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalContainerTablet: {
    maxWidth: 560,
    maxHeight: height * 0.8,
  },
  scrollContent: {
    padding: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  titleTablet: {
    fontSize: 28,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
    fontWeight: '300',
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 12,
  },
  streakContainerTablet: {
    gap: 16,
  },
  streakBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  streakNumberTablet: {
    fontSize: 36,
  },
  streakLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  streakLabelTablet: {
    fontSize: 14,
  },
  messageContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  messageTextTablet: {
    fontSize: 18,
  },
  subMessage: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    fontWeight: '400',
  },
  subMessageTablet: {
    fontSize: 16,
  },
  calendarContainer: {
    marginBottom: 28,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  calendarTitleTablet: {
    fontSize: 16,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayBox: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  dayBoxTablet: {
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  dayBoxToday: {
    backgroundColor: '#F8F8F8',
  },
  dayText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 10,
    fontWeight: '500',
  },
  dayTextTablet: {
    fontSize: 13,
  },
  dayTextToday: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  checkMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkMarkTablet: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  checkMarkActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  checkMarkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  checkInButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInButtonTablet: {
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  checkInButtonDisabled: {
    backgroundColor: '#E8E8E8',
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  checkInButtonTextTablet: {
    fontSize: 17,
  },
  checkInButtonTextDisabled: {
    color: '#999',
  },
  confirmButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  confirmButtonTablet: {
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  confirmButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  confirmButtonTextTablet: {
    fontSize: 17,
  },
});

export default AttendanceModal;
