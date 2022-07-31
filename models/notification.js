/*jshint esversion: 6 */
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const notificationSchema = mongoose.Schema({
  poster: Object,
  title: String,
  content: String,
  topic: String,
  dateCreated: {
    type: Date,
    default: new Date()
  },
  dateModified: {
    type: Date,
    default: new Date()
  }
})

notificationSchema.plugin(mongoosePaginate);
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;