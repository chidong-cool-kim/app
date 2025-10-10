import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// IAP 기능은 개발 빌드에서만 작동 (Expo Go에서는 지원 안됨)
// import RNIap, {
//   Product,
//   Subscription,
import userDataService from './userDataService';
import OrientationGuard from './components/OrientationGuard';
import { getScreenInfo, responsive } from './utils/responsive';
import MiniTimer from './miniTimer';

// Google Play Console에 등록한 상품 ID
const PRODUCT_IDS = Platform.select({
  android: ['basic_monthly', 'premium_monthly'],
  ios: ['basic_monthly', 'premium_monthly'],
});

const PLANS = [
  {
    id: 'basic',
    productId: 'basic_monthly',
    name: '베이직',
    price: '9,900',
    aiQuestions: 30,
    aiModel: 'GPT-4o',
    features: [
      '프리미엄 프로필 커스터마이징',
      'AI 질문 월 30개',
      'GPT-4o 모델 사용',
      '고급 프로필 테마',
    ],
  },
  {
    id: 'premium',
    productId: 'premium_monthly',
    name: '프리미엄',
    price: '14,900',
    aiQuestions: 65,
    aiModel: 'GPT-4o',
    features: [
      '프리미엄 프로필 커스터마이징',
      'AI 질문 월 65개',
      'GPT-4o 최신 모델 사용',
      '프리미엄 프로필 테마',
      '고급 색상 팔레트',
      '우선 지원',
    ],
  },
];

