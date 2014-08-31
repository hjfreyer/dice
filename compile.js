(function() {
  var execute = function(request) {
    var deferred = Q.defer();
    request.execute(function(jsonResp, rawResp) {
      return deferred.resolve(jsonResp);
    });
    return deferred.promise;
  };

  var isDir = function(file) {
    return file.mimeType === 'application/vnd.google-apps.folder';
  };
  var isImage = function(file) {
    return file.mimeType === 'image/jpeg';
  };
  var splitPred = function(pred, list) {
    var yes = list.filter(pred);
    var no = list.filter(function(x) { return !pred(x); });
    return [yes, no];
  };

  var listDir = function(drive, folderId) {
    return execute(drive.children.list({
      folderId: folderId,
    }))
    .then(function(children) {
      var childInfos = children.items.map(function(child) {
        return execute(drive.files.get({fileId: child.id}));
      });
      return Q.all(childInfos);
    });
  };

  var Dir = function(file, subdirs, contents) {
    this.file = file;
    this.subdirs = subdirs;
    this.contents = contents;
  };

  var listDirRec = function(drive, dirFile, depth) {
    if (depth === 0) {
      return Q(new Dir(dirFile, [], []));
    }
    return listDir(drive, dirFile.id)
    .then(function(children) {
      children = children.filter(function(child) {
        return !child.labels.trashed;
      });
      var split = splitPred(isDir, children);
      var subdirs = split[0].map(function(subDir) {
        return listDirRec(drive, subDir, depth - 1);
      });
      var files = split[1];
      return Q.all([Q(files), Q.all(subdirs)]);
    })
    .then(function(args) {
      return new Dir(dirFile, args[1], args[0]);
    });
  };

  var listDirRecFromId = function(drive, dirId, depth) {
    return execute(drive.files.get({fileId: dirId}))
    .then(function(file) {
      return listDirRec(drive, file, depth);
    });
  };

  var UserSet = function(users) {
    this.users = users;
  };

  UserSet.fromDir = function(dir) {
    var users = dir.subdirs.map(User.fromDir);
    return new UserSet(users);
  };

  var User = function(name, dice) {
    this.name = name;
    this.dice = dice;
  };

  User.fromDir = function(dir) {
    var dice = dir.subdirs.map(Die.fromDir);
    return new User(dir.title, dice);
  };

  var Die = function(name) {
    this.name = name;
  };

  Die.fromDir = function(dir) {
    var name = folder.title;
    /*return listDir(drive, folder.id)
    .then(function(children) {
      var images = children.filter(isImage);
      var photoPromises = folders.map(function(folder) {
        return Die.fromFolder(drive, folder);
      });
      return Q.all(dicePromises);
    }).then(function(dice) {
      return new User(name, dice);
    });*/
    return Q(new Die(name));
  };

  var Face = function() {

  };

  

/*
  var Compiler, Die, User, UserSet,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  UserSet = (function() {
    function UserSet() {}

    return UserSet;

  })();

  User = (function() {
    function User() {}

    return User;

  })();

  Die = (function() {
    function Die() {}

    return Die;

  })();

  var Compiler = (function() {
    function Compiler(drive) {
      this.drive = drive;
      this.listDir = __bind(this.listDir, this);
    }


    Compiler.prototype.listDir = function(folderId) {
      return this.execute(this.drive.children.list({
        folderId: folderId
      })).then((function(_this) {
        return function(children) {
          var childIds, childInfos, id, item;
          childIds = (function() {
            var _i, _len, _ref, _results;
            _ref = children.items;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              item = _ref[_i];
              _results.push(item.id);
            }
            return _results;
          })();
          childInfos = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = childIds.length; _i < _len; _i++) {
              id = childIds[_i];
              _results.push(this.execute(this.drive.files.get({
                fileId: id
              })));
            }
            return _results;
          }).call(_this);
          return Q.all(childInfos);
        };
      })(this));
    };

    Compiler.prototype.makeUserSet = function(folderId) {
      var subfoldersPromise;
      return subfoldersPromise = listDir(folderId).then((function(_this) {
        return function(children) {
          var i, _i, _len, _results;
          if (i.mimeType === 'application/vnd.google-apps.folder') {
            _results = [];
            for (_i = 0, _len = children.length; _i < _len; _i++) {
              i = children[_i];
              _results.push(i);
            }
            return _results;
          }
        };
      })(this));
    };

    return Compiler;

  })();

  window.Compiler = Compiler;*/
  window.makeUserSet = function(drive, folderId) {
    return UserSet.fromFolderId(drive, folderId);
  };
}).call(this);
