import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import userDataService from './userDataService';

const API_URL = 'http://192.168.45.53:5000';

export default function StudyGroupInvite() {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;
  
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadGroupInfo();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  const loadGroupInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/study-groups/invite/${groupId}`);
      const data = await response.json();
      
      if (data.success) {
        setGroupInfo(data.group);
      } else {
        Alert.alert('오류', data.error || '그룹 정보를 불러올 수 없습니다.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('그룹 정보 로드 오류:', error);
      Alert.alert('오류', '그룹 정보를 불러올 수 없습니다.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!currentUser) {
      Alert.alert('로그인 필요', '스터디그룹에 참여하려면 로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    try {
      setJoining(true);
      const response = await fetch(`${API_URL}/api/study-groups/invite/${groupId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.email}`,
        }
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('성공', '스터디그룹에 참여했습니다!', [
          {
            text: '확인',
            onPress: () => {
              navigation.navigate('StudyGroupDetail', {
                groupId: groupId,
                groupName: data.group.name
              });
            }
          }
        ]);
      } else {
        Alert.alert('오류', data.error || '스터디그룹 참여에 실패했습니다.');
      }
    } catch (error) {
      console.error('초대 수락 오류:', error);
      Alert.alert('오류', '스터디그룹 참여에 실패했습니다.');
    } finally {
      setJoining(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      '초대 거절',
      '스터디그룹 초대를 거절하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '거절', 
          style: 'destructive',
          onPress: () => navigation.navigate('Main')
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>초대 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!groupInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>그룹 정보를 찾을 수 없습니다.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 초대 아이콘 */}
        <View style={styles.iconContainer}>
          <Text style={styles.inviteIcon}>📨</Text>
        </View>

        {/* 초대 메시지 */}
        <Text style={styles.inviteTitle}>스터디그룹 초대</Text>
        <Text style={styles.inviteSubtitle}>
          {groupInfo.creator?.name || '누군가'}님이 스터디그룹에 초대했습니다
        </Text>

        {/* 그룹 정보 카드 */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupName}>{groupInfo.name}</Text>
            <View style={styles.subjectBadge}>
              <Text style={styles.subjectText}>{groupInfo.subject}</Text>
            </View>
          </View>

          <Text style={styles.groupDescription}>{groupInfo.description}</Text>

          <View style={styles.groupStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>멤버</Text>
              <Text style={styles.statValue}>
                {groupInfo.currentMembers}/{groupInfo.maxMembers}명
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>공개</Text>
              <Text style={styles.statValue}>
                {groupInfo.isPublic ? '공개' : '비공개'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>생성일</Text>
              <Text style={styles.statValue}>
                {new Date(groupInfo.createdAt).toLocaleDateString('ko-KR', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* 정원 초과 경고 */}
        {groupInfo.currentMembers >= groupInfo.maxMembers && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>⚠️ 정원이 가득 찼습니다</Text>
          </View>
        )}

        {/* 버튼 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
            disabled={joining}
          >
            <Text style={styles.declineButtonText}>거절</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button, 
              styles.acceptButton,
              (joining || groupInfo.currentMembers >= groupInfo.maxMembers) && styles.disabledButton
            ]}
            onPress={handleAcceptInvite}
            disabled={joining || groupInfo.currentMembers >= groupInfo.maxMembers}
          >
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>
                {groupInfo.currentMembers >= groupInfo.maxMembers ? '정원초과' : '참여하기'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  inviteIcon: {
    fontSize: 80,
  },
  inviteTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  inviteSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  subjectBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  subjectText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  groupDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  groupStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    backgroundColor: '#4A90E2',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
});
