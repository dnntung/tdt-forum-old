/*jshint esversion: 6 */
let hasPost = true;
let loadedPosts = [];
let isLoading = false;
let user;
let socket;
let post;

const createToast = ({bg, title, msg}) => {
  const text = bg==='warning'?'dark':'light';

  $('#toasts').append(`
    <div class="toast bg-${bg}" data-bs-delay="5000">
      <div class="toast-header">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body text-${text}">
        ${msg}
      </div>
    </div>
  `);

  return $($($('.toast')).get(-1)).toast('show');
};

const getYTId = url => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  return (match && match[2].length === 11)? match[2]: null;
};

const getCmts = ({post}) => {
  isLoading = true;
  $('#cmt-list').next('.loading').show();

  $.ajax({
    url: '/post/'+post+'/comment',
    type: 'GET',
    processData: false, // important
    contentType: false, // important
    dataType : 'json',
    success: result => {
      if (result.status !== 'success') { 
        createToast({
          bg: result.status, 
          title: 'Hệ thống',
          msg: result.msg
        });
      }
      else {  
        const cmts = result.data;

        $('#cmt-list').html(cmts);

        $('.deleteCmtBtn').off('click').click(e => {
          const cmtId = $(e.target).closest('.cmt').attr('data-id');
          
          $('#deleteCmtModal').attr('data-id', cmtId);
        });

        $('.editCmtBtn').off('click').click(e => {
          const cmt = $(e.target).closest('.cmt');
          const cmtId = cmt.attr('data-id');

          $('#editCmtContent').html(cmt.find('div.cmt-content').html());
          $('#editCmtModal').attr('data-id', cmtId);
        });
      }

      $('#cmt-list').next('.loading').hide();
      isLoading = false;
    },
    error: (XMLHttpRequest, textStatus, e) => {
      console.log(e);

      $('#cmt-list').next('.loading').hide();
      isLoading = false;
    }
  });
};

const getNoftsPreview = () => {
  $('#noft-list').closest('.loading').show();
  isLoading = true;

  const url = '/notification/0?limit='+encodeURIComponent(5)+'&preview=true';
  
  $.ajax({
    url: url,
    type: 'GET',
    processData: false, // important
    contentType: false, // important
    dataType : 'json',
    success: result => {
      // console.log(result)
      if (result.status !== 'success') { 
        createToast({
          bg: result.status, 
          title: 'Hệ thống',
          msg: result.msg
        });
      }
      else {  
        const {nofts} = result.data;

        $('#noft-list').html(nofts);
  
        $('.noft-title').off('click').click(e => {
          const noftId = $(e.target).closest('.noft').attr('data-id');
          const modal = $('#viewNoftModal');
  
          modal.find('.spinner-header').show();
          modal.find('.modal-title > h5').text('Đang tải');
          modal.find('.modal-title > div.text-muted').html('');
          modal.find('.modal-body').html('');

          $.ajax({
            url: '/notification/detail/'+noftId,
            type: 'GET',
            processData: false, // important
            contentType: false, // important
            dataType : 'json',
            success: result => {
              if (result.status !== 'success') {
                createToast({
                  bg: result.status,
                  title: 'Hệ thống',
                  msg: result.msg
                });
                modal.modal('hide');
              }
              else {
                const noft = result.data;
                const dateCreated = new Date(noft.dateCreated);

                modal.find('.modal-title > h5').text(noft.title);
                modal.find('.modal-title > div.text-muted').html(`
                  <span class="topic">${noft.topic}</span>
                  <span> - </span>
                  <span class="dateCreated">${dateCreated.getDate()}/${dateCreated.getMonth()+1}/${dateCreated.getFullYear()}</span>
                `);
                modal.find('.modal-body').html(noft.content.split("\n").join("<br/>"));
              }

              modal.find('.spinner-header').hide();
            },
            error: (XMLHttpRequest, textStatus, e) => {
              console.log(e);
              
              modal.find('.spinner-header').hide();
              modal.modal('hide');
            }
          });
        });
      }

      $('#noft-list').closest('.loading').hide();
      isLoading = false;
    },
    error: (XMLHttpRequest, textStatus, e) => {
      console.log(e);

      $('#noft-list').closest('.loading').hide();
      isLoading = false;
    }
  });
};

