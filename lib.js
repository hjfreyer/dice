(function() {
  var COLORS, Csv, Photo, User, docPromises, exec, getCsv, getDoc, getRealtime, globals, groupBy, groupByFunc, initDoc, initPhoto, initUser, realtimePromise;

  globals = {
    CLIENT_ID: '895593330219-dagqsd3t6aqm8qtvp9t02mkd4aafnkbi.apps.' + 'googleusercontent.com',
    API_KEY: 'AIzaSyBlvPyizj2oXOt_EyrG-eh0WVO5R-DJT9o',
    SCOPES: ['https://www.googleapis.com/auth/drive.install', 'https://www.googleapis.com/auth/drive.file']
  };

  exec = function(request) {
    var deferred;
    deferred = Q.defer();
    request.execute(function(jsonResp, rawResp) {
      return deferred.resolve(jsonResp);
    });
    return deferred.promise;
  };

  Polymer('x-header', {
    clientId: globals.CLIENT_ID,
    scopes: globals.SCOPES.join(' ')
  });

  Polymer('x-body', {
    created: function() {
      return this.authReady = false;
    },
    ready: function() {
      var router;
      this.location = {};
      router = Router({
        '/': (function(_this) {
          return function() {
            return _this.location = {
              name: 'index'
            };
          };
        })(this),
        '/create/:folderId': (function(_this) {
          return function(folderId) {
            return _this.location = {
              name: 'create',
              folderId: folderId
            };
          };
        })(this),
        '/p/:projectId': (function(_this) {
          return function(projectId) {
            return _this.location = {
              name: 'overview',
              projectId: projectId
            };
          };
        })(this),
        '/p/:projectId/upload': (function(_this) {
          return function(projectId) {
            return _this.location = {
              name: 'upload',
              projectId: projectId
            };
          };
        })(this),
        '/p/:projectId/a/:photoId': (function(_this) {
          return function(projectId, photoId) {
            return _this.location = {
              name: 'annotator',
              projectId: projectId,
              photoId: photoId
            };
          };
        })(this),
        '.*': (function(_this) {
          return function() {
            return _this.location = {
              name: 'not-found'
            };
          };
        })(this)
      });
      return router.init('/');
    },
    authSuccess: function() {
      return this.authReady = true;
    }
  });

  Csv = (function() {
    function Csv() {
      this.rows = [];
    }

    Csv.prototype.addRow = function(row) {
      return this.rows.push(row);
    };

    Csv.prototype.toString = function() {
      var row, rowStrs;
      rowStrs = (function() {
        var _i, _len, _ref, _results;
        _ref = this.rows;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          _results.push('"' + row.join('","') + '"');
        }
        return _results;
      }).call(this);
      return rowStrs.join('\n');
    };

    return Csv;

  })();

  COLORS = ['Yellow', 'Green', 'Blue', 'Red'];

  getCsv = function(doc) {
    var attr, byDie, byPips, color, csv, face, header, item, photos, row, user, userData, _i, _j, _k, _l, _len, _len1, _len2, _m, _ref, _ref1, _ref2, _ref3;
    header = ['ID', 'Name', 'Sex', 'Group'];
    for (_i = 0, _len = COLORS.length; _i < _len; _i++) {
      color = COLORS[_i];
      for (face = _j = 3; _j <= 6; face = ++_j) {
        _ref = ['Coords', 'Desc'];
        for (_k = 0, _len1 = _ref.length; _k < _len1; _k++) {
          attr = _ref[_k];
          header.push("" + color + " (" + face + ") " + attr);
        }
      }
    }
    csv = new Csv();
    csv.addRow(header);
    photos = doc.getModel().getRoot().get('photos');
    photos = (function() {
      var _l, _len2, _ref1, _results;
      _ref1 = photos.items();
      _results = [];
      for (_l = 0, _len2 = _ref1.length; _l < _len2; _l++) {
        item = _ref1[_l];
        _results.push(new Photo(item[0], item[1].get('annotations')));
      }
      return _results;
    })();
    _ref1 = groupBy('user', photos);
    for (user in _ref1) {
      photos = _ref1[user];
      userData = (_ref2 = doc.getModel().getRoot().get('users').get(user)) != null ? _ref2.get('data') : void 0;
      row = [user, userData != null ? userData.name : void 0, userData != null ? userData.sex : void 0, userData != null ? userData.group : void 0];
      byDie = groupBy('name', photos);
      for (_l = 0, _len2 = COLORS.length; _l < _len2; _l++) {
        color = COLORS[_l];
        photos = (_ref3 = byDie[color]) != null ? _ref3 : [];
        byPips = groupByFunc((function(x) {
          var _ref4, _ref5;
          return (_ref4 = (_ref5 = x.pips) != null ? _ref5.length : void 0) != null ? _ref4 : 0;
        }), photos);
        for (face = _m = 3; _m <= 6; face = ++_m) {
          photos = byPips[face];
          if (!photos) {
            row.push('');
            row.push('');
          } else {
            row.push(photos[0].getCoordsString());
            row.push(photos[0].description);
          }
        }
      }
      csv.addRow(row);
    }
    return csv.toString();
  };

  Polymer('x-create', {
    ready: function() {
      this.api = null;
      return this.auth = false;
    },
    driveReady: function() {
      this.api = this.$.drive.api;
      return this.tryCreate();
    },
    authReady: function() {
      this.auth = true;
      return this.tryCreate();
    },
    tryCreate: function() {
      var boundary, close_delim, delimiter, metadata, multipartRequestBody, request, res;
      if (!this.api || !this.auth) {
        return;
      }
      boundary = '-------314159265358979323846';
      delimiter = "\r\n--" + boundary + "\r\n";
      close_delim = "\r\n--" + boundary + "--";
      metadata = {
        title: 'Dice Collection',
        mimeType: 'application/vnd.google-apps.drive-sdk'
      };
      multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + close_delim;
      request = gapi.client.request({
        'path': '/upload/drive/v2/files',
        'method': 'POST',
        'params': {
          'uploadType': 'multipart'
        },
        'headers': {
          'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
      });
      return res = exec(request).then(function(file) {
        return location.hash = '#/p/' + file.id;
      });
    }
  });

  groupByFunc = function(func, records) {
    var p, r, results, _i, _len;
    results = {};
    for (_i = 0, _len = records.length; _i < _len; _i++) {
      r = records[_i];
      p = func(r);
      if (!p) {
        continue;
      }
      if (results[p] == null) {
        results[p] = [];
      }
      results[p].push(r);
    }
    return results;
  };

  groupBy = function(property, records) {
    return groupByFunc((function(x) {
      return x[property];
    }), records);
  };

  Photo = (function() {
    function Photo(id, annotations) {
      var k, v;
      this.id = id;
      for (k in annotations) {
        v = annotations[k];
        this[k] = v;
      }
    }

    Photo.prototype.isLabeled = function() {
      return this.user && this.name;
    };

    Photo.prototype.isAnnotated = function() {
      return this.isLabeled() && this.grid && this.pips && this.description;
    };

    Photo.prototype.getCoordsString = function() {
      var coords, p, x, y, _i, _len, _ref;
      if (!(this.grid && (this.grid.x != null) && (this.grid.y != null) && this.grid.width && this.grid.height && this.pips)) {
        return '';
      }
      coords = [];
      _ref = this.pips;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        x = Math.round((p.x - this.grid.x) / this.grid.width * 10.0);
        y = Math.round((p.y - this.grid.y) / this.grid.height * 10.0);
        coords.push("(" + x + "," + y + ")");
      }
      return coords.join(',');
    };

    return Photo;

  })();

  User = (function() {
    function User(id, data) {
      this.id = id;
      this.data = data;
    }

    User.prototype.isComplete = function() {
      return this.data.sex && this.data.name && this.data.group;
    };

    return User;

  })();

  Polymer('x-project', {
    docReady: function() {
      return this.doc = this.$.doc.doc;
    }
  });

  Polymer('photo-model', {
    created: function() {
      this.doc = null;
      this.photoId = null;
      return this.annotations = null;
    },
    observe: {
      'annotations': 'pushAnnotations',
      'annotations.user': 'pushAnnotations',
      'annotations.name': 'pushAnnotations',
      'annotations.description': 'pushAnnotations',
      'annotations.grid': 'pushAnnotations',
      'annotations.pips': 'pushAnnotations'
    },
    docChanged: function() {
      var photo, _ref;
      photo = this.getPhoto();
      if (!photo) {
        return;
      }
      photo.addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, (function(_this) {
        return function(e) {
          if (e.isLocal || e.property !== 'annotations') {
            return;
          }
          return _this.annotations = e.newValue;
        };
      })(this));
      return this.annotations = (_ref = this.getPhoto()) != null ? _ref.get('annotations') : void 0;
    },
    pushAnnotations: function(oldValue, newValue) {
      var photo, remote, _ref;
      this.fire('changed');
      photo = this.getPhoto();
      if (!photo) {
        return;
      }
      remote = photo.get('annotations');
      if (JSON.stringify(newValue) === JSON.stringify(remote)) {
        return;
      }
      return (_ref = this.getPhoto()) != null ? _ref.set('annotations', this.annotations) : void 0;
    },
    getPhoto: function() {
      var _ref, _ref1;
      return (_ref = this.doc) != null ? (_ref1 = _ref.getModel().getRoot().get('photos')) != null ? _ref1.get(this.photoId) : void 0 : void 0;
    }
  });

  Polymer('user-model', {
    created: function() {
      this.doc = null;
      this.userId = null;
      return this.data = null;
    },
    observe: {
      'data': 'pushData',
      'data.name': 'pushData',
      'data.sex': 'pushData',
      'data.group': 'pushData'
    },
    docChanged: function() {
      var user;
      user = this.getUser();
      if (!user) {
        initUser(this.doc, this.userId, {});
        user = this.getUser();
      }
      user.addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, (function(_this) {
        return function(e) {
          if (e.isLocal || e.property !== 'data') {
            return;
          }
          return _this.data = e.newValue;
        };
      })(this));
      return this.data = user.get('data');
    },
    pushData: function(oldValue, newValue) {
      var remote, user;
      this.fire('changed');
      user = this.getUser();
      if (!user) {
        return;
      }
      remote = user.get('data');
      if (JSON.stringify(newValue) === JSON.stringify(remote)) {
        return;
      }
      return user.set('data', this.data);
    },
    getUser: function() {
      var _ref;
      return (_ref = this.doc) != null ? _ref.getModel().getRoot().get('users').get(this.userId) : void 0;
    }
  });

  initDoc = function(doc) {
    var photos, users;
    if (!doc) {
      return;
    }
    if (!doc.getModel().getRoot().get('photos')) {
      photos = doc.getModel().createMap();
      doc.getModel().getRoot().set('photos', photos);
    }
    if (!doc.getModel().getRoot().get('users')) {
      users = doc.getModel().createMap();
      return doc.getModel().getRoot().set('users', users);
    }
  };

  initPhoto = function(doc, photoId, defaultAnno) {
    var anno, photo, photos;
    photos = doc.getModel().getRoot().get('photos');
    photo = photos.get(photoId);
    if (!photo) {
      photo = doc.getModel().createMap();
      photos.set(photoId, photo);
    }
    anno = photo.get('annotations');
    if (!anno) {
      return photo.set('annotations', defaultAnno);
    }
  };

  initUser = function(doc, userId, defaultData) {
    var data, user, users;
    users = doc.getModel().getRoot().get('users');
    user = users.get(userId);
    if (!user) {
      user = doc.getModel().createMap();
      users.set(userId, user);
    }
    data = user.get('data');
    if (!data) {
      return user.set('data', defaultData);
    }
  };

  Polymer('x-overview', {
    created: function() {
      this.fileId = null;
      this.doc = null;
      this.unlabeled = null;
      this.problems = null;
      return this.users = null;
    },
    docChanged: function() {
      this.doc.getModel().getRoot().get('photos').addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, (function(_this) {
        return function() {
          return _this.update();
        };
      })(this));
      this.doc.getModel().getRoot().get('users').addEventListener(gapi.drive.realtime.EventType.VALUE_CHANGED, (function(_this) {
        return function() {
          return _this.update();
        };
      })(this));
      return this.update();
    },
    update: function() {
      var c, covered, dieToPhotos, id, key, p, photos, userIds, _i, _j, _k, _l, _len, _len1, _ref;
      photos = this.getPhotos();
      if (!photos) {
        return;
      }
      userIds = {};
      for (_i = 0, _len = photos.length; _i < _len; _i++) {
        p = photos[_i];
        if (p.user) {
          userIds[p.user] = true;
        }
      }
      this.userIds = (function() {
        var _results;
        _results = [];
        for (id in userIds) {
          _results.push(id);
        }
        return _results;
      })();
      this.unlabeled = [];
      this.badPips = [];
      dieToPhotos = {};
      while (photos.length !== 0) {
        p = photos.pop();
        if (!p.isAnnotated()) {
          this.unlabeled.push(p);
          continue;
        }
        if (!((2 < (_ref = p.pips.length) && _ref <= 6))) {
          this.badPips.push(p);
          continue;
        }
        key = p.user + ',' + p.name;
        if (dieToPhotos[key] == null) {
          dieToPhotos[key] = [];
        }
        dieToPhotos[key].push(p);
      }
      this.dieProblems = [];
      for (key in dieToPhotos) {
        photos = dieToPhotos[key];
        covered = {};
        for (c = _j = 3; _j <= 6; c = ++_j) {
          covered[c] = [];
        }
        for (_k = 0, _len1 = photos.length; _k < _len1; _k++) {
          p = photos[_k];
          covered[p.pips.length].push(p);
        }
        for (c = _l = 3; _l <= 6; c = ++_l) {
          if (covered[c].length !== 1) {
            this.dieProblems.push({
              user: photos[0].user,
              name: photos[0].name,
              side: c,
              photos: covered[c]
            });
          }
        }
      }
      return this.csv = getCsv(this.doc);
    },
    "export": function() {
      this.update();
      return document.location = 'data:text/csv,' + encodeURIComponent(this.csv);
    },
    getPhotos: function() {
      var item, photos, _ref;
      photos = (_ref = this.doc) != null ? _ref.getModel().getRoot().get('photos') : void 0;
      if (!photos) {
        return;
      }
      return (function() {
        var _i, _len, _ref1, _results;
        _ref1 = photos.items();
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          item = _ref1[_i];
          _results.push(new Photo(item[0], item[1].get('annotations')));
        }
        return _results;
      })();
    }
  });

  Polymer('x-upload', {
    created: function() {
      this.projectId = null;
      this.doc = null;
      this.pickerApi = false;
      return gapi.load('picker', (function(_this) {
        return function() {
          return _this.pickerReady();
        };
      })(this));
    },
    pickerReady: function() {
      return this.pickerApi = true;
    },
    showPicker: function() {
      var picker, view;
      view = new google.picker.DocsView();
      view.setIncludeFolders(true);
      view.setMimeTypes('image/jpeg,image/png');
      picker = new google.picker.PickerBuilder().setOAuthToken(gapi.auth.getToken().access_token).setDeveloperKey(globals.API_KEY).setCallback((function(_this) {
        return function(o) {
          return _this.pickerCb(o);
        };
      })(this)).addView(view).enableFeature(google.picker.Feature.MINE_ONLY).enableFeature(google.picker.Feature.MULTISELECT_ENABLED).build();
      return picker.setVisible(true);
    },
    pickerCb: function(o) {
      var doc, model, _i, _len, _ref;
      console.log(o);
      if (o.action !== 'picked') {
        return;
      }
      model = this.doc.getModel();
      _ref = o.docs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        doc = _ref[_i];
        initPhoto(this.doc, doc.id, {
          user: this.user,
          name: this.name
        });
      }
      return location.hash = '#/p/' + this.projectId;
    }
  });

  Polymer('x-annotator', {
    created: function() {
      this.width = 600;
      this.height = 600;
      return this.image = new Image();
    },
    ready: function() {
      this.annotator = new Annotator(this.$.canvas);
      this.image.onload = (function(_this) {
        return function() {
          return _this.annotator.setImage(_this.image);
        };
      })(this);
      return this.image.src = "https://docs.google.com/uc?id=" + this.photoId;
    },
    annotationsChanged: function() {
      return this.annotator.setAnnotations(this.annotations);
    },
    resetAnno: function() {
      this.annotations.grid = null;
      this.annotations.pips = null;
      return this.annotator.setAnnotations(this.annotations);
    },
    deletePhoto: function() {
      this.doc.getModel().getRoot().get('photos')["delete"](this.photoId);
      return location.hash = '#/p/' + this.projectId;
    }
  });

  Polymer('user-editor', {
    update: function() {
      return this.isComplete = this.data.name && this.data.sex && this.data.group;
    }
  });

  realtimePromise = null;

  getRealtime = function() {
    var deferred;
    if (!realtimePromise) {
      deferred = Q.defer();
      gapi.load('drive-realtime', function() {
        return deferred.resolve(true);
      });
      realtimePromise = deferred.promise;
    }
    return realtimePromise;
  };

  docPromises = {};

  getDoc = function(fileId) {
    if (!docPromises[fileId]) {
      console.log('Loading doc');
      docPromises[fileId] = getRealtime().then(function() {
        var deferred;
        deferred = Q.defer();
        gapi.drive.realtime.load(fileId, function(doc) {
          return deferred.resolve(doc);
        });
        return deferred.promise;
      });
    }
    return docPromises[fileId];
  };

  Polymer('realtime-doc', {
    created: function() {
      this.fileId = '';
      return this.doc = null;
    },
    authReady: function() {
      return getDoc(this.fileId).then((function(_this) {
        return function(doc) {
          return _this.onFileLoaded(doc);
        };
      })(this)).done();
    },
    onFileLoaded: function(doc) {
      this.doc = doc;
      initDoc(this.doc);
      return this.fire('realtime-doc-loaded');
    }
  });

}).call(this);

