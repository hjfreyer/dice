
var CLIENT_ID=
      '895593330219-dagqsd3t6aqm8qtvp9t02mkd4aafnkbi.apps.googleusercontent.com';

var SCOPES = [
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.file'
];

var auth = function(immediate, callback) {
  gapi.auth.authorize({
    client_id: CLIENT_ID,
    scope: SCOPES,
    immediate: immediate
  }, callback);
};

Polymer('x-init', {
  state: 'LOADING',
  ready: function() {
    this.url = purl();

    if (!this.url.param('state')) {
      this.state = 'BAD_URL';
      return;
    }
    this.driveState = JSON.parse(this.url.param('state'));
    this.state = 'LOADING';

    gapi.load('auth:client,drive-realtime', function() {
      auth(true, this.handleAuthResult.bind(this));
    }.bind(this));
  },
  login: function() {
    this.state = 'LOADING';
    auth(false, this.handleAuthResult.bind(this));
  },
  handleAuthResult: function(authResult) {
    if (authResult && !authResult.error) {
      this.state = 'LOGGED_IN';
    } else {
      this.state = 'LOGGED_OUT';
    }
  }
});

Polymer('x-app', {
  ready: function() {
    this.width = 800;
    this.height = 600;
    this.canvas = this.$.canvas;

    gapi.drive.realtime.load(this.driveState.ids[0],
                             this.onFileLoaded.bind(this));
    this.image = new Image();
    this.image.onload = this.onImageLoaded.bind(this);
    this.image.src = "https://docs.google.com/uc?id=" + this.driveState.ids[0];

    this.imageReady = false;
    this.docReady = false;
  },
  onFileLoaded: function(doc) {
    this.docReady = true;
    this.doc = doc;
    this.root = this.doc.getModel().getRoot();
    if (!this.root.get('title')) {
      this.root.set('title', this.doc.getModel().createString());
    }
    gapi.drive.realtime.databinding.bindString(this.root.get('title'),
                                               this.$.title);
    this.onAllLoaded();
  },
  onImageLoaded: function() {
    this.imageReady = true;
    this.onAllLoaded();
  },
  onAllLoaded: function() {
    if (!this.docReady || !this.imageReady) {
      return;
    }
    this.annotator = new Annotator(
      this.canvas, this.image, this.doc.getModel());
    this.annotator.draw();
  },
  resetModel: function() {
    this.annotator.reset();
  }
});
