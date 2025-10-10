import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import studyTimeService from './services/StudyTimeService';
import LevelUpModal from './components/LevelUpModal';

const { width: screenWidth } = Dimensions.get('window');

const StudyStatsScreen = () => {
  const navigation = useNavigation();
  const [studyStats, setStudyStats] = useState(studyTimeService.getStats());
  const [weeklyData, setWeeklyData] = useState(studyTimeService.getWeeklyStudyData());
  const [levelUpData, setLevelUpData] = useState({ oldLevel: 1, newLevel: 1 });
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  useEffect(() => {
    loadData();
    
    const handleLevelUp = (oldLevel, newLevel) => {
      setLevelUpData({ oldLevel, newLevel });
      setShowLevelUpModal(true);
      updateStats();
    };

    // 경험치 변화 리스너 등록 (그래프 업데이트용)
    const handleExpGain = () => {
      updateStats();
    };

    studyTimeService.addLevelUpListener(handleLevelUp);
    studyTimeService.addExpGainListener(handleExpGain);

    return () => {
      studyTimeService.removeListener(handleLevelUp);
      studyTimeService.removeListener(handleExpGain);
    };
  }, []);

  // 화면 포커스 시 데이터 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('통계 화면 포커스 - 데이터 새로고침');
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    await studyTimeService.loadData();
    updateStats();
  };
  const updateStats = async () => {
    console.log('📊 통계 업데이트 시작');
    
    // StudyTimeService에서 현재 상태 가져오기
    const currentStats = studyTimeService.getStats();
    console.log('📊 현재 통계:', currentStats);
    setStudyStats(currentStats);
    
    // 로컬 StudyTimeService 데이터를 기본으로 사용
    const localWeeklyData = studyTimeService.getWeeklyStudyData();
    console.log('📊 주간 데이터:', localWeeklyData);
    setWeeklyData(localWeeklyData);
    
    // 서버 동기화는 임시 비활성화 (데이터 초기화 방지)
    console.log('📊 서버 동기화 비활성화 - 로컬 데이터만 사용');
  };

  const getLevelColor = (level) => {
    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[(level - 1) % colors.length];
  };



  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>학습 통계</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 현재 레벨 카드 */}
        <View style={[styles.levelCard, { borderColor: getLevelColor(studyStats.currentLevel) }]}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(studyStats.currentLevel) }]}>
              <Text style={styles.levelNumber}>Lv.{studyStats.currentLevel}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>{studyStats.levelTitle}</Text>
              <Text style={styles.levelSubtitle}>현재 레벨</Text>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>다음 레벨까지</Text>
              <Text style={styles.progressValue}>{studyStats.expToNextLevel}분</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${studyStats.expProgress * 100}%`,
                    backgroundColor: getLevelColor(studyStats.currentLevel),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressPercent}>
              {Math.round(studyStats.expProgress * 100)}% 완료
            </Text>
          </View>
        </View>

        {/* 핵심 통계 카드들 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.floor(studyStats.totalStudyTime / 60)}</Text>
            <Text style={styles.statLabel}>총 학습시간</Text>
            <Text style={styles.statUnit}>시간</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{studyStats.currentLevel}</Text>
            <Text style={styles.statLabel}>현재 레벨</Text>
            <Text style={styles.statUnit}>Level</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{studyStats.expToNextLevel}</Text>
            <Text style={styles.statLabel}>레벨업까지</Text>
            <Text style={styles.statUnit}>분</Text>
          </View>
        </View>

        {/* 하루 학습시간 그래프 */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📊 최근 7일 학습시간</Text>
          <View style={styles.chartContainer}>
            {/* 배경 그라데이션 */}
            <View style={styles.chartBackground}>
              <View style={styles.gradientOverlay} />
            </View>
            
            {/* 배경 격자선 - 시각적 가이드 */}
            <View style={styles.gridContainer}>
              {[0, 25, 50, 75].map((percentage) => (
                <View
                  key={`grid-${percentage}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${percentage}%`,
                    height: 1,
                    backgroundColor: '#E5E7EB',
                    opacity: 0.3,
                  }}
                />
              ))}
            </View>
            
            {/* 막대 그래프 - 요일 라벨과 정확히 맞춤 */}
            <View style={styles.barsContainer}>
              {weeklyData.map((dayData, index) => {
                const maxStudyTime = Math.max(...weeklyData.map(d => d.studyTime), 60);
                const height = dayData.studyTime === 0 ? 3 : Math.max(5, (dayData.studyTime / maxStudyTime) * 85);
                
                return (
                  <View 
                    key={`bar-${index}`} 
                    style={{
                      width: 28,
                      height: `${height}%`,
                      backgroundColor: dayData.isToday ? '#3B82F6' : '#10B981',
                      borderRadius: 6,
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                      alignItems: 'center',
                    }}
                  >
                    {/* 막대 위에 값 표시 - 살짝 아래로 */}
                    <View style={{
                      position: 'absolute',
                      top: -18,
                      alignItems: 'center',
                      width: 50,
                      left: -11, // 중앙 정렬
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: dayData.isToday ? '#3B82F6' : '#10B981',
                        textAlign: 'center',
                      }}>
                        {dayData.studyTime}분
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            
            {/* 요일 라벨 */}
            <View style={styles.labelsContainer}>
              {weeklyData.map((dayData, index) => {
                return (
                  <View key={`${dayData.date}-label-${index}`} style={styles.labelWrapper}>
                    <Text 
                      style={[
                        styles.dayLabel,
                        dayData.isToday && styles.todayLabel
                      ]}
                    >
                      {dayData.dayName}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          
          <View style={styles.chartInfo}>
            <View style={styles.infoItem}>
              <View style={[styles.infoDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.infoText}>오늘</Text>
            </View>
            <View style={styles.infoItem}>
              <View style={[styles.infoDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.infoText}>이전 날짜</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      <LevelUpModal
        visible={showLevelUpModal}
        oldLevel={levelUpData.oldLevel}
        newLevel={levelUpData.newLevel}
        onClose={() => setShowLevelUpModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    fontSize: 24,
    color: '#374151',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  levelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  levelSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 28,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  chartContainer: {
    position: 'relative',
    height: 200,
    marginBottom: 24,
  },
  chartBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    borderRadius: 16,
  },
  curveContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    bottom: 60,
  },
  curveLine: {
    position: 'absolute',
    borderRadius: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  gridContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    bottom: 60,
  },
  barsContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    bottom: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  linesContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    bottom: 60,
  },
  pointsContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    bottom: 60,
  },
  point: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ translateX: -7 }],
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  pointInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  todayPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    opacity: 0.6,
  },
  labelsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  labelWrapper: {
    alignItems: 'center',
    minWidth: 30,
  },
  dayLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  todayLabel: {
    color: '#3B82F6',
    fontWeight: '800',
  },
  timeLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },
  chartInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default StudyStatsScreen;
