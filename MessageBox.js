import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import MobileSafeArea from './components/MobileSafeArea';

const API_URL = 'http://192.168.45.53:5000';

export default function MessageBox() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUserInfo();
    loadMessages();
    loadUnreadCount();
  }, []);

  const loadUserInfo = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) {
        Alert.alert('알림', '로그인이 필요한 서비스입니다.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_URL}/api/messages/${user.email}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        throw new Error(data.message || '메시지를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('메시지 로드 실패:', error);
      Alert.alert('오류', '메시지를 불러오는데 실패했습니다. 다시 시도해주세요.');
    }
  };

  const loadUnreadCount = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      const response = await fetch(`${API_URL}/api/messages/${user.email}/unread-count`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (error) {
      console.error('읽지 않은 메시지 개수 로드 실패:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    await loadUnreadCount();
    setRefreshing(false);
  };

  const handleMessagePress = (message) => {
    console.log('메시지 클릭됨:', message.title);
    
    // 읽지 않은 메시지인 경우 읽음 처리만 수행
    if (!message.isRead) {
      markAsRead(message.id);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      const user = await userDataService.getCurrentUser();
      if (!user) return;

      console.log('메시지 읽음 처리 시작:', messageId);

      const response = await fetch(`${API_URL}/api/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userEmail: user.email
        })
      });

      if (response.ok) {
        console.log('메시지 읽음 처리 성공:', messageId);
        
        // 로컬 상태 업데이트
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId ? { ...msg, isRead: true } : msg
          )
        );
        
        // 읽지 않은 메시지 개수 업데이트
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // AsyncStorage에 읽음 상태 저장 (다른 화면과 동기화용)
        try {
          const readMessages = await AsyncStorage.getItem('readMessages') || '[]';
          const readMessagesList = JSON.parse(readMessages);
          if (!readMessagesList.includes(messageId)) {
            readMessagesList.push(messageId);
            await AsyncStorage.setItem('readMessages', JSON.stringify(readMessagesList));
            console.log('읽음 상태 AsyncStorage에 저장됨:', messageId);
          }
        } catch (storageError) {
          console.error('AsyncStorage 저장 실패:', storageError);
        }
      }
    } catch (error) {
      console.error('메시지 읽음 처리 실패:', error);
    }
  };

  const getMessageTypeStyle = (type) => {
    switch (type) {
      case 'notice':
        return { backgroundColor: '#e3f2fd', borderColor: '#2196f3' };
      case 'warning':
        return { backgroundColor: '#fff3e0', borderColor: '#ff9800' };
      case 'promotion':
        return { backgroundColor: '#f3e5f5', borderColor: '#9c27b0' };
      default:
        return { backgroundColor: '#f5f5f5', borderColor: '#9e9e9e' };
    }
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'notice':
        return '📢';
      case 'warning':
        return '⚠️';
      case 'promotion':
        return '🎉';
      default:
        return '💬';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <MobileSafeArea style={styles.safeArea} backgroundColor="#f8f9fa">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>메시지함</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Messages List */}
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>받은 메시지가 없습니다</Text>
            <Text style={styles.emptySubText}>관리자가 보낸 메시지가 여기에 표시됩니다</Text>
          </View>
        ) : (
          messages.map((message) => (
            <TouchableOpacity
              key={message.id}
              style={[
                styles.messageCard,
                getMessageTypeStyle(message.type),
                !message.isRead && styles.unreadMessage
              ]}
              onPress={() => handleMessagePress(message)}
              activeOpacity={0.7}
            >
              <View style={styles.messageHeader}>
                <View style={styles.messageTypeContainer}>
                  <Text style={styles.messageTypeIcon}>
                    {getMessageTypeIcon(message.type)}
                  </Text>
                  <Text style={styles.messageType}>
                    {message.type === 'notice' ? '공지사항' : 
                     message.type === 'warning' ? '경고' :
                     message.type === 'promotion' ? '이벤트' : '일반'}
                  </Text>
                </View>
                <Text style={styles.messageDate}>
                  {formatDate(message.createdAt)}
                </Text>
              </View>
              
              <Text style={styles.messageTitle} numberOfLines={1}>
                {message.title}
              </Text>
              
              <Text style={styles.messagePreview} numberOfLines={2}>
                {message.content}
              </Text>
              
              <View style={styles.messageFooter}>
                <Text style={styles.senderText}>
                  관리자로부터
                </Text>
                {!message.isRead && (
                  <View style={styles.unreadDot} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </MobileSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#000' },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  unreadBadge: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTypeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  messageType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f44336',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalBackButton: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '500',
  },
  modalTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTypeIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  modalType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    lineHeight: 28,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalSender: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalDate: {
    fontSize: 12,
    color: '#999',
  },
  modalContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});
