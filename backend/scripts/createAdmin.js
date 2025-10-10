const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    provider: String,
    providerId: String,
    username: String,
    profileImage: String,
    isEmailVerified: Boolean,
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    banInfo: {
        isBanned: Boolean,
        banType: String,
        banReason: String,
        banStartDate: Date,
        banEndDate: Date,
        bannedBy: mongoose.Schema.Types.ObjectId,
    },
    notes: Array,
    aiChats: Array,
    planners: Array,
    dailyStudy: Object,
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

const createAdminAccount = async () => {
    try {
        await connectDB();

        const adminEmail = 'drda00001@gmail.com';
        const adminPassword = 'rlaalswns00~';

        // 기존 계정 확인
        let adminUser = await User.findOne({ email: adminEmail });

        if (adminUser) {
            console.log('기존 관리자 계정 발견, 권한 업데이트 중...');
            
            // 관리자 권한 부여
            adminUser.role = 'admin';
            
            // 비밀번호 업데이트 (필요한 경우)
            if (adminUser.provider === 'email') {
                const hashedPassword = await bcrypt.hash(adminPassword, 12);
                adminUser.password = hashedPassword;
            }
            
            await adminUser.save();
            console.log('✅ 기존 계정을 관리자로 업데이트했습니다.');
        } else {
            console.log('새 관리자 계정 생성 중...');
            
            // 비밀번호 해시화
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            // 새 관리자 계정 생성
            adminUser = new User({
                name: '관리자',
                email: adminEmail,
                password: hashedPassword,
                provider: 'email',
                providerId: adminEmail,
                username: 'admin',
                isEmailVerified: true,
                role: 'admin',
                banInfo: {
                    isBanned: false,
                    banType: null,
                    banReason: null,
                    banStartDate: null,
                    banEndDate: null,
                    bannedBy: null,
                },
                notes: [],
                aiChats: [],
                planners: [],
                dailyStudy: {
                    date: new Date().toISOString().split('T')[0],
                    totalMinutes: 0,
                    sessions: [],
                },
            });

            await adminUser.save();
            console.log('✅ 새 관리자 계정을 생성했습니다.');
        }

        console.log('\n📋 관리자 계정 정보:');
        console.log(`이메일: ${adminUser.email}`);
        console.log(`이름: ${adminUser.name}`);
        console.log(`역할: ${adminUser.role}`);
        console.log(`생성일: ${adminUser.createdAt}`);

        // 다른 관리자 계정들도 확인
        const allAdmins = await User.find({ role: 'admin' });
        console.log(`\n👥 전체 관리자 수: ${allAdmins.length}`);
        allAdmins.forEach(admin => {
            console.log(`- ${admin.name} (${admin.email})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ 관리자 계정 생성 실패:', error);
        process.exit(1);
    }
};

// 스크립트 실행
createAdminAccount();
