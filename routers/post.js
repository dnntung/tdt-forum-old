/*jshint esversion: 6 */
const express = require('express');
const Router = express.Router();
const {validationResult} = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ObjectId = require('mongoose').Types.ObjectId; 

const Post = require('../models/post');
const User = require('../models/user');

const uploader = multer({
  dest: __dirname + '/../temp'
});

//Get post detail
Router.get('/detail/:postId', async (req, res) => {
  if (!req.session.user) {
    req.flash('alert', {
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });

    return res.redirect('/');
  }

  const {postId} = req.params;
  const {username, nameTag, name, avatar, role} = req.session.user;

  try {
    const selectedPost = await Post.findOne({_id: new ObjectId(postId)});
    const user = await User.findOne({username: selectedPost.poster.username});

    selectedPost.poster.nameTag = user.nameTag;
    selectedPost.poster.name = user.name;
    selectedPost.poster.avatar = user.avatar;
    delete selectedPost.poster.username; 

    return res.render('post', {
      currentUser: {nameTag, name, avatar, role},
      selectedPost: selectedPost,
      hearted: selectedPost.likes.indexOf(username)!==-1?true:false
    });
  }
  catch(e)  {
    req.flash('alert', {
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
    })

    return res.redirect('/home');
  }
});

//Edit post's cmt
Router.post('/:postId/comment/:cmtId', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {username} = req.session.user;
  const {postId, cmtId} = req.params;
  const {editCmtContent} = req.body;

  try {
    const post = await Post.findOne({_id: new ObjectId(postId)})

    if (!post) {
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy bài viết!'
      });
    }

    const result = await Post.updateOne({
      _id: new ObjectId(postId),
      comments: {
        $elemMatch: {
          _id: new ObjectId(cmtId),
          username}
        }
      },
      {
        $set: {
        'comments.$.content': editCmtContent
      }}
    );

    if (result.n === 0) {
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy bình luận!'
      });
    }
  
    if (result.nModified === 1) {
      return res.json({
        status: 'success',
        msg: 'Cập nhật bình luận thành công!'
      });
    }
  }
  catch(e) {
    console.log(e)

    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
    });
  }
})

//Delete post's cmt
Router.delete('/:postId/comment/:cmtId', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {username} = req.session.user;
  const {postId, cmtId} = req.params;

  try {
    const post = await Post.findOne({_id: new ObjectId(postId)})

    if (!post) {
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy bài viết!'
      });
    }

    const result = await Post.updateOne({
      _id: new ObjectId(postId)
    },
    {
        $pull: {
          comments: {
            _id: new ObjectId(cmtId),
            username
          }
        }
    });
  
    if (result.nModified === 1) {
      return res.json({
        status: 'success',
        msg: 'Xóa bình luận thành công!'
      });
    }

    return res.json({
      status: 'danger',
      msg: 'Xóa bình luận thất bại!'
    });
  }
  catch(e) {
    console.log(e)

    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
    });
  }
})

//Toggle heart
Router.get('/:postId/heart', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }
  const {postId} = req.params;
  const {username} = req.session.user
  
  try {
    const post = await Post.findOne({_id: new ObjectId(postId)})

    if (!post) {
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy bài viết!'
      });
    }

    const index = post.likes.indexOf(username);
    let hearted;

    if (index !== -1) {
      post.likes.splice(index, 1);
      hearted = false
    }
    else {
      post.likes.push(username)
      hearted = true
    }

    await post.save()
    
    return res.json({
      status: 'success', 
      data: {
        state: hearted,
        count: post.likes.length
      }
    })
  }
  catch(e) { 
    return res.json({
      status: 'warning', 
      msg: 'Đã có lỗi xảy ra: '+e
    })
  }
})

