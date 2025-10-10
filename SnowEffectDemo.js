import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import CommentInput from './components/CommentInput';
import EffectSettings from './components/EffectSettings';
import effectSettingsService from './services/EffectSettingsService';

const SnowEffectDemo = () => {
  const [comments, setComments] = useState([
    { id: 1, text: '첫 번째 댓글입니다!', timestamp: new Date().toLocaleString() },
    { id: 2, text: '눈 내리는 효과가 정말 예쁘네요 ❄️', timestamp: new Date().toLocaleString() },
  ]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // 설정 로드
    effectSettingsService.loadSettings();
  }, []);

  const handleCommentSubmit = async (commentText) => {
    // 댓글 추가
    const newComment = {
      id: Date.now(),
      text: commentText,
      timestamp: new Date().toLocaleString(),
    };
    
    setComments(prev => [newComment, ...prev]);
    
    // 성공 알림
    const canUseEffect = effectSettingsService.canUseSnowEffect();
    if (canUseEffect) {
      setTimeout(() => {
        Alert.alert('✨ 댓글 작성 완료!', '눈 내리는 효과와 함께 댓글이 작성되었습니다.');
      }, 2000);
    } else {
      Alert.alert('댓글 작성 완료!', '댓글이 성공적으로 작성되었습니다.');
    }
  };

  if (showSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>특수 효과 설정</Text>
          <Text 
            style={styles.backButton} 
            onPress={() => setShowSettings(false)}
          >
            ← 돌아가기
          </Text>
        </View>
        <EffectSettings />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>댓글 눈 효과 데모</Text>
        <Text 
          style={styles.settingsButton} 
          onPress={() => setShowSettings(true)}
        >
          설정 ⚙️
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 안내 메시지 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>❄️ 눈 내리는 효과 체험</Text>
          <Text style={styles.infoText}>
            프리미엄 사용자는 댓글 작성 시 아름다운 눈 내리는 효과를 경험할 수 있습니다.
          </Text>
          <Text style={styles.infoText}>
            설정에서 프리미엄을 활성화하고 눈 효과를 켜보세요!
          </Text>
        </View>

        {/* 기존 댓글들 */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>댓글 목록</Text>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <Text style={styles.commentText}>{comment.text}</Text>
              <Text style={styles.commentTime}>{comment.timestamp}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 댓글 입력 */}
      <CommentInput
        onSubmit={handleCommentSubmit}
        placeholder="댓글을 입력하세요... (프리미엄 사용자는 눈 효과와 함께!)"
        maxLength={300}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  backButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
    marginBottom: 4,
  },
  commentsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  commentItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  commentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
});

export default SnowEffectDemo;
