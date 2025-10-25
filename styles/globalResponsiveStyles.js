import { useMemo } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { getScreenInfo } from '../utils/responsive';
import mobileStyles from './mobileStyles';

/**
 * 전역 반응형 스타일 시스템
 * 
 * 사용법:
 * {{ ...useGlobalResponsiveStyles() }}
 * import { useGlobalResponsiveStyles } from './styles/globalResponsiveStyles';
 * const styles = useGlobalResponsiveStyles();
 * 
 * 규칙:
 * - 핸드폰: 세로 모드 전용, 모든 스타일 최적화
 * - 태블릿: 가로 모드 전용, 기존 디자인 유지하면서 크기/간격만 조정
 */

// 기본 스타일 (태블릿/데스크톱 기준)
const baseStyles = StyleSheet.create({
  // ============ 공통 레이아웃 ============
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#666' 
  },
  
  // ============ 헤더 ============
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5E5' 
  },
  
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  
  hamburgerButton: { 
    width: 24, 
    height: 24, 
    justifyContent: 'space-between', 
    paddingVertical: 2 
  },
  
  hamburgerLine: { 
    width: '100%', 
    height: 3, 
    backgroundColor: '#333', 
    borderRadius: 2 
  },
  
  title: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: '#000' 
  },
  
  homeText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#000' 
  },
  
  profileIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#E0E0E0', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  profileImage: { 
    width: 44, 
    height: 44, 
    borderRadius: 22 
  },
  
  defaultProfileIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#4A90E2', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  profileText: { 
    fontSize: 16, 
    color: '#fff', 
    fontWeight: '600' 
  },
  
  // ============ 컨테이너 ============
  container: { 
    flex: 1, 
    flexDirection: 'row' 
  },
  
  // ============ 사이드바 (데스크톱) ============
  sidebar: { 
    width: 320, 
    backgroundColor: 'white', 
    paddingHorizontal: 20, 
    paddingVertical: 24, 
    borderRightWidth: 1, 
    borderRightColor: '#E5E5E5' 
  },
  
  // ============ 모바일 사이드바 ============
  mobileSidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    flexDirection: 'row',
  },
  
  mobileSidebarContent: {
    width: '80%',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  
  mobileSidebarOverlay: {
    flex: 1,
  },
  
  // ============ 검색 ============
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5', 
    borderRadius: 25, 
    marginBottom: 24, 
    paddingHorizontal: 16, 
    height: 44 
  },
  
  searchIconText: { 
    fontSize: 14, 
    color: '#999', 
    marginRight: 8 
  },
  
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#000' 
  },
  
  // ============ 메뉴 리스트 ============
  subjectList: { 
    flex: 1, 
    gap: 4 
  },
  
  subjectItem: { 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 10 
  },
  
  activeSubjectItem: { 
    backgroundColor: '#F0F0F0' 
  },
  
  subjectText: { 
    fontSize: 16, 
    color: '#666', 
    fontWeight: '400' 
  },
  
  activeSubjectText: { 
    color: '#000', 
    fontWeight: '600' 
  },
  
  // ============ 하단 닷 ============
  bottomDots: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 8, 
    paddingTop: 24 
  },
  
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: '#D0D0D0' 
  },
  
  activeDot: { 
    backgroundColor: '#666' 
  },
  
  // ============ 메인 콘텐츠 ============
  mainContent: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  mainContentExpanded: { 
    paddingLeft: 16 
  },
});

