import AsyncStorage from '@react-native-async-storage/async-storage';

class EffectSettingsService {
  constructor() {
    this.settings = {
      snowEffect: false,
      autumnEffect: false,
      rainEffect: false,
      isPremiumUser: false,
      effectIntensity: 30,
    };
  }

  // 설정 로드
  async loadSettings() {
    try {
      const settingsData = await AsyncStorage.getItem('effectSettings');
      if (settingsData) {
        this.settings = { ...this.settings, ...JSON.parse(settingsData) };
      }
      console.log('🎨 Effect Settings 로드:', this.settings);
    } catch (error) {
      console.error('Effect Settings 로드 실패:', error);
    }
  }

  // 설정 저장
  async saveSettings() {
    try {
      await AsyncStorage.setItem('effectSettings', JSON.stringify(this.settings));
      console.log('🎨 Effect Settings 저장:', this.settings);
    } catch (error) {
      console.error('Effect Settings 저장 실패:', error);
    }
  }

  // 눈 효과 설정 토글
  async toggleSnowEffect() {
    if (!this.settings.isPremiumUser) {
      throw new Error('프리미엄 사용자만 이용할 수 있는 기능입니다.');
    }
    
    this.settings.snowEffect = !this.settings.snowEffect;
    await this.saveSettings();
    return this.settings.snowEffect;
  }

  // 가을 효과 설정 토글
  async toggleAutumnEffect() {
    if (!this.settings.isPremiumUser) {
      throw new Error('프리미엄 사용자만 이용할 수 있는 기능입니다.');
    }
    
    this.settings.autumnEffect = !this.settings.autumnEffect;
    await this.saveSettings();
    return this.settings.autumnEffect;
  }

  // 비 효과 설정 토글
  async toggleRainEffect() {
    if (!this.settings.isPremiumUser) {
      throw new Error('프리미엄 사용자만 이용할 수 있는 기능입니다.');
    }
    
    this.settings.rainEffect = !this.settings.rainEffect;
    await this.saveSettings();
    return this.settings.rainEffect;
  }

  // 효과 설정 (하나만 선택 가능)
  async setEffect(effectType) {
    if (!this.settings.isPremiumUser) {
      throw new Error('프리미엄 사용자만 이용할 수 있는 기능입니다.');
    }
    
    // 모든 효과 비활성화
    this.settings.snowEffect = false;
    this.settings.autumnEffect = false;
    this.settings.rainEffect = false;
    
    // 선택된 효과만 활성화
    switch (effectType) {
      case 'snow':
        this.settings.snowEffect = true;
        break;
      case 'autumn':
        this.settings.autumnEffect = true;
        break;
      case 'rain':
        this.settings.rainEffect = true;
        break;
      case 'none':
      default:
        // 모든 효과 비활성화 (이미 위에서 처리됨)
        break;
    }
    
    await this.saveSettings();
    return this.settings;
  }

  // 프리미엄 상태 설정
  async setPremiumStatus(isPremium) {
    this.settings.isPremiumUser = isPremium;
    
    // 프리미엄이 아니면 모든 효과 비활성화
    if (!isPremium) {
      this.settings.snowEffect = false;
      this.settings.autumnEffect = false;
      this.settings.rainEffect = false;
    }
    
    await this.saveSettings();
    console.log('💎 프리미엄 상태 변경:', isPremium);
  }

  // 효과 강도 설정
  async setEffectIntensity(intensity) {
    if (!this.settings.isPremiumUser) {
      throw new Error('프리미엄 사용자만 이용할 수 있는 기능입니다.');
    }
    
    this.settings.effectIntensity = Math.max(10, Math.min(100, intensity));
    await this.saveSettings();
    return this.settings.effectIntensity;
  }

  // 현재 설정 반환
  getSettings() {
    return { ...this.settings };
  }

  // 눈 효과 사용 가능 여부 확인
  canUseSnowEffect() {
    return this.settings.isPremiumUser && this.settings.snowEffect;
  }

  // 가을 효과 사용 가능 여부 확인
  canUseAutumnEffect() {
    return this.settings.isPremiumUser && this.settings.autumnEffect;
  }

  // 비 효과 사용 가능 여부 확인
  canUseRainEffect() {
    return this.settings.isPremiumUser && this.settings.rainEffect;
  }


  // 프리미엄 사용자 여부 확인
  isPremium() {
    return this.settings.isPremiumUser;
  }
}

// 싱글톤 인스턴스
const effectSettingsService = new EffectSettingsService();
export default effectSettingsService;
