/*jshint esversion: 6 */
const mongoose = require('mongoose');

const Post = mongoose.model('Post', mongoose.Schema({
  poster: Object,
  content: String,
  dateCreated: {
    type: Date,
    default: new Date()
  },
  dateModified: {
    type: Date,
    default: new Date()
  },
  likes: [Object],
  comments: [Object],
  attachment: Object
}));
module.exports = Post;