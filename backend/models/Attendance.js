const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  currentStreak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  totalDays: {
    type: Number,
    default: 0,
  },
  lastCheckIn: {
    type: Date,
    default: null,
  },
  checkInDates: [{
    type: Date,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 인덱스 설정
attendanceSchema.index({ userId: 1, lastCheckIn: -1 });

// 업데이트 시 updatedAt 자동 갱신
attendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
