Polymer('annotator-page', {
  created: function() {
    this.clientId = globals.CLIENT_ID;
    this.scopes = globals.SCOPES.join(' ');

    this.width = 800;
    this.height = 600;

    this.authorized = false;
    this.error = null;

    this.depman = new dice.DependencyManager();
    this.annotator = null;
  },
  ready: function() {
    var url = purl();
    if (!url.param('state')) {
      this.error = 'Looks like you came here directly. You should ' +
        'have come here via Google Drive. Work on that.';
      return;
    }
    var driveState = JSON.parse(url.param('state'));
    this.fileId = driveState.ids[0];
    this.canvas = this.$.canvas;

    var _this = this;
    // Annotator
    this.depman.add(['image', 'doc'], function() {
      _this.annotator = new Annotator(_this.canvas,
                                      _this.depman.get('image'),
                                      _this.depman.get('doc').getModel());
    });

    // Doc
    this.depman.add(['authToken', 'realtime'], function() {
      var realtime = _this.depman.get('realtime');
      realtime.load(_this.fileId, function(doc) {
        _this.depman.provide('doc', doc);
        var str = doc.getModel().getRoot().get('description');
        if (!str) {
          str = doc.getModel().createString();
          doc.getModel().getRoot().set('description', str);
        }

        realtime.databinding.bindString(str, _this.$.description);
      });
    });

    // Realtime
    this.depman.add(['gapi'], function() {
      var gapi = _this.depman.get('gapi');
      gapi.load('drive-realtime', function() {
        _this.depman.provide('realtime', gapi.drive.realtime);
      });
    });

    // Image
    var image = new Image();
    image.onload = function() {
      _this.depman.provide('image', image);
    };
    image.src = "https://docs.google.com/uc?id=" + this.fileId;

    this.depman.provide('gapi', window.gapi);
  },
  signIn: function(e) {
    this.depman.provide('authToken', e.detail.result);
    this.authorized = true;
  },
  resetModel: function() {
    this.annotator.reset();
  }
});
