// 구독 설정
export const SUBSCRIPTION_CONFIG = {
  plans: {
    basic: {
      id: 'basic',
      name: '베이직 프리미엄',
      price: 9900,
      originalPrice: 9900,
      period: '월',
      features: [
        'AI 질문 월 30회',
        '광고 완전 제거',
        '기본 프로필 꾸미기',
        '기본 학습 통계',
        '출석 보너스 증가'
      ],
      popular: false,
      color: '#007AFF'
    },
    premium: {
      id: 'premium',
      name: '프로 프리미엄',
      price: 14900,
      originalPrice: 14900,
      period: '월',
      features: [
        'AI 질문 월 65회',
        '광고 완전 제거',
        '모든 프로필 꾸미기',
        '고급 학습 분석',
        '우선 고객 지원',
        '프리미엄 배지',
        '출석 보너스 대폭 증가'
      ],
      popular: true,
      color: '#FF6B35'
    }
  },
  tokenPackages: {
    small: {
      id: 'small',
      name: '5개 질문권',
      price: 1500,
      tokens: 5,
      originalPrice: 1500,
      badge: '인기'
    },
    medium: {
      id: 'medium',
      name: '15개 질문권',
      price: 4000,
      tokens: 15,
      originalPrice: 4000,
      badge: '추천'
    },
    large: {
      id: 'large',
      name: '30개 질문권',
      price: 7000,
      tokens: 30,
      originalPrice: 7000,
      badge: '베스트'
    }
  },
  benefits: {
    free: {
      aiQuestions: 0,
      profileCustomization: ['basic'],
      features: ['basic_timer', 'basic_planner', 'basic_study_groups']
    },
    basic: {
      aiQuestions: 30,
      profileCustomization: ['basic', 'theme', 'status'],
      features: ['basic_timer', 'basic_planner', 'basic_study_groups', 'ad_free', 'basic_stats']
    },
    premium: {
      aiQuestions: 65,
      profileCustomization: ['basic', 'theme', 'status', 'frame', 'badge', 'premium_badge'],
      features: ['basic_timer', 'basic_planner', 'basic_study_groups', 'ad_free', 'advanced_stats', 'priority_support']
    }
  }
};

// 프로필 테마 설정
export const PROFILE_THEMES = {
  default: {
    id: 'default',
    name: '기본',
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      text: '#1a1a1a'
    }
  },
  dark: {
    id: 'dark',
    name: '다크',
    colors: {
      primary: '#007AFF',
      background: '#1a1a1a',
      text: '#FFFFFF'
    }
  },
  neon: {
    id: 'neon',
    name: '네온',
    colors: {
      primary: '#00FF88',
      background: '#0a0a0a',
      text: '#FFFFFF'
    }
  },
  nature: {
    id: 'nature',
    name: '자연',
    colors: {
      primary: '#28a745',
      background: '#f8f9fa',
      text: '#1a1a1a'
    }
  },
  space: {
    id: 'space',
    name: '우주',
    colors: {
      primary: '#6f42c1',
      background: '#0f0f23',
      text: '#FFFFFF'
    }
  }
};

// 프로필 프레임 설정
export const PROFILE_FRAMES = {
  none: { id: 'none', name: '없음' },
  gold: { id: 'gold', name: '골드', color: '#FFD700', requires: 'premium' },
  diamond: { id: 'diamond', name: '다이아몬드', color: '#B9F2FF', requires: 'premium' },
  rainbow: { id: 'rainbow', name: '무지개', color: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)', requires: 'premium' },
  fire: { id: 'fire', name: '불꽃', color: '#FF4500', requires: 'premium' }
};

// 배지 설정
export const BADGES = {
  premium: { id: 'premium', name: '프리미엄', color: '#FFD700', icon: '⭐', requires: 'premium' },
  streak_7: { id: 'streak_7', name: '7일 연속', color: '#28a745', icon: '🔥' },
  streak_30: { id: 'streak_30', name: '30일 연속', color: '#6f42c1', icon: '💎' },
  early_bird: { id: 'early_bird', name: '얼리버드', color: '#17a2b8', icon: '🌅' },
  night_owl: { id: 'night_owl', name: '나이트오울', color: '#6c757d', icon: '🦉' }
};