export default function Store() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [screenInfo, setScreenInfo] = useState(getScreenInfo());
  const [purchaseUpdateSubscription, setPurchaseUpdateSubscription] = useState(null);
  const [purchaseErrorSubscription, setPurchaseErrorSubscription] = useState(null);

  // 화면 크기 변경 감지
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setScreenInfo(getScreenInfo());
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    initializeIAP();
    loadUserData();

    return () => {
      // IAP 정리 (개발 빌드에서만 필요)
      console.log('IAP 정리 - 개발 빌드에서만 작동');
    };
  }, []);

  // IAP 초기화 (임시 비활성화 - Expo Go에서는 지원 안됨)
  const initializeIAP = async () => {
    console.log('IAP 기능은 개발 빌드에서만 사용 가능합니다.');
    console.log('현재는 임시 결제 시스템을 사용합니다.');
  };


  const loadUserData = async () => {
    try {
      setLoading(true);

      const user = await userDataService.getCurrentUser();
      if (user) {
        const userData = await userDataService.getUserData();
        setUserData(userData);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  // 임시 결제 처리 (개발 중)
  const handlePayment = async () => {
    if (!selectedPlan) return;

    try {
      setProcessingPayment(true);
      console.log('임시 결제 처리:', selectedPlan.name);

      // 2초 대기 (결제 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const subscriptionData = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        aiQuestions: selectedPlan.aiQuestions,
        aiModel: selectedPlan.aiModel,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      };

      await userDataService.updateSubscription(subscriptionData);

      const updatedUser = {
        ...currentUser,
        subscription: subscriptionData,
      };

      await userDataService.updateCurrentUser(updatedUser);

      setProcessingPayment(false);
      setShowPaymentModal(false);

      Alert.alert(
        '구독 활성화 (개발 모드)',
        `${selectedPlan.name} 플랜이 활성화되었습니다!\n\n✅ ${selectedPlan.aiModel} 모델 사용 가능\n✅ AI 질문 ${selectedPlan.aiQuestions}개/월\n✅ 프로필 커스터마이징 기능\n\n※ 실제 결제는 앱 출시 후 가능합니다.`,
        [{ text: '확인', onPress: () => loadUserData() }]
      );
    } catch (error) {
      console.error('임시 결제 처리 실패:', error);
      setProcessingPayment(false);
      Alert.alert('오류', '결제 처리에 실패했습니다.');
    }
  };

  // 구독 복원 (개발 모드)
  const restorePurchases = async () => {
    Alert.alert(
      '개발 모드',
      '구독 복원 기능은 실제 앱 출시 후 사용할 수 있습니다.\n\n현재는 개발 모드로 임시 결제만 가능합니다.',
      [{ text: '확인', style: 'default' }]
    );
  };

  const getCurrentSubscription = () => {
    if (!currentUser?.subscription) return null;
    return currentUser.subscription;
  };

  const currentSubscription = getCurrentSubscription();

  // 가격 포맷팅
  const formatPrice = (product) => {
    if (!product) return '가격 정보 없음';
    
    if (product.localizedPrice) {
      return product.localizedPrice;
    }
    
    if (product.price) {
      return `₩${product.price.toLocaleString()}`;
    }
    
    return '가격 정보 없음';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 반응형 스타일 생성
  const getResponsiveStyles = () => {
    if (screenInfo.isPhone) {
      return phoneStyles;
    }
    return {}; // 태블릿은 기존 스타일 유지
  };

  const responsiveStyles = getResponsiveStyles();

  return (
    <OrientationGuard screenName="스토어">
      <SafeAreaView style={[styles.container, responsiveStyles.container]}> 
        <MiniTimer />
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>스토어</Text>
        <TouchableOpacity onPress={restorePurchases}>
          <Text style={styles.restoreButton}>복원</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 현재 구독 상태 */}
        {currentSubscription && (
          <View style={styles.currentSubscription}>
            <Text style={styles.currentSubscriptionTitle}>현재 구독 중</Text>
            <View style={styles.subscriptionCard}>
              <Text style={styles.subscriptionName}>{currentSubscription.planName}</Text>
              <Text style={styles.subscriptionPrice}>월 {currentSubscription.price}원</Text>
              <Text style={styles.subscriptionExpiry}>
                만료일: {new Date(currentSubscription.endDate).toLocaleDateString('ko-KR')}
              </Text>
              <View style={styles.subscriptionFeatures}>
                <Text style={styles.subscriptionFeature}>
                  ✅ {currentSubscription.aiModel} 모델 사용
                </Text>
                <Text style={styles.subscriptionFeature}>
                  ✅ AI 질문 {currentSubscription.aiQuestions}개/월
                </Text>
                <Text style={styles.subscriptionFeature}>
                  ✅ 프로필 커스터마이징 활성화
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 플랜 선택 */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>플랜 선택</Text>
          <Text style={styles.sectionSubtitle}>
            프로필을 더 멋지게 꾸미고 AI 질문을 더 많이 사용해보세요!
          </Text>

          {PLANS.map((plan) => {
            const product = Platform.OS === 'android' 
              ? subscriptions.find(s => s.productId === plan.productId)
              : products.find(p => p.productId === plan.productId);
            
            const displayPrice = product ? formatPrice(product) : `월 ${plan.price}원`;

            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  currentSubscription?.planId === plan.id && styles.currentPlanCard,
                ]}
                onPress={() => handlePlanSelect(plan)}
                disabled={currentSubscription?.planId === plan.id}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.planPrice}>{displayPrice}</Text>
                  </View>
                </View>

                <View style={styles.planContent}>
                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <Text key={index} style={styles.planFeature}>
                        • {feature}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.planFooter}>
                    {currentSubscription?.planId === plan.id ? (
                      <Text style={styles.currentPlanText}>현재 플랜</Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.subscribeButton}
                        onPress={() => handlePlanSelect(plan)}
                      >
                        <Text style={styles.subscribeButtonText}>구독하기</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 추가 정보 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 유의사항</Text>
          <Text style={styles.infoText}>
            • 구독은 매월 자동으로 갱신됩니다{'\n'}
            • 구독 취소는 Google Play 설정에서 언제든지 가능합니다{'\n'}
            • 사용하지 않은 AI 질문권은 다음 달로 이월되지 않습니다{'\n'}
            • 결제는 Google Play 계정으로 청구됩니다{'\n'}
            • 환불 정책은 Google Play 정책을 따릅니다
          </Text>
        </View>
      </ScrollView>

      {/* 결제 확인 모달 */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>결제 확인</Text>

            {selectedPlan && (
              <>
                <View style={styles.modalPlanInfo}>
                  <Text style={styles.modalPlanName}>{selectedPlan.name} 플랜</Text>
                  <Text style={styles.modalPlanModel}>{selectedPlan.aiModel} 모델</Text>
                  <Text style={styles.modalPlanPrice}>월 {selectedPlan.price}원</Text>
                  <Text style={styles.modalPlanQuestions}>
                    AI 질문 {selectedPlan.aiQuestions}개/월
                  </Text>
                </View>

                <View style={styles.modalFeatures}>
                  <Text style={styles.modalFeaturesTitle}>포함된 기능:</Text>
                  {selectedPlan.features.map((feature, index) => (
                    <Text key={index} style={styles.modalFeature}>
                      • {feature}
                    </Text>
                  ))}
                </View>

                <Text style={styles.modalNote}>
                  Google Play를 통해 결제가 진행됩니다.
                </Text>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPaymentModal(false)}
                disabled={processingPayment}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  processingPayment && styles.disabledButton,
                ]}
                onPress={handlePayment}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>결제하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </OrientationGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  restoreButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  currentSubscription: {
    margin: 20,
    marginBottom: 0,
  },
  currentSubscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  subscriptionCard: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
  },
  subscriptionName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subscriptionPrice: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  subscriptionExpiry: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  subscriptionFeatures: {
    gap: 4,
  },
  subscriptionFeature: {
    fontSize: 14,
    color: '#fff',
  },
  plansSection: {
    margin: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  currentPlanCard: {
    borderColor: '#4A90E2',
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
  },
  planContent: {
    flex: 1,
  },
  planFeatures: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  planFeature: {
    fontSize: 14,
    color: '#666',
  },
  planFooter: {
    alignItems: 'flex-end',
  },
  subscribeButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  infoSection: {
    margin: 20,
    marginTop: 0,
    marginBottom: 10,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalPlanInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalPlanName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalPlanPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 8,
  },
  modalPlanModel: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 4,
  },
  modalPlanQuestions: {
    fontSize: 16,
    color: '#666',
  },
  modalFeatures: {
    marginBottom: 16,
  },
  modalFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalFeature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ccc',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

// 핸드폰용 반응형 스타일
const phoneStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing(16),
    paddingVertical: responsive.spacing(12),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    fontSize: responsive.fontSize(16),
    color: '#4A90E2',
    fontWeight: '500',
  },
  restoreButton: {
    fontSize: responsive.fontSize(14),
    color: '#666',
  },
  scrollView: {
    flex: 1,
    padding: responsive.spacing(16),
  },
  subscriptionStatus: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: responsive.spacing(16),
    marginBottom: responsive.spacing(20),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusTitle: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: responsive.spacing(8),
  },
  statusText: {
    fontSize: responsive.fontSize(14),
    color: '#666',
    marginBottom: responsive.spacing(4),
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: responsive.spacing(16),
    marginBottom: responsive.spacing(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activePlanCard: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.spacing(12),
  },
  planName: {
    fontSize: responsive.fontSize(18),
    fontWeight: '700',
    color: '#333',
  },
  planPrice: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: '#4A90E2',
  },
  planDescription: {
    fontSize: responsive.fontSize(14),
    color: '#666',
    marginBottom: responsive.spacing(12),
  },
  featuresList: {
    marginBottom: responsive.spacing(16),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing(6),
  },
  featureText: {
    fontSize: responsive.fontSize(14),
    color: '#333',
    marginLeft: responsive.spacing(8),
  },
  subscribeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: responsive.spacing(12),
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: responsive.spacing(24),
  },
  modalTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: '600',
    color: '#333',
    marginBottom: responsive.spacing(16),
    textAlign: 'center',
  },
  modalText: {
    fontSize: responsive.fontSize(14),
    color: '#666',
    marginBottom: responsive.spacing(20),
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: responsive.spacing(12),
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: responsive.spacing(12),
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: responsive.spacing(12),
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
});