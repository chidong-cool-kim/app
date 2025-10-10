import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Slider,
} from 'react-native';
import effectSettingsService from '../services/EffectSettingsService';

const EffectSettings = () => {
  const [settings, setSettings] = useState({
    snowEffect: false,
    autumnEffect: false,
    rainEffect: false,
    isPremiumUser: false,
    effectIntensity: 30,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    await effectSettingsService.loadSettings();
    const currentSettings = effectSettingsService.getSettings();
    setSettings(currentSettings);
  };

  const handleEffectChange = async (effectType) => {
    try {
      if (!settings.isPremiumUser) {
        const effectNames = {
          snow: '눈 내리는 효과',
          autumn: '가을 나뭇잎 효과',
          rain: '비 내리는 효과'
        };
        Alert.alert(
          '프리미엄 기능',
          `${effectNames[effectType]}는 프리미엄 사용자만 이용할 수 있습니다.\n\n구독하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            { text: '구독하기', onPress: () => handlePremiumUpgrade() }
          ]
        );
        return;
      }

      // 현재 선택된 효과와 같으면 비활성화, 다르면 해당 효과로 변경
      const currentEffect = settings.snowEffect ? 'snow' : 
                           settings.autumnEffect ? 'autumn' : 
                           settings.rainEffect ? 'rain' : 'none';
      
      const newEffectType = currentEffect === effectType ? 'none' : effectType;
      const newSettings = await effectSettingsService.setEffect(newEffectType);
      setSettings(prev => ({ ...prev, ...newSettings }));
      
      const effectNames = {
        snow: '눈 내리는 효과',
        autumn: '가을 나뭇잎 효과',
        rain: '비 내리는 효과',
        none: '모든 효과'
      };
      
      Alert.alert(
        '설정 변경',
        newEffectType === 'none' ? '모든 효과가 비활성화되었습니다.' : `${effectNames[newEffectType]}가 활성화되었습니다.`
      );
    } catch (error) {
      Alert.alert('오류', error.message);
    }
  };


  const handleIntensityChange = async (value) => {
    try {
      const newIntensity = await effectSettingsService.setEffectIntensity(value);
      setSettings(prev => ({ ...prev, effectIntensity: newIntensity }));
    } catch (error) {
      Alert.alert('오류', error.message);
    }
  };

  const handlePremiumUpgrade = () => {
    // 실제 구독 로직으로 연결
    Alert.alert(
      '구독 안내',
      '프리미엄 구독 기능은 준비 중입니다.',
      [{ text: '확인' }]
    );
  };

  // 임시로 프리미엄 상태 토글 (개발용)
  const togglePremiumStatus = async () => {
    const newStatus = !settings.isPremiumUser;
    await effectSettingsService.setPremiumStatus(newStatus);
    setSettings(prev => ({ ...prev, isPremiumUser: newStatus, snowEffect: false, autumnEffect: false, rainEffect: false }));
    
    Alert.alert(
      '개발자 모드',
      `프리미엄 상태: ${newStatus ? '활성화' : '비활성화'}`
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>특수 효과 설정</Text>
      
      {/* 프리미엄 상태 표시 */}
      <View style={styles.premiumSection}>
        <View style={styles.premiumBadge}>
          <Text style={[styles.premiumText, settings.isPremiumUser && styles.premiumActive]}>
            {settings.isPremiumUser ? '💎 프리미엄 사용자' : '⭐ 일반 사용자'}
          </Text>
        </View>
        
        {/* 개발용 토글 버튼 */}
        <TouchableOpacity 
          style={styles.devButton} 
          onPress={togglePremiumStatus}
        >
          <Text style={styles.devButtonText}>
            {settings.isPremiumUser ? '프리미엄 해제' : '프리미엄 활성화'} (개발용)
          </Text>
        </TouchableOpacity>
      </View>

      {/* 눈 효과 설정 */}
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <Text style={styles.settingTitle}>❄️ 댓글 작성 시 눈 내리는 효과</Text>
          {!settings.isPremiumUser && (
            <Text style={styles.premiumLabel}>프리미엄</Text>
          )}
        </View>
        <Text style={styles.settingDescription}>
          댓글을 작성할 때 아름다운 눈 내리는 효과를 표시합니다.
        </Text>
        <Switch
          value={settings.snowEffect}
          onValueChange={() => handleEffectChange('snow')}
          trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
          thumbColor={settings.snowEffect ? '#FFFFFF' : '#FFFFFF'}
          disabled={!settings.isPremiumUser}
        />
      </View>

      {/* 가을 효과 설정 */}
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <Text style={styles.settingTitle}>🍂 댓글 작성 시 가을 나뭇잎 효과</Text>
          {!settings.isPremiumUser && (
            <Text style={styles.premiumLabel}>프리미엄</Text>
          )}
        </View>
        <Text style={styles.settingDescription}>
          댓글을 작성할 때 아름다운 가을 나뭇잎이 떨어지는 효과를 표시합니다.
        </Text>
        <Switch
          value={settings.autumnEffect}
          onValueChange={() => handleEffectChange('autumn')}
          trackColor={{ false: '#E0E0E0', true: '#FF8C00' }}
          thumbColor={settings.autumnEffect ? '#FFFFFF' : '#FFFFFF'}
          disabled={!settings.isPremiumUser}
        />
      </View>

      {/* 비 효과 설정 */}
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <Text style={styles.settingTitle}>🌧️ 댓글 작성 시 비 내리는 효과</Text>
          {!settings.isPremiumUser && (
            <Text style={styles.premiumLabel}>프리미엄</Text>
          )}
        </View>
        <Text style={styles.settingDescription}>
          댓글을 작성할 때 자연스러운 비 내리는 효과를 표시합니다.
        </Text>
        <Switch
          value={settings.rainEffect}
          onValueChange={() => handleEffectChange('rain')}
          trackColor={{ false: '#E0E0E0', true: '#2196F3' }}
          thumbColor={settings.rainEffect ? '#FFFFFF' : '#FFFFFF'}
          disabled={!settings.isPremiumUser}
        />
      </View>

      {/* 효과 강도 설정 */}
      {settings.isPremiumUser && (settings.snowEffect || settings.autumnEffect || settings.rainEffect) && (
        <View style={styles.settingItem}>
          <Text style={styles.settingTitle}>
            {settings.snowEffect ? '🌨️ 눈 내리는 강도' : 
             settings.autumnEffect ? '🍂 나뭇잎 떨어지는 강도' : 
             settings.rainEffect ? '🌧️ 비 내리는 강도' : '⚡ 효과 강도'}
          </Text>
          <Text style={styles.settingDescription}>
            {settings.snowEffect ? '눈송이의 개수를 조절합니다' : 
             settings.autumnEffect ? '나뭇잎의 개수를 조절합니다' : 
             settings.rainEffect ? '빗줄기의 개수를 조절합니다' : '효과의 강도를 조절합니다'} (현재: {settings.effectIntensity}개)
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={10}
            maximumValue={100}
            value={settings.effectIntensity}
            onValueChange={handleIntensityChange}
            step={10}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#E0E0E0"
            thumbStyle={styles.sliderThumb}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>약함</Text>
            <Text style={styles.sliderLabel}>강함</Text>
          </View>
        </View>
      )}

      {/* 프리미엄 업그레이드 안내 */}
      {!settings.isPremiumUser && (
        <View style={styles.upgradeSection}>
          <Text style={styles.upgradeTitle}>🎨 더 많은 특수 효과를 원하시나요?</Text>
          <Text style={styles.upgradeDescription}>
            프리미엄 구독으로 눈❄️, 가을나뭇잎🍂, 비🌧️ 효과와 다양한 테마를 이용해보세요!
          </Text>
          <TouchableOpacity style={styles.upgradeButton} onPress={handlePremiumUpgrade}>
            <Text style={styles.upgradeButtonText}>프리미엄 구독하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  premiumSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginBottom: 12,
  },
  premiumText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  premiumActive: {
    color: '#FFD700',
  },
  devButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  premiumLabel: {
    backgroundColor: '#FFD700',
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: 10,
  },
  sliderThumb: {
    backgroundColor: '#2196F3',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  upgradeSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EffectSettings;
