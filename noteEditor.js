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
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import userDataService from './userDataService';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';
import { getScreenInfo } from './utils/responsive';

export default function NoteEditor() {
  const navigation = useNavigation();
  const route = useRoute();
  const responsiveUtil = useResponsive();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());

  // 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setScreenInfo(getScreenInfo());
    });
    return () => subscription?.remove();
  }, []);
  
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

    console.log('📝 [noteEditor] saveNote 호출:', {
      isEditing,
      noteId,
      title: title.trim(),
      content: content.trim(),
      contentLength: content.trim().length
    });

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
      
      // 제한 도달 에러 처리
      if (error.limitReached) {
        const planName = error.currentPlan === 'free' ? '무료' : 
                        error.currentPlan === 'basic' ? '베이직' : '프리미엄';
        const noteTypeName = error.noteType === 'drawing' ? '그림' : '텍스트';
        
        Alert.alert(
          '노트 개수 제한',
          `${error.message}\n\n현재 플랜: ${planName}\n\n더 많은 노트를 생성하려면 스토어에서 플랜을 업그레이드하세요.`,
          [
            { text: '취소', style: 'cancel' },
            { text: '스토어로 이동', onPress: () => navigation.navigate('Store') }
          ]
        );
      } else {
        Alert.alert('오류', error.message || '노트 저장에 실패했습니다.');
      }
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
  const getResponsiveStyles = () => {
    if (screenInfo.isPhone) {
      return phoneStyles;
    }
    return {};
  };

  const responsiveStyles = getResponsiveStyles();
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );

  return (
    <OrientationLock isNoteScreen={false}>
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 헤더 */}
        <View style={[styles.header, responsiveStyles.header]}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={[styles.backButton, responsiveStyles.backButton]}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={[styles.title, responsiveStyles.title]}>
            {isEditing ? '노트 수정' : '새 노트'}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={saveNote} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#5C7CFA" />
              ) : (
                <Text style={[styles.saveButton, responsiveStyles.saveButton]}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 노트 편집 영역 */}
        <View style={[styles.editorContainer, responsiveStyles.editorContainer]}>
          {/* 제목 입력 */}
          <TextInput
            style={[styles.titleInput, responsiveStyles.titleInput]}
            placeholder="제목을 입력하세요..."
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            autoFocus={!isEditing}
          />

          {/* 내용 입력 */}
          <TextInput
            style={[styles.contentInput, responsiveStyles.contentInput]}
            placeholder="내용을 입력하세요..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          {/* 글자 수 표시 */}
          <View style={[styles.statusBar, responsiveStyles.statusBar]}>
            <Text style={[styles.statusText, responsiveStyles.statusText]}>
              제목: {title.length}/100자
            </Text>
            <Text style={[styles.statusText, responsiveStyles.statusText]}>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    fontSize: 16,
    color: '#5C7CFA',
    width: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 60,
    justifyContent: 'flex-end',
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

const phoneStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 32, // Safe Area: iOS 44+8, Android 24+8
  },
  backButton: {
    fontSize: 15,
    width: 50,
  },
  title: {
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    fontSize: 15,
  },
  headerRight: {
    width: 50,
    justifyContent: 'flex-end',
  },
  editorContainer: {
    margin: 12,
    padding: 12,
  },
  titleInput: {
    fontSize: 18,
    paddingBottom: 10,
    marginBottom: 12,
  },
  contentInput: {
    fontSize: 15,
    lineHeight: 22,
  },
  statusBar: {
    paddingTop: 10,
  },
  statusText: {
    fontSize: 11,
  },
});
