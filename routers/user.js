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
            msg: 'Lỗi hệ thống, vui lòng thử lại!'
          });

          return res.redirect('/');
        });
    }
    else {
      req.flash('alert', {
        status: 'danger',
        msg: 'Vui lòng sử dụng email sinh viên!'
      });

      return res.redirect('/');
    }
  }
);

Router.post('/change-password/', (req, res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  if (req.session.user.role ===3) {
    return res.json({
      status: 'danger',
      msg: 'Yêu cầu không hợp lệ!'
    });
  }

  const {username} = req.session.user;
  const {currentPassword, newPassword} = req.body;

  User.findOne({username: username}) 
    .then(result => {
      if (!result) {
        return res.json({
          status: 'warning',
          msg: 'Đã có lỗi xảy ra!'
        });
      }

      const {password} = result;

      if (!bcrypt.compareSync(currentPassword, password)) {
        return res.json({
          status: 'warning',
          msg: 'Mật khẩu hiện tại không đúng!'
        });
      }

      result.password = bcrypt.hashSync(newPassword, 10); 

      result.save()
        .then(result => {
          return res.json({
            status: 'success', 
            msg: 'Thay đổi mật khẩu thành công!'
          })
        })
    })
    .catch(e => { 
      return res.json({
        status: 'warning', 
        msg: 'Đã có lỗi xảy ra: '+e
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
          msg: 'Tài khoản không tồn tại!'
        });
        
        return res.redirect('/');
      }
      if (!bcrypt.compareSync(password, result.password)) {
        req.flash('alert', {
          status: 'danger',
          msg: 'Mật khẩu tài khoản không đúng!'
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
        msg: 'Lỗi hệ thống, vui lòng thử lại!'
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
        msg: 'Username đã tồn tại!'
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
      msg: 'Tạo tài khoản thành công!'
    });
  }
  catch (e) {
    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
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
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {role,username} = req.session.user

  if (role === 3) {
    return res.json({
      status: 'danger',
      msg: 'Bạn không có quyền đăng thông báo!'
    });
  }

  try {
    let topics = ''

    if (role === 1) {
      topics = [
        "Phòng Công tác học sinh sinh viên (CTHSSV)",
        "Phòng Đại học", 
        "Phòng Sau đại học", 
        "Phòng điện toán và máy tính", 
        "Phòng khảo thí và kiểm định chất lượng", 
        "Phòng tài chính", 
        "TDT Creative Language Center", 
        "Trung tâm tin học", 
        "Trung tâm đào tạo phát triển xã hội (SDTC)", 
        "Trung tâm phát triển Khoa học quản lý và Ứng dụng công nghệ (ATEM)", 
        "Trung tâm hợp tác doanh nghiệp và cựu sinh viên", 
        "Khoa Luật", 
        "Trung tâm ngoại ngữ - tin học – bồi dưỡng văn hóa", 
        "Viện chính sách kinh tế và kinh doanh", 
        "Khoa Mỹ thuật công nghiệp", 
        "Khoa Điện – Điện tử", 
        "Khoa Công nghệ thông tin", 
        "Khoa Quản trị kinh doanh", 
        "Khoa Môi trường và bảo hộ lao động", 
        "Khoa Lao động công đoàn", 
        "Khoa Tài chính ngân hàng", 
        "Khoa giáo dục quốc tế"
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
      data: 'Đã có lỗi xảy ra: '+e
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
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {nameTag, role} = req.session.user
  const {userNameTag} = req.params;

  if (userNameTag !== nameTag) {
    return res.json({
      status: 'danger',
      msg: 'Bạn không có quyền chỉnh sửa thông tin này!'
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
      msg: 'Cập nhật thông tin thành công!',
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
      msg: 'Đã có lỗi xảy ra: '+ e
    })
  }
});

module.exports = Router;