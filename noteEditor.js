import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import userDataService from './userDataService';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';

export default function NoteEditor() {
  const navigation = useNavigation();
  const route = useRoute();
  const responsiveUtil = useResponsive();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // 라우트에서 노트 정보 가져오기
  const noteId = route.params?.noteId;
  const initialTitle = route.params?.title || '';
  const initialContent = route.params?.content || '';

  useEffect(() => {
    if (noteId) {
      setIsEditing(true);
      setTitle(initialTitle);
      setContent(initialContent);
    }
  }, [noteId, initialTitle, initialContent]);

  const saveNote = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      if (isEditing && noteId) {
        // 기존 노트 수정
        await userDataService.updateNote(noteId, title.trim(), content.trim());
        Alert.alert('성공', '노트가 수정되었습니다.', [
          { text: '확인', onPress: () => {
            // 메인 화면으로 돌아가며 강제 새로고침
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }}
        ]);
      } else {
        // 새 노트 생성 (텍스트 타입으로 저장)
        await userDataService.addNote(title.trim(), content.trim());
        Alert.alert('성공', '텍스트 노트가 저장되었습니다.', [
          { text: '확인', onPress: () => {
            // 메인 화면으로 돌아가며 강제 새로고침
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }}
        ]);
      }
    } catch (error) {
      console.error('노트 저장 실패:', error);
      Alert.alert('오류', '노트 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (title.trim() || content.trim()) {
      Alert.alert(
        '저장하지 않고 나가기',
        '작성 중인 내용이 있습니다. 저장하지 않고 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '나가기', style: 'destructive', onPress: () => navigation.navigate('Main') }
        ]
      );
    } else {
      navigation.navigate('Main');
    }
  };

  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );

  return (
    <OrientationLock isNoteScreen={true}>
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backButton}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? '노트 수정' : '새 노트'}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={saveNote} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#5C7CFA" />
              ) : (
                <Text style={styles.saveButton}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 노트 편집 영역 */}
        <View style={styles.editorContainer}>
          {/* 제목 입력 */}
          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력하세요..."
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            autoFocus={!isEditing}
          />

          {/* 내용 입력 */}
          <TextInput
            style={styles.contentInput}
            placeholder="내용을 입력하세요..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          {/* 글자 수 표시 */}
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              제목: {title.length}/100자
            </Text>
            <Text style={styles.statusText}>
              내용: {content.length}자
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </OrientationLock>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    fontSize: 16,
    color: '#5C7CFA',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawingModeButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  drawingModeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  aiButton: {
    marginRight: 8,
  },
  aiButtonText: {
    fontSize: 18,
  },
  saveButton: {
    fontSize: 16,
    color: '#5C7CFA',
    fontWeight: '600',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 12,
    marginBottom: 16,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  statusText: {
    fontSize: 12,
    color: '#999',
  },
});