//Get post's cmts
Router.get('/:postId/comment',async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {nameTag} = req.session.user;
  const {postId} = req.params;

  try {
    const post = await Post.findOne({_id: new ObjectId(postId)})

    if (!post) {
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy bài viết!'
      });
    }

    const {comments} = post;
    let cmts = '';

    for (const cmt of comments) { 
      const dateCreated = new Date(cmt.dateCreated);
      const cmtUser = await User.findOne({username: cmt.username});
      const cmtOptions = nameTag === cmtUser.nameTag? `
        <div class="cmt-options post-options">
          <button class="rounded btn" data-bs-toggle="dropdown">  
            <span><i class="fas fa-ellipsis-h"></i></span>
          </button>
          <ul class="dropdown-menu dropdown-menu dropdown-menu-end">
            <li>
              <button class="dropdown-item editCmtBtn" data-bs-toggle="modal" data-bs-target="#editCmtModal">
                <span><i class="fas fa-pen"></i></span>
                <span class="label">Chỉnh sửa bình luận</span>
              </button>
            </li>  
            <li>
              <button class="dropdown-item deleteCmtBtn" data-bs-toggle="modal" data-bs-target="#deleteCmtModal">
                <span><i class="fas fa-trash-alt"></i></span>
                <span class="label">Xóa bình luận</span>
              </button>
            </li>
          </ul>
        </div>
      `:''; 
      const cmtDiv = `
        <div class="cmt post p-3 border-bottom" data-id="${cmt._id}">
          <div class="post-container w-100 d-flex flex-row">
            <div class="post-header avatar rounded-circle pr-3 shadow">
              <img class="w-100 h-100" src="${cmtUser.avatar}" alt="${cmtUser.nameTag}">
            </div>
            <div class="w-100">
              <div class="post-header w-100 d-flex justify-content-between">
                <div class="poster d-flex flex-column">
                  <a href="/user/${cmtUser.nameTag}" class="name text-decoration-none text-dark"><strong>${cmtUser.name}</strong></a>
                  <div class="text-muted">
                    <small class="name-tag">@${cmtUser.nameTag}</small>
                    <small> - </small>
                    <small class="date-created">${dateCreated.getDate()}/${dateCreated.getMonth()+1}/${dateCreated.getFullYear()}</small>
                  </div>
                </div>
                ${cmtOptions}
              </div>
              <div class="post-content cmt-content">
                ${cmt.content.split('\n').join('<br>')}
              </div>
            </div>
          </div>
        </div>
      `;

      cmts=cmtDiv+cmts;
    }

    return res.json({
      status: 'success',
      data: cmts
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

//Create post's cmt
Router.post('/:postId/comment', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {postId} = req.params;
  const {username} =  req.session.user;
  const {cmtContent} = req.body;

  try { 
    const post = await Post.findOne({_id: new ObjectId(postId)})

    if (!post) {
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy bài viết!'
      });
    }

    post.comments.push({
      _id: new ObjectId(), 
      username: username,
      content: cmtContent,
      dateCreated: new Date()
    });

    await post.save()

    return res.json({
      status: 'success',
      msg: 'Đăng bình luận thành công!'
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

// Create a new post
Router.post('/create', uploader.single('image'), async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {username} =  req.session.user;
  const {content, video} = req.body;
  const image = req.file;

  try {
    const post = new Post({
      poster: {username}, 
      content: content, 
      attachment: {
        video: video,
        image: image?image.originalname:image
      }
    })

    await post.save()

    if (image) {
      const currentPath = image.path;
      const savePath = path.join(__dirname,`/../public/images/posts`);

      if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath);
      }
      fs.renameSync(currentPath, savePath+`/${post._id}_${image.originalname}`);
    }

    const user = await User.findOne({username: post.poster.username});

    let p = post.toObject()

    p.poster.avatar = user.avatar;
    p.poster.name = user.name;
    p.poster.nameTag = user.nameTag;
    p.like = {
      hearted: post.likes.indexOf(username)!==-1?true:false,
      count: post.likes.length
    }

    delete p.likes
    delete p.poster.username;

    return res.json({
      status: 'success',
      msg: 'Tạo bài viết mới thành công',
      data: p
    });
  }
  catch(e) {
    console.log(e)

    if (image) {
      const currentPath = image.path;

      fs.unlinkSync(currentPath)
    }

    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
    });
  }
});

//Get posts
Router.get('/',  async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const limit = 10;
  let loadedPosts = [];
  let {nameTag} = req.query;
  const {username} = req.session.user

  try {
    JSON.parse(req.query.loadedPosts).forEach(postId => {
      loadedPosts.push(new ObjectId(postId));
    });

    let filter = {
      _id: {$nin: loadedPosts}
    };
  
    if (nameTag) {
      const user = await User.findOne({nameTag: nameTag});
      Object.assign(filter, {'poster.username':user.username});
    }

    const posts = await Post.find(filter)
      .sort({_id: -1})
      .limit(limit)
    
    postList=[]

    for (const post of posts) {
      let p = post.toObject()
      const user = await User.findOne({username: post.poster.username});
      p.poster.avatar = user.avatar;
      p.poster.name = user.name;
      p.poster.nameTag = user.nameTag;
      p.like = {
        hearted: post.likes.indexOf(username)!==-1?true:false,
        count: post.likes.length
      }

      delete p.likes
      delete p.poster.username;

      postList.push(p)
    }

    return res.json({
      status: 'success',
      msg: 'Lấy bài viết thành công!',
      data: postList
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

//Delete post
Router.delete('/:postId', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {username} = req.session.user
  const {postId} = req.params;

  try { 
    const post = await Post.findOne({_id: new ObjectId(postId)});

    if (!post) {
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy bài viết!'
      });
    }

    if (post.poster.username !== username) {
      return res.json({
        status: 'danger',
        msg: 'Bạn không có quyền xóa bài viết này!'
      });
    }

    const result = await Post.deleteOne({_id: new Object(postId)})

    if (result.deletedCount===1) {
      return res.json({
        status: 'success',
        msg: 'Xóa bài viết thành công!'
      });
    } 

    return res.json({
      status: 'danger',
      msg: 'Xóa bài viết thất bại!'
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

//Edit post
Router.post('/:postId', async (req,res) => {
  if (!req.session.user) {
    return res.json({
      status: 'warning',
      msg: 'Vui lòng đăng nhập!'
    });
  }

  const {postId} = req.params;
  const {content} = req.body;
  const {username} = req.session.user;

  try { 
    const post = await Post.findOne({_id: new Object(postId)})

    if (!post) { 
      return res.json({
        status: 'danger',
        msg: 'Không tìm thấy bài viết!'
      })
    }

    if (username !== post.poster.username) {
      return res.json({
        status: 'danger',
        msg: 'Bạn không có quyền chỉnh sửa bài viết này!'
      });
    }

    post.content = content;
    await post.save()

    return res.json({
      status: 'success',
      msg: 'Chỉnh sửa bài viết thành công!',
      data: post.content
    });
  }
  catch(e) { 
    console.log(e)

    return res.json({
      status: 'warning',
      msg: 'Đã có lỗi xảy ra: '+e
    })
  }
});

module.exports = Router;