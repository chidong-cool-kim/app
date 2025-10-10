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

const fixBanInfo = async () => {
    try {
        await connectDB();

        console.log('banInfo 필드 수정 시작...');

        // banInfo가 없거나 잘못된 사용자들 찾기
        const users = await User.find({
            $or: [
                { banInfo: { $exists: false } },
                { 'banInfo.isBanned': { $exists: false } }
            ]
        });

        console.log(`수정할 사용자 수: ${users.length}`);

        for (const user of users) {
            console.log(`사용자 수정 중: ${user.email}`);
            
            // banInfo 초기화
            user.banInfo = {
                isBanned: false,
                banReason: null,
                banStartDate: null,
                banEndDate: null,
                bannedBy: null
            };

            // role이 없으면 기본값 설정
            if (!user.role) {
                user.role = 'user';
            }

            await user.save();
            console.log(`✅ ${user.email} 수정 완료`);
        }

        console.log('🎉 모든 사용자 banInfo 수정 완료!');

        // 특정 계정을 관리자로 설정
        const adminEmail = 'drda00001@gmail.com';
        const adminUser = await User.findOne({ email: adminEmail });
        
        if (adminUser) {
            adminUser.role = 'admin';
            await adminUser.save();
            console.log(`🔧 ${adminEmail} 관리자 권한 설정 완료`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ banInfo 수정 실패:', error);
        process.exit(1);
    }
};

// 스크립트 실행
fixBanInfo();
