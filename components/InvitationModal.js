import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

const InvitationModal = ({ 
  visible, 
  invitation, 
  onAccept, 
  onDecline,
  onClose 
}) => {
  const [responding, setResponding] = useState(false);

  const handleAccept = async () => {
    try {
      setResponding(true);
      await onAccept(invitation);
    } catch (error) {
      console.error('초대 수락 오류:', error);
      Alert.alert('오류', '초대 수락 중 오류가 발생했습니다.');
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    try {
      setResponding(true);
      await onDecline(invitation);
    } catch (error) {
      console.error('초대 거절 오류:', error);
      Alert.alert('오류', '초대 거절 중 오류가 발생했습니다.');
    } finally {
      setResponding(false);
    }
  };

  if (!invitation) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.inviteIcon}>📝</Text>
          </View>
          
          <Text style={styles.modalTitle}>노트 공유 초대</Text>
          
          <View style={styles.invitationInfo}>
            <Text style={styles.fromUserText}>
              <Text style={styles.userName}>{invitation.fromUserName}</Text>님이
            </Text>
            <Text style={styles.noteTitle}>"{invitation.noteTitle}"</Text>
            <Text style={styles.inviteText}>노트를 함께 보자고 초대했습니다.</Text>
          </View>

          <Text style={styles.descriptionText}>
            수락하시면 실시간으로 노트를 함께 편집하고 음성채팅도 할 수 있습니다.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
              disabled={responding}
            >
              {responding ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Text style={styles.declineButtonText}>거절</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={responding}
            >
              {responding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.acceptButtonText}>수락</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={responding}
          >
            <Text style={styles.closeButtonText}>나중에</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  inviteIcon: {
    fontSize: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  invitationInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  fromUserText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  userName: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  inviteText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    minHeight: 45,
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 14,
  },
});

export default InvitationModal;
