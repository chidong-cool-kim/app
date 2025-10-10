import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import userDataService from './userDataService';

const API_URL = 'http://192.168.45.53:5000';

export default function AdminPanel({ route }) {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'users'); // users, posts, stats
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [banType, setBanType] = useState('temporary');
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('7');
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [subscriptionDays, setSubscriptionDays] = useState('30');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'posts') {
      loadPosts();
    } else if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab]);

  const checkAdminAccess = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        navigation.goBack();
        return;
      }

      // 관리자 권한 확인을 위한 API 호출
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      if (!response.ok) {
        Alert.alert('접근 거부', '관리자 권한이 필요합니다.');
        navigation.goBack();
        return;
      }
    } catch (error) {
      console.error('관리자 권한 확인 오류:', error);
      Alert.alert('오류', '관리자 권한을 확인할 수 없습니다.');
      navigation.goBack();
    }
  };

  const loadUsers = async (search = '') => {
    try {
      setLoading(true);
      const user = await userDataService.getCurrentUser();
      
      const response = await fetch(`${API_URL}/api/admin/users?search=${search}`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('사용자 로드 오류:', error);
      Alert.alert('오류', '사용자 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const user = await userDataService.getCurrentUser();
      
      const response = await fetch(`${API_URL}/api/admin/posts`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('게시글 로드 오류:', error);
      Alert.alert('오류', '게시글 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const user = await userDataService.getCurrentUser();
      
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('통계 로드 오류:', error);
      Alert.alert('오류', '통계를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeTab === 'users') {
      loadUsers(searchText);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      Alert.alert('오류', '밴 사유를 입력해주세요.');
      return;
    }

    try {
      const user = await userDataService.getCurrentUser();
      
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser._id || selectedUser.id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
        },
        body: JSON.stringify({
          banType,
          reason: banReason,
          days: banType === 'temporary' ? parseInt(banDays) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('성공', data.message);
        setShowBanModal(false);
        setBanReason('');
        loadUsers(searchText);
      } else {
        Alert.alert('오류', data.error || data.message || '밴 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 밴 오류:', error);
      Alert.alert('오류', '사용자 밴에 실패했습니다.');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      const user = await userDataService.getCurrentUser();
      
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('성공', data.message);
        loadUsers(searchText);
      } else {
        Alert.alert('오류', data.error || data.message || '밴 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 밴 해제 오류:', error);
      Alert.alert('오류', '사용자 밴 해제에 실패했습니다.');
    }
  };

  // 구독 부여 함수
  const handleGrantSubscription = async () => {
    if (!selectedUser) return;

    try {
      const user = await userDataService.getCurrentUser();
      const days = parseInt(subscriptionDays);
      
      const planDetails = {
        basic: { name: '베이직', price: '9,900', aiQuestions: 30, aiModel: 'GPT-4o' },
        premium: { name: '프리미엄', price: '14,900', aiQuestions: 65, aiModel: 'GPT-4o' }
      };

      const plan = planDetails[selectedPlan];
      
      const subscriptionData = {
        email: selectedUser.email,
        planId: selectedPlan,
        planName: plan.name,
        price: plan.price,
        aiQuestions: plan.aiQuestions,
        aiModel: plan.aiModel,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        grantedBy: user.email, // 관리자가 부여했음을 표시
      };

      const response = await fetch(`${API_URL}/api/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
        },
        body: JSON.stringify(subscriptionData)
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('성공', `${selectedUser.name}님에게 ${plan.name} 플랜 (${days}일)이 부여되었습니다.`);
        setShowSubscriptionModal(false);
        setSelectedUser(null);
        loadUsers(searchText);
      } else {
        Alert.alert('오류', data.message || '구독 부여에 실패했습니다.');
      }
    } catch (error) {
      console.error('구독 부여 오류:', error);
      Alert.alert('오류', '구독 부여에 실패했습니다.');
    }
  };

  const handleDeletePost = async (postId) => {
    Alert.alert(
      '게시글 삭제',
      '정말 이 게시글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await userDataService.getCurrentUser();
              
              const response = await fetch(`${API_URL}/api/admin/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${user.email}`,
                }
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('성공', data.message);
                loadPosts();
              } else {
                Alert.alert('오류', data.error);
              }
            } catch (error) {
              console.error('게시글 삭제 오류:', error);
              Alert.alert('오류', '게시글 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'users') {
      loadUsers(searchText);
    } else if (activeTab === 'posts') {
      loadPosts();
    } else if (activeTab === 'stats') {
      loadStats();
    }
    setRefreshing(false);
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userRole}>역할: {item.role === 'admin' ? '관리자' : '사용자'}</Text>
        {item.subscription?.isActive && (
          <Text style={styles.subscriptionStatus}>
            구독: {item.subscription.planName} ({new Date(item.subscription.endDate).toLocaleDateString()}까지)
          </Text>
        )}
        {item.isBanned && (
          <Text style={styles.banStatus}>
            밴 상태: {item.banType === 'permanent' ? '영구밴' : '임시밴'}
          </Text>
        )}
      </View>
      <View style={styles.userActions}>
        {item.role !== 'admin' && (
          <>
            {!item.isBanned ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.banBtn]}
                onPress={() => {
                  setSelectedUser(item);
                  setShowBanModal(true);
                }}
              >
                <Text style={styles.actionBtnText}>밴</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.unbanBtn]}
                onPress={() => handleUnbanUser(item._id || item.id)}
              >
                <Text style={styles.actionBtnText}>밴 해제</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.subscriptionBtn]}
              onPress={() => {
                setSelectedUser(item);
                setShowSubscriptionModal(true);
              }}
            >
              <Text style={styles.actionBtnText}>구독 부여</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderPostItem = ({ item }) => (
    <View style={styles.postItem}>
      <View style={styles.postInfo}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContent}>{item.content}</Text>
        <Text style={styles.postAuthor}>작성자: {item.author.name} ({item.author.email})</Text>
        <Text style={styles.postStats}>좋아요: {item.likes} | 댓글: {item.commentsCount}</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, styles.deleteBtn]}
        onPress={() => handleDeletePost(item.id)}
      >
        <Text style={styles.actionBtnText}>삭제</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsView = () => (
    <ScrollView style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statTitle}>전체 사용자</Text>
        <Text style={styles.statValue}>{stats.totalUsers || 0}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statTitle}>전체 게시글</Text>
        <Text style={styles.statValue}>{stats.totalPosts || 0}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statTitle}>밴된 사용자</Text>
        <Text style={styles.statValue}>{stats.bannedUsers || 0}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statTitle}>관리자</Text>
        <Text style={styles.statValue}>{stats.adminUsers || 0}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statTitle}>최근 7일 신규 사용자</Text>
        <Text style={styles.statValue}>{stats.recentUsers || 0}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statTitle}>최근 7일 게시글</Text>
        <Text style={styles.statValue}>{stats.recentPosts || 0}</Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>관리자 패널</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 탭 메뉴 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            사용자 관리
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            게시글 관리
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            통계
          </Text>
        </TouchableOpacity>
      </View>

      {/* 검색 (사용자 탭에서만) */}
      {activeTab === 'users' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="사용자 검색 (이름, 이메일, 닉네임)"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>검색</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 컨텐츠 */}
      {activeTab === 'users' && (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          style={styles.list}
        />
      )}

      {activeTab === 'posts' && (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          style={styles.list}
        />
      )}

      {activeTab === 'stats' && renderStatsView()}

      {/* 밴 모달 */}
      <Modal
        visible={showBanModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>사용자 밴</Text>
            
            <Text style={styles.modalLabel}>밴 타입</Text>
            <View style={styles.banTypeContainer}>
              <TouchableOpacity
                style={[styles.banTypeBtn, banType === 'temporary' && styles.activeBanType]}
                onPress={() => setBanType('temporary')}
              >
                <Text style={styles.banTypeText}>임시밴</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.banTypeBtn, banType === 'permanent' && styles.activeBanType]}
                onPress={() => setBanType('permanent')}
              >
                <Text style={styles.banTypeText}>영구밴</Text>
              </TouchableOpacity>
            </View>

            {banType === 'temporary' && (
              <>
                <Text style={styles.modalLabel}>밴 기간 (일)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={banDays}
                  onChangeText={setBanDays}
                  keyboardType="numeric"
                  placeholder="7"
                />
              </>
            )}

            <Text style={styles.modalLabel}>밴 사유</Text>
            <TextInput
              style={[styles.modalInput, styles.reasonInput]}
              value={banReason}
              onChangeText={setBanReason}
              placeholder="밴 사유를 입력하세요"
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowBanModal(false)}
              >
                <Text style={styles.modalBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleBanUser}
              >
                <Text style={styles.modalBtnText}>밴 실행</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 구독 부여 모달 */}
      <Modal
        visible={showSubscriptionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>구독 부여</Text>
            
            <Text style={styles.modalLabel}>사용자: {selectedUser?.name} ({selectedUser?.email})</Text>
            
            <Text style={styles.modalLabel}>플랜 선택</Text>
            <View style={styles.banTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.banTypeBtn,
                  selectedPlan === 'basic' && styles.activeBanType
                ]}
                onPress={() => setSelectedPlan('basic')}
              >
                <Text style={[
                  styles.banTypeText,
                  selectedPlan === 'basic' && { color: '#fff' }
                ]}>베이직</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.banTypeBtn,
                  selectedPlan === 'premium' && styles.activeBanType
                ]}
                onPress={() => setSelectedPlan('premium')}
              >
                <Text style={[
                  styles.banTypeText,
                  selectedPlan === 'premium' && { color: '#fff' }
                ]}>프리미엄</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>구독 기간 (일)</Text>
            <TextInput
              style={styles.modalInput}
              value={subscriptionDays}
              onChangeText={setSubscriptionDays}
              placeholder="30"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowSubscriptionModal(false)}
              >
                <Text style={styles.modalBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#4CAF50' }]}
                onPress={handleGrantSubscription}
              >
                <Text style={styles.modalBtnText}>부여</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
  },
  searchBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginVertical: 1,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  subscriptionStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  banStatus: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: 'bold',
  },
  userActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 5,
  },
  banBtn: {
    backgroundColor: '#ff4444',
  },
  unbanBtn: {
    backgroundColor: '#44ff44',
  },
  subscriptionBtn: {
    backgroundColor: '#FF9800',
  },
  deleteBtn: {
    backgroundColor: '#ff4444',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  postItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginVertical: 1,
    alignItems: 'flex-start',
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  postContent: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  postAuthor: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  postStats: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statsContainer: {
    flex: 1,
    padding: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10,
  },
  banTypeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  banTypeBtn: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 5,
  },
  activeBanType: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  banTypeText: {
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  reasonInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#ccc',
  },
  confirmBtn: {
    backgroundColor: '#ff4444',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
