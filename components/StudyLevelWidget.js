import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import studyTimeService from '../services/StudyTimeService';
import { useTimer } from '../timerContext';

const { width: screenWidth } = Dimensions.get('window');

const StudyLevelWidget = ({ onPress }) => {
  const [studyStatus, setStudyStatus] = useState(studyTimeService.getStatus());
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const progressAnim = new Animated.Value(studyStatus.expProgress);

  useEffect(() => {
    // 초기 데이터 로드
    loadStudyData();

    // 경험치 변화 리스너
    const handleExpGain = () => {
      updateStatus();
    };

    studyTimeService.addExpGainListener(handleExpGain);

    return () => {
      studyTimeService.removeListener(handleExpGain);
    };
  }, []);

  // 사용자가 변경될 때마다 데이터 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      // 5초마다 데이터 새로고침 (사용자 변경 감지용)
      loadStudyData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadStudyData = async () => {
    await studyTimeService.loadData();
    updateStatus();
    await loadTodayStudyTime();
  };

  // DB에서 오늘의 공부시간 직접 로드
  const loadTodayStudyTime = async () => {
    try {
      const { default: userDataService } = await import('../userDataService');
      const currentUser = await userDataService.getCurrentUser();
      
      if (currentUser) {
        // getWeeklyStudyTime()이 dailyStudy도 포함해서 반환
        const serverData = await userDataService.getWeeklyStudyTime();
        const serverDailyMinutes = serverData?.dailyStudy?.totalMinutes || 0;
        
        // StudyTimeService의 로컬 데이터도 확인
        const today = new Date().toISOString().split('T')[0];
        const weeklyData = studyTimeService.getWeeklyStudyData();
        const todayData = weeklyData.find(day => day.isToday);
        const localMinutes = todayData ? todayData.studyTime : 0;
        
        // 더 큰 값 사용
        const finalMinutes = Math.max(serverDailyMinutes, localMinutes);
        setTodayStudyTime(finalMinutes);
        
        console.log(`🔥 StudyLevelWidget 오늘 공부시간: 서버=${serverDailyMinutes}분, 로컬=${localMinutes}분, 최종=${finalMinutes}분`);
      } else {
        // 로그인되지 않은 경우 로컬 데이터만 사용
        const today = new Date().toISOString().split('T')[0];
        const weeklyData = studyTimeService.getWeeklyStudyData();
        const todayData = weeklyData.find(day => day.isToday);
        const localMinutes = todayData ? todayData.studyTime : 0;
        setTodayStudyTime(localMinutes);
      }
    } catch (error) {
      console.error('오늘 공부시간 로드 실패:', error);
      // 오류 시 로컬 데이터 사용
      const today = new Date().toISOString().split('T')[0];
      const weeklyData = studyTimeService.getWeeklyStudyData();
      const todayData = weeklyData.find(day => day.isToday);
      const localMinutes = todayData ? todayData.studyTime : 0;
      setTodayStudyTime(localMinutes);
    }
  };

  const updateStatus = () => {
    const newStatus = studyTimeService.getStatus();
    setStudyStatus(newStatus);
    
    // 오늘 공부시간도 함께 업데이트
    loadTodayStudyTime();
    
    // 경험치 바 애니메이션
    Animated.timing(progressAnim, {
      toValue: newStatus.expProgress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const getLevelColor = (level) => {
    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[(level - 1) % colors.length];
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.levelInfo}>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(studyStatus.currentLevel) }]}>
            <Text style={styles.levelNumber}>Lv.{studyStatus.currentLevel}</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.levelTitle}>
              {studyTimeService.getLevelTitle(studyStatus.currentLevel)}
            </Text>
            <Text style={styles.studyTime}>
              총 학습시간: {formatTime(studyStatus.totalStudyTime)} | 오늘: {formatTime(todayStudyTime)}
            </Text>
          </View>
        </View>
        
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.expText}>
            EXP {studyStatus.currentExp - (studyStatus.currentLevel > 1 ? studyTimeService.getExpRequiredForLevel(studyStatus.currentLevel - 1) : 0)} / {studyStatus.maxExpForCurrentLevel - (studyStatus.currentLevel > 1 ? studyTimeService.getExpRequiredForLevel(studyStatus.currentLevel - 1) : 0)}
          </Text>
          <Text style={styles.nextLevelText}>
            다음 레벨까지 {studyStatus.expToNextLevel}분
          </Text>
        </View>
        
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: getLevelColor(studyStatus.currentLevel),
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  levelNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  titleContainer: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  studyTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  nextLevelText: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default StudyLevelWidget;