// 핸드폰 전용 스타일 (Galaxy S20 5G 기준 - 360x800)
// 디자인: 화이트 베이스, 모던, 깔끔, 세련됨
const phoneStyles = StyleSheet.create({
  // ============ 기본 레이아웃 ============
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // ============ 헤더 (상단 Safe Area 고려) ============
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 48 : 38, // iOS: 44(safe) + 4, Android: 24(safe) + 14
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  hamburgerButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 1,
    marginVertical: 2,
  },
  
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  
  homeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
    marginLeft: 4,
  },
  
  // ============ 프로필 ============
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flexShrink: 0,
  },
  
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  
  defaultProfileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  profileText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  
  // ============ 사이드바 ============
  mobileSidebarContent: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 64 : 44, // iOS: 44 + 20, Android: 24 + 20
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 54 : 36, // iOS: 34 + 20, Android: 16 + 20
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  
  searchContainer: {
    height: 44,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  
  searchIconText: {
    fontSize: 16,
    color: '#999999',
    marginRight: 8,
  },
  
  searchInput: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  
  subjectItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  
  activeSubjectItem: {
    backgroundColor: '#F0F4FF',
  },
  
  subjectText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  
  activeSubjectText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  
  bottomDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 24,
    paddingBottom: 10,
  },
  
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  
  activeDot: {
    backgroundColor: '#4A90E2',
    width: 24,
  },
  
  // ============ 메인 콘텐츠 ============
  mainContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingBottom: 40,
  },
  
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
});

// 데스크톱 스타일 (1024px 이상) - iPad 기준에서 10-20% 확대
const desktopStyles = StyleSheet.create({
  header: { 
    paddingHorizontal: 28,  // 24 → 28
    paddingVertical: 18,    // 16 → 18
  },
  
  title: { 
    fontSize: 22,  // 20 → 22
  },
  
  homeText: { 
    fontSize: 20,  // 18 → 20
  },
  
  sidebar: { 
    width: 280,  // 260 → 280
    paddingTop: 24,  // 20 → 24
  },
  
  searchContainer: { 
    marginHorizontal: 18,  // 16 → 18
    marginBottom: 22,      // 20 → 22
    paddingHorizontal: 14, // 12 → 14
    paddingVertical: 11,   // 10 → 11
  },
  
  subjectItem: { 
    paddingVertical: 14,   // 12 → 14
    paddingHorizontal: 22, // 20 → 22
  },
  
  subjectText: { 
    fontSize: 17,  // 16 → 17
  },
  
  mainContent: { 
    flex: 1, 
    padding: 28,  // 24 → 28
  },
});

/**
 * 반응형 스타일 훅
 * @returns {Object} 현재 화면 크기에 맞는 스타일
 */
export const useGlobalResponsiveStyles = () => {
  const screenInfo = getScreenInfo();
  
  if (screenInfo.isPhone) {
    // 핸드폰: 기본 스타일 + 핸드폰 오버라이드
    return { ...baseStyles, ...phoneStyles };
  } else if (screenInfo.isDesktop) {
    // 데스크톱 (1024px+): iPad 기준 + 10-20% 확대
    return { ...baseStyles, ...desktopStyles };
  } else {
    // 태블릿 (iPad 11 M2): 기본 스타일 그대로 (완벽한 상태 유지)
    return baseStyles;
  }
};

/**
 * AI 화면 전용 반응형 스타일
 */
