import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AttendanceModal from './AttendanceModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 사용 예시 컴포넌트
const AttendanceExample = ({ userId }) => {
  const [showAttendance, setShowAttendance] = useState(false);

  useEffect(() => {
    // 앱 시작 시 출석 모달 표시 여부 확인
    checkShouldShowAttendance();
  }, []);

  const checkShouldShowAttendance = async () => {
    try {
      const lastShown = await AsyncStorage.getItem('attendance_last_shown');
      const today = new Date().toDateString();
      
      // 오늘 아직 모달을 보여주지 않았으면 표시
      if (lastShown !== today) {
        setShowAttendance(true);
        await AsyncStorage.setItem('attendance_last_shown', today);
      }
    } catch (error) {
      console.error('출석 모달 표시 확인 실패:', error);
    }
  };

  const handleClose = () => {
    setShowAttendance(false);
  };

  return (
    <View style={styles.container}>
      <AttendanceModal
        visible={showAttendance}
        onClose={handleClose}
        userId={userId}
      />
      
      {/* 여기에 나머지 앱 컨텐츠 */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AttendanceExample;
