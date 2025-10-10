import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import SnowEffect from './SnowEffect';
import effectSettingsService from '../services/EffectSettingsService';

const CommentInput = ({ 
  onSubmit, 
  placeholder = "댓글을 입력하세요...", 
  style,
  multiline = true,
  maxLength = 500 
}) => {
  const [comment, setComment] = useState('');
  const [showSnowEffect, setShowSnowEffect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('알림', '댓글을 입력해주세요.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // 눈 효과 활성화 체크
      const canUseSnowEffect = effectSettingsService.canUseSnowEffect();
      
      if (canUseSnowEffect) {
        setShowSnowEffect(true);
        
        // 눈 효과와 함께 댓글 제출
        setTimeout(async () => {
          try {
            await onSubmit(comment.trim());
            setComment('');
            
            // 키보드 숨기기
            Keyboard.dismiss();
            inputRef.current?.blur();
            
            // 3초 후 눈 효과 종료
            setTimeout(() => {
              setShowSnowEffect(false);
            }, 3000);
            
          } catch (error) {
            console.error('댓글 제출 실패:', error);
            Alert.alert('오류', '댓글 작성에 실패했습니다.');
            setShowSnowEffect(false);
          } finally {
            setIsSubmitting(false);
          }
        }, 500); // 눈 효과 시작 후 0.5초 뒤 제출
        
      } else {
        // 일반 댓글 제출 (눈 효과 없음)
        await onSubmit(comment.trim());
        setComment('');
        Keyboard.dismiss();
        inputRef.current?.blur();
        setIsSubmitting(false);
      }
      
    } catch (error) {
      console.error('댓글 제출 실패:', error);
      Alert.alert('오류', '댓글 작성에 실패했습니다.');
      setIsSubmitting(false);
      setShowSnowEffect(false);
    }
  };

  const handleFocus = () => {
    // 포커스 시 프리미엄 사용자에게 힌트 표시
    const isPremium = effectSettingsService.isPremium();
    const canUseEffect = effectSettingsService.canUseSnowEffect();
    
    if (isPremium && canUseEffect) {
      // 프리미엄 사용자에게 특수 효과 활성화 상태 알림 (선택적)
      console.log('❄️ 눈 내리는 효과가 활성화되어 있습니다!');
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* 눈 내리는 효과 */}
      <SnowEffect 
        active={showSnowEffect} 
        intensity={effectSettingsService.getSettings().effectIntensity || 30}
        duration={3000}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            multiline && styles.multilineInput
          ]}
          value={comment}
          onChangeText={setComment}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline={multiline}
          maxLength={maxLength}
          onFocus={handleFocus}
          editable={!isSubmitting}
        />
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!comment.trim() || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!comment.trim() || isSubmitting}
        >
          <Text style={[
            styles.submitButtonText,
            (!comment.trim() || isSubmitting) && styles.submitButtonTextDisabled
          ]}>
            {isSubmitting ? '작성 중...' : '작성'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 글자 수 표시 */}
      <View style={styles.footer}>
        <Text style={styles.characterCount}>
          {comment.length}/{maxLength}
        </Text>
        
        {/* 프리미엄 효과 표시 */}
        {effectSettingsService.canUseSnowEffect() && (
          <Text style={styles.effectIndicator}>
            ❄️ 특수 효과 활성화
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  multilineInput: {
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
  },
  effectIndicator: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
});

export default CommentInput;
