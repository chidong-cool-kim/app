require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./db/connection');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;
const cron = require('node-cron');
const { User } = require('./db');

// 보안 헤더 설정
app.use((req, res, next) => {
    // XSS 보호
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // HTTPS 강제 (프로덕션에서)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // 민감한 서버 정보 숨기기
    res.removeHeader('X-Powered-By');
    
    next();
});

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] // 프로덕션에서는 특정 도메인만 허용
        : true, // 개발 환경에서는 모든 도메인 허용
    credentials: true,
    optionsSuccessStatus: 200
}));

// JSON 크기 제한 (DoS 공격 방지)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 업로드 디렉토리 확인 및 생성
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 uploads 디렉토리 생성됨');
}

if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
    console.log('📁 uploads/profiles 디렉토리 생성됨');
}

// 정적 파일 서빙 (업로드된 이미지)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('📂 정적 파일 서빙 설정:', path.join(__dirname, 'uploads'));

// MongoDB 연결
connectDB();

// 매일 자정 데이터 정리 스케줄러 (공부시간은 유지)
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('🕛 자정 - 사용자 데이터 정리 시작 (공부시간 유지)');
        const users = await User.find({});
        
        for (const user of users) {
            user.checkAndResetDaily(); // 이제 공부시간을 초기화하지 않음
            await user.save();
        }
        
        console.log(`✅ ${users.length}명의 사용자 데이터 정리 완료`);
    } catch (error) {
        console.error('❌ 데이터 정리 실패:', error);
    }
});

// 매주 월요일 자정 주간 공부시간 완전 초기화 스케줄러
cron.schedule('0 0 * * 1', async () => {
    try {
        console.log('🗓️ 월요일 자정 - 모든 사용자 주간 공부시간 완전 초기화 시작');
        const users = await User.find({});
        
        for (const user of users) {
            // 새로운 주 시작 - 모든 데이터 완전 초기화
            const now = new Date();
            const weekStart = now.toISOString().split('T')[0]; // 오늘이 월요일
            
            user.weeklyStudy = {
                weekStart: weekStart,
                dailyMinutes: {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                },
                totalMinutes: 0,
                sessions: [],
            };
            user.weeklyStudyLastReset = now;
            
            await user.save();
        }
        
        console.log(`🎯 ${users.length}명의 사용자 주간 공부시간 완전 초기화 완료`);
    } catch (error) {
        console.error('❌ 주간 공부시간 완전 초기화 실패:', error);
    }
});

// Routes
const signupRoutes = require('./router/route_1');
const authRoutes = require('./router/route_2');
const communityRoutes = require('./router/route_3');
const emailRoutes = require('./router/route_email');
const aiRoutes = require('./router/route_ai');
const adminRoutes = require('./router/route_admin');
const studyGroupRoutes = require('./router/route_studygroup');
const subscriptionRoutes = require('./router/route_subscription');
const messageRoutes = require('./router/route_messages');
const iapRoutes = require('./router/route_iap');
const noteRoutes = require('./router/route_notes');
const plannerRoutes = require('./router/route_planner');
const googleOAuthRoutes = require('./router/route_google_oauth');

