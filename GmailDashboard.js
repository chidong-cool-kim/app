import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { useGmailAuth } from './useGmailAuth';

export default function GmailDashboard({ navigation }) {
  const {
    isAuthenticated,
    userInfo,
    loading,
    error,
    signOutFromGmail,
    getEmails,
    getEmail,
    sendEmail,
    getProfile,
    getLabels,
    clearError
  } = useGmailAuth();

  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [profile, setProfile] = useState(null);
  const [labels, setLabels] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  
  // 메일 작성 상태
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (error) {
      Alert.alert('오류', error, [
        { text: '확인', onPress: clearError }
      ]);
    }
  }, [error]);

  // 초기 데이터 로드
  const loadInitialData = async () => {
    try {
      setLoadingEmails(true);
      
      // 프로필, 라벨, 이메일을 병렬로 로드
      const [profileData, labelsData, emailsData] = await Promise.all([
        getProfile(),
        getLabels(),
        getEmails('', 20)
      ]);

      setProfile(profileData);
      setLabels(labelsData.labels || []);
      setEmails(emailsData.messages || []);
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingEmails(false);
    }
  };

  // 메일 새로고침
  const refreshEmails = async () => {
    try {
      setLoadingEmails(true);
      const emailsData = await getEmails('', 20);
      setEmails(emailsData.messages || []);
    } catch (error) {
      console.error('메일 새로고침 실패:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  // 특정 메일 내용 보기
  const viewEmail = async (messageId) => {
    try {
      const emailData = await getEmail(messageId);
      setSelectedEmail(emailData);
    } catch (error) {
      console.error('메일 내용 로드 실패:', error);
      Alert.alert('오류', '메일 내용을 불러올 수 없습니다.');
    }
  };

  // 메일 보내기
  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      Alert.alert('알림', '모든 필드를 입력해주세요.');
      return;
    }

    try {
      await sendEmail(composeData.to, composeData.subject, composeData.body);
      Alert.alert('성공', '메일이 성공적으로 전송되었습니다.');
      setShowComposeModal(false);
      setComposeData({ to: '', subject: '', body: '' });
      refreshEmails();
    } catch (error) {
      console.error('메일 전송 실패:', error);
      Alert.alert('오류', '메일 전송에 실패했습니다.');
    }
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      'Gmail에서 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          onPress: async () => {
            await signOutFromGmail();
            navigation.goBack();
          }
        }
      ]
    );
  };

  // 메일 아이템 렌더링
  const renderEmailItem = ({ item }) => (
    <TouchableOpacity
      style={styles.emailItem}
      onPress={() => viewEmail(item.id)}
    >
      <Text style={styles.emailId} numberOfLines={1}>
        ID: {item.id}
      </Text>
      <Text style={styles.threadId} numberOfLines={1}>
        Thread: {item.threadId}
      </Text>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.title}>Gmail 인증이 필요합니다</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>로그인 화면으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gmail Dashboard</Text>
          {userInfo && (
            <Text style={styles.userEmail}>{userInfo.email}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 프로필 정보 */}
      {profile && (
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>프로필 정보</Text>
          <Text>이메일 주소: {profile.emailAddress}</Text>
          <Text>총 메시지: {profile.messagesTotal}</Text>
          <Text>총 스레드: {profile.threadsTotal}</Text>
        </View>
      )}

      {/* 액션 버튼들 */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowComposeModal(true)}
        >
          <Text style={styles.actionButtonText}>메일 작성</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={refreshEmails}
          disabled={loadingEmails}
        >
          <Text style={styles.actionButtonText}>새로고침</Text>
        </TouchableOpacity>
      </View>

      {/* 메일 목록 */}
      <View style={styles.emailSection}>
        <Text style={styles.sectionTitle}>최근 메일</Text>
        {loadingEmails ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <FlatList
            data={emails}
            keyExtractor={(item) => item.id}
            renderItem={renderEmailItem}
            refreshing={loadingEmails}
            onRefresh={refreshEmails}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 메일 작성 모달 */}
      <Modal
        visible={showComposeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowComposeModal(false)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>메일 작성</Text>
            <TouchableOpacity onPress={handleSendEmail}>
              <Text style={styles.modalSendText}>전송</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.composeForm}>
            <TextInput
              style={styles.composeInput}
              placeholder="받는 사람"
              value={composeData.to}
              onChangeText={(text) => setComposeData({...composeData, to: text})}
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.composeInput}
              placeholder="제목"
              value={composeData.subject}
              onChangeText={(text) => setComposeData({...composeData, subject: text})}
            />
            
            <TextInput
              style={[styles.composeInput, styles.composeBody]}
              placeholder="메일 내용"
              value={composeData.body}
              onChangeText={(text) => setComposeData({...composeData, body: text})}
              multiline
              textAlignVertical="top"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* 선택된 메일 내용 모달 */}
      <Modal
        visible={!!selectedEmail}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedEmail(null)}>
              <Text style={styles.modalCancelText}>닫기</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>메일 내용</Text>
            <View />
          </View>

          {selectedEmail && (
            <View style={styles.emailContent}>
              <Text style={styles.emailContentText}>
                메일 ID: {selectedEmail.id}
              </Text>
              <Text style={styles.emailContentText}>
                스레드 ID: {selectedEmail.threadId}
              </Text>
              {selectedEmail.payload && (
                <Text style={styles.emailContentText}>
                  MIME 타입: {selectedEmail.payload.mimeType}
                </Text>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 16,
  },
  profileSection: {
    backgroundColor: 'white',
    padding: 20,
    margin: 10,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emailSection: {
    flex: 1,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 8,
    padding: 15,
  },
  emailItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  emailId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  threadId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancelText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalSendText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  composeForm: {
    flex: 1,
    padding: 20,
  },
  composeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  composeBody: {
    flex: 1,
    minHeight: 200,
  },
  emailContent: {
    flex: 1,
    padding: 20,
  },
  emailContentText: {
    fontSize: 14,
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
