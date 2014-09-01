(function(Polymer, Q, globals, gapi) {
  var execute = function(request) {
    var deferred = Q.defer();
    request.execute(function(jsonResp, rawResp) {
      deferred.resolve(jsonResp);
    });
    return deferred.promise;
  };

  // var listDir = function(drive, folderIdPromise) {
  //   return folderIdPromise.then(function(folderId) {
  //     return execute(drive.children.list({folderId: folderId}));
  //   });
  // };



  // DiceSet.fromFolderId = function(drive, folderIdPromise) {
  //   folderIdPromise.then(function(folderId) {
  //     return execute(drive.children.list({folderId: folderId}));
  //   }).then(function(result) {
  //     var childInfos = result.items.map(function(item) {
  //       return execute(drive.file.get({id: item.id}));
  //     });
  //     return Q.all(result);
  //   }).then(function(childInfos) {
  //
  //   });
  // };

  Polymer('x-overview', {
    ready: function() {
      var deferredPicker = Q.defer();
      // gapi.load('picker', {'callback': function() {
      //   deferredPicker.resolve(google.picker);
      // }});
      this.picker = deferredPicker.promise;

      this.drive = null;
      this.auth = null;

      this.userSet = null;
    },
    scopes: globals.SCOPES.join(' '),
    folderId: '0By0VXVqSXF5oRjFnRnlsNUZiQnM',  // TMP
    folders: [],
    signedIn: false,
    signIn: function(e) {
      console.log('boom');
      this.signedIn = true;
      this.auth = e.detail.result;
      this.tryGo();
    },
    driveLoad: function() {
      this.drive = this.$.driveApi.api;
      this.tryGo();
    },
    pick: function() {
      var p = this.pickerApi;
      var view = new p.DocsView(p.ViewId.FOLDERS);
      // view.setIncludeFolders(true);
      view.setMimeTypes("application/vnd.google-apps.folder");
      view.setSelectFolderEnabled(true);

      var picker = new this.pickerApi.PickerBuilder()
            .addView(view)
            .setOAuthToken(this.authToken.access_token)
            .setDeveloperKey(globals.API_KEY)
            .setCallback(this.cb.bind(this))
            .build();
      picker.setVisible(true);
    },
    tryGo: function() {
      if (this.drive && this.auth) {
        this.go();
      }
    },
    go: function(args) {


      // var x = window.getFile(this.drive, '0By0VXVqSXF5oQ3lzVHhOZExra28', 1  ).then(function(x) {
      //   console.log(x)
      // }, function(x) {console.log(x);});
      window.getUserSet(this.drive, '0By0VXVqSXF5oRjFnRnlsNUZiQnM')
        .then(function(userSet) { this.userSet = userSet; }.bind(this),
        function(err) { console.log(err); });

      return
      var x = window.listDirRecFromId(this.drive, '0By0VXVqSXF5oRjFnRnlsNUZiQnM', 3).then(function(x) {
        console.log(x)
      }, function(x) {console.log(x);});

      return;
      var x = window.makeUserSet(this.drive, '0By0VXVqSXF5oRjFnRnlsNUZiQnM').then(function(x) {
        console.log(x)
      }, function(x) {console.log(x);});

      console.log('foo');
      console.log(x.end);
      return;

      Q(this.folderId)
        .then(function(folderId) {
        })
        .then(function(childrenList) {
          var userDirInfos = [];
          childrenList.items.forEach(function(item) {
            userDirInfos.push(execute(drive.files.get({
              fileId: item.id
            })));
          });
          return Q.all(userDirInfos);
        })
        .then(function(childrenInfo) {
          var folderChildren = childrenInfo.filter(function(item) {
            return item.mimeType == 'application/vnd.google-apps.folder';
          });
          var folderChildrenContents = folderChildren.map(function(child) {
            return execute(drive.children.list({
              folderId: child
            }));
          });
          return Q.all(folderChildrenContents);
        });
    },
    cb: function(e) {
      if (e.action != 'picked') {
        return;
      }
      console.log(e);
      this.folderId = e.docs[0].id;
      this.$.list.go();
    }
  });
}(Polymer, Q, globals, gapi));
