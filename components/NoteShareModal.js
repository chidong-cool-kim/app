import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useAuth } from '../authContext';
import userDataService from '../userDataService';
import socketService from '../services/SocketService';

const NoteShareModal = ({ 
  visible, 
  onClose, 
  noteTitle, 
  onStartSharing,
  currentStudyGroup 
}) => {
  const { user } = useAuth();
  const [studyGroupMembers, setStudyGroupMembers] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [invitingSent, setInvitingSent] = useState(new Set());

  useEffect(() => {
    if (visible && currentStudyGroup) {
      loadStudyGroupMembers();
    }
  }, [visible, currentStudyGroup]);

  useEffect(() => {
    // 온라인 상태 변경 리스너
    const handleUserStatusChanged = (data) => {
      setOnlineMembers(prev => {
        const newOnlineMembers = [...prev];
        const memberIndex = newOnlineMembers.findIndex(m => m.userId === data.userId);
        
        if (data.status === 'online') {
          if (memberIndex === -1) {
            // 스터디그룹 멤버인지 확인
            const isGroupMember = studyGroupMembers.some(m => m.user._id === data.userId);
            if (isGroupMember) {
              const member = studyGroupMembers.find(m => m.user._id === data.userId);
              newOnlineMembers.push({
                userId: data.userId,
                user: member.user,
                status: 'online'
              });
            }
          }
        } else {
          if (memberIndex !== -1) {
            newOnlineMembers.splice(memberIndex, 1);
          }
        }
        
        return newOnlineMembers;
      });
    };

    socketService.addListener('user_status_changed', handleUserStatusChanged);

    return () => {
      socketService.removeListener('user_status_changed', handleUserStatusChanged);
    };
  }, [studyGroupMembers]);

  const loadStudyGroupMembers = async () => {
    try {
      setLoading(true);
      
      // 스터디그룹 멤버 정보 가져오기
      const response = await fetch(`http://192.168.45.53:5000/api/study-groups/${currentStudyGroup._id}`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        const members = data.group.members.filter(member => member.user._id !== user._id);
        setStudyGroupMembers(members);
        
        // 온라인 사용자 상태 확인
        await checkOnlineStatus(members);
      }
    } catch (error) {
      console.error('스터디그룹 멤버 로드 오류:', error);
      Alert.alert('오류', '멤버 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const checkOnlineStatus = async (members) => {
    try {
      console.log('🔍 온라인 상태 확인 시작...');
      const response = await fetch('http://192.168.45.53:5000/api/online-users');
      const data = await response.json();
      
      console.log('📊 서버 응답:', data);
      
      if (data.success) {
        const onlineUserIds = data.onlineUsers;
        console.log('🟢 온라인 사용자 IDs:', onlineUserIds);
        console.log('👥 스터디그룹 멤버들:', members.map(m => ({ id: m.user._id, name: m.user.name })));
        
        const onlineGroupMembers = members.filter(member => {
          const isOnline = onlineUserIds.includes(member.user._id);
          console.log(`👤 ${member.user.name} (${member.user._id}): ${isOnline ? '온라인' : '오프라인'}`);
          return isOnline;
        }).map(member => ({
          userId: member.user._id,
          user: member.user,
          status: 'online'
        }));
        
        console.log('✅ 최종 온라인 멤버:', onlineGroupMembers);
        setOnlineMembers(onlineGroupMembers);
      }
    } catch (error) {
      console.error('❌ 온라인 상태 확인 오류:', error);
    }
  };

  const sendInvitation = async (member) => {
    try {
      console.log('📧 초대 전송 시작:', {
        to: member.user.name,
        toId: member.userId,
        from: user.name || user.username,
        fromId: user._id,
        noteTitle
      });
      
      setInvitingSent(prev => new Set([...prev, member.userId]));
      
      const roomId = `note_${Date.now()}_${user._id}`;
      console.log('🏠 생성된 방 ID:', roomId);
      
      // Socket 연결 상태 확인
      const connectionStatus = socketService.getConnectionStatus();
      console.log('🔌 Socket 연결 상태:', connectionStatus);
      
      if (!connectionStatus.isConnected) {
        Alert.alert('연결 오류', 'Socket 서버에 연결되지 않았습니다.');
        return;
      }
      
      const result = await socketService.sendNoteInvitation(
        member.userId,
        user.name || user.username,
        noteTitle,
        roomId
      );

      console.log('📨 초대 전송 결과:', result);

      if (result.success) {
        Alert.alert(
          '초대 전송됨',
          `${member.user.name || member.user.username}님에게 초대를 보냈습니다.`,
          [
            {
              text: '확인',
              onPress: () => {
                onStartSharing(roomId);
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('초대 실패', result.error || '초대를 보낼 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 초대 전송 오류:', error);
      Alert.alert('오류', '초대 전송 중 오류가 발생했습니다.');
    } finally {
      setInvitingSent(prev => {
        const newSet = new Set(prev);
        newSet.delete(member.userId);
        return newSet;
      });
    }
  };

  const filteredOnlineMembers = onlineMembers.filter(member =>
    member.user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    member.user.username?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>
            {item.user.name || item.user.username}
          </Text>
          <Text style={styles.memberEmail}>{item.user.email}</Text>
        </View>
        <View style={styles.onlineIndicator} />
      </View>
      
      <TouchableOpacity
        style={[
          styles.inviteButton,
          invitingSent.has(item.userId) && styles.inviteButtonDisabled
        ]}
        onPress={() => sendInvitation(item)}
        disabled={invitingSent.has(item.userId)}
      >
        {invitingSent.has(item.userId) ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.inviteButtonText}>초대</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>노트 공유하기</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.noteTitle}>"{noteTitle}"</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="멤버 검색..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>멤버 목록을 불러오는 중...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                온라인 멤버 ({filteredOnlineMembers.length}명)
              </Text>
              
              {filteredOnlineMembers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    현재 온라인인 스터디그룹 멤버가 없습니다.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredOnlineMembers}
                  renderItem={renderMemberItem}
                  keyExtractor={(item) => item.userId}
                  style={styles.membersList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  noteTitle: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  membersList: {
    flex: 1,
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginLeft: 10,
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  inviteButtonDisabled: {
    backgroundColor: '#ccc',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default NoteShareModal;
