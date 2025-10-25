import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import userDataService from './userDataService';
import studyTimeService from './services/StudyTimeService';

const API_URL = 'http://192.168.45.53:5000';

export default function StudyGroupDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId, groupName } = route.params;
  const responsiveUtil = useResponsive();
  
  const [groupDetail, setGroupDetail] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeUpdate, setRealTimeUpdate] = useState(null);

  useEffect(() => {
    const initializeData = async () => {
      // StudyTimeService 초기화
      await studyTimeService.loadData();
      console.log('📊 StudyTimeService 초기화 완료');
      
      loadGroupDetail();
      loadCurrentUser();
    };
    
    initializeData();
    
    // 실시간 업데이트 (30초마다 데이터 새로고침)
    const dataInterval = setInterval(() => {
      loadGroupDetail();
    }, 30000);
    
    // UI 업데이트 (1초마다 - 타이머 실행 중일 때만)
    const uiInterval = setInterval(() => {
      if (currentUser?.isStudying) {
        setRealTimeUpdate(Date.now()); // 강제 리렌더링
      }
    }, 1000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(uiInterval);
    };
  }, [currentUser?.isStudying]);

  // 스터디그룹용 자정 감지 - 멤버들 공부시간 초기화
  useEffect(() => {
    const getLocalDateStr = (d = new Date()) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let lastDate = getLocalDateStr();
    console.log(`🕐 스터디그룹 자정 감지 시작 - 초기 날짜: ${lastDate}`);
    
    const tick = async () => {
      const nowDate = getLocalDateStr();
      console.log(`🕐 스터디그룹 자정 체크 - 이전: ${lastDate}, 현재: ${nowDate}`);
      
      if (nowDate !== lastDate) {
        console.log(`🌅 스터디그룹 날짜 변경 감지! ${lastDate} → ${nowDate}`);
        lastDate = nowDate;
        
        // 멤버들 공부시간 새로고침
        console.log(`📊 스터디그룹 멤버 공부시간 새로고침`);
        try {
          await loadGroupDetail();
          console.log(`🔄 스터디그룹 데이터 새로고침 완료`);
        } catch (e) {
          console.error(`❌ 스터디그룹 데이터 새로고침 실패:`, e);
        }
      }
    };

    const id = setInterval(tick, 30000); // 30초마다 체크
    
    // 즉시 한 번 실행해서 현재 상태 확인
    tick();
    
    return () => clearInterval(id);
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  const loadGroupDetail = async () => {
    try {
      setLoading(true);
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      const response = await fetch(`${API_URL}/api/study-groups/${groupId}/detail`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        setGroupDetail(data.group);
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('그룹 상세 정보 로드 오류:', error);
      Alert.alert('오류', '그룹 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGroupDetail();
    setRefreshing(false);
  };

  const handleShareInvite = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      const response = await fetch(`${API_URL}/api/study-groups/${groupId}/invite-link`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        const { webLink, groupName } = data.inviteLink;
        
        // Share API를 사용하여 카카오톡 등으로 공유
        await Share.share({
          message: `[스터디그룹 초대]\n\n${groupName}에 초대합니다!\n\n아래 링크를 클릭하여 참여하세요:\n${webLink}`,
          title: '스터디그룹 초대',
        });
      } else {
        Alert.alert('오류', data.error || '초대 링크 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('초대 링크 공유 오류:', error);
      if (error.message !== 'User did not share') {
        Alert.alert('오류', '초대 링크 공유에 실패했습니다.');
      }
    }
  };

  const formatStudyTime = (minutes) => {
    if (!minutes) return '0분';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
    return `${mins}분`;
  };

  const getTodayStudyTime = (member) => {
    // 로컬 타임존 기준 오늘 날짜 계산
    const getLocalDateStr = () => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    const today = getLocalDateStr();
    console.log(`📅 스터디그룹 - 로컬 기준 오늘 날짜: ${today}`);
    
    // 현재 사용자인 경우 DB 데이터 우선 사용
    if (member.email === currentUser?.email) {
      console.log('📊 현재 사용자 공부시간 - DB 데이터 우선 사용');
      
      // 1. 서버 DB 데이터 (dailyStudy.totalMinutes)
      let serverTime = member.dailyStudy?.date === today ? member.dailyStudy.totalMinutes || 0 : 0;
      
      // 2. StudyTimeService 로컬 데이터
      const weeklyData = studyTimeService.getWeeklyStudyData();
      const todayData = weeklyData.find(day => day.isToday);
      let localTime = todayData ? todayData.studyTime : 0;
      
      // 3. 더 큰 값 사용 (DB와 로컬 중)
      let baseTime = Math.max(serverTime, localTime);
      
      console.log(`📊 현재 사용자: 서버=${serverTime}분, 로컬=${localTime}분, 최종=${baseTime}분`);
      
      // 4. 타이머가 실행 중이면 실시간 시간 추가
      if (currentUser?.isStudying) {
        const studyStartTime = new Date(currentUser.studyStartTime);
        const currentTime = new Date();
        const additionalMinutes = Math.floor((currentTime - studyStartTime) / (1000 * 60));
        baseTime += additionalMinutes;
        console.log('📊 실시간 추가 시간:', additionalMinutes, '분');
      }
      
      return baseTime;
    }
    
    // 다른 사용자인 경우 서버 데이터 사용
    let baseTime = member.dailyStudy?.date === today ? member.dailyStudy.totalMinutes || 0 : 0;
    console.log('📊 다른 사용자 공부시간 (서버):', member.name, baseTime);
    
    return baseTime;
  };

  const getWeeklyStudyTime = (member) => {
    // 주간 공부시간 계산 (임시로 오늘 시간 * 7로 표시)
    return getTodayStudyTime(member) * 7;
  };

  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles),
    [responsiveUtil]
  );

  const renderMemberCard = (member, isCurrentUser = false) => (
    <View key={member._id} style={[styles.memberCard, isCurrentUser && styles.currentUserCard]}>
      {/* 멤버 정보 */}
      <View style={styles.memberHeader}>
        <View style={[styles.memberAvatar, isCurrentUser && styles.currentUserAvatar]}>
          <Text style={[styles.memberAvatarText, isCurrentUser && styles.currentUserAvatarText]}>
            {member.name?.charAt(0) || '?'}
          </Text>
        </View>
        
        <View style={styles.memberNameContainer}>
          <Text style={[styles.memberName, isCurrentUser && styles.currentUserName]} numberOfLines={1}>
            {member.name}
          </Text>
          <View style={styles.badgeContainer}>
            {isCurrentUser && (
              <View style={styles.currentUserBadge}>
                <Text style={styles.currentUserBadgeText}>나</Text>
              </View>
            )}
            {member.role === 'admin' && (
              <Text style={styles.adminBadge}>관리자</Text>
            )}
          </View>
        </View>
      </View>
      
      {/* 오늘 공부시간 */}
      <View style={styles.studyTimeCard}>
        <Text style={styles.studyTimeIcon}>
          {isCurrentUser && currentUser?.isStudying ? '공부중' : '시간'}
        </Text>
        <Text style={styles.studyTimeLabel}>
          {isCurrentUser && currentUser?.isStudying ? '공부 중...' : '오늘 공부시간'}
        </Text>
        <Text style={[
          styles.studyTimeValue, 
          isCurrentUser && styles.currentUserTime,
          isCurrentUser && currentUser?.isStudying && styles.studyingTime
        ]}>
          {formatStudyTime(getTodayStudyTime(member))}
        </Text>
        <Text style={styles.studyTimeDate}>
          {new Date().toLocaleDateString('ko-KR')}
        </Text>
      </View>
    </View>
  );

  if (!groupDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>로딩 중...</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>그룹 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 현재 사용자를 맨 위로, 나머지는 공부시간 순으로 정렬
  const sortedMembers = [...members].sort((a, b) => {
    if (a.email === currentUser?.email) return -1;
    if (b.email === currentUser?.email) return 1;
    return getTodayStudyTime(b) - getTodayStudyTime(a);
  });

  return (
    <OrientationLock isNoteScreen={false}>
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{groupDetail.name}</Text>
        <TouchableOpacity style={styles.headerInviteButton} onPress={handleShareInvite}>
          <Text style={styles.headerInviteButtonText}>친구 초대</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 그룹 정보 */}
        <View style={styles.groupInfoContainer}>
          <View style={styles.groupInfoHeader}>
            <View style={styles.groupTitleContainer}>
              <Text style={styles.groupName}>{groupDetail.name}</Text>
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{groupDetail.subject}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.groupDescription}>{groupDetail.description}</Text>
          
          <View style={styles.groupStatsContainer}>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatEmoji}>멤버</Text>
              <Text style={styles.groupStatLabel}>멤버</Text>
              <Text style={styles.groupStatValue}>
                {groupDetail.currentMembers}/{groupDetail.maxMembers}
              </Text>
            </View>
            
            <View style={styles.groupStatDivider} />
            
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatEmoji}>생성</Text>
              <Text style={styles.groupStatLabel}>생성일</Text>
              <Text style={styles.groupStatValue}>
                {new Date(groupDetail.createdAt).toLocaleDateString('ko-KR')}
              </Text>
            </View>
            
            <View style={styles.groupStatDivider} />
            
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatEmoji}>공개</Text>
              <Text style={styles.groupStatLabel}>공개</Text>
              <Text style={styles.groupStatValue}>
                {groupDetail.isPublic ? '공개' : '비공개'}
              </Text>
            </View>
          </View>
        </View>

        {/* 멤버 공부시간 */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>멤버 공부시간 📊</Text>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContainer}
            style={styles.horizontalScroll}
          >
            {sortedMembers.map((member) => 
              renderMemberCard(member, member.email === currentUser?.email)
            )}
          </ScrollView>
          
          {members.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>멤버 정보를 불러오는 중...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    </OrientationLock>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backBtn: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerInviteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerInviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  groupInfoContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupInfoHeader: {
    marginBottom: 15,
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    marginRight: 12,
  },
  groupBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  groupBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  groupDescription: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
    marginBottom: 20,
  },
  groupStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  groupStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  groupStatEmoji: {
    fontSize: 18,
    marginBottom: 6,
  },
  groupStatLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
  },
  groupStatValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '600',
  },
  groupStatDivider: {
    width: 1,
    backgroundColor: '#dee2e6',
    marginHorizontal: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  membersSection: {
    padding: 15,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
  },
  horizontalScroll: {
    // 높이 제한 제거하여 자유롭게 스크롤 가능
  },
  horizontalScrollContainer: {
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginRight: 12,
    width: 160,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserCard: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
    backgroundColor: '#f8f9ff',
  },
  memberHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentUserAvatar: {
    backgroundColor: '#007AFF',
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
  },
  currentUserAvatarText: {
    color: '#fff',
  },
  memberNameContainer: {
    alignItems: 'center',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
    textAlign: 'center',
  },
  currentUserName: {
    color: '#007AFF',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginRight: 2,
  },
  currentUserBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  adminBadge: {
    fontSize: 12,
  },
  studyTimeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  studyTimeIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  studyTimeLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  studyTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#28a745',
    marginBottom: 6,
    textAlign: 'center',
  },
  currentUserTime: {
    color: '#007AFF',
  },
  studyingTime: {
    color: '#ff6b35',
    textShadowColor: '#ff6b35',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  studyTimeDate: {
    fontSize: 9,
    color: '#6c757d',
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
  },
});