const getNofts = ({page, topic} = {page: 1, topic:''}) => {
  $('.loading').show();
  isLoading = true;
  let url = '/notification/'+page;
  url+='?limit='+encodeURIComponent(10)+'&preview=false';
  
  if (topic!='') {
    url+='&topic='+encodeURIComponent(topic);
  }

  $.ajax({
    url: url,
    type: 'GET',
    processData: false, // important
    contentType: false, // important
    dataType : 'json',
    success: result => {
      if (result.status !== 'success') { 
        createToast({
          bg: result.status, 
          title: 'Hệ thống',
          msg: result.msg
        });
      }
      else {
        const {nofts, prev, next, current} = result.data;

        $('#prevPage > a').attr("data-topic", topic);
        $('#nextPage > a').attr("data-topic", topic);

        if (prev != null) {
          $('#prevPage').removeClass('disabled');
          $('#prevPage > a').attr("data-page", prev);
        }
        else {
          $('#prevPage').addClass('disabled');
        }
  
        if (next != null) {
          $('#nextPage').removeClass('disabled');
          $('#nextPage > a').attr("data-page", next);
        }
        else {
          $('#nextPage').addClass('disabled');
        }

        $('#currentPage > a').text(page);
  
        $('#noft-list').html(nofts);

        $('.deleteNoftBtn').off('click').click(e => {
          const selectedNoft = $(e.target).closest('.noft');

          $('#deleteNoftModal').attr('data-id',selectedNoft.attr('data-id'));
        }); 

        $('.editNoftBtn').off('click').click(e => {
          const selectedNoft = $(e.target).closest('.noft');
          const modal = $('#editNoftModal')
          const noftId = selectedNoft.attr('data-id');

          $('#editNoftModal').attr('data-id',noftId);

          formReady(modal);
          formBusy(modal);

          $.ajax({
            url: '/notification/detail/'+noftId,
            type: 'GET',
            processData: false, // important
            contentType: false, // important
            dataType : 'json',
            success: result => {
              if (result.status !== 'success') {
                createToast({
                  bg: result.status,
                  title: 'Hệ thống',
                  msg: result.msg
                });
                formReady(modal);
                modal.modal('hide');
              }
              else {
                const noft = result.data;

                $('#edit-noft-title').val(noft.title);
                $('#edit-noft-content').val(noft.content);
              }
              // formReady(modal);
              modal.find('.spinner-header').hide();
              $('#edit-noft-title').attr('disabled', false)
              $('#edit-noft-content').attr('disabled', false)
              modal.find('.form-control-btn').removeClass('disabled')
            },
            error: (XMLHttpRequest, textStatus, e) => {
              console.log(e);
              
              formReady(modal);
              modal.modal('hide');
            }
          });
        }); 
  
        $('.noft-title').off('click').click(e => {
          const noftId = $(e.target).closest('.noft').attr('data-id');
          const modal = $('#viewNoftModal');
  
          modal.find('.spinner-header').show();
          modal.find('.modal-title > h5').text('Đang tải');
          modal.find('.modal-title > div.text-muted').html('');
          modal.find('.modal-body').html('');

          $.ajax({
            url: '/notification/detail/'+noftId,
            type: 'GET',
            processData: false, // important
            contentType: false, // important
            dataType : 'json',
            success: result => {
              if (result.status !== 'success') {
                createToast({
                  bg: result.status,
                  title: 'Hệ thống',
                  msg: result.msg
                });
                modal.modal('hide');
              }
              else {
                const noft = result.data;
                const dateCreated = new Date(noft.dateCreated);

                modal.find('.modal-title > h5').text(noft.title);
                modal.find('.modal-title > div.text-muted').html(`
                  <span class="topic">${noft.topic}</span>
                  <span> - </span>
                  <span class="dateCreated">${dateCreated.getDate()}/${dateCreated.getMonth()+1}/${dateCreated.getFullYear()}</span>
                `);
                modal.find('.modal-body').html(noft.content.split("\n").join("<br/>"));
              }

              modal.find('.spinner-header').hide();
            },
            error: (XMLHttpRequest, textStatus, e) => {
              console.log(e);
              
              modal.find('.spinner-header').hide();
              modal.modal('hide');
            }
          });
        });
      }

      $('.loading').hide();
      isLoading = false;
    },
    error: (XMLHttpRequest, textStatus, e) => {
      console.log(e);

      $('.loading').hide();
      isLoading = false;
    }
  });
};

