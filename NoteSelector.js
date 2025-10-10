import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const NoteSelector = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Main.js에서 전달받은 파라미터
  const { noteId, noteTitle } = route.params || {};

  const handleDrawingMode = () => {
    // 아이펜슬 그리기 모드로 이동
    navigation.navigate('Note', { 
      noteId, 
      noteTitle: noteTitle || '그림 노트',
      mode: 'drawing'
    });
  };

  const handleTextMode = () => {
    // 키보드 텍스트 모드로 이동
    navigation.navigate('NoteEditor', { 
      noteId, 
      title: noteTitle || '텍스트 노트',
      mode: 'text'
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>노트 작성 방식 선택</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          어떤 방식으로 노트를 작성하시겠습니까?
        </Text>

        {/* Drawing Mode Button */}
        <TouchableOpacity 
          style={styles.modeButton} 
          onPress={handleDrawingMode}
          activeOpacity={0.8}
        >
          <View style={styles.modeIcon}>
            <Text style={styles.modeIconText}>✏️</Text>
          </View>
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>아이펜슬로 그리기</Text>
            <Text style={styles.modeDescription}>
              손으로 직접 그리고 필기할 수 있습니다.
              자유로운 드로잉과 필기가 가능해요.
            </Text>
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Text Mode Button */}
        <TouchableOpacity 
          style={styles.modeButton} 
          onPress={handleTextMode}
          activeOpacity={0.8}
        >
          <View style={styles.modeIcon}>
            <Text style={styles.modeIconText}>⌨️</Text>
          </View>
          <View style={styles.modeContent}>
            <Text style={styles.modeTitle}>키보드로 입력하기</Text>
            <Text style={styles.modeDescription}>
              키보드를 사용해서 텍스트를 입력할 수 있습니다.
              긴 글이나 정리된 노트 작성에 적합해요.
            </Text>
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Info Text */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 언제든지 다른 방식으로 전환할 수 있습니다
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    height: 80,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  backButtonText: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modeIconText: {
    fontSize: 28,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
  },
  modeDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  infoContainer: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  infoText: {
    fontSize: 14,
    color: '#065f46',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NoteSelector;
