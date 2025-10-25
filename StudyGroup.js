import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import OrientationGuard from './components/OrientationGuard';
import { getScreenInfo, responsive } from './utils/responsive';
import MiniTimer from './miniTimer';

const API_URL = 'http://192.168.45.53:5000';

export default function StudyGroup() {
  const navigation = useNavigation();
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [activeTab, setActiveTab] = useState('find');
  const [searchText, setSearchText] = useState('');
  const [studyGroups, setStudyGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupSubject, setGroupSubject] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [isPublic, setIsPublic] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const subjects = [
    '수학', '영어', '국어', '과학', '사회', '역사', 
    '프로그래밍', '디자인', '언어학습', '자격증', '기타'
  ];

  // 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setScreenInfo(getScreenInfo());
    });
    return () => subscription?.remove();
  }, []);

  // screenInfo 초기화
  useEffect(() => {
    setScreenInfo(getScreenInfo());
  }, []);

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
    <View style={[styles.groupCard, responsiveStyles.groupCard]}>
      {/* 상단: 그룹명과 멤버 수 */}
      <View style={[styles.cardHeader, responsiveStyles.cardHeader]}>
        <Text style={[styles.groupName, responsiveStyles.groupName]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.memberCount, responsiveStyles.memberCount]}>{item.currentMembers}/{item.maxMembers}</Text>
      </View>
      
      {/* 배지 행 */}
      <View style={[styles.badgeRow, responsiveStyles.badgeRow]}>
        <View style={[styles.subjectBadge, responsiveStyles.subjectBadge]}>
          <Text style={[styles.subjectBadgeText, responsiveStyles.subjectBadgeText]}>{item.subject}</Text>
        </View>
        <View style={[styles.statusBadge, item.isPublic ? styles.publicBadge : styles.privateBadge]}>
          <Text style={[styles.statusText, item.isPublic ? styles.publicText : styles.privateText]}>
            {item.isPublic ? '공개' : '비공개'}
          </Text>
        </View>
      </View>
      
      {/* 생성자 정보 (한 줄) */}
      <View style={[styles.infoRow, responsiveStyles.infoRow]}>
        <Text style={[styles.infoText, responsiveStyles.infoText]} numberOfLines={1}>
          {item.creator?.name || '알 수 없음'} • {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      
      {/* 설명 (간단히) */}
      <Text style={[styles.groupDescription, responsiveStyles.groupDescription]} numberOfLines={2}>
        {item.description}
      </Text>
      
      {/* 액션 버튼 */}
      {showJoinButton ? (
        <TouchableOpacity
          style={[
            styles.actionBtn, 
            styles.joinBtn,
            responsiveStyles.actionBtn,
            item.currentMembers >= item.maxMembers && styles.disabledBtn
          ]}
          onPress={() => joinStudyGroup(item._id)}
          disabled={item.currentMembers >= item.maxMembers}
        >
          <Text style={[
            styles.actionBtnText,
            responsiveStyles.actionBtnText,
            item.currentMembers >= item.maxMembers && styles.disabledBtnText
          ]}>
            {item.currentMembers >= item.maxMembers ? '정원초과' : '참여하기'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionBtn, styles.leaveBtn, responsiveStyles.actionBtn]}
          onPress={() => leaveStudyGroup(item._id)}
        >
          <Text style={[styles.actionBtnText, responsiveStyles.actionBtnText]}>나가기</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // 반응형 스타일 생성
  const getResponsiveStyles = () => {
    return getResponsiveStylesForStudyGroup();
  };

  const responsiveStyles = getResponsiveStyles();

  return (
    <OrientationGuard screenName="스터디그룹">
    <View style={[styles.container, responsiveStyles.container]}>
      <MiniTimer />
      {/* 헤더 */}
      <View style={[styles.header, responsiveStyles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, responsiveStyles.backBtn]}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={[styles.title, responsiveStyles.title]}>스터디그룹</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Text style={[styles.createBtn, responsiveStyles.createBtn]}>+ 생성</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 메뉴 */}
      <View style={[styles.tabContainer, responsiveStyles.tabContainer]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'find' && styles.activeTab]}
          onPress={() => setActiveTab('find')}
        >
          <Text style={[styles.tabText, responsiveStyles.tabText, activeTab === 'find' && styles.activeTabText]}>
            그룹 찾기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, responsiveStyles.tabText, activeTab === 'my' && styles.activeTabText]}>
            내 그룹
          </Text>
        </TouchableOpacity>
      </View>

      {/* 검색 (그룹 찾기 탭에서만) */}
      {activeTab === 'find' && (
        <View style={[styles.searchContainer, responsiveStyles.searchContainer]}>
          <TextInput
            style={[styles.searchInput, responsiveStyles.searchInput]}
            placeholder="스터디그룹 검색..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={loadStudyGroups}
          />
          <TouchableOpacity style={[styles.searchBtn, responsiveStyles.searchBtn]} onPress={loadStudyGroups}>
            <Text style={[styles.searchBtnText, responsiveStyles.searchBtnText]}>검색</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 컨텐츠 */}
      <FlatList
        data={activeTab === 'find' ? studyGroups : myGroups}
        renderItem={(props) => renderGroupItem({ ...props, showJoinButton: activeTab === 'find' })}
        keyExtractor={(item, index) => `${item._id || item.id || index}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={[styles.list, responsiveStyles.list]}
        showsVerticalScrollIndicator={false}
        numColumns={screenInfo.isPhone ? 1 : 2}
        columnWrapperStyle={!screenInfo.isPhone ? styles.row : null}
        key={`${activeTab}-${studyGroups.length}-${myGroups.length}`}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, responsiveStyles.emptyContainer]}>
            <Text style={[styles.emptyText, responsiveStyles.emptyText]}>
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
          <View style={[styles.modalContent, responsiveStyles.modalContent]}>
            <Text style={[styles.modalTitle, responsiveStyles.modalTitle]}>스터디그룹 생성</Text>
            
            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, responsiveStyles.formLabel]}>그룹명 *</Text>
              <TextInput
                style={[styles.formInput, responsiveStyles.formInput]}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="스터디그룹 이름을 입력하세요"
                maxLength={30}
              />

              <Text style={[styles.formLabel, responsiveStyles.formLabel]}>설명 *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, responsiveStyles.formInput]}
                value={groupDescription}
                onChangeText={setGroupDescription}
                placeholder="스터디그룹에 대한 설명을 입력하세요"
                multiline
                numberOfLines={3}
                maxLength={200}
              />

              <Text style={[styles.formLabel, responsiveStyles.formLabel]}>과목 *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectContainer}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject}
                    style={[
                      styles.subjectChip,
                      responsiveStyles.subjectChip,
                      groupSubject === subject && styles.selectedSubjectChip
                    ]}
                    onPress={() => setGroupSubject(subject)}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      responsiveStyles.subjectChipText,
                      groupSubject === subject && styles.selectedSubjectChipText
                    ]}>
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, responsiveStyles.formLabel]}>최대 인원</Text>
              <TextInput
                style={[styles.formInput, responsiveStyles.formInput]}
                value={maxMembers}
                onChangeText={setMaxMembers}
                placeholder="10"
                keyboardType="numeric"
                maxLength={2}
              />

              <View style={styles.publicToggle}>
                <Text style={[styles.formLabel, responsiveStyles.formLabel]}>공개 설정</Text>
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
    </View>
    </OrientationGuard>
  );
}

const styles = StyleSheet.create({
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
  },
  createBtn: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
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
    paddingHorizontal: 4,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: '#fff',
    width: '48%',
    marginVertical: 4,
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  subjectBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  infoRow: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  publicBadge: {
    backgroundColor: '#e8f5e8',
    borderColor: '#28a745',
  },
  privateBadge: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  publicText: {
    color: '#28a745',
  },
  privateText: {
    color: '#856404',
  },
  groupDescription: {
    fontSize: 11,
    color: '#495057',
    lineHeight: 15,
    marginBottom: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  joinBtn: {
    backgroundColor: '#007AFF',
  },
  leaveBtn: {
    backgroundColor: '#ff3b30',
  },
  disabledBtn: {
    backgroundColor: '#e9ecef',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledBtnText: {
    color: '#6c757d',
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

// 핸드폰용 반응형 스타일
const phoneStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 64 : 48, // 모바일 전용 Safe Area: iOS 50+14, Android 34+14
    backgroundColor: '#fff',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  createBtn: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f8f9fa',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    flex: 1,
    paddingHorizontal: 8,
  },
  groupCard: {
    backgroundColor: '#fff',
    width: '100%',
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  subjectBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  subjectBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
  infoRow: {
    marginBottom: 6,
  },
  infoText: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '500',
  },
  groupDescription: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 16,
    marginBottom: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6c757d',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '95%',
    maxHeight: '85%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  subjectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    marginRight: 6,
  },
  subjectChipText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
});

// 반응형 스타일 함수 추가
const getResponsiveStylesForStudyGroup = () => {
  const { width, height } = Dimensions.get('window');
  
  // 더 작은 핸드폰 (width < 360)
  if (width < 360) {
    return {
      header: { paddingHorizontal: 14, paddingVertical: 10, paddingTop: Platform.OS === 'ios' ? 64 : 48 },
      backBtn: { fontSize: 13 },
      title: { fontSize: 15 },
      createBtn: { fontSize: 13 },
      tabText: { fontSize: 13 },
      searchContainer: { padding: 10 },
      searchInput: { fontSize: 13, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 5 },
      searchBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 5 },
      searchBtnText: { fontSize: 13 },
      groupCard: { padding: 10, marginVertical: 5, borderRadius: 8 },
      groupName: { fontSize: 14 },
      memberCount: { fontSize: 10 },
      subjectBadgeText: { fontSize: 8 },
      infoText: { fontSize: 9 },
      groupDescription: { fontSize: 11, lineHeight: 14, marginBottom: 7 },
      actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
      actionBtnText: { fontSize: 10 },
      modalContent: { width: '92%', padding: 14 },
      modalTitle: { fontSize: 16, marginBottom: 14 },
      formLabel: { fontSize: 13, marginBottom: 5, marginTop: 8 },
      formInput: { paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
    };
  }
  
  // 일반 핸드폰 (360 <= width < 768) - 기존 phoneStyles 사용
  if (width < 768) {
    return phoneStyles;
  }
  
  // 작은 태블릿 (768 <= width < 1024)
  if (width < 1024) {
    return {
      header: { paddingHorizontal: 18, paddingVertical: 13 },
      backBtn: { fontSize: 15 },
      title: { fontSize: 17 },
      createBtn: { fontSize: 15 },
      tabText: { fontSize: 15 },
      searchContainer: { padding: 13 },
      searchInput: { paddingHorizontal: 11, paddingVertical: 9, fontSize: 15 },
      searchBtn: { paddingHorizontal: 18, paddingVertical: 9 },
      searchBtnText: { fontSize: 15 },
      groupCard: { width: '48%', padding: 11, marginVertical: 5, borderRadius: 11 },
      cardHeader: { marginBottom: 7 },
      groupName: { fontSize: 15 },
      memberCount: { fontSize: 12 },
      badgeRow: { gap: 5, marginBottom: 7 },
      subjectBadge: { paddingHorizontal: 7, paddingVertical: 3 },
      subjectBadgeText: { fontSize: 10 },
      infoRow: { marginBottom: 7 },
      infoText: { fontSize: 11 },
      groupDescription: { fontSize: 12, lineHeight: 16, marginBottom: 9 },
      actionBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
      actionBtnText: { fontSize: 12 },
      modalContent: { width: '88%', padding: 18 },
      modalTitle: { fontSize: 19, marginBottom: 18 },
      formLabel: { fontSize: 15, marginBottom: 7, marginTop: 11 },
      formInput: { paddingHorizontal: 11, paddingVertical: 9, fontSize: 15 },
    };
  }
  
  // 큰 태블릿 및 데스크톱 (width >= 1024) - 기본 스타일 사용
  return {};
};
