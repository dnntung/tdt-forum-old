/*jshint esversion: 6 */
const express = require('express');
const Router = express.Router();
const {validationResult} = require('express-validator');
const passport = require('passport');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

//Get mongoDB's model
const User = require('../models/user');

const uploader = multer({
  dest: __dirname + '/../temp'
});

//Validation for user
const userValidator = require('./validators/user');

// Google Authentication
let receivedUserInfo;

Router.use(passport.initialize());
Router.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '789900594668-lonbu7u54dmq3kigmriipf7f6t5ra86h.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'jrtpyAtfTXJR2vXomI-hCAo1';

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/user/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
      console.log("RECEIVED PROFILE:", profile);
      receivedUserInfo=profile;
      return done(null, receivedUserInfo);
  }
));

Router.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
// Create/login student account using email
/** DONE */ Router.get('/auth/google/callback', 
  passport.authenticate('google', {
    //Redirect to error page after failed login
    failureRedirect: '/error' 
  }),
  (req, res) => {
    // Successful authentication
    // Start validating auth user by redirect to /user/login (GET)
    const {displayName} = receivedUserInfo;
    const email = receivedUserInfo._json.email;
    const studentId = email.replace('@student.tdtu.edu.vn', '');
    const avatar = receivedUserInfo._json.picture;

    if (email.includes('@student.tdtu.edu.vn')) {
      const username = 'google:'+studentId;

      User.findOne({username: username})
        .then(result => {
          if (!result) {
            console.log('NEW STUDENT ARRIVED!');
            new User({
              username: username,
              nameTag: studentId,
              name: displayName,
              avatar: avatar,
              role: 3,
              otherInfo: {
                major: '', 
                class: ''
              }
            })
            .save()
            .then(result => {
              req.session.user = {
                username: username,
                name: displayName, 
                avatar: avatar, 
                role: result.role, 
                nameTag: studentId
              };
              console.log('STUDENT LOGIN', req.session.user);

              return res.redirect('/home');
            });
          }
          else {
            req.session.user = {
              username: username,
              name: result.name, 
              avatar: result.avatar, 
              role: result.role, 
              nameTag: result.nameTag
            };
            console.log('STUDENT LOGIN', req.session.user);

            return res.redirect('/home');
          }
        })
        .catch(e => {
          console.log(e);
          req.flash('alert', {
            status: 'warning',
            msg: 'L???i h??? th???ng, vui l??ng th??? l???i!'
          });

          return res.redirect('/');
        });
    }
    else {
      req.flash('alert', {
        status: 'danger',
        msg: 'Vui l??ng s??? d???ng email sinh vi??n!'
      });

      return res.redirect('/');
    }
  }
);

Router.post('/change-password/', (req, res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui l??ng ????ng nh???p!'
    });
  }

  if (req.session.user.role ===3) {
    return res.json({
      status: 'danger',
      msg: 'Y??u c???u kh??ng h???p l???!'
    });
  }

  const {username} = req.session.user;
  const {currentPassword, newPassword} = req.body;

  User.findOne({username: username}) 
    .then(result => {
      if (!result) {
        return res.json({
          status: 'warning',
          msg: '???? c?? l???i x???y ra!'
        });
      }

      const {password} = result;

      if (!bcrypt.compareSync(currentPassword, password)) {
        return res.json({
          status: 'warning',
          msg: 'M???t kh???u hi???n t???i kh??ng ????ng!'
        });
      }

      result.password = bcrypt.hashSync(newPassword, 10); 

      result.save()
        .then(result => {
          return res.json({
            status: 'success', 
            msg: 'Thay ?????i m???t kh???u th??nh c??ng!'
          })
        })
    })
    .catch(e => { 
      return res.json({
        status: 'warning', 
        msg: '???? c?? l???i x???y ra: '+e
      })
    })
});