(function() {
  var Annotator, Map1D, Map2D, pt;

  pt = function(x, y) {
    return {
      x: x,
      y: y
    };
  };

  Map1D = (function() {
    function Map1D(s, t) {
      this.s = s;
      this.t = t;
    }

    Map1D.prototype.map = function(x) {
      return this.s * x + this.t;
    };

    Map1D.prototype.inv = function() {
      return new Map1D(1.0 / this.s, -this.t / this.s);
    };

    return Map1D;

  })();

  Map1D.fromExample = function(before1, after1, before2, after2) {
    var s, t;
    s = (after2 - after1) / (before2 - before1);
    t = ((before1 * after2) - (after1 * before2)) / (before1 - before2);
    return new Map1D(s, t);
  };

  Map2D = (function() {
    function Map2D(x, y) {
      this.x = x;
      this.y = y;
    }

    Map2D.prototype.map = function(pt) {
      return {
        x: this.x.map(pt.x),
        y: this.y.map(pt.y)
      };
    };

    Map2D.prototype.mapRect = function(rect) {
      var pt1, pt2;
      pt1 = this.map({
        x: rect.x,
        y: rect.y
      });
      pt2 = this.map({
        x: rect.x + rect.width,
        y: rect.y + rect.height
      });
      return {
        x: pt1.x,
        y: pt1.y,
        width: pt2.x - pt1.x,
        height: pt2.y - pt1.y
      };
    };

    Map2D.prototype.inv = function() {
      return new Map2D(this.x.inv(), this.y.inv());
    };

    return Map2D;

  })();

  Map2D.fromExample = function(before1, after1, before2, after2) {
    var mx, my;
    mx = Map1D.fromExample(before1.x, after1.x, before2.x, after2.x);
    my = Map1D.fromExample(before1.y, after1.y, before2.y, after2.y);
    return new Map2D(mx, my);
  };

  Annotator = (function() {
    function Annotator(canvas) {
      this.canvas = canvas;
      this.image = null;
      this.annotations = null;
      this.cxt = this.canvas.getContext('2d');
      this.clickStack = [];
      this.canvas.onclick = (function(_this) {
        return function(e) {
          return _this.click(e);
        };
      })(this);
    }

    Annotator.prototype.setImage = function(image) {
      this.image = image;
      return this.update();
    };

    Annotator.prototype.setAnnotations = function(annotations) {
      this.annotations = annotations;
      this.clickStack = [];
      return this.update();
    };

    Annotator.prototype.isReady = function() {
      return this.image && this.annotations;
    };

    Annotator.prototype.click = function(e) {
      var c1, c2, canvasRect, x, y, _base;
      if (!this.isReady()) {
        return;
      }
      canvasRect = this.canvas.getBoundingClientRect();
      x = e.pageX - (canvasRect.left + window.pageXOffset);
      y = e.pageY - (canvasRect.top + window.pageYOffset);
      this.clickStack.push(this.vpToImage.map(pt(x, y)));
      if (this.state === 'grid' && this.clickStack.length === 2) {
        c1 = this.clickStack[0];
        c2 = this.clickStack[1];
        this.annotations.grid = {
          x: c1.x,
          y: c1.y,
          width: c2.x - c1.x,
          height: c2.y - c1.y
        };
        this.clickStack = [];
      } else if (this.state === 'pips') {
        if ((_base = this.annotations).pips == null) {
          _base.pips = [];
        }
        this.annotations.pips.push(this.clickStack[0]);
        this.clickStack = [];
      }
      return this.update();
    };

    Annotator.prototype.update = function() {
      var grid, newSide, scale, vpMin;
      if (!this.isReady()) {
        return;
      }
      grid = this.annotations.grid;
      if (grid) {
        this.state = 'pips';
        newSide = Math.max(grid.width, grid.height);
        vpMin = Math.min(this.canvas.width, this.canvas.height);
        this.vpToImage = Map2D.fromExample(pt(0, 0), pt(grid.x - newSide * 0.1, grid.y - newSide * 0.1), pt(vpMin, vpMin), pt(grid.x + newSide * 1.1, grid.y + newSide * 1.1));
      } else {
        this.state = 'grid';
        scale = Math.max(this.image.width / this.canvas.width, this.image.height / this.canvas.height);
        this.vpToImage = new Map2D(new Map1D(scale, 0), new Map1D(scale, 0));
      }
      return this.draw();
    };

    Annotator.prototype.draw = function() {
      var LINE_COUNT, grid, i, imgToVp, mapped, pip, pips, rect, xOff, yOff, _i, _j, _len, _results;
      this.cxt.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.cxt.setStrokeColor('red');
      this.cxt.setFillColor('red');
      imgToVp = this.vpToImage.inv();
      rect = imgToVp.mapRect({
        x: 0,
        y: 0,
        width: this.image.width,
        height: this.image.height
      });
      this.cxt.drawImage(this.image, rect.x, rect.y, rect.width, rect.height);
      LINE_COUNT = 10;
      grid = this.annotations.grid;
      if (grid) {
        for (i = _i = 0; 0 <= LINE_COUNT ? _i <= LINE_COUNT : _i >= LINE_COUNT; i = 0 <= LINE_COUNT ? ++_i : --_i) {
          yOff = grid.height * (i / LINE_COUNT);
          mapped = imgToVp.mapRect({
            x: grid.x,
            y: grid.y + yOff,
            width: grid.width,
            height: grid.height - yOff
          });
          this.cxt.strokeRect(mapped.x, mapped.y, mapped.width, mapped.height);
          xOff = grid.width * (i / LINE_COUNT);
          mapped = imgToVp.mapRect({
            x: grid.x + xOff,
            y: grid.y,
            width: grid.width - xOff,
            height: grid.height
          });
          this.cxt.strokeRect(mapped.x, mapped.y, mapped.width, mapped.height);
        }
      }
      pips = this.annotations.pips;
      if (pips) {
        _results = [];
        for (_j = 0, _len = pips.length; _j < _len; _j++) {
          pip = pips[_j];
          pip = imgToVp.map(pip);
          _results.push(this.cxt.fillRect(pip.x - 2, pip.y - 2, 4, 4));
        }
        return _results;
      }
    };

    return Annotator;

  })();

  window.Annotator = Annotator;

}).call(this);
