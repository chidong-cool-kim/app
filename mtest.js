import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataService from './userDataService';
import MobileSafeArea from './components/MobileSafeArea';

export default function ExamAnswers() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [examList, setExamList] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const user = await userDataService.getCurrentUser();
      
      // 관리자 확인 (drda00001)
      const adminStatus = user?.email === 'drda00001' || user?.username === 'drda00001';
      setIsAdmin(adminStatus);
      
      // 모의고사 답지 목록 로드
      await loadExamList();
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExamList = async () => {
    try {
      // AsyncStorage에서 모의고사 목록 로드
      const saved = await AsyncStorage.getItem('examAnswers');
      if (saved) {
        setExamList(JSON.parse(saved));
      }
    } catch (error) {
      console.error('모의고사 목록 로드 실패:', error);
    }
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        setSelectedFiles(result.assets);
      }
    } catch (error) {
      console.error('파일 선택 실패:', error);
      Alert.alert('오류', '파일 선택에 실패했습니다.');
    }
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.9,
      });

      if (!result.canceled) {
        const imageFiles = result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: `image_${index + 1}.jpg`,
          type: 'image/jpeg',
        }));
        setSelectedFiles(imageFiles);
      }
    } catch (error) {
      console.error('이미지 선택 실패:', error);
      Alert.alert('오류', '이미지 선택에 실패했습니다.');
    }
  };

  const uploadExam = async () => {
    if (!uploadTitle.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }

    if (selectedFiles.length === 0) {
      Alert.alert('알림', '파일을 선택해주세요.');
      return;
    }

    setUploading(true);

    try {
      const newExam = {
        id: Date.now().toString(),
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        files: selectedFiles.map(file => ({
          uri: file.uri,
          name: file.name,
          type: file.type || file.mimeType,
        })),
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'drda00001',
      };

      const updatedList = [newExam, ...examList];
      await AsyncStorage.setItem('examAnswers', JSON.stringify(updatedList));
      setExamList(updatedList);

      // 초기화
      setUploadTitle('');
      setUploadDescription('');
      setSelectedFiles([]);
      setShowUploadModal(false);

      Alert.alert('완료', '모의고사 답지가 업로드되었습니다.');
    } catch (error) {
      console.error('업로드 실패:', error);
      Alert.alert('오류', '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const deleteExam = (examId) => {
    Alert.alert(
      '삭제 확인',
      '이 답지를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = examList.filter(exam => exam.id !== examId);
              await AsyncStorage.setItem('examAnswers', JSON.stringify(updatedList));
              setExamList(updatedList);
              Alert.alert('완료', '삭제되었습니다.');
            } catch (error) {
              console.error('삭제 실패:', error);
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  if (loading) {
    return (
      <MobileSafeArea style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333" />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </MobileSafeArea>
    );
  }

  return (
    <MobileSafeArea style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모의고사 답지</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 관리자 업로드 버튼 */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setShowUploadModal(true)}
          >
            <Text style={styles.uploadButtonText}>+ 답지 업로드</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 답지 목록 */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {examList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 업로드된 답지가 없습니다.</Text>
            {isAdmin && (
              <Text style={styles.emptySubText}>
                답지를 업로드하여 학생들과 공유해보세요!
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.examList}>
            {examList.map((exam) => (
              <View key={exam.id} style={styles.examCard}>
                <View style={styles.examHeader}>
                  <View style={styles.examTitleContainer}>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    <Text style={styles.examDate}>{formatDate(exam.uploadedAt)}</Text>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => deleteExam(exam.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>삭제</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {exam.description && (
                  <Text style={styles.examDescription}>{exam.description}</Text>
                )}

                <View style={styles.filesContainer}>
                  <Text style={styles.filesLabel}>
                    첨부파일 ({exam.files.length})
                  </Text>
                  {exam.files.map((file, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.fileItem}
                      onPress={() => {
                        // 파일 보기 (실제로는 파일 뷰어 화면으로 이동)
                        Alert.alert('파일 보기', `${file.name}을 엽니다.`);
                      }}
                    >
                      {file.type?.includes('image') ? (
                        <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
                      ) : (
                        <View style={styles.pdfThumbnail}>
                          <Text style={styles.pdfIcon}>PDF</Text>
                        </View>
                      )}
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 업로드 모달 (관리자만) */}
      {isAdmin && (
        <Modal
          visible={showUploadModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowUploadModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>답지 업로드</Text>

              <TextInput
                style={styles.input}
                placeholder="제목 (예: 2025년 3월 모의고사 답지)"
                placeholderTextColor="#999"
                value={uploadTitle}
                onChangeText={setUploadTitle}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="설명 (선택사항)"
                placeholderTextColor="#999"
                value={uploadDescription}
                onChangeText={setUploadDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.filePickerSection}>
                <TouchableOpacity style={styles.filePickerButton} onPress={pickImages}>
                  <Text style={styles.filePickerButtonText}>이미지 선택</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filePickerButton} onPress={pickFiles}>
                  <Text style={styles.filePickerButtonText}>파일 선택</Text>
                </TouchableOpacity>
              </View>

              {selectedFiles.length > 0 && (
                <View style={styles.selectedFilesContainer}>
                  <Text style={styles.selectedFilesLabel}>
                    선택된 파일 ({selectedFiles.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedFiles.map((file, index) => (
                      <View key={index} style={styles.selectedFileItem}>
                        {file.type?.includes('image') ? (
                          <Image source={{ uri: file.uri }} style={styles.selectedFileThumbnail} />
                        ) : (
                          <View style={styles.selectedPdfThumbnail}>
                            <Text style={styles.selectedPdfIcon}>PDF</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowUploadModal(false);
                    setUploadTitle('');
                    setUploadDescription('');
                    setSelectedFiles([]);
                  }}
                  disabled={uploading}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, uploading && styles.disabledButton]}
                  onPress={uploadExam}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>업로드</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </MobileSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  headerRight: {
    width: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  adminSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  uploadButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  examList: {
    padding: 16,
  },
  examCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  examTitleContainer: {
    flex: 1,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  examDate: {
    fontSize: 13,
    color: '#999',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    color: '#FF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  examDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  filesContainer: {
    marginTop: 8,
  },
  filesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#E0E0E0',
  },
  pdfThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfIcon: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  filePickerSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filePickerButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filePickerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  selectedFilesContainer: {
    marginBottom: 20,
  },
  selectedFilesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  selectedFileItem: {
    marginRight: 12,
  },
  selectedFileThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  selectedPdfThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPdfIcon: {
    fontSize: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
});