const getPosts = ({createdPost, user} = {}) => {
  isLoading = true;

  if (hasPost) {
    $('#post-list').next('.loading').show();
  }

  const url = '/post?'+(user?'nameTag='+encodeURIComponent(user)+'&':'')+'loadedPosts='+JSON.stringify(loadedPosts);
  $.ajax({
    url: url,
    type: 'GET',
    processData: false, // important
    contentType: false, // important
    dataType : 'json',
    success: result => {
      if (result.status !== 'success') { 
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });
      }
      else {
        let posts = result.data;
        const currentNameTag = $('#nameTag').text().replace('@','');      
  
        if (createdPost) {
          posts=[createdPost];
        }
  
        if (posts.length > 0) {
          $('.no-post').remove();

          if (!hasPost) {
            hasPost = true;

            $('#post-list').next('.loading').show();
          }
  
          // console.log(posts)
          posts.forEach(post => {
            const dateCreated = new Date(post.dateCreated);
            const postAttachment = post.attachment?`
              <div class="post-attachment border rounded position-relative mt-3">
                ${post.attachment.video?`<iframe width="560" height="315" src="https://www.youtube.com/embed/${post.attachment.video}"></iframe>`:''}
                ${post.attachment.image?`<img class="w-100" src="/images/posts/${post._id}_${post.attachment.image}">`:''}
              </div>
            `:'';
            const postOption = currentNameTag===post.poster.nameTag? `
              <div class="post-options">
                <button class="rounded btn" data-bs-toggle="dropdown">  
                  <span><i class="fas fa-ellipsis-h"></i></span>
                </button>
                <ul class="dropdown-menu dropdown-menu dropdown-menu-end">
                  <li>
                    <button class="dropdown-item editPostBtn" data-bs-toggle="modal" data-bs-target="#editPostModal">
                      <span><i class="fas fa-pen"></i></span>
                      <span class="label">Chỉnh sửa bài viết</span>
                    </button>
                  </li>  
                  <li>
                    <button class="dropdown-item deletePostBtn" data-bs-toggle="modal" data-bs-target="#deletePostModal">
                      <span><i class="fas fa-trash-alt"></i></span>
                      <span class="label">Xóa bài viết</span>
                    </button>
                  </li>
                </ul>
              </div>
            `:''; 
            const postContent = post.content?`
              <div class="post-content">
                ${post.content.split("\n").join("<br/>")}
              </div>
            `:'';
            const postDiv = `
              <div class="post pt-3 px-3 border-bottom" data-id="${post._id}">
                <div class="post-container w-100 d-flex flex-row">
                  <div class="post-header avatar rounded-circle pr-3 shadow">
                    <img class="w-100 h-100" src="${post.poster.avatar}" alt="${post.poster.nameTag}">
                  </div>
                  <div class="w-100">
                    <div class="post-header w-100 d-flex justify-content-between">
                      <div class="poster d-flex flex-column">
                        <a href="/user/${post.poster.nameTag}" class="name text-decoration-none"><strong>${post.poster.name}</strong></a>
                        <div class="text-muted">
                          <small class="name-tag">@${post.poster.nameTag}</small>
                          <span> - </span>
                          <small class="date-created">${dateCreated.getDate()}/${dateCreated.getMonth()+1}/${dateCreated.getFullYear()}</small>
                        </div>
                      </div>
                      ${postOption}
                    </div>
                    ${postContent}
                  </div>
                </div>
                ${postAttachment}
                <div class="post-bar d-flex pt-1">
                  <button class="btn heart ${post.like.hearted?"text-danger":""}" data-hearted="false">
                    <span class="heart-state"><i class="fa${!post.like.hearted?'r':'s'} fa-heart"></i></span>
                    <small class="heart-count label">${post.like.count}</small>
                  </button>
                  <a href="/post/detail/${post._id}" class="btn comment">
                    <span><i class="far fa-comment-alt"></i></span>
                    <small class="label">${post.comments.length} bình luận</small>
                  </a>
                </div>
              </div>
            `;
            
            if (createdPost) {
              $('#post-list').prepend(postDiv);
            }
            else {
              $('#post-list').append(postDiv);
            }
            loadedPosts.push(post._id);
          });  

          //Remove current click event
          $('button.heart').off('click').click((e) => {
            const postId = $(e.target).closest('.post').attr('data-id')
        
            $.ajax({
              url: `/post/${postId}/heart`,
              type: 'GET',
              processData: false, // important
              contentType: false, // important
              success: result => {
                if (result.status === 'success') {
                  const state = result.data.state

                  $(e.target).find('.heart-state').html(`<i class="fa${!state?'r':'s'} fa-heart"></i>`);
                
                  if (state) {
                    $(e.target).addClass('text-danger');
                  }
                  else {
                    $(e.target).removeClass('text-danger');
                  }
                  
                  $(e.target).find('.heart-count').text(result.data.count)
                }
              },
              error: (XMLHttpRequest, textStatus, e) => {
                console.log(e);
              }  
            });  
          });

          $('.post-attachment > img').off('click').click(e => {
            const imageSource = $(e.target).attr('src');
  
            $('#viewImageModal').find('img').attr('src', imageSource);
            $('#viewImageModal').modal('show');
          });
  
          $('.deletePostBtn').off('click').click(e => {
            const selectedPost = $(e.target).closest('.post');
  
            $('#deletePostModal').attr('data-id',selectedPost.attr('data-id'));
          }); 
  
          $('.editPostBtn').off('click').click(e => {
            const selectedPost = $(e.target).closest('.post');
  
            $('#editPostModal').attr('data-id',selectedPost.attr('data-id'));
            $('#editPostContent').html(selectedPost.find('.post-content').html());
          }); 
        }
        else {
          $('.no-post').remove();
          $('#post-list').append(`
            <div class="text-center text-muted py-3 no-post">
              <span><i class="fas fa-ban"></i></span>
              <span class="label">Không có bài viết nào</span>                
            </div>
          `);

          hasPost = false
        }
      }

      $('#post-list').next('.loading').hide();
      isLoading = false;
    }, 
    error: (XMLHttpRequest, textStatus, e) => {
      console.log(e);
      
      $('.loading').hide();
      isLoading = false;
    }
  });
};

const formBusy = form => {
  form.find('.form-select').attr('disabled', true);
  form.find('span.form-control').attr('contenteditable',false);
  form.find('.form-control').attr('disabled', true);
  form.find('.form-control').addClass('disabled');
  form.find('.form-control-btn').addClass('disabled');

  form.find('.spinner-header').show();
};

const formReady = form => {
  form.find('.form-select').attr('disabled', false);
  form.find('span.form-control').attr('contenteditable',true);
  form.find('.form-control').text('');
  form.find('.form-control').val('');

  form.find('.form-control').attr('disabled', false);
  form.find('.form-control').removeClass('disabled');
  form.find('.form-control-btn').removeClass('disabled');

  form.find('.spinner-header').hide();
};

