/**
 * 모든 파일에 반응형 자동 적용 가이드
 * 
 * 적용 규칙:
 * 1. 디자인은 원본 100% 유지
 * 2. 크기(size)와 간격(spacing)만 조절
 * 3. 태블릿: 가로모드만 (세로모드 금지)
 * 4. 핸드폰: 세로모드만 (가로모드 금지)
 * 5. 예외: 핸드폰의 노트 기능만 가로모드
 */

// 우선순위 높음 파일 목록
export const HIGH_PRIORITY_FILES = [
  'main.js',
  'timer.js',
  'planner.js',
  'community.js',
  'Settings.js',
  'signup.js',
  'login.js'
];

// 우선순위 중간 파일 목록
export const MEDIUM_PRIORITY_FILES = [
  'ai.js',
  'note.js',
  'StudyGroupClean.js',
  'StudyGroupDetail.js',
  'Store.js',
  'Mailbox.js',
  'MessageBox.js',
  'username.js'
];

// 우선순위 낮음 파일 목록
export const LOW_PRIORITY_FILES = [
  'wait.js',
  'AdminPanel.js',
  'NoteSelector.js',
  'noteEditor.js',
  'PdfViewer.js',
  'StudyStatsScreen.js',
  'mtest.js',
  'plan.js',
  'BanModal.js',
  'StudyGroup.js'
];

// 노트 관련 파일 (핸드폰에서 가로모드)
export const NOTE_FILES = [
  'note.js',
  'noteEditor.js',
  'NoteSelector.js',
  'note_improved.js'
];

/**
 * 파일에 추가할 import 문
 */
export const IMPORTS_TO_ADD = `import { useMemo } from 'react';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';`;

/**
 * 컴포넌트 내부에 추가할 코드
 */
export const HOOK_USAGE = `  const responsiveUtil = useResponsive();
  
  // 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );`;

/**
 * 파일이 노트 관련 파일인지 확인
 */
export function isNoteFile(filename) {
  return NOTE_FILES.some(noteFile => filename.includes(noteFile));
}

/**
 * OrientationLock으로 감싸는 템플릿
 */
export function wrapWithOrientationLock(content, isNoteScreen = false) {
  return `<OrientationLock isNoteScreen={${isNoteScreen}}>
${content}
</OrientationLock>`;
}

/**
 * 반응형 적용 체크리스트
 */
export const CHECKLIST = {
  imports: '✅ Import 추가 (useMemo, useResponsive, OrientationLock)',
  hook: '✅ useResponsive() Hook 호출',
  baseStyles: '✅ StyleSheet.create를 baseStyles로 변경',
  useMemo: '✅ useMemo로 스타일 변환',
  orientationLock: '✅ OrientationLock으로 컴포넌트 감싸기',
  jsx: '✅ 기존 JSX 코드 유지',
  test: '✅ 앱 실행 및 정상 동작 확인'
};

/**
 * 반응형 적용 예시 템플릿
 */
export const TEMPLATE = `
// 1. Import 추가
import React, { useMemo } from 'react';
import { useResponsive } from './hooks/useResponsive';
import OrientationLock from './components/OrientationLock';

// 2. 컴포넌트 내부
export default function MyComponent() {
  const responsiveUtil = useResponsive();
  
  // 3. 반응형 스타일 적용
  const styles = useMemo(
    () => responsiveUtil.applyAll(baseStyles), 
    [responsiveUtil]
  );
  
  // 4. OrientationLock으로 감싸기
  return (
    <OrientationLock isNoteScreen={false}>
      <View style={styles.container}>
        <Text style={styles.text}>Hello</Text>
      </View>
    </OrientationLock>
  );
}

// 5. StyleSheet.create를 baseStyles로 변경
const baseStyles = StyleSheet.create({
  container: { padding: 20 },
  text: { fontSize: 16 }
});
`;

console.log('✅ 반응형 적용 유틸리티 로드 완료');
console.log('📋 총 파일 수:', HIGH_PRIORITY_FILES.length + MEDIUM_PRIORITY_FILES.length + LOW_PRIORITY_FILES.length);
