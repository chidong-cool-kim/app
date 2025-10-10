const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB 연결
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://drda8881:rlaalswns00@cluster0.3mcfs.mongodb.net/study-app?retryWrites=true&w=majority');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        process.exit(1);
    }
};

// User 스키마 (간단 버전)
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const setAdminRole = async () => {
    try {
        await connectDB();

        const adminEmail = 'drda00001@gmail.com';

        // 해당 계정 찾기
        const user = await User.findOne({ email: adminEmail });

        if (!user) {
            console.log('❌ 해당 계정을 찾을 수 없습니다:', adminEmail);
            process.exit(1);
        }

        console.log('✅ 계정 발견:', user.email);
        console.log('현재 역할:', user.role || 'user');

        // 관리자 권한 부여
        user.role = 'admin';
        
        // banInfo가 없으면 초기화
        if (!user.banInfo) {
            user.banInfo = {
                isBanned: false,
                banType: null,
                banReason: null,
                banStartDate: null,
                banEndDate: null,
                bannedBy: null,
            };
        }

        await user.save();

        console.log('🎉 관리자 권한이 설정되었습니다!');
        console.log('📋 업데이트된 정보:');
        console.log(`이메일: ${user.email}`);
        console.log(`이름: ${user.name}`);
        console.log(`역할: ${user.role}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ 관리자 권한 설정 실패:', error);
        process.exit(1);
    }
};

// 스크립트 실행
setAdminRole();
