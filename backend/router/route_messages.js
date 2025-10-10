const express = require('express');
const router = express.Router();
const User = require('../db/userSchema');

// 로그 함수
const log = (message, data = null) => {
  console.log(`[MESSAGES] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// 메시지 스키마 (간단한 구조)
const messageSchema = {
  id: String,
  title: String,
  content: String,
  type: String, // 'notice', 'warning', 'info', 'promotion'
  recipientEmail: String,
  senderEmail: String,
  createdAt: Date,
  isRead: Boolean
};

// 사용자별 메시지 조회
router.get('/messages/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // 사용자 확인
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 사용자의 메시지 반환 (실제로는 별도 메시지 컬렉션을 사용하는 것이 좋음)
    const messages = user.messages || [];

    res.json({
      success: true,
      messages: messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });

  } catch (error) {
    console.error('메시지 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 조회에 실패했습니다.',
      error: error.message
    });
  }
});

// 관리자가 메시지 발송 (특정 관리자 이메일만 사용 가능)
router.post('/messages/send', async (req, res) => {
  try {
    const { senderEmail, recipientEmail, title, content, type = 'info' } = req.body;

    log('메시지 전송 요청 받음', { senderEmail, recipientEmail, title, content, type });

    // 필수 필드 확인
    if (!senderEmail || !recipientEmail || !content) {
      log('필수 필드 누락');
      return res.status(400).json({
        success: false,
        message: '발송자, 수신자, 내용이 모두 필요합니다.'
      });
    }

    // 발송자가 관리자인지 확인 (특정 이메일로 확인)
    if (senderEmail.toLowerCase() !== 'drda00001@gmail.com') {
      log('권한 없음', senderEmail);
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    // 수신자 확인 (이메일 또는 사용자명으로 검색)
    let recipient = await User.findOne({ email: recipientEmail.toLowerCase() });
    
    // 이메일로 찾지 못하면 사용자명으로 검색
    if (!recipient) {
      recipient = await User.findOne({ 
        $or: [
          { username: recipientEmail },
          { name: recipientEmail }
        ]
      });
    }
    
    if (!recipient) {
      log('수신자를 찾을 수 없음', recipientEmail);
      return res.status(404).json({
        success: false,
        message: `수신자를 찾을 수 없습니다: ${recipientEmail}`
      });
    }
    
    log('수신자 찾음', { email: recipient.email, name: recipient.name });

    // 메시지 생성
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: title || `메시지 - ${new Date().toLocaleDateString()}`,
      content: content.trim(),
      type,
      recipientEmail: recipient.email,
      senderEmail: senderEmail.toLowerCase(),
      createdAt: new Date(),
      isRead: false
    };

    log('생성된 메시지', message);

    // 수신자의 메시지 배열에 추가
    if (!recipient.messages) {
      recipient.messages = [];
    }
    recipient.messages.push(message);

    // 메시지가 너무 많으면 오래된 것 삭제 (최대 50개 유지)
    if (recipient.messages.length > 50) {
      recipient.messages = recipient.messages.slice(-50);
    }

    await recipient.save();
    
    log('메시지 저장 완료', { recipientEmail: recipient.email, messageCount: recipient.messages.length });

    res.json({
      success: true,
      message: '메시지가 발송되었습니다.',
      messageId: message.id,
      recipient: {
        email: recipient.email,
        name: recipient.name
      }
    });

  } catch (error) {
    console.error('메시지 발송 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 발송에 실패했습니다.',
      error: error.message
    });
  }
});

// 모든 사용자에게 공지사항 발송 (관리자만)
router.post('/messages/broadcast', async (req, res) => {
  try {
    const { senderEmail, title, content, type = 'notice' } = req.body;

    // 발송자가 관리자인지 확인 (특정 이메일로 확인)
    if (senderEmail.toLowerCase() !== 'drda00001@gmail.com') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    // 모든 사용자 조회 (관리자 제외)
    const users = await User.find({ role: { $ne: 'admin' } });

    let successCount = 0;
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    for (const user of users) {
      try {
        const message = {
          id: messageId + '_' + user._id,
          title,
          content,
          type,
          recipientEmail: user.email,
          senderEmail: senderEmail.toLowerCase(),
          createdAt: new Date(),
          isRead: false
        };

        if (!user.messages) {
          user.messages = [];
        }
        user.messages.push(message);

        // 메시지가 너무 많으면 오래된 것 삭제
        if (user.messages.length > 50) {
          user.messages = user.messages.slice(-50);
        }

        await user.save();
        successCount++;
      } catch (userError) {
        console.error(`사용자 ${user.email}에게 메시지 발송 실패:`, userError);
      }
    }

    res.json({
      success: true,
      message: `${successCount}명의 사용자에게 메시지가 발송되었습니다.`,
      totalUsers: users.length,
      successCount
    });

  } catch (error) {
    console.error('브로드캐스트 메시지 발송 오류:', error);
    res.status(500).json({
      success: false,
      message: '브로드캐스트 메시지 발송에 실패했습니다.',
      error: error.message
    });
  }
});

// 메시지 읽음 처리
router.patch('/messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userEmail } = req.body;

    log('메시지 읽음 처리 요청', { messageId, userEmail });

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: '사용자 이메일이 필요합니다.'
      });
    }

    // 사용자 찾기
    const user = await User.findOne({ email: userEmail.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 해당 메시지 찾기 및 읽음 처리
    const messageIndex = user.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '메시지를 찾을 수 없습니다.'
      });
    }

    user.messages[messageIndex].isRead = true;
    await user.save();

    log('메시지 읽음 처리 완료', { messageId, userEmail });

    res.json({
      success: true,
      message: '메시지가 읽음 처리되었습니다.'
    });

  } catch (error) {
    console.error('메시지 읽음 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 읽음 처리에 실패했습니다.',
      error: error.message
    });
  }
});

// 읽지 않은 메시지 개수 조회
router.get('/messages/:email/unread-count', async (req, res) => {
  try {
    const { email } = req.params;

    // 사용자 확인
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 읽지 않은 메시지 개수 계산
    const unreadCount = user.messages ? user.messages.filter(msg => !msg.isRead).length : 0;

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('읽지 않은 메시지 개수 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '읽지 않은 메시지 개수 조회에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