const createPostReset = () => {
  $('#uploadYTVideoBtn').removeClass('text-danger');
  $('#uploadImageBtn').removeClass('text-success');

  $('#YTVideoURL').removeClass('is-invalid is-valid');
  $('#imageUploader').removeClass('is-invalid is-valid');

  $('#confirmCreatePost').addClass('disabled');

  $('#uploadYTVideoBtn').attr('data-active', "false");
  $('#uploadImageBtn').attr('data-active',"false");

  $('#newPostContent').prop('innerText','');
  $('#YTVideoURL').val('');
  $('#imageUploader').val('');

  $('#uploadImage').hide();
  $('#uploadYTVideo').hide();
};

const createUserValidatior = () => {
  if ($('#username').val()==='') {
    return $('#confirmCreateUser').addClass('disabled')
  }
  
  if ($('#password').val()==='') {
    return $('#confirmCreateUser').addClass('disabled')
  }

  if ($('#confirmPassword').val()==='') {
    return $('#confirmCreateUser').addClass('disabled')
  }

  if ($('#password').val()!==$('#confirmPassword').val()) {
    return $('#confirmCreateUser').addClass('disabled')
  }

  let checked = false;
  for (const checkbox of $('.form-check > input:checkbox')) {
    if (checkbox.checked) {
      checked = true;
      break;
    }
  }
  if (checked) {
    return $('#confirmCreateUser').removeClass('disabled');
  }
  return $('#confirmCreateUser').addClass('disabled');
}

const createNoftValidator = () => {
  let titleInput = $('input#noft-title');
  let contentInput = $('textarea#noft-content');
  let topicSelect = $('select#noft-topics');

  if (titleInput.val() === '' || contentInput.val() === '') {
    return $('#confirmCreateNoft').addClass('disabled');
  }

  if (topicSelect.val() === '' ||topicSelect.val() === 'empty') {
    return $('#confirmCreateNoft').addClass('disabled');
  }
  return $('#confirmCreateNoft').removeClass('disabled');
};

const editNoftValidator = () => {
  let titleInput = $('input#edit-noft-title');
  let contentInput = $('textarea#edit-noft-content');

  if (titleInput.val() === '' || contentInput.val() === '') {
    return $('#confirmEditNoft').addClass('disabled');
  }

  return $('#confirmEditNoft').removeClass('disabled');
}

const createPostValidator = () => {
  if ($('#newPostContent').text() === '') {
    return $('#confirmCreatePost').addClass('disabled');
  }

  if ($('#uploadYTVideoBtn').attr('data-active') === "true") {
    if ($('#YTVideoURL').val() === '' || $('#YTVideoURL').hasClass('is-invalid')) {
      return $('#confirmCreatePost').addClass('disabled');
    }
  }
  else if ($('#uploadImageBtn').attr('data-active') === "true") {
    if ($('#imageUploader').prop('files').length <= 0) {
      return $('#confirmCreatePost').addClass('disabled');
    }
  }

  return $('#confirmCreatePost').removeClass('disabled');
};

const ytVidId = url => {
  const p = /^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/gm;
  return (url.match(p)) ? RegExp.$1 : false;
};