export const getAIResponsiveStyles = () => {
  const screenInfo = getScreenInfo();
  
  // iPad 기준 (기본값)
  const baseAIStyles = {
    messagesContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    messagesContent: { paddingBottom: 20 },
    messageContainer: { marginBottom: 16 },
    userMessage: { alignItems: 'flex-end' },
    aiMessage: { alignItems: 'flex-start' },
    messageBubble: { maxWidth: '80%', borderRadius: 20, padding: 16 },
    messageText: { fontSize: 16, lineHeight: 22 },
    userText: { color: 'white' },
    userBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: 'white', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
    messageTime: { fontSize: 11, marginTop: 6, opacity: 0.7 },
    userTime: { color: 'white', textAlign: 'right' },
    aiTime: { color: '#999' },
    loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    loadingText: { fontSize: 14, color: '#666' },
    inputContainer: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E5E5' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    addButtonText: { fontSize: 22, color: 'white', fontWeight: '300' },
    textInput: { flex: 1, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, maxHeight: 100, fontSize: 16, backgroundColor: '#F8F9FA' },
    sendButton: { backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, justifyContent: 'center', minHeight: 40 },
    sendButtonDisabled: { backgroundColor: '#C7C7CC' },
    sendButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
    selectedImageContainer: { marginBottom: 12, position: 'relative', alignSelf: 'flex-start' },
    selectedImagePreview: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#007AFF' },
    removeImageButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FF3B30', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    removeImageText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    imageLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0, 122, 255, 0.9)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, paddingVertical: 4, paddingHorizontal: 8 },
    imageLabelText: { color: 'white', fontSize: 11, fontWeight: '600', textAlign: 'center' },
    messageImageContainer: { marginBottom: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#E5E5E5' },
    messageImage: { width: 200, height: 200 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    styleButton: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2196F3', shadowColor: '#2196F3', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    styleButtonText: { fontSize: 12, fontWeight: '600', color: '#1976D2' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    styleModalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: 320, maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
    styleModalTitle: { fontSize: 20, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 8 },
    styleModalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
    styleButtons: { gap: 12, marginBottom: 20 },
    styleOptionButton: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#E5E5E5' },
    selectedStyleButton: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
    styleName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
    styleDescription: { fontSize: 12, color: '#666', textAlign: 'center' },
    styleCloseButton: { backgroundColor: '#F5F5F5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    styleCloseText: { fontSize: 16, fontWeight: '500', color: '#666' },
  };
  
  // 데스크톱 확대 (10-15%)
  const desktopAIStyles = {
    messagesContainer: { flex: 1, paddingHorizontal: 18, paddingTop: 18 },
    messageBubble: { maxWidth: '75%', borderRadius: 22, padding: 18 },
    messageText: { fontSize: 17, lineHeight: 24 },
    inputContainer: { padding: 18 },
    addButton: { width: 44, height: 44, borderRadius: 22 },
    addButtonText: { fontSize: 24 },
    textInput: { borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 17 },
    sendButton: { borderRadius: 22, paddingHorizontal: 28, paddingVertical: 12, minHeight: 44 },
    sendButtonText: { fontSize: 15 },
  };
  
  if (screenInfo.isPhone) {
    return {
      ...baseAIStyles,
      messagesContainer: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
      messagesContent: { paddingBottom: 16 },
      messageContainer: { marginBottom: 12 },
      messageBubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
      messageText: { fontSize: 15, lineHeight: 20 },
      inputContainer: { padding: 12 },
      addButton: { width: 36, height: 36, borderRadius: 18 },
      addButtonText: { fontSize: 20 },
      textInput: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 90, fontSize: 15 },
      sendButton: { borderRadius: 18, paddingHorizontal: 20, paddingVertical: 8, minHeight: 36 },
      sendButtonText: { fontSize: 13 },
    };
  } else if (screenInfo.isDesktop) {
    return { ...baseAIStyles, ...desktopAIStyles };
  }
  
  return baseAIStyles;
};

/**
 * 플래너 화면 전용 반응형 스타일
 */
export const getPlannerResponsiveStyles = () => {
  const screenInfo = getScreenInfo();
  
  const basePlannerStyles = {
    monthlyCalendarContainerFull: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 20, minHeight: 350 },
    fullCalendar: { width: '100%' },
    selectedDateContainer: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 20 },
    selectedDateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectedDateText: { fontSize: 18, fontWeight: 'bold', color: '#5C7CFA' },
    closeDateDetails: { padding: 4 },
    closeDateDetailsText: { fontSize: 20, color: '#666' },
    addTaskContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50', marginBottom: 16 },
    inputColumn: { gap: 16 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    input: { borderWidth: 1, borderColor: '#E1E5E9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, backgroundColor: '#FAFBFC', color: '#2C3E50' },
    taskInput: { flex: 1 },
    timeButton: { width: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E1E5E9' },
    timeButtonText: { fontSize: 14, color: '#495057', fontWeight: '500' },
    timeButtonPlaceholder: { color: '#ADB5BD' },
    memoInputInline: { minHeight: 60, textAlignVertical: 'top' },
    addButtonFull: { backgroundColor: '#5C7CFA', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#5C7CFA', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
    addButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    tasksContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20 },
    emptyText: { textAlign: 'center', color: '#999', fontSize: 14, paddingVertical: 20 },
    taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: '#F5F5F5' },
    checkboxContainer: { paddingRight: 4 },
    checkbox: { fontSize: 24, color: '#5C7CFA' },
    taskTextContainer: { flex: 1 },
    taskTitle: { fontSize: 16, fontWeight: '500', color: '#333333' },
    completedTask: { textDecorationLine: 'line-through', color: '#999' },
    memoIndicator: { fontSize: 12, color: '#5C7CFA', marginTop: 4 },
    taskActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deleteButton: { padding: 6 },
    deleteButtonText: { fontSize: 20, color: '#FF3B30', fontWeight: 'bold' },
    memoContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20 },
    memoInput: { borderWidth: 1, borderColor: '#E1E5E9', borderRadius: 12, padding: 16, fontSize: 14, color: '#2C3E50', backgroundColor: '#FAFBFC', textAlignVertical: 'top', minHeight: 100 },
  };
  
  // 데스크톱 확대
  const desktopPlannerStyles = {
    addTaskContainer: { padding: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 20, marginBottom: 18 },
    input: { paddingHorizontal: 18, paddingVertical: 16, fontSize: 15 },
    timeButton: { width: 130 },
    timeButtonText: { fontSize: 15 },
    addButtonFull: { paddingVertical: 18 },
    addButtonText: { fontSize: 17 },
    tasksContainer: { padding: 24, marginBottom: 24 },
    taskItem: { paddingVertical: 18, paddingHorizontal: 18 },
    taskTitle: { fontSize: 17 },
    memoContainer: { padding: 24, marginBottom: 24 },
    memoInput: { padding: 18, fontSize: 15, minHeight: 110 },
  };
  
  if (screenInfo.isPhone) {
    return {
      ...basePlannerStyles,
      monthlyCalendarContainerFull: { backgroundColor: 'white', borderRadius: 8, padding: 12, marginBottom: 16, minHeight: 300 },
      selectedDateContainer: { backgroundColor: 'white', borderRadius: 8, padding: 12, marginBottom: 16 },
      selectedDateText: { fontSize: 16, fontWeight: 'bold', color: '#5C7CFA' },
      addTaskContainer: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16 },
      sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
      inputColumn: { gap: 12 },
      inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
      input: { borderWidth: 1, borderColor: '#E1E5E9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
      timeButton: { width: 100 },
      timeButtonText: { fontSize: 13 },
      addButtonFull: { paddingVertical: 12, borderRadius: 8 },
      addButtonText: { fontSize: 14 },
      tasksContainer: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16 },
      taskItem: { paddingVertical: 12, paddingHorizontal: 12, marginBottom: 6 },
      taskTitle: { fontSize: 14 },
      memoContainer: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16 },
      memoInput: { padding: 12, fontSize: 13, minHeight: 80 },
    };
  } else if (screenInfo.isDesktop) {
    return { ...basePlannerStyles, ...desktopPlannerStyles };
  }
  
  return basePlannerStyles;
};

