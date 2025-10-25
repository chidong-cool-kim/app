// 메인 화면 기준 공통 모바일 스타일
export const getCommonMobileStyles = (screenWidth) => {
  // 일반 핸드폰 (360 <= width < 768)
  if (screenWidth < 768) {
    return {
      // 헤더
      header: { 
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16, 
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5'
      },
      headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
      hamburgerButton: { width: 24, height: 24, justifyContent: 'space-between', paddingVertical: 2 },
      hamburgerLine: { width: '100%', height: 3, backgroundColor: '#333', borderRadius: 2 },
      title: { fontSize: 24, fontWeight: '700', color: '#000' },
      homeText: { fontSize: 15, fontWeight: '500', color: '#000' },
      profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
      profileImage: { width: 44, height: 44, borderRadius: 22 },
      defaultProfileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
      profileText: { fontSize: 16, color: '#fff', fontWeight: '600' },
      
      // 사이드바
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
      mobileSidebarOverlay: { flex: 1 },
      searchContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F5F5F5', 
        borderRadius: 25, 
        marginBottom: 24, 
        paddingHorizontal: 16, 
        height: 44 
      },
      searchIconText: { fontSize: 14, color: '#999', marginRight: 8 },
      searchInput: { flex: 1, fontSize: 15, color: '#000' },
      subjectList: { flex: 1, gap: 4 },
      subjectItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10 },
      activeSubjectItem: { backgroundColor: '#F0F0F0' },
      subjectText: { fontSize: 16, color: '#666', fontWeight: '400' },
      activeSubjectText: { color: '#000', fontWeight: '600' },
      bottomDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 24 },
      dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D0D0D0' },
      activeDot: { backgroundColor: '#666' },
    };
  }
  
  return {};
};
