const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    firstName:String,
    lastName:String,
    mobileNo:{type:String,unique:true,required:true},
    email:{type:String,unique:true,required:true},
    userName:{type:String,unique:true,required:true},
    password:String,
    followers:[{type:mongoose.Types.ObjectId,ref:'User'}],
    following:[{type:mongoose.Types.ObjectId,ref:'User'}],
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
      },
      isLoggedIn: {
        type: Boolean,
        default: false,
    },
})
userSchema.index({ location: '2dsphere' });
const User = mongoose.model('User',userSchema);
module.exports = User;