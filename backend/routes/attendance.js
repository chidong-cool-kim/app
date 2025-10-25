const express = require('express');
const router = express.Router();
const User = require('../db/userSchema');

// 출석 데이터 조회
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    
    // attendance 필드가 없으면 초기화
    if (!user.attendance) {
      user.attendance = {
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        checkInDates: [],
      };
      await user.save();
    }
    
    res.json({
      success: true,
      data: user.attendance,
    });
  } catch (error) {
    console.error('출석 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '출석 데이터 조회에 실패했습니다.',
      error: error.message,
    });
  }
});

// 출석 체크
router.post('/check-in', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId가 필요합니다.',
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // attendance 필드 초기화
    if (!user.attendance) {
      user.attendance = {
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        checkInDates: [],
      };
    }
    
    // 오늘 이미 체크했는지 확인
    const lastCheck = user.attendance.lastCheckIn ? new Date(user.attendance.lastCheckIn) : null;
    const lastCheckDate = lastCheck ? new Date(lastCheck.getFullYear(), lastCheck.getMonth(), lastCheck.getDate()) : null;
    
    if (lastCheckDate && lastCheckDate.getTime() === today.getTime()) {
      return res.status(400).json({
        success: false,
        message: '오늘은 이미 출석체크를 완료했습니다.',
      });
    }
    
    // 어제 날짜
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 연속 출석 계산
    if (lastCheckDate && lastCheckDate.getTime() === yesterday.getTime()) {
      // 어제 출석했으면 연속 +1
      user.attendance.currentStreak += 1;
    } else {
      // 연속 끊김
      user.attendance.currentStreak = 1;
    }
    
    // 최장 연속 기록 갱신
    if (user.attendance.currentStreak > user.attendance.longestStreak) {
      user.attendance.longestStreak = user.attendance.currentStreak;
    }
    
    // 총 출석일 증가
    user.attendance.totalDays += 1;
    user.attendance.lastCheckIn = now;
    user.attendance.checkInDates.push(now);
    
    await user.save();
    
    res.json({
      success: true,
      message: '출석체크가 완료되었습니다!',
      data: user.attendance,
    });
  } catch (error) {
    console.error('출석체크 실패:', error);
    res.status(500).json({
      success: false,
      message: '출석체크에 실패했습니다.',
      error: error.message,
    });
  }
});

// 출석 통계 조회
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user || !user.attendance) {
      return res.json({
        success: true,
        data: {
          currentStreak: 0,
          longestStreak: 0,
          totalDays: 0,
          thisMonthDays: 0,
          thisWeekDays: 0,
        },
      });
    }
    
    // 이번 달 출석일 계산
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthDays = user.attendance.checkInDates.filter(date => 
      new Date(date) >= thisMonthStart
    ).length;
    
    // 이번 주 출석일 계산
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekDays = user.attendance.checkInDates.filter(date => 
      new Date(date) >= thisWeekStart
    ).length;
    
    res.json({
      success: true,
      data: {
        currentStreak: user.attendance.currentStreak,
        longestStreak: user.attendance.longestStreak,
        totalDays: user.attendance.totalDays,
        thisMonthDays,
        thisWeekDays,
        lastCheckIn: user.attendance.lastCheckIn,
      },
    });
  } catch (error) {
    console.error('출석 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '출석 통계 조회에 실패했습니다.',
      error: error.message,
    });
  }
});

// 출석 기록 초기화 (테스트용)
router.delete('/reset/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    
    user.attendance = {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      checkInDates: [],
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: '출석 기록이 초기화되었습니다.',
    });
  } catch (error) {
    console.error('출석 기록 초기화 실패:', error);
    res.status(500).json({
      success: false,
      message: '출석 기록 초기화에 실패했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;