app.use('/api/signup', signupRoutes);
app.use('/api/auth', signupRoutes); // route_1.js를 /api/auth로도 등록 (초대 API용)
app.use('/api', signupRoutes); // route_1.js를 /api로도 등록 (user/details API용)
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); // 사용자 데이터 조회용 (/api/user-data 경로 포함)
app.use('/api/auth', googleOAuthRoutes); // Google OAuth 라우트
app.use('/api/community', communityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/study-groups', studyGroupRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', messageRoutes);
app.use('/api', emailRoutes);
app.use('/api/iap', iapRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api', plannerRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Study App API Server Running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Socket.IO 연결 관리
const onlineUsers = new Map(); // userId -> socketId
const studyGroupRooms = new Map(); // studyGroupId -> Set of userIds

io.on('connection', (socket) => {
    console.log('🔌 새로운 사용자 연결됨:', socket.id);

    // 사용자 온라인 상태 등록
    socket.on('user_online', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        console.log(`👤 사용자 ${userId} 온라인 상태로 변경 (Socket: ${socket.id})`);
        console.log('📊 현재 온라인 사용자 수:', onlineUsers.size);
        console.log('📋 온라인 사용자 목록:', Array.from(onlineUsers.keys()));
        
        // 사용자가 속한 스터디그룹에 온라인 상태 알림
        socket.broadcast.emit('user_status_changed', {
            userId,
            status: 'online'
        });
    });

    // 스터디그룹 방 참여
    socket.on('join_study_group', (studyGroupId) => {
        socket.join(`study_group_${studyGroupId}`);
        
        if (!studyGroupRooms.has(studyGroupId)) {
            studyGroupRooms.set(studyGroupId, new Set());
        }
        studyGroupRooms.get(studyGroupId).add(socket.userId);
        
        console.log(`사용자 ${socket.userId}가 스터디그룹 ${studyGroupId}에 참여`);
    });

    // 노트 공유 초대 전송
    socket.on('send_note_invitation', (data) => {
        console.log('📧 초대 전송 요청 수신:', data);
        const { toUserId, fromUserId, noteTitle, roomId } = data;
        const targetSocketId = onlineUsers.get(toUserId);
        
        console.log(`🔍 대상 사용자 ${toUserId}의 Socket ID: ${targetSocketId}`);
        console.log('📋 현재 온라인 사용자들:', Array.from(onlineUsers.entries()));
        
        if (targetSocketId) {
            console.log(`✅ ${toUserId}에게 초대 전송 중...`);
            io.to(targetSocketId).emit('note_invitation_received', {
                fromUserId,
                fromUserName: data.fromUserName,
                noteTitle,
                roomId,
                timestamp: new Date()
            });
            
            socket.emit('invitation_sent', { success: true, toUserId });
            console.log(`📨 초대 전송 완료: ${fromUserId} → ${toUserId}`);
        } else {
            console.log(`❌ 사용자 ${toUserId}가 오프라인 상태`);
            socket.emit('invitation_sent', { success: false, error: '사용자가 오프라인입니다.' });
        }
    });

    // 노트 공유 방 참여
    socket.on('join_note_room', (roomId) => {
        socket.join(`note_room_${roomId}`);
        socket.noteRoomId = roomId;
        
        socket.to(`note_room_${roomId}`).emit('user_joined_note', {
            userId: socket.userId,
            timestamp: new Date()
        });
        
        console.log(`사용자 ${socket.userId}가 노트 방 ${roomId}에 참여`);
    });

    // 실시간 노트 업데이트
    socket.on('note_update', (data) => {
        if (socket.noteRoomId) {
            socket.to(`note_room_${socket.noteRoomId}`).emit('note_updated', {
                ...data,
                userId: socket.userId,
                timestamp: new Date()
            });
        }
    });

    // 음성 채팅 상태 업데이트
    socket.on('voice_status_update', (data) => {
        if (socket.noteRoomId) {
            socket.to(`note_room_${socket.noteRoomId}`).emit('voice_status_changed', {
                userId: socket.userId,
                isActive: data.isActive,
                timestamp: new Date()
            });
        }
    });

    // 연결 해제
    socket.on('disconnect', () => {
        console.log(`🔌 사용자 연결 해제: ${socket.id}`);
        if (socket.userId) {
            console.log(`👤 사용자 ${socket.userId} 오프라인 처리`);
            onlineUsers.delete(socket.userId);
            
            // 스터디그룹 방에서 제거
            studyGroupRooms.forEach((users, studyGroupId) => {
                if (users.has(socket.userId)) {
                    users.delete(socket.userId);
                    if (users.size === 0) {
                        studyGroupRooms.delete(studyGroupId);
                    }
                }
            });
            
            // 오프라인 상태 알림
            socket.broadcast.emit('user_status_changed', {
                userId: socket.userId,
                status: 'offline'
            });
            
            console.log(`📊 현재 온라인 사용자 수: ${onlineUsers.size}`);
            console.log(`📋 온라인 사용자 목록:`, Array.from(onlineUsers.keys()));
        }
    });
});

// 온라인 사용자 상태 조회 API
app.get('/api/online-users', (req, res) => {
    const onlineUserIds = Array.from(onlineUsers.keys());
    res.json({
        success: true,
        onlineUsers: onlineUserIds,
        count: onlineUserIds.length
    });
});

// Temporary logging to verify environment variables
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Server accessible at:`);
    console.log(`  - http://localhost:${PORT}`);
    console.log(`  - http://127.0.0.1:${PORT}`);
    console.log(`  - http://192.168.45.53:${PORT}`);
});
