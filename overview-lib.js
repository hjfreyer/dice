(function() {
  var DIR_MIME, Die, Face, File, User, UserSet, execute, getFile;

  DIR_MIME = 'application/vnd.google-apps.folder';

  execute = function(request) {
    var deferred;
    deferred = Q.defer();
    request.execute(function(jsonResp, rawResp) {
      return deferred.resolve(jsonResp);
    });
    return deferred.promise;
  };

  File = (function() {
    function File(file, realtime, contents, subdirs) {
      this.file = file;
      this.realtime = realtime;
      this.contents = contents;
      this.subdirs = subdirs;
    }

    File.prototype.isTrashed = function() {
      return this.file.labels.trashed;
    };

    File.prototype.isDir = function() {
      return this.file.mimeType === DIR_MIME;
    };

    File.prototype.isImage = function() {
      return this.file.mimeType === 'image/jpeg';
    };

    return File;

  })();

  getFile = function(drive, id, maxDepth) {
    var getDir, getImage;
    getDir = function(dirFile) {
      if (maxDepth === 0) {
        return newFile(dirFile, null, [], []);
      }
      return execute(drive.children.list({
        folderId: dirFile.id
      })).then(function(children) {
        var child;
        return Q.all((function() {
          var _i, _len, _ref, _results;
          _ref = children.items;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            _results.push(getFile(drive, child.id, maxDepth - 1));
          }
          return _results;
        })());
      }).then(function(childFiles) {
        var contents, f, subdirs;
        subdirs = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = childFiles.length; _i < _len; _i++) {
            f = childFiles[_i];
            if (f.isDir()) {
              _results.push(f);
            }
          }
          return _results;
        })();
        contents = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = childFiles.length; _i < _len; _i++) {
            f = childFiles[_i];
            if (!f.isDir()) {
              _results.push(f);
            }
          }
          return _results;
        })();
        return new File(dirFile, null, contents, subdirs);
      });
    };
    getImage = function(imageFile) {
      var req;
      req = gapi.client.request({
        path: "/drive/v2/files/" + imageFile.id + "/realtime",
        method: 'GET'
      });
      return execute(req).then(function(realtime) {
        return new File(imageFile, realtime.data, [], []);
      });
    };
    return execute(drive.files.get({
      fileId: id
    })).then(function(file) {
      if (file.mimeType === DIR_MIME) {
        return getDir(file);
      }
      if (file.mimeType === 'image/jpeg') {
        return getImage(file);
      }
      return new File(file, [], [], []);
    });
  };

  UserSet = (function() {
    function UserSet(users) {
      this.users = users;
    }

    return UserSet;

  })();

  UserSet.fromFile = function(file) {
    var subDir;
    return new UserSet((function() {
      var _i, _len, _ref, _results;
      _ref = file.subdirs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subDir = _ref[_i];
        _results.push(User.fromFile(subDir));
      }
      return _results;
    })());
  };

  User = (function() {
    function User(name, dice) {
      this.name = name;
      this.dice = dice;
    }

    return User;

  })();

  User.fromFile = function(file) {
    var subDir;
    return new User(file.file.title, (function() {
      var _i, _len, _ref, _results;
      _ref = file.subdirs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subDir = _ref[_i];
        _results.push(Die.fromFile(subDir));
      }
      return _results;
    })());
  };

  Die = (function() {
    function Die(name, faces) {
      this.name = name;
      this.faces = faces;
    }

    return Die;

  })();

  Die.fromFile = function(file) {
    var f;
    return new Die(file.file.title, (function() {
      var _i, _len, _ref, _results;
      _ref = file.contents;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        if (f.isImage) {
          _results.push(Face.fromFile(f));
        }
      }
      return _results;
    })());
  };

  Face = (function() {
    function Face(grid, pips, description) {
      this.grid = grid;
      this.pips = pips;
      this.description = description;
    }

    return Face;

  })();

  Face.fromFile = function(file) {
    console.log(file.realtime);
    return new Face();
  };

  window.getUserSet = function(drive, dirId) {
    return getFile(drive, dirId, 3).then(function(file) {
      return UserSet.fromFile(file);
    });
  };

}).call(this);
