import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import OrientationGuard from './components/OrientationGuard';
import { getScreenInfo, responsive } from './utils/responsive';

const BACKEND_URL = 'http://192.168.45.53:5000';

export default function Mailbox() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());

  // 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setScreenInfo(getScreenInfo());
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      // AsyncStorage에서 메시지 로드
      const storedMessages = await AsyncStorage.getItem('userMessages');
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        setMessages(parsedMessages);
      }
      
      // 서버에서 새 메시지 확인
      await fetchNewMessages();
      
    } catch (error) {
      console.error('메시지 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewMessages = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      const response = await fetch(`${BACKEND_URL}/api/messages/${user.email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          // 새 메시지를 AsyncStorage에 저장
          await AsyncStorage.setItem('userMessages', JSON.stringify(data.messages));
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error('새 메시지 확인 실패:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNewMessages();
    setRefreshing(false);
  };

  const openMessage = (message) => {
    setSelectedMessage(message);
    setShowMessageModal(true);
    
    // 메시지를 읽음으로 표시
    markAsRead(message.id);
  };

  const markAsRead = async (messageId) => {
    try {
      const updatedMessages = messages.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      );
      setMessages(updatedMessages);
      await AsyncStorage.setItem('userMessages', JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('메시지 읽음 처리 실패:', error);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const updatedMessages = messages.filter(msg => msg.id !== messageId);
      setMessages(updatedMessages);
      await AsyncStorage.setItem('userMessages', JSON.stringify(updatedMessages));
      
      Alert.alert('삭제 완료', '메시지가 삭제되었습니다.');
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      Alert.alert('오류', '메시지 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '오늘';
    } else if (diffDays === 2) {
      return '어제';
    } else if (diffDays <= 7) {
      return `${diffDays - 1}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'notice': return '📢';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'promotion': return '🎉';
      default: return '📧';
    }
  };

  const renderMessageItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.messageItem, !item.isRead && styles.unreadMessage]}
      onPress={() => openMessage(item)}
    >
      <View style={styles.messageHeader}>
        <View style={styles.messageInfo}>
          <Text style={styles.messageIcon}>{getMessageIcon(item.type)}</Text>
          <View style={styles.messageDetails}>
            <Text style={[styles.messageTitle, !item.isRead && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.messageDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.messagePreview} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  // 반응형 스타일 생성
  const getResponsiveStyles = () => {
    if (screenInfo.isPhone) {
      return phoneStyles;
    }
    return {}; // 태블릿은 기존 스타일 유지
  };

  const responsiveStyles = getResponsiveStyles();

  return (
    <OrientationGuard screenName="메일함">
      <SafeAreaView style={[styles.container, responsiveStyles.container]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>메일함</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>메일함이 비어있습니다</Text>
            <Text style={styles.emptyText}>
              관리자가 보낸 메시지가 여기에 표시됩니다.
            </Text>
          </View>
        ) : (
          <View style={styles.messagesList}>
            {messages.map((message, index) => (
              <View key={message.id || index}>
                {renderMessageItem({ item: message })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 메시지 상세 모달 */}
      <Modal
        visible={showMessageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMessage && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>
                    {getMessageIcon(selectedMessage.type)}
                  </Text>
                  <Text style={styles.modalTitle}>{selectedMessage.title}</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowMessageModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalDate}>
                  {formatDate(selectedMessage.createdAt)}
                </Text>
                
                <ScrollView style={styles.modalBody}>
                  <Text style={styles.modalText}>{selectedMessage.content}</Text>
                </ScrollView>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => {
                      setShowMessageModal(false);
                      Alert.alert(
                        '메시지 삭제',
                        '이 메시지를 삭제하시겠습니까?',
                        [
                          { text: '취소', style: 'cancel' },
                          { 
                            text: '삭제', 
                            style: 'destructive',
                            onPress: () => deleteMessage(selectedMessage.id)
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.deleteButtonText}>삭제</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.closeModalButton}
                    onPress={() => setShowMessageModal(false)}
                  >
                    <Text style={styles.closeModalButtonText}>닫기</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </OrientationGuard>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 50,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  messagesList: {
    padding: 16,
  },
  messageItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  messageIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  messageDetails: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginLeft: 8,
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#999',
  },
  modalDate: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF4444',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  closeModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});

// 핸드폰용 반응형 스타일
const phoneStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing(16),
    paddingVertical: responsive.spacing(12),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    fontSize: responsive.fontSize(16),
    color: '#4A90E2',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsive.spacing(80),
  },
  emptyIcon: {
    fontSize: responsive.fontSize(48),
    marginBottom: responsive.spacing(16),
  },
  emptyTitle: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: responsive.spacing(8),
  },
  emptyText: {
    fontSize: responsive.fontSize(14),
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  messagesList: {
    padding: responsive.spacing(16),
  },
  messageItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: responsive.spacing(16),
    marginBottom: responsive.spacing(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: responsive.spacing(8),
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  messageIcon: {
    fontSize: responsive.fontSize(16),
    marginRight: responsive.spacing(12),
  },
  messageDetails: {
    flex: 1,
  },
  messageTitle: {
    fontSize: responsive.fontSize(14),
    fontWeight: '500',
    color: '#333',
    marginBottom: responsive.spacing(4),
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  messageDate: {
    fontSize: responsive.fontSize(10),
    color: '#999',
  },
  unreadDot: {
    width: responsive.size(6),
    height: responsive.size(6),
    borderRadius: responsive.size(3),
    backgroundColor: '#4A90E2',
    marginLeft: responsive.spacing(8),
  },
  messagePreview: {
    fontSize: responsive.fontSize(12),
    color: '#666',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: responsive.spacing(20),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalIcon: {
    fontSize: responsive.fontSize(20),
    marginRight: responsive.spacing(12),
  },
  modalTitle: {
    flex: 1,
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: responsive.spacing(4),
  },
  closeButtonText: {
    fontSize: responsive.fontSize(16),
    color: '#999',
  },
  modalDate: {
    fontSize: responsive.fontSize(10),
    color: '#999',
    paddingHorizontal: responsive.spacing(20),
    paddingTop: responsive.spacing(8),
  },
  modalBody: {
    flex: 1,
    padding: responsive.spacing(20),
  },
  modalText: {
    fontSize: responsive.fontSize(14),
    color: '#333',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: responsive.spacing(20),
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: responsive.spacing(12),
  },
  deleteButton: {
    flex: 1,
    paddingVertical: responsive.spacing(12),
    borderRadius: 8,
    backgroundColor: '#FF4444',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: responsive.fontSize(14),
    fontWeight: '500',
  },
  closeModalButton: {
    flex: 1,
    paddingVertical: responsive.spacing(12),
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#333',
    fontSize: responsive.fontSize(14),
    fontWeight: '500',
  },
});
