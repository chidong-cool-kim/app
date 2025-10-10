const connectDB = require('./connection');
const User = require('./userSchema');
const Verification = require('./verificationSchema');
const StudySession = require('./studySchema');
const Plan = require('./planSchema');
const Note = require('./noteSchema');
const Post = require('./communitySchema');
const StudyGroup = require('./studyGroupSchema');

module.exports = {
    connectDB,
    User,
    Verification,
    StudySession,
    Plan,
    Note,
    Post,
    StudyGroup,
};
