require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../db/userSchema');

// MongoDB 연결
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studytime', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB 연결 성공');
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error);
        process.exit(1);
    }
};

// 모든 사용자의 password를 'rlaalswns00~'로 업데이트
const updateAllPasswords = async () => {
    try {
        console.log('🔄 모든 사용자의 password 업데이트 시작...');
        
        // password가 없거나 빈 문자열인 사용자 찾기
        const users = await User.find({
            $or: [
                { password: { $exists: false } },
                { password: null },
                { password: '' }
            ]
        });

        console.log(`📊 업데이트할 사용자 수: ${users.length}명`);

        let updatedCount = 0;
        for (const user of users) {
            user.password = 'rlaalswns00~';
            await user.save();
            updatedCount++;
            console.log(`✅ ${updatedCount}/${users.length} - ${user.email} 업데이트 완료`);
        }

        console.log(`\n🎉 총 ${updatedCount}명의 사용자 password 업데이트 완료!`);
        console.log('📝 모든 사용자의 password: rlaalswns00~');
        
    } catch (error) {
        console.error('❌ Password 업데이트 실패:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB 연결 종료');
        process.exit(0);
    }
};

// 실행
const run = async () => {
    await connectDB();
    await updateAllPasswords();
};

run();
