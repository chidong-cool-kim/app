// 구독 플랜별 제한 설정

export const SUBSCRIPTION_LIMITS = {
  free: {
    studyGroupsJoin: 3,      // 가입 가능한 스터디그룹 수
    studyGroupsCreate: 3,    // 생성 가능한 스터디그룹 수
    notesText: 3,            // 텍스트 노트 개수
    notesDrawing: 3,         // 그림 노트 개수
    notesTotal: 3,           // 전체 노트 개수 (텍스트 + 그림)
    aiQuestions: 0,          // AI 질문 개수
  },
  basic: {
    studyGroupsJoin: 15,
    studyGroupsCreate: 15,
    notesText: 15,
    notesDrawing: 15,
    notesTotal: 15,          // 전체 노트 개수 (텍스트 + 그림)
    aiQuestions: 30,
  },
  premium: {
    studyGroupsJoin: 30,
    studyGroupsCreate: 30,
    notesText: 25,
    notesDrawing: 25,
    notesTotal: 25,          // 전체 노트 개수 (텍스트 + 그림)
    aiQuestions: 65,
  },
};

// 사용자의 구독 플랜 가져오기
export const getUserPlan = (user) => {
  if (!user || !user.subscription || !user.subscription.isActive) {
    return 'free';
  }
  
  const planId = user.subscription.planId;
  if (planId === 'basic') return 'basic';
  if (planId === 'premium') return 'premium';
  
  return 'free';
};

// 사용자의 제한 가져오기
export const getUserLimits = (user) => {
  const plan = getUserPlan(user);
  return SUBSCRIPTION_LIMITS[plan];
};

// 제한 체크 함수
export const checkLimit = (user, limitType, currentCount) => {
  const limits = getUserLimits(user);
  const limit = limits[limitType];
  
  return {
    canCreate: currentCount < limit,
    current: currentCount,
    limit: limit,
    remaining: Math.max(0, limit - currentCount),
  };
};

// 제한 초과 메시지 생성
export const getLimitMessage = (limitType, plan) => {
  const limits = SUBSCRIPTION_LIMITS[plan];
  const limit = limits[limitType];
  
  const messages = {
    studyGroupsJoin: `스터디그룹 가입은 최대 ${limit}개까지 가능합니다.`,
    studyGroupsCreate: `스터디그룹 생성은 최대 ${limit}개까지 가능합니다.`,
    notesText: `텍스트 노트는 최대 ${limit}개까지 생성 가능합니다.`,
    notesDrawing: `그림 노트는 최대 ${limit}개까지 생성 가능합니다.`,
    notesTotal: `노트(텍스트+그림)는 최대 ${limit}개까지 생성 가능합니다.`,
  };
  
  return messages[limitType] || '제한에 도달했습니다.';
};

// 업그레이드 권장 메시지
export const getUpgradeMessage = (currentPlan) => {
  if (currentPlan === 'free') {
    return '베이직 플랜으로 업그레이드하면 15개까지, 프리미엄 플랜은 25개까지 이용 가능합니다!';
  } else if (currentPlan === 'basic') {
    return '프리미엄 플랜으로 업그레이드하면 25개까지 이용 가능합니다!';
  }
  return '';
};
