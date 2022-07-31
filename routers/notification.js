/*jshint esversion: 6 */
const express = require('express');
const Router = express.Router();
const {validationResult} = require('express-validator');
const ObjectId = require('mongoose').Types.ObjectId; 
//Get mongoDB's model
const Notification = require('../models/notification');
const User = require('../models/user');
//Noft validator for user input
const notificationValidator = require('./validators/notification');

//Create noft
Router.post('/create', notificationValidator, async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const vResult = validationResult(req);

  if (vResult.errors.length > 0) {
    return res.json({
      status: 'danger',
      msg: vResult.errors[0].msg
    });
  }

  const {username, role} = req.session.user
  const {title, content, topic} = req.body;

  try {
    if (role!=1) {
      if (role!=2) {
        return res.json({
          status: 'danger',
          msg: 'Bạn không có quyền đăng thông báo trong chuyên mục này!'
        });
      }
      else {
        const user = await User.findOne({username: username});
        const userTopics = user.otherInfo.topics.split(',');

        if (!userTopics.includes(topic)) {
          return res.json({
            status: 'danger',
            msg: 'Bạn không có quyền đăng thông báo trong chuyên mục này!'
          });
        }
      }
    } 

    const noft = Notification({
      poster: {username},
      title: title, 
      content: content, 
      topic: topic
    })
    await noft.save()
    delete noft.poster.username

    return res.json({
      status: 'success',
      msg: 'Tạo thông báo mới thành công',
      data: noft
    });
  }
  catch(e) { 
    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: ' + e
    });
  }
});

//Delete noft
Router.delete('/:noftId', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {username, role} = req.session.user;
  const {noftId} = req.params;

  try {
    const noft = await Notification.findOne({_id: new ObjectId(noftId)});
  
    if (!noft) {
      return res.json({
        status: 'danger',
        msg: 'Thông báo không tồn tại!'
      });
    }

    if (role!=1) {
      if (role!=2) {
        return res.json({
          status: 'danger',
          msg: 'Bạn không có quyền xóa thông báo này!'
        });
      }
      else {
        const user = await User.findOne({username: username});
        const userTopics = user.otherInfo.topics.split(',');

        if (!userTopics.includes(noft.topic)) {
          return res.json({
            status: 'danger',
            msg: 'Bạn không có quyền xóa thông báo này!'
          });
        }
      }
    }    

    const result = await Notification.deleteOne({_id: new Object(noftId)})

    return res.json({
      status: 'success',
      msg: 'Thông báo đã được xóa thành công!'
    });
  }
  catch(e) { 
    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+ e
    })
  }
});

//Get noft detail
Router.get('/detail/:noftId', async (req,res) => {
  const {noftId} = req.params;

  try {
    const noft = await Notification.findOne({_id: new ObjectId(noftId)})
  
    if (!noft) {
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy thông báo!'
      });
    }
  
    const {title, content, topic, dateCreated} = noft
  
    return res.json({
      status: 'success',
      data: {title, content, topic, dateCreated}
    });    
  }
  catch(e) { 
    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
    });
  }
}); 

//Edit noft
Router.post('/:noftId', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {username, role} = req.session.user;
  const {noftId} = req.params;
  const {title, content} = req.body;

  try {
    const noft = await Notification.findOne({_id: new ObjectId(noftId)});

    if (!noft) {
      return res.json({
        status: 'danger',
        msg: 'Thông báo không tồn tại!'
      });
    }

    if (role!=1) {
      if (role!=2) {
        return res.json({
          status: 'danger',
          msg: 'Bạn không có quyền chỉnh sửa thông báo này!'
        });
      }
      else {
        const user = await User.findOne({username: username});
        const userTopics = user.otherInfo.topics.split(',');

        if (!userTopics.includes(noft.topic)) {
          return res.json({
            status: 'danger',
            msg: 'Bạn không có quyền chỉnh sửa thông báo này!'
          });
        }
      }
    }

    noft.dateModified = new Date();
    noft.title = title;
    noft.content = content;

    await noft.save();

    return res.json({
      status: 'success',
      msg: 'Chỉnh sửa thông báo thành công!',
      data: {
        title: noft.title
      }
    });
  }
  catch(e) {
    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
    });
  }
});

//Get nofts with specific page
Router.get('/:page', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {username, role} = req.session.user
  const {page} = req.params;
  const {topic,preview,limit} = req.query;
  const options = {
    sort: {_id: -1},
    page: parseInt(page),
    limit: parseInt(limit)
  };
  
  let filter = {}; 

  if (topic) {
    filter.topic = topic;
  }

  try {
    const result = await Notification.paginate(filter, options);
    const current = result.page;
    const prev = result.prevPage;
    const next = result.nextPage;
    const nofts = result.docs;

    let noftList = ``;

    for (const noft of nofts) {
      const dateCreated = new Date(noft.dateCreated);
      let noftOptions = (preview==='false')?`
        <div class="noft-options">
          <button class="rounded btn" data-bs-toggle="dropdown">  
            <span><i class="fas fa-ellipsis-h"></i></span>
          </button>
          <ul class="dropdown-menu dropdown-menu dropdown-menu-end">
            <li>
              <button class="dropdown-item editNoftBtn" data-bs-toggle="modal" data-bs-target="#editNoftModal">
                <span><i class="fas fa-pen"></i></span>
                <span class="label">Chỉnh sửa thông báo</span>
              </button>
            </li>  
            <li>
              <button class="dropdown-item deleteNoftBtn" data-bs-toggle="modal" data-bs-target="#deleteNoftModal">
                <span><i class="fas fa-trash-alt"></i></span>
                <span class="label">Xóa thông báo</span>
              </button>
            </li>
          </ul>
        </div>
      `:``;

      if (role!=1) {
        if (role!=2) {
          noftOptions = ''
        }
        else {
          const user = await User.findOne({username: username});
          const userTopics = user.otherInfo.topics.split(',');

          if (!userTopics.includes(noft.topic)) {
            noftOptions = ''
          }
        }
      }

      const noftDiv = `
        <div class="noft p-3 border-bottom" data-id="${noft._id}">
          <div class="noft-container">
            <div class="noft-header d-flex justify-content-between">
              <div class="fw-bold d-flex align-items-center">
                <a href="#" class="noft-title text-decoration-none" data-bs-toggle="modal" data-bs-target="#viewNoftModal">
                  ${noft.title}
                </a>
              </div>
              ${noftOptions}
            </div>
            <div class="text-muted">
              <small class="noft-topic">${noft.topic}</small>
              <small> - </small>
              <small class="date-created">${dateCreated.getDate()}/${dateCreated.getMonth()+1}/${dateCreated.getFullYear()}</small>
            </div>
          </div>
        </div>
      `;

      noftList+= noftDiv;
    }

    return res.json({
      status: 'success',
      data: {
        prev, next, current,
        nofts: noftList
      }
    });
  }
  catch(e) {
    console.log(e)
    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
    });
  }
}); 

//Noft page
Router.get('/', (req, res) => {
  if (!req.session.user) {
    req.flash('alert', {
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });

    return res.redirect('/');
  }

  const {nameTag, name, avatar, role} = req.session.user;

  res.render('notification', {
    currentUser: {nameTag, name, avatar, role}
  });
});

module.exports = Router;