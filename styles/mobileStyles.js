import { StyleSheet, Dimensions, Platform } from 'react-native';

/**
 * 모바일 전용 스타일 시스템
 * 기준: Galaxy S20 5G (360x800 논리적 픽셀)
 * 디자인: 화이트 베이스, 모던, 깔끔, 세련됨
 * 
 * Safe Area:
 * - 상단: 44px (상태바 + 노치)
 * - 하단: 34px (홈 인디케이터)
 */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// 공통 색상 팔레트
// ============================================
export const COLORS = {
  // 기본 색상
  primary: '#4A90E2',
  primaryLight: '#6BA3E8',
  primaryDark: '#3A7BC8',
  
  // 배경
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F5F5F5',
  
  // 텍스트
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#CCCCCC',
  
  // 테두리
  border: '#E8E8E8',
  borderLight: '#F0F0F0',
  borderDark: '#D0D0D0',
  
  // 상태
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  
  // 그림자
  shadow: '#000000',
  
  // 오버레이
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// ============================================
// 공통 간격
// ============================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ============================================
// Safe Area
// ============================================
export const SAFE_AREA = {
  top: Platform.OS === 'ios' ? 44 : 24,
  bottom: Platform.OS === 'ios' ? 34 : 16,
};

// ============================================
// 폰트 크기
// ============================================
export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

// ============================================
// 공통 스타일
// ============================================
export const commonStyles = StyleSheet.create({
  // ============ 레이아웃 ============
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  scrollContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SAFE_AREA.bottom + SPACING.xxxl,
  },
  
  // ============ 카드 ============
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  
  cardSmall: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // ============ 텍스트 ============
  textPrimary: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '400',
  },
  
  textSecondary: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  
  textBold: {
    fontWeight: '600',
  },
  
  textCenter: {
    textAlign: 'center',
  },
  
  // ============ 버튼 ============
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  buttonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  
  buttonSecondary: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

// ============================================
// 헤더 스타일
// ============================================
export const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: SAFE_AREA.top + 4, // 상단 Safe Area + 추가 여백
    backgroundColor: COLORS.background,
    borderBottomWidth: 0,
    shadowColor: COLORS.shadow,
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
    backgroundColor: COLORS.textPrimary,
    borderRadius: 1,
    marginVertical: 2,
  },
  
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginLeft: 4,
    flexShrink: 0,
  },
  
  homeText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flexShrink: 0,
  },
  
  defaultProfileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  
  profileText: {
    fontSize: 14,
    color: COLORS.background,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
});

// ============================================
// 사이드바 스타일
// ============================================
export const sidebarStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    zIndex: 999,
  },
  
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '85%',
    maxWidth: 320,
    backgroundColor: COLORS.background,
    paddingTop: SAFE_AREA.top + 20,
    paddingHorizontal: 20,
    paddingBottom: SAFE_AREA.bottom + 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  searchIcon: {
    fontSize: 16,
    color: COLORS.textTertiary,
    marginRight: 8,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    padding: 0,
  },
  
  menuList: {
    flex: 1,
  },
  
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  
  menuItemActive: {
    backgroundColor: '#F0F4FF',
  },
  
  menuText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  
  menuTextActive: {
    color: COLORS.primary,
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
  
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
});

// ============================================
// Main 화면 스타일
// ============================================
export const mainScreenStyles = StyleSheet.create({
  // ============ 공부 시간 카드 ============
  studyTimeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: SPACING.xl,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  
  studyTimeTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
    fontWeight: '500',
    opacity: 0.9,
    marginBottom: SPACING.xs,
  },
  
  studyTimeValue: {
    fontSize: FONT_SIZES.xxxl,
    color: COLORS.background,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  
  studyTimeDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    fontWeight: '400',
    opacity: 0.8,
  },
  
  // ============ 섹션 헤더 ============
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  
  sectionAction: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // ============ 폴더 그리드 ============
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  
  folderItem: {
    width: '46%',
    aspectRatio: 0.9,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.lg,
    marginRight: '4%',
    marginBottom: SPACING.lg,
    justifyContent: 'space-between',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  
  folderItemEven: {
    marginRight: 0,
  },
  
  folderIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  
  folderTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  
  folderDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  
  addFolderItem: {
    width: '46%',
    aspectRatio: 0.9,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    marginRight: '4%',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  addFolderItemEven: {
    marginRight: 0,
  },
  
  addFolderIcon: {
    fontSize: 40,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
  },
  
  addFolderText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  
  // ============ 스터디 그룹 카드 ============
  studyGroupCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  
  studyGroupName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  
  studyGroupDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

// ============================================
// Timer 화면 스타일
// ============================================
export const timerScreenStyles = StyleSheet.create({
  // 타이머 메인 컨테이너 - 세로 짧게, 중앙 정렬
  timerMainContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: SPACING.md,
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.sm,
    marginVertical: SPACING.sm,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  
  // 타이머 원형 디스플레이
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  
  // 타이머 텍스트
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  
  // 타이머 상태 텍스트
  timerStatusText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  
  // 타이머 버튼 그룹
  timerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  
  // 타이머 버튼
  timerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  timerButtonText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.background,
    fontWeight: '600',
  },
  
  // 타이머 정보 카드들
  timerInfoContainer: {
    width: '100%',
    marginTop: SPACING.md,
  },
  
  // 빠른 시간 설정
  quickTimeContainer: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  
  quickTimeTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  
  quickTimeButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  
  quickTimeButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  quickTimeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  
  // 오늘의 총 공부 시간
  totalTimeCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.sm,
    alignItems: 'center',
  },
  
  totalTimeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  
  totalTimeValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  
  // 목표 vs 현재 시간
  goalTimeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  
  goalTimeCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  goalTimeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  
  goalTimeValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

// ============================================
// AI 화면 스타일
// ============================================
export const aiScreenStyles = StyleSheet.create({
  // 메시지 입력 컨테이너
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: SAFE_AREA.bottom + SPACING.md,
  },
  
  // + 버튼
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  
  addButtonText: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  
  // 입력 필드
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  
  input: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    padding: 0,
    margin: 0,
  },
  
  // 전송 버튼
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  sendButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.background,
    fontWeight: '600',
  },
});

export default {
  COLORS,
  SPACING,
  SAFE_AREA,
  FONT_SIZES,
  commonStyles,
  headerStyles,
  sidebarStyles,
  mainScreenStyles,
  timerScreenStyles,
  aiScreenStyles,
};
