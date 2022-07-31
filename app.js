/*jshint esversion: 6 */
require('dotenv').config();
const socketio = require('socket.io')
const express = require('express');
const app = express();
const flash = require('express-flash');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');

//Set view engine
app.set('view engine', 'ejs');


app.use(express.urlencoded({extended: false}));
//Set public resources
app.use(express.static(__dirname + '/public'));

//Set cookies and session
app.use(cookieParser('doodleragon'));
app.use(session({
  //Extend session's duration by maxAge
  //when receiving any request,
  rolling: true,
  //Session's duration
  cookie: {
    maxAge: 1000*60*15
}}));
app.use(flash());

//Set routers
const userRouter = require('./routers/user');
const postRouter = require('./routers/post');
const notificationRouter = require('./routers/notification');
app.use('/user', userRouter);
app.use('/post', postRouter);
app.use('/notification', notificationRouter);


app.get('/', (req,res) => {
  if (req.session.user) {
    return res.redirect('/home');
  }

  const alert = req.flash('alert')[0] || '';
  
  let isStudent = req.flash('is-student')[0] || 'student';
  isStudent = isStudent==='student'?true:false;

  console.log(alert, isStudent);

  return res.render('login', {alert, isStudent});
});

app.get('/home', (req,res) => {
  if (!req.session.user) {
    req.flash('alert', {
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });

    return res.redirect('/');
  }

  const {nameTag, name, avatar, role} = req.session.user;

  return res.render('home', {currentUser: {nameTag, name, avatar, role}});
});

const port = process.env.PORT;
const uri = process.env.MONGODB_URI;

mongoose.connect(uri, {
     useNewUrlParser: true,
     useUnifiedTopology: true
})
.then(() => {
  const httpServer = app.listen(port, () => {
    console.log('http://localhost:'+port);
  });
  const io = socketio(httpServer);

  io.on('connection', client => {
    client.on('newNoft', noftTopic => {
      client.broadcast.emit('newNoft', noftTopic);
    });
  });
})
.catch(e => console.log('Không thể kết nối tới mongoDB: '+ e.message));

