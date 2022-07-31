/*jshint esversion: 6 */
const mongoose = require('mongoose');
const User = mongoose.model('User', mongoose.Schema({
  username: {
    type: String,
    unique: true
  },
  nameTag: String,
  password: String,
  name: String,
  avatar: {
    type:String, 
    default: '/images/default_avatar.png'
  },
  role: Number,
  otherInfo: Object
}));
module.exports = User;