$(document).ready(function() {
  $('.loading').hide();
  $('.spinner-header').hide();

  if (window.location.pathname != '/') {
    socket  = io();

    socket.on('newNoft', noftTopic => {
      createToast({
        bg: `primary`,
        title: `Hệ thống`,
        msg: `
          <strong>${noftTopic}</strong> vừa đăng một thông báo mới!
        `
      });
    });
  }

  if (window.location.pathname === '/home') {
    getNoftsPreview();
    getPosts();

    formReady($('#createPostModal'));
    createPostReset();
  }
  
  if (window.location.pathname.indexOf('user') != -1) {
    user = window.location.pathname.split('/')[2];

    getPosts({user});

    formReady($('#createPostModal'));
    createPostReset();
  }

  if (window.location.pathname.indexOf('notification') != -1) {
    getNofts();
  }

  if (window.location.pathname.indexOf('post/detail') != -1) {
    post = window.location.pathname.split('/')[3];

    getCmts({post})
  }

  $(window).scroll(function() {
    if($(window).scrollTop() + $(window).height() == $(document).height()) {

      if (window.location.pathname.indexOf('notification') !== -1) {
        return;
      }
      if (window.location.pathname.indexOf('post/detail') !== -1) {
        return;
      }
      if (!isLoading) {
        getPosts({user});
      }
    }
  });

  $('#not-student > a').click(e => {
    $(e.target).removeClass('bg-light text-dark');
    $(e.target).addClass('active bg-primary text-white');
  
    $('#student > a').removeClass('active bg-primary text-white');
    $('#student > a').addClass('bg-light text-dark');
  
    $('#studentLogin').addClass('d-none');
    $('#notStudentLogin').removeClass('d-none');
  });
  
  $('#student > a').click(e => {
    $(e.target).removeClass('bg-light text-dark');
    $(e.target).addClass('active bg-primary text-white');
  
    $('#not-student > a').removeClass('active bg-primary text-white');
    $('#not-student > a').addClass('bg-light text-dark');
  
    $('#notStudentLogin').addClass('d-none');
    $('#studentLogin').removeClass('d-none');
  });
  
  $('button.heart').click((e) => {
    const postId = $(e.target).closest('.post').attr('data-id')

    $.ajax({
      url: `/post/${postId}/heart`,
      type: 'GET',
      processData: false, // important
      contentType: false, // important
      success: result => {
        if (result.status === 'success') {
          const state = result.data.state

          $(e.target).find('.heart-state').html(`<i class="fa${!state?'r':'s'} fa-heart"></i>`);
        
          if (state) {
            $(e.target).addClass('text-danger');
          }
          else {
            $(e.target).removeClass('text-danger');
          }
          
          $(e.target).find('.heart-count').text(result.data.count)
        }
      },
      error: (XMLHttpRequest, textStatus, e) => {
        console.log(e);
      }  
    });  
  });
  
  $('#newPostContent').on('input', e => {
    createPostValidator();
  });
  
  $('#uploadImageBtn').click(e => {
    const state = $(e.target).attr('data-active');
  
    if (state !== "true") {
      $(e.target).attr('data-active', "true");
      $(e.target).addClass('text-success');
      $('#uploadImage').show();
  
      $('#uploadYTVideoBtn').attr('data-active', "false");
      $('#uploadYTVideoBtn').removeClass('text-danger');
      $('#uploadYTVideo').hide();
  
      $('#uploadImage').focus();
    }
    else {
      $(e.target).attr('data-active', "false");
      $(e.target).removeClass('text-success');
      $('#uploadImage').hide();
    }
  });
  
  $('#uploadYTVideoBtn').click(e => {
    const state = $(e.target).attr('data-active');
  
    if (state !== "true") {
      $(e.target).attr('data-active', "true");
      $(e.target).addClass('text-danger');
      $('#uploadYTVideo').show();
  
      $('#uploadImageBtn').attr('data-active', "false");
      $('#uploadImageBtn').removeClass('text-success');
      $('#uploadImage').hide();
  
      $('#YTVideoURL').focus();
    }
    else {
      $(e.target).attr('data-active', "false");
      $(e.target).removeClass('text-danger');
      $('#uploadYTVideo').hide();
    }
  });
  
  $('#YTVideoURL').bind("change keyup input", e => {
    const url = $(e.target).val();
  
    if (ytVidId(url) !== false) {
      $(e.target).removeClass('is-invalid');
      $(e.target).addClass('is-valid');

      $('#uploadYTVideo > .invalid-feedback').text('');
      $('#uploadYTVideo > .invalid-feedback').removeClass('d-block');
    } else {
      $(e.target).removeClass('is-valid');
      $(e.target).addClass('is-invalid');

      $('#uploadYTVideo > .invalid-feedback').text('Đường dẫn không hợp lệ!')
      $('#uploadYTVideo > .invalid-feedback').addClass('d-block');
    }
  
    createPostValidator();
  });
  
  $('#imageUploader').on('change', e => {
    if ($(e.target).prop('files').length < 1 || $(e.target).prop('files')[0].size/1024/1024 > 5) {
      $(e.target).removeClass('is-valid');
      $(e.target).addClass('is-invalid');
      
      $('#uploadImage > .invalid-feedback').text('Ảnh phải có dung lượng không quá 5MB!')
      $('#uploadImage > .invalid-feedback').addClass('d-block');
    } else {
      $(e.target).removeClass('is-invalid');
      $(e.target).addClass('is-valid');

      $('#uploadImage > .invalid-feedback').text('');
      $('#uploadImage > .invalid-feedback').removeClass('d-block');
    }
  
    createPostValidator();
  });
  
  $('#confirmCreatePost').click(e => {
    //Make modal's form busy
    formBusy($('#createPostModal'));
  
    //Create form data for form request    
    let fd = new FormData();
    const content = $('#newPostContent').prop('innerText');
    
    fd.append('content', content);

    if ($('#uploadImageBtn').attr('data-active') === "true") {
      const image = $('#imageUploader').prop('files')[0];
      fd.append('image', image);
    }
    else if ($('#uploadYTVideoBtn').attr('data-active') === "true") {
      const video = getYTId($('#YTVideoURL').val());
      fd.append('video', video);
    }
  
    $.ajax({
      url: '/post/create',
      type: 'POST',
      processData: false, // important
      contentType: false, // important
      dataType : 'json',
      data: fd,
      success: result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          //Reload post list with created post
          getPosts({createdPost: result.data});
        }
        
        //Reset modal's form
        createPostReset();
        formReady($('#createPostModal'));

        $('#createPostModal').find('#confirmCreatePost').addClass('disabled');

        //Close modal
        $('#createPostModal').modal('hide');
      }
    });   
  });

  $('#confirmDeletePost').click(e => {
    //Make modal's form busy
    formBusy($('#deletePostModal'));

    const postId = $('#deletePostModal').attr('data-id');
    
    $.ajax({
      url: '/post/'+postId,
      type: 'DELETE',
      processData: false, // important
      contentType: false, // important
      dataType : 'json',
      success: result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          $(`div.post[data-id="${postId}"]`).remove();
        }

        //Make modal's form ready
        formReady($('#deletePostModal'));

        //Close modal
        $('#deletePostModal').modal('hide');
      }
    });
  });

  $('#confirmEditPost').click(e => {
    //Make modal's form busy
    formBusy($('#editPostModal'));

    const postId = $('#editPostModal').attr('data-id');
    const content = $('#editPostContent').prop('innerText');
    // let fd = new FormData();
    // fd.append('content', content);

    fetch('/post/'+postId, { 
          method: "POST", 
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body:  'content='+encodeURIComponent(content)
     })
      .then(response => response.json())
      .then(result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          $(`.post[data-id="${postId}"]`).find('.post-content').html(result.data.split("\n").join("<br/>"));
        }

        //Make modal's form ready
        formReady($('#editPostModal'));

        //Close modal
        $('#editPostModal').modal('hide');
      });

    // $.ajax({
    //   url: '/post/'+postId,
    //   type: 'POST',
    //   processData: false, // important
    //   contentType: false,
    //   dataType : 'json',
    //   data: fd,
    //   success: result => {
    //     console.log(result);
    //   }
    // });
  });

  $('#editProfileBtn').click(e => {
    $('#editProfileBtn').addClass('d-none');

    $('#name').find('input').val($('#name').find('span').text());
    $('#major').find('input').val($('#major').find('span').text());
    $('#class').find('input').val($('#class').find('span').text());
    $('#avatarUploader').val('');

    $('#name').find('input').removeClass('d-none');
    $('#major').find('input').removeClass('d-none');
    $('#class').find('input').removeClass('d-none');
    $('#avatarUploader').removeClass('d-none');
    $('#editProfileBtns').removeClass('d-none');

    $('#name').find('span').addClass('d-none');
    $('#major').find('span').addClass('d-none');
    $('#class').find('span').addClass('d-none');
  });

  $('#name').find('input').bind('change keyup input', e => {
    if ($(e.target).val() === '') {
      $(e.target).addClass('is-invalid');
      $('#confirmEditProfile').addClass('disabled')
    }
    else {
      $(e.target).removeClass('is-invalid');
      $('#confirmEditProfile').removeClass('disabled')
    }
  });

  $('#cancelEditProfile').click(e => {
    $('#name').find('input').addClass('d-none');
    $('#major').find('input').addClass('d-none');
    $('#class').find('input').addClass('d-none');
    $('#avatarUploader').addClass('d-none');
    $('#editProfileBtns').addClass('d-none');

    $('#name').find('span').removeClass('d-none');
    $('#major').find('span').removeClass('d-none');
    $('#class').find('span').removeClass('d-none');

    $('#name').find('input').removeClass('is-invalid');
    $('#confirmEditProfile').removeClass('disabled');

    $('#editProfileBtn').removeClass('d-none');
  });

  $('#confirmEditProfile').click(e => {
    formBusy($('#profile'));
    
    let userName = $('#name').find('input').val().trim(); 
    let userMajor = $('#major').find('input').val();
    let userClass = $('#class').find('input').val();
    let userAvatar = $('#avatarUploader').prop('files');

    //Create form data for form request    
    let fd = new FormData();
    
    fd.append('userName', userName);

    if (userMajor) {
      fd.append('userMajor',userMajor.trim());
    }
    if (userClass) {
      fd.append('userClass',userClass.trim());
    }
    if (userAvatar) {
      const userCurrentAvatar = $('.avatar > img').attr('src');

      fd.append('userCurrentAvatar', userCurrentAvatar);
      fd.append('userAvatar', userAvatar[0]);
    }

    $.ajax({
      url: '/user/'+$('#nameTag').text().replace('@',''),
      type: 'POST',
      processData: false, // important
      contentType: false, // important
      dataType : 'json',
      data: fd,
      success: result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          const updatedInfo = result.data;

          $('.avatar > img').attr('src', updatedInfo.userAvatar); 
          $('#name').find('span').text(updatedInfo.userName);
          $('#major').find('span').text(updatedInfo.userMajor);
          $('#class').find('span').text(updatedInfo.userClass);
        }

        $('#name').find('input').addClass('d-none');
        $('#major').find('input').addClass('d-none');
        $('#class').find('input').addClass('d-none');
        $('#avatarUploader').addClass('d-none');
        $('#editProfileBtns').addClass('d-none');

        $('#name').find('span').removeClass('d-none');
        $('#major').find('span').removeClass('d-none');
        $('#class').find('span').removeClass('d-none');

        $('#name').find('input').removeClass('is-invalid');
        $('#confirmEditProfile').removeClass('disabled');

        $('#editProfileBtn').removeClass('d-none');
        
        formReady($('#profile'));
      }
    });   
      
    // fetch('/user/'+ $('#nameTag').text().replace('@',''), { 
    //   method: "POST", 
    //   headers: { 
    //     'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    //   },
    //   body: bodyData
    // })
    //   .then(response => response.json())
    //   .then(result => {
    //     console.log(result);

    //     if (result.status === 'success') {
    //       $('#name').find('span').text(userName);
    //       $('#major').find('span').text(userMajor);
    //       $('#class').find('span').text(userClass);
    //     }

        
    //   });
    
  });

  $('#createNoftBtn').click(e => {
    formBusy($('#createNoftModal'));

    $.ajax({
      url: '/user/topics',
      type: 'GET',
      processData: false, // important
      contentType: false, // important
      success: result => {
        // console.log(result);

        if (result.status === 'success') {
          const topics = result.data.split(',');

          $('#noft-topics').html(`
            <option value="empty" selected>Chọn chuyên mục thông báo</option>
          `);

          topics.forEach(topic => {
            $('#noft-topics').html($('#noft-topics').html()+`
              <option value="${topic}">${topic}</option>
            `);
          });
        }

        formReady($('#createNoftModal'));
        $('#confirmCreateNoft').addClass('disabled');
      },
      error: (XMLHttpRequest, textStatus, e) => {
        console.log(e);
        formReady($('#createNoftModal'));
        $('#confirmCreateNoft').addClass('disabled');
      }  
    });  
  });

  $('#noft-title').bind('change keyup input', e => {
    createNoftValidator();
  });

  $('#noft-content').bind('change keyup input', e => {
    createNoftValidator();
  });

  $('#edit-noft-title').bind('change keyup input', e => {
    editNoftValidator();
  });

  $('#edit-noft-content').bind('change keyup input', e => {
    editNoftValidator();
  });

  $('#noft-topics').change(e => {
    createNoftValidator();
  })

  $('#confirmDeleteNoft').click(e => {

    //Make modal's form busy
    formBusy($('#deleteNoftModal'));

    const noftId = $('#deleteNoftModal').attr('data-id');
    
    $.ajax({
      url: '/notification/'+noftId,
      type: 'DELETE',
      processData: false, // important
      contentType: false, // important
      dataType : 'json',
      success: result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          $(`div.noft[data-id="${noftId}"]`).remove();
        }

        //Make modal's form ready
        formReady($('#deleteNoftModal'));

        //Close modal
        $('#deleteNoftModal').modal('hide');
      }
    });
  });
  $('#confirmEditNoft').click(e => {
    formBusy($('#editNoftModal'));

    const noftId = $('#editNoftModal').attr('data-id');
    const title = $('#edit-noft-title').val().trim();
    const content = $('#edit-noft-content').val().trim();

    let bodyData = `title=${encodeURIComponent(title)}`;
    bodyData+=`&content=${encodeURIComponent(content)}`;

    fetch('/notification/'+noftId, { 
      method: "POST", 
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: bodyData
    })
      .then(response => response.json())
      .then(result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          $(`div.noft[data-id="${noftId}"]`).find('.noft-title').text(result.data.title);
        }

        //Make modal's form ready
        formReady($('#editNoftModal'));
        //Close modal
        $('#editNoftModal').modal('hide');
      });
  });

  $('#confirmCreateNoft').click(e => {
    formBusy($('#createNoftModal'));

    const title = $('#noft-title').val();
    const content = $('#noft-content').val();
    const topic = $('#noft-topics').val();

    let bodyData = `title=${encodeURIComponent(title)}`;
    bodyData+=`&content=${encodeURIComponent(content)}`;
    bodyData+=`&topic=${encodeURIComponent(topic)}`;

    fetch('/notification/create', { 
      method: "POST", 
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: bodyData
    })
      .then(response => response.json())
      .then(result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          socket.emit('newNoft', topic);

          getNofts();

          $('a.topic > span').removeClass('bg-primary bg-secondary');
          $('a.topic > span').addClass('bg-secondary');
          $($('a.topic > span')[0]).removeClass('bg-secondary');
          $($('a.topic > span')[0]).addClass('bg-primary');
        }

        //Make modal's form ready
        formReady($('#createNoftModal'));
        $('#confirmCreateNoft').addClass('disabled');

        //Close modal
        $('#createNoftModal').modal('hide');
      });
  });

  $('li.page-item:not(#currentPage) > a').click(e => {
    const page = $(e.target).attr('data-page');
    const topic = $(e.target).attr('data-topic');

    getNofts({page, topic});
  });

  $('a.topic').click(e => {
    const topic = $(e.target).attr('data-topic');

    getNofts({topic: topic});

    $('a.topic > span').removeClass('bg-primary bg-secondary');
    $('a.topic > span').addClass('bg-secondary');
    $(e.target).find('span').removeClass('bg-secondary');
    $(e.target).find('span').addClass('bg-primary');

    
  });

  const changePasswordValidator = () => {
    let currentPasswordInput = $('input#currentPassword');
    let newPasswordInput = $('input#newPassword');
    let confirmPassword = $('input#confirmNewPassword');
  
    if (currentPasswordInput.val() === '' || newPasswordInput.val() === '' || confirmPassword.val() === '') {
      return $('#confirmChangePassword').addClass('disabled');
    }
    if (newPasswordInput.val() !== confirmPassword.val()) {
      return $('#confirmChangePassword').addClass('disabled');
    }

    return $('#confirmChangePassword').removeClass('disabled');
  }

  $('#newPassword').bind('change keyup input', e => { 
    return changePasswordValidator()
  })

  $('#confirmNewPassword').bind('change keyup input', e => { 
    return changePasswordValidator()
  })

  $('#cancelChangePassword').click(e => {
    formReady($('#changePasswordModal'));
    $('#confirmChangePassword').addClass('disabled');
  });

  $('#confirmChangePassword').click(e => {
    formBusy($('#changePasswordModal'));

    const currentPassword = $('#currentPassword').val()
    const newPassword = $('#newPassword').val()

    let bodyData = `currentPassword=${encodeURIComponent(currentPassword)}`;
    bodyData+=`&newPassword=${encodeURIComponent(newPassword)}`;

    fetch('/user/change-password/', { 
      method: "POST", 
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: bodyData
    })
      .then(response => response.json())
      .then(result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        //Make modal's form ready
        formReady($('#changePasswordModal'));
        $('#confirmChangePassword').addClass('disabled');
        //Close modal
        $('#changePasswordModal').modal('hide');
      });
  })

  $('.post-attachment > img').click(e => {
    const imageSource = $(e.target).attr('src');

    $('#viewImageModal').find('img').attr('src', imageSource);
    $('#viewImageModal').modal('show');
  });

  $('.deletePostBtn').click(e => {
    const selectedPost = $(e.target).closest('.post');

    $('#deletePostModal').attr('data-id',selectedPost.attr('data-id'));
  }); 

  $('.editPostBtn').click(e => {
    const selectedPost = $(e.target).closest('.post');

    $('#editPostModal').attr('data-id',selectedPost.attr('data-id'));
    $('#editPostContent').html(selectedPost.find('.post-content').html());
  }); 

  $('#cmtContent').bind('change keyup input', e => {
    if ($(e.target).text() === '') {
      return $('#cmtBtn').addClass('disabled');
    }

    return $('#cmtBtn').removeClass('disabled');
  })

  $('#confirmDeleteCmt').click(e => {
    //Make modal's form busy
    formBusy($('#deleteCmtModal'));

    const cmtId = $('#deleteCmtModal').attr('data-id');
    
    $.ajax({
      url: '/post/'+post+'/comment/'+cmtId,
      type: 'DELETE',
      processData: false, // important
      contentType: false, // important
      dataType : 'json',
      success: result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          $(`div.cmt[data-id="${cmtId}"]`).remove();
        }

        //Make modal's form ready
        formReady($('#deleteCmtModal'));

        //Close modal
        $('#deleteCmtModal').modal('hide');
      }
    });
  })

  $('#editCmtContent').bind('change keyup input', e => {
    if ($(e.target).text() === '') {
      return $('#confirmEditCmt').addClass('disabled');
    }
    return $('#confirmEditCmt').removeClass('disabled');
  });

  $('#confirmEditCmt').click(e => {
    //Make modal's form busy
    formBusy($('#editCmtModal'));

    const cmtId = $('#editCmtModal').attr('data-id');
    const editCmtContent = $('#editCmtContent')[0].innerText.trim()

    fetch('/post/'+post+'/comment/'+cmtId, { 
      method: "POST", 
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body:  'editCmtContent='+encodeURIComponent(editCmtContent)
    })
      .then(response => response.json())
      .then(result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          $(`.cmt[data-id="${cmtId}"]`).find('.cmt-content').html(editCmtContent.split("\n").join("<br/>"));
        }

        //Make modal's form ready
        formReady($('#editPostModal'));

        //Close modal
        $('#editCmtModal').modal('hide');
      })
  });
  
  $('#cmtBtn').click(e => {
    const postId = $(e.target).attr('data-id')
    const cmtContent = $('#cmtContent')[0].innerText.trim();

    let bodyData = `cmtContent=${encodeURIComponent(cmtContent)}`;
    
    fetch('/post/'+postId+'/comment', { 
      method: "POST", 
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: bodyData
    })
      .then(response => response.json())
      .then(result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        if (result.status === 'success') {
          getCmts({post});
        }
        else {
          createToast({
            bg: result.status,
            title: 'Hệ thống',
            msg: result.msg
          });
        }

        $(e.target).addClass('disabled');
        $('#cmtContent').text('');
      });
  })

  $('#username').bind('keyup change input', () => {
    createUserValidatior()
  }) 

  $('#password').bind('keyup change input', () => {
    createUserValidatior()
  })
  
  $('#confirmPassword').bind('keyup change input', () => {
    createUserValidatior()
  }) 

  $('.form-check > input:checkbox').change(e => {
    createUserValidatior()
  })

  $('#confirmCreateUser').click(e => {
    formBusy($('#createUserModal'));

    const username = $('#username').val();
    const password = $('#password').val();
    let selectedTopics = []

    // console.log(username, password)

    for (const selectedCheckbox of $('#createUserModal').find('input:checked')) {
      selectedTopics.push(selectedCheckbox.value);
    }

    selectedTopics = selectedTopics.join(',');

    const bodyData = `username=${encodeURIComponent(username)}`+
    `&password=${encodeURIComponent(password)}`+
    `&selectedTopics=${encodeURIComponent(selectedTopics)}`
    

    fetch('/user/create', { 
      method: "POST", 
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body:  bodyData
    })
      .then(response => response.json())
      .then(result => {
        createToast({
          bg: result.status,
          title: 'Hệ thống',
          msg: result.msg
        });

        //Make modal's form ready
        formReady($('#createUserModal'));

        //Close modal
        $('#createUserModal').modal('hide');
      });
  })
});