/**
 * 타이머 화면 전용 반응형 스타일
 */
export const getTimerResponsiveStyles = () => {
  const screenInfo = getScreenInfo();
  
  const baseTimerStyles = {
    timerContainer: { backgroundColor: 'white', borderRadius: 24, padding: 40, alignItems: 'center', marginBottom: 32 },
    timeText: { fontSize: 72, fontWeight: '700', color: '#1F2937', letterSpacing: 2 },
    controlButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  };
  
  // 데스크톱 확대
  const desktopTimerStyles = {
    timerContainer: { padding: 48, marginBottom: 36 },
    timeText: { fontSize: 80 },
    controlButton: { width: 72, height: 72, borderRadius: 36 },
  };
  
  if (screenInfo.isPhone) {
    return {
      ...baseTimerStyles,
      timerContainer: { padding: 32, marginBottom: 24 },
      timeText: { fontSize: 56 },
      controlButton: { width: 56, height: 56, borderRadius: 28 },
    };
  } else if (screenInfo.isDesktop) {
    return { ...baseTimerStyles, ...desktopTimerStyles };
  }
  
  return baseTimerStyles;
};

export default {
  useGlobalResponsiveStyles,
  getAIResponsiveStyles,
  getPlannerResponsiveStyles,
  getTimerResponsiveStyles,
};