// Login department/admin account using username and password
/** DONE */ Router.post('/login', userValidator.login(), (req,res) => {
  const {tab} = req.body;

  //Re-select the previous login's tab
  //if user is returned to login page
  req.flash('is-student', tab?tab:'student');

  const vResult = validationResult(req);
  if (vResult.errors.length > 0) {
    req.flash('alert', {
      status: 'danger',
      msg: vResult.errors[0].msg
    });

    return res.redirect('/');
  }

  const {username, password} = req.body;

  User.findOne({username: username})
    .then(result => {
      if (!result) {
        req.flash('alert', {
          status: 'danger',
          msg: 'T??i kho???n kh??ng t???n t???i!'
        });
        
        return res.redirect('/');
      }
      if (!bcrypt.compareSync(password, result.password)) {
        req.flash('alert', {
          status: 'danger',
          msg: 'M???t kh???u t??i kho???n kh??ng ????ng!'
        });

        return res.redirect('/');
      }

      req.session.user = {
        username: result.username,
        nameTag: result.nameTag,
        name: result.name,
        avatar: result.avatar,
        role: result.role
      };
      console.log('NON_STUDENT LOGIN', req.session.user);

      return res.redirect('/home');
    })
    .catch(e => {
      console.log(e);
      req.flash('alert', {
        status: 'warning',
        msg: 'L???i h??? th???ng, vui l??ng th??? l???i!'
      });
      
      return res.redirect('/');
    });
});

//Create account for department user
Router.post('/create', userValidator.create(), async (req,res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  //*ADMIN ONLY
  if (req.session.user.role!==1) {
    return res.redirect('/');
  }

  //Get errors from validator
  let vResult = validationResult(req);
  if (vResult.errors.length >  0) {
    return res.json({
      status: 'danger',
      msg: vResult.errors[0].msg
    });
  }

  const {username, password, selectedTopics} = req.body;


  try {
    const user = await User.findOne({username: username});
    if (user) {
      return res.json({
        status: 'danger',
        msg: 'Username ???? t???n t???i!'
      });
    }
    new User({
      name: username,
      username: username,
      nameTag: username,
      password: bcrypt.hashSync(password, 10), 
      role: 2,
      otherInfo: {
        topics: selectedTopics
      }
    }).save();

    return res.json({
      status: 'success',
      msg: 'T???o t??i kho???n th??nh c??ng!'
    });
  }
  catch (e) {
    return res.json({
      status: 'warning',
      msg: '???? c?? l???i x???y ra: '+e
    });
  }
});

//Update user's info
// Router.put('/:username', (req,res) => {
//   if (!req.session.user) {
//     return res.redirect('/');
//   }
// });

//Logout current user
/** DONE */ Router.get('/logout', (req,res) => {
  req.session.destroy();

  return res.redirect('/');
});

Router.get('/topics', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui l??ng ????ng nh???p!'
    });
  }

  const {role,username} = req.session.user

  if (role === 3) {
    return res.json({
      status: 'danger',
      msg: 'B???n kh??ng c?? quy???n ????ng th??ng b??o!'
    });
  }

  try {
    let topics = ''

    if (role === 1) {
      topics = [
        "Ph??ng C??ng t??c h???c sinh sinh vi??n (CTHSSV)",
        "Ph??ng ?????i h???c", 
        "Ph??ng Sau ?????i h???c", 
        "Ph??ng ??i???n to??n v?? m??y t??nh", 
        "Ph??ng kh???o th?? v?? ki???m ?????nh ch???t l?????ng", 
        "Ph??ng t??i ch??nh", 
        "TDT Creative Language Center", 
        "Trung t??m tin h???c", 
        "Trung t??m ????o t???o ph??t tri???n x?? h???i (SDTC)", 
        "Trung t??m ph??t tri???n Khoa h???c qu???n l?? v?? ???ng d???ng c??ng ngh??? (ATEM)", 
        "Trung t??m h???p t??c doanh nghi???p v?? c???u sinh vi??n", 
        "Khoa Lu???t", 
        "Trung t??m ngo???i ng??? - tin h???c ??? b???i d?????ng v??n h??a", 
        "Vi???n ch??nh s??ch kinh t??? v?? kinh doanh", 
        "Khoa M??? thu???t c??ng nghi???p", 
        "Khoa ??i???n ??? ??i???n t???", 
        "Khoa C??ng ngh??? th??ng tin", 
        "Khoa Qu???n tr??? kinh doanh", 
        "Khoa M??i tr?????ng v?? b???o h??? lao ?????ng", 
        "Khoa Lao ?????ng c??ng ??o??n", 
        "Khoa T??i ch??nh ng??n h??ng", 
        "Khoa gi??o d???c qu???c t???"
      ].join(',')
    }
    else {
      const user = await User.findOne({username: username})
      topics = user.otherInfo.topics
    }
  
    return res.json({
      status: 'success', 
      data: topics
    });
  }
  catch(e) {
    return res.json({
      status: 'warning', 
      data: '???? c?? l???i x???y ra: '+e
    });
  }
}); 

