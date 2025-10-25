const mongoose = require('mongoose');

const mockExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  images: {
    type: [String],
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const MockExam = mongoose.model('MockExam', mockExamSchema);

module.exports = MockExam;
