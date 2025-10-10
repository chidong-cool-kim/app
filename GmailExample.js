import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function GmailExample({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Gmail 인증 기능 사용법</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 기본 설정</Text>
          <Text style={styles.description}>
            Gmail 인증 기능을 사용하기 위해서는 Google Cloud Console에서 
            OAuth 2.0 클라이언트 ID를 설정해야 합니다.
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>
{`// setting.js에서 설정
export const GMAIL_CONFIG = {
  iosClientId: 'your-ios-client-id',
  webClientId: 'your-web-client-id',
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
  ]
};`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 인증 훅 사용</Text>
          <Text style={styles.description}>
            useGmailAuth 훅을 사용하여 Gmail 인증 기능을 쉽게 구현할 수 있습니다.
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>
{`import { useGmailAuth } from './useGmailAuth';

const {
  isAuthenticated,
  userInfo,
  signInWithGmail,
  signOutFromGmail,
  getEmails,
  sendEmail
} = useGmailAuth();`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 주요 기능</Text>
          <View style={styles.featureList}>
            <Text style={styles.feature}>• Gmail OAuth 인증</Text>
            <Text style={styles.feature}>• 메일 목록 조회</Text>
            <Text style={styles.feature}>• 메일 내용 읽기</Text>
            <Text style={styles.feature}>• 메일 보내기</Text>
            <Text style={styles.feature}>• 사용자 프로필 정보</Text>
            <Text style={styles.feature}>• 라벨 관리</Text>
            <Text style={styles.feature}>• 자동 토큰 갱신</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 사용 예제</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>
{`// 메일 목록 가져오기
const emails = await getEmails('is:unread', 10);

// 메일 보내기
await sendEmail(
  'recipient@example.com',
  '제목',
  '메일 내용'
);

// 로그아웃
await signOutFromGmail();`}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('GmailDashboard')}
        >
          <Text style={styles.buttonText}>Gmail Dashboard 보기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 15,
  },
  codeBlock: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  featureList: {
    paddingLeft: 10,
  },
  feature: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