//Get selected user
Router.get('/:userNameTag', async (req,res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const {userNameTag} = req.params;
  const {nameTag, name, avatar, role} = req.session.user;

  const selectedUser = await User.findOne({nameTag: userNameTag}); 
  //?
  return res.render('user', {
    currentUser: {nameTag, name, avatar, role},
    selectedUser: {
      name: selectedUser.name,
      nameTag: selectedUser.nameTag,
      avatar: selectedUser.avatar,
      role: selectedUser.role,
      otherInfo: selectedUser.otherInfo
    }
  });
});

Router.post('/:userNameTag', uploader.single('userAvatar'), async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui l??ng ????ng nh???p!'
    });
  }

  const {nameTag, role} = req.session.user
  const {userNameTag} = req.params;

  if (userNameTag !== nameTag) {
    return res.json({
      status: 'danger',
      msg: 'B???n kh??ng c?? quy???n ch???nh s???a th??ng tin n??y!'
    });
  }

  const {userName, userClass, userMajor, userCurrentAvatar} = req.body;
  const userAvatar = req.file;
  try {
    const user = await User.findOne({nameTag: userNameTag})

    user.name = userName
  
    if (role === 3) {
      if (userClass) {
        user.otherInfo.class = userClass
      }
  
      if (userClass) {
        user.otherInfo.major = userMajor
      }
    }

    if (userAvatar) {
      const fileName = `${userNameTag}_${userAvatar.originalname}`;
  
      user.avatar = '/images/users/'+fileName
    }
  
    await user.save()

    if (userAvatar) {
      const currentPath = userAvatar.path;
      const savePath = path.join(__dirname,`/../public`);
  
      if (!fs.existsSync(savePath+'/images/users')) {
        fs.mkdirSync(savePath+'/images/users');
      }

      
      fs.renameSync(currentPath, savePath+user.avatar);

      if (userCurrentAvatar.includes('/images/users/')) {
        if (fs.existsSync(savePath+userCurrentAvatar)) {
          fs.unlinkSync(savePath+userCurrentAvatar);
        }
      }
    }
  
    let data = {
      userName: user.name,
      userAvatar: user.avatar,
    };
  
    if (req.session.user.role === 3) {
      Object.assign(data, {
        userMajor: user.otherInfo.major,
        userClass: user.otherInfo.class
      });
    }
  
    req.session.user.name = user.name;
    req.session.user.avatar = user.avatar;
    
    return res.json({
      status: 'success',
      msg: 'C???p nh???t th??ng tin th??nh c??ng!',
      data: data
    });
  }
  catch(e) {
    console.log(e)

    if (userAvatar) {
      const currentPath = userAvatar.path;

      if (fs.existsSync(currentPath)) {
        fs.unlinkSync(currentPath);
      }
    }

    return res.json({
      status: 'warning',
      msg: '???? c?? l???i x???y ra: '+ e
    })
  }
});

module.exports = Router;