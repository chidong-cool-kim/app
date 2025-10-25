import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MobileSafeArea from './components/MobileSafeArea';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import userDataService from './userDataService';
import { checkLimit, getLimitMessage, getUpgradeMessage, getUserPlan } from './utils/subscriptionLimits';

const API_URL = 'http://192.168.45.53:5000';

export default function StudyGroup() {
  const navigation = useNavigation();
  const responsiveUtil = useResponsive();
  const [activeTab, setActiveTab] = useState('find'); // find, my, create
  const [searchText, setSearchText] = useState('');
  const [studyGroups, setStudyGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // 그룹 생성 폼
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupSubject, setGroupSubject] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [isPublic, setIsPublic] = useState(true);

  const subjects = [
    '수학', '영어', '국어', '과학', '사회', '역사', 
    '프로그래밍', '디자인', '언어학습', '자격증', '기타'
  ];

  useEffect(() => {
    loadUserInfo();
    loadStudyGroups();
  }, []);

  useEffect(() => {
    if (activeTab === 'find') {
      loadStudyGroups();
    } else if (activeTab === 'my') {
      loadMyGroups();
    }
  }, [activeTab]);

  const loadUserInfo = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  const loadStudyGroups = async () => {
    try {
      setLoading(true);
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      const response = await fetch(`${API_URL}/api/study-groups?search=${searchText}`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        setStudyGroups(data.groups || []);
      }
    } catch (error) {
      console.error('스터디그룹 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyGroups = async () => {
    try {
      setLoading(true);
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      const response = await fetch(`${API_URL}/api/study-groups/my`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        setMyGroups(data.groups || []);
      }
    } catch (error) {
      console.error('내 스터디그룹 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStudyGroup = async () => {
    if (!groupName.trim() || !groupDescription.trim() || !groupSubject) {
      Alert.alert('오류', '모든 필수 정보를 입력해주세요.');
      return;
    }

    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      // 생성한 그룹 수 체크
      const createdGroups = myGroups.filter(g => g.creator?.email === user.email);
      const limitCheck = checkLimit(user, 'studyGroupsCreate', createdGroups.length);
      
      if (!limitCheck.canCreate) {
        const plan = getUserPlan(user);
        const upgradeMsg = getUpgradeMessage(plan);
        Alert.alert(
          '생성 제한',
          `${getLimitMessage('studyGroupsCreate', plan)}\n\n${upgradeMsg}`,
          [
            { text: '확인', style: 'cancel' },
            { text: '구독하기', onPress: () => navigation.navigate('Store') }
          ]
        );
        return;
      }

      const response = await fetch(`${API_URL}/api/study-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim(),
          subject: groupSubject,
          maxMembers: parseInt(maxMembers),
          isPublic
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('성공', '스터디그룹이 생성되었습니다!');
        setShowCreateModal(false);
        resetCreateForm();
        setActiveTab('my');
        loadMyGroups();
      } else {
        Alert.alert('오류', data.error || '스터디그룹 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('스터디그룹 생성 오류:', error);
      Alert.alert('오류', '스터디그룹 생성에 실패했습니다.');
    }
  };

  const joinStudyGroup = async (groupId) => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      // 가입한 그룹 수 체크
      const limitCheck = checkLimit(user, 'studyGroupsJoin', myGroups.length);
      
      if (!limitCheck.canCreate) {
        const plan = getUserPlan(user);
        const upgradeMsg = getUpgradeMessage(plan);
        Alert.alert(
          '가입 제한',
          `${getLimitMessage('studyGroupsJoin', plan)}\n\n${upgradeMsg}`,
          [
            { text: '확인', style: 'cancel' },
            { text: '구독하기', onPress: () => navigation.navigate('Store') }
          ]
        );
        return;
      }

      const response = await fetch(`${API_URL}/api/study-groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('성공', '스터디그룹에 참여했습니다!');
        loadStudyGroups();
        loadMyGroups();
      } else {
        Alert.alert('오류', data.error || '스터디그룹 참여에 실패했습니다.');
      }
    } catch (error) {
      console.error('스터디그룹 참여 오류:', error);
      Alert.alert('오류', '스터디그룹 참여에 실패했습니다.');
    }
  };

  const leaveStudyGroup = async (groupId) => {
    Alert.alert(
      '스터디그룹 나가기',
      '정말 이 스터디그룹을 나가시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await userDataService.getCurrentUser();
              if (!user) return;

              const response = await fetch(`${API_URL}/api/study-groups/${groupId}/leave`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${user.email}`,
                }
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('완료', '스터디그룹을 나갔습니다.');
                loadMyGroups();
              } else {
                Alert.alert('오류', data.error || '스터디그룹 나가기에 실패했습니다.');
              }
            } catch (error) {
              console.error('스터디그룹 나가기 오류:', error);
              Alert.alert('오류', '스터디그룹 나가기에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const resetCreateForm = () => {
    setGroupName('');
    setGroupDescription('');
    setGroupSubject('');
    setMaxMembers('10');
    setIsPublic(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'find') {
      loadStudyGroups();
    } else if (activeTab === 'my') {
      loadMyGroups();
    }
    setRefreshing(false);
  };

  const renderGroupItem = ({ item, showJoinButton = true }) => (
    <TouchableOpacity 
      style={styles.groupCard}
      onPress={() => {
        if (!showJoinButton) {
          // 내 그룹인 경우 상세 화면으로 이동
          navigation.navigate('StudyGroupDetail', {
            groupId: item._id,
            groupName: item.name
          });
        }
      }}
      activeOpacity={showJoinButton ? 1 : 0.7}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupSubject}>{item.subject}</Text>
        </View>
        <View style={styles.groupStats}>
          <Text style={styles.memberCount}>
            {item.currentMembers}/{item.maxMembers}명
          </Text>
          <View style={[styles.statusBadge, item.isPublic ? styles.publicBadge : styles.privateBadge]}>
            <Text style={styles.statusText}>
              {item.isPublic ? '공개' : '비공개'}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.groupDescription}>{item.description}</Text>
      
      <View style={styles.groupFooter}>
        <Text style={styles.createdBy}>
          생성자: {item.creator?.name || '알 수 없음'}
        </Text>
        <Text style={styles.createdAt}>
          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        </Text>
      </View>

      <View style={styles.groupActions}>
        {showJoinButton ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.joinBtn]}
            onPress={() => joinStudyGroup(item._id)}
            disabled={item.currentMembers >= item.maxMembers}
          >
            <Text style={styles.actionBtnText}>
              {item.currentMembers >= item.maxMembers ? '정원초과' : '참여하기'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.myGroupActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.detailBtn]}
              onPress={() => navigation.navigate('StudyGroupDetail', {
                groupId: item._id,
                groupName: item.name
              })}
            >
              <Text style={styles.actionBtnText}>상세보기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.leaveBtn]}
              onPress={() => leaveStudyGroup(item._id)}
            >
              <Text style={styles.actionBtnText}>나가기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {!showJoinButton && (
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>탭하여 멤버 공부시간 보기 →</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );

  return (
    <>
    <StatusBar barStyle="dark-content" backgroundColor="white" />
    <SafeAreaView style={styles.container} edges={['top']}>
      <OrientationLock isNoteScreen={false}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>스터디그룹</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createBtn}>+ 생성</Text>
        </TouchableOpacity>
      </View>

      {/* 토글 메뉴 (탭) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'find' && styles.activeTab]}
          onPress={() => setActiveTab('find')}
        >
          <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText]}>
            그룹 찾기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            내 그룹
          </Text>
        </TouchableOpacity>
      </View>

      {/* 검색 (그룹 찾기 탭에서만) */}
      {activeTab === 'find' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="스터디그룹 검색..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={loadStudyGroups}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={loadStudyGroups}>
            <Text style={styles.searchBtnText}>검색</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 컨텐츠 */}
      <FlatList
        data={activeTab === 'find' ? studyGroups : myGroups}
        renderItem={(props) => renderGroupItem({ ...props, showJoinButton: activeTab === 'find' })}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'find' ? '스터디그룹이 없습니다.' : '참여한 스터디그룹이 없습니다.'}
            </Text>
          </View>
        }
      />

      {/* 그룹 생성 모달 */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>스터디그룹 생성</Text>
            
            <ScrollView style={styles.modalForm}>
              <Text style={styles.formLabel}>그룹명 *</Text>
              <TextInput
                style={styles.formInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="스터디그룹 이름을 입력하세요"
                maxLength={30}
              />

              <Text style={styles.formLabel}>설명 *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={groupDescription}
                onChangeText={setGroupDescription}
                placeholder="스터디그룹에 대한 설명을 입력하세요"
                multiline
                numberOfLines={3}
                maxLength={200}
              />

              <Text style={styles.formLabel}>과목 *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectContainer}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject}
                    style={[
                      styles.subjectChip,
                      groupSubject === subject && styles.selectedSubjectChip
                    ]}
                    onPress={() => setGroupSubject(subject)}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      groupSubject === subject && styles.selectedSubjectChipText
                    ]}>
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>최대 인원</Text>
              <TextInput
                style={styles.formInput}
                value={maxMembers}
                onChangeText={setMaxMembers}
                placeholder="10"
                keyboardType="numeric"
                maxLength={2}
              />

              <View style={styles.publicToggle}>
                <Text style={styles.formLabel}>공개 설정</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, isPublic && styles.activeToggleBtn]}
                    onPress={() => setIsPublic(true)}
                  >
                    <Text style={[styles.toggleText, isPublic && styles.activeToggleText]}>
                      공개
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !isPublic && styles.activeToggleBtn]}
                    onPress={() => setIsPublic(false)}
                  >
                    <Text style={[styles.toggleText, !isPublic && styles.activeToggleText]}>
                      비공개
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                <Text style={styles.modalBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={createStudyGroup}
              >
                <Text style={styles.modalBtnText}>생성</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </OrientationLock>
    </SafeAreaView>
    </>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backBtn: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  createBtn: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
  },
  searchBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  groupCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  groupSubject: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  groupStats: {
    alignItems: 'flex-end',
  },
  memberCount: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  publicBadge: {
    backgroundColor: '#d4edda',
  },
  privateBadge: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  groupDescription: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 12,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  createdBy: {
    fontSize: 12,
    color: '#6c757d',
  },
  createdAt: {
    fontSize: 12,
    color: '#6c757d',
  },
  groupActions: {
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  joinBtn: {
    backgroundColor: '#007AFF',
  },
  leaveBtn: {
    backgroundColor: '#dc3545',
  },
  detailBtn: {
    backgroundColor: '#28a745',
  },
  myGroupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tapHint: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: {
    maxHeight: 400,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  subjectContainer: {
    marginBottom: 10,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 8,
  },
  selectedSubjectChip: {
    backgroundColor: '#007AFF',
  },
  subjectChipText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  selectedSubjectChipText: {
    color: '#fff',
  },
  publicToggle: {
    marginTop: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  activeToggleBtn: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  activeToggleText: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#6c757d',
  },
  confirmBtn: {
    backgroundColor: '#007AFF',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
