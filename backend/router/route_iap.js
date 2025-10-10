const express = require('express');
const router = express.Router();
const { User } = require('../db');

// Google Play 영수증 검증
const verifyGooglePlayReceipt = async (purchaseToken, productId) => {
  try {
    // TODO: Google Play Developer API를 사용하여 실제 검증
    // 현재는 임시로 true 반환
    console.log('Google Play 영수증 검증:', { purchaseToken, productId });
    return { valid: true, data: { productId, purchaseToken } };
  } catch (error) {
    console.error('Google Play 영수증 검증 실패:', error);
    return { valid: false, error: error.message };
  }
};

// App Store 영수증 검증
const verifyAppStoreReceipt = async (receiptData) => {
  try {
    // TODO: App Store Server API를 사용하여 실제 검증
    // 현재는 임시로 true 반환
    console.log('App Store 영수증 검증:', receiptData);
    return { valid: true, data: receiptData };
  } catch (error) {
    console.error('App Store 영수증 검증 실패:', error);
    return { valid: false, error: error.message };
  }
};

// POST /api/iap/verify - 영수증 검증
router.post('/verify', async (req, res) => {
  try {
    const { 
      email, 
      platform, 
      receiptData, 
      purchaseToken, 
      productId,
      transactionId 
    } = req.body;

    if (!email || !platform || !productId) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다.'
      });
    }

    let verificationResult;

    if (platform === 'android') {
      if (!purchaseToken) {
        return res.status(400).json({
          success: false,
          message: 'Android 플랫폼에는 purchaseToken이 필요합니다.'
        });
      }
      verificationResult = await verifyGooglePlayReceipt(purchaseToken, productId);
    } else if (platform === 'ios') {
      if (!receiptData) {
        return res.status(400).json({
          success: false,
          message: 'iOS 플랫폼에는 receiptData가 필요합니다.'
        });
      }
      verificationResult = await verifyAppStoreReceipt(receiptData);
    } else {
      return res.status(400).json({
        success: false,
        message: '지원하지 않는 플랫폼입니다.'
      });
    }

    if (!verificationResult.valid) {
      return res.status(400).json({
        success: false,
        message: '영수증 검증에 실패했습니다.',
        error: verificationResult.error
      });
    }

    // 사용자 찾기
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 구독 정보 업데이트
    const subscriptionData = {
      platform,
      productId,
      transactionId: transactionId || purchaseToken,
      purchaseToken: platform === 'android' ? purchaseToken : null,
      receiptData: platform === 'ios' ? receiptData : null,
      verifiedAt: new Date(),
      isActive: true
    };

    // 사용자 구독 정보 업데이트
    user.subscription = {
      ...user.subscription,
      ...subscriptionData,
      updatedAt: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: '영수증 검증이 완료되었습니다.',
      subscription: user.subscription
    });

  } catch (error) {
    console.error('영수증 검증 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '영수증 검증에 실패했습니다.',
      error: error.message
    });
  }
});

// GET /api/iap/subscription/:email - 구독 상태 조회
router.get('/subscription/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      subscription: user.subscription || null
    });

  } catch (error) {
    console.error('구독 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '구독 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
