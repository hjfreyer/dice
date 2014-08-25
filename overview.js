(function(window) {
  Polymer('folder-overview', {
    folderId: '',
    domReady: function() {
      console.log('folder ready');
    },
    onList: function(e) {
      this.$.list.go();
      console.log(e);
    },
    signIn2: function(e) {
      console.log('we get signal');
      this.authToken = e.detail.result;
    },
  });

  Polymer('x-overview', {
    ready: function() {
      gapi.load('picker', {'callback': this.onPickerApiLoad.bind(this)});
    },
    scopes: globals.SCOPES.join(' '),
    folderId: '0By0VXVqSXF5oRjFnRnlsNUZiQnM',  // TMP
    authToken: null,
    pickerApi: null,
    onPickerApiLoad: function() {
      this.pickerApi = google.picker;
    },
    signIn: function(e) {
      console.log('overview signin2');
      this.authToken = e.detail.result;
    },
    pick: function() {
      var p = this.pickerApi;
      var view = new p.DocsView(p.ViewId.FOLDERS);
      // view.setIncludeFolders(true);
      view.setMimeTypes("application/vnd.google-apps.folder");
      view.setSelectFolderEnabled(true);

      var picker = newthis.pickerApi.PickerBuilder()
            .addView(view)
            .setOAuthToken(this.authToken.access_token)
            .setDeveloperKey(window.globals.API_KEY)
            .setCallback(this.cb.bind(this))
            .build();
      picker.setVisible(true);
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
}(window));
