import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';

const API_URL = 'http://192.168.45.53:5000';

export default function UserProfileModal({ visible, onClose, userEmail }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && userEmail) {
      fetchUserData();
    }
  }, [visible, userEmail]);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    setUserData(null);
    try {
      const response = await fetch(`${API_URL}/api/user/details?email=${userEmail}`);
      if (!response.ok) {
        throw new Error('사용자 정보를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      if (data.success) {
        setUserData(data.user);
      } else {
        throw new Error(data.message || '사용자 정보를 가져올 수 없습니다.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#4A90E2" />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    if (userData) {
      return (
        <ScrollView>
          <View style={styles.profileHeader}>
            <Image 
              source={{ uri: userData.profileImage || 'https://via.placeholder.com/100' }}
              style={styles.profileImage}
            />
            <Text style={styles.userName}>{userData.name || '이름 없음'}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>가입한 스터디 그룹</Text>
            {userData.studyGroups && userData.studyGroups.length > 0 ? (
              userData.studyGroups.map(group => (
                <View key={group._id} style={styles.studyGroupCard}>
                  <Text style={styles.studyGroupName}>{group.name}</Text>
                  <Text style={styles.studyGroupDescription}>{group.description}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>가입한 스터디 그룹이 없습니다.</Text>
            )}
          </View>
        </ScrollView>
      );
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {renderContent()}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  studyGroupCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  studyGroupName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
  },
  studyGroupDescription: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 10,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
