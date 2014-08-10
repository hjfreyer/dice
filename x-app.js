
var CLIENT_ID=
      '895593330219-dagqsd3t6aqm8qtvp9t02mkd4aafnkbi.apps.googleusercontent.com';

var SCOPES = [
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.file'
];

var isEmpty = function(obj) {
  for (var x in obj) {
    return false;
  }
  return true;
};

var DependencyManager = function() {
  this._ready = [];
  this._waiting = [];

  this._providedValues = {};
};

var Dependency = function(requires, load) {
  this.requires = requires;
  this.load = load;

  this.stillRequires = {};
  this.requires.forEach(function(req) {
    this.stillRequires[req] = true;
  }, this);
};

DependencyManager.prototype.add = function(requires, load) {
  this._waiting.push(new Dependency(requires, load));
};

DependencyManager.prototype.get = function(name) {
  return this._providedValues[name];
};

DependencyManager.prototype.provide = function(name, value) {
  this._providedValues[name] = value;

  var stillWaiting = [];
  this._waiting.forEach(function(dep) {
    delete dep.stillRequires[name];
    if (isEmpty(dep.stillRequires)) {
      this._ready.push(dep);
    } else {
      stillWaiting.push(dep);
    }
  }, this);
  this._waiting = stillWaiting;
  this.go();
};

DependencyManager.prototype.go = function() {
  var toExec = this._ready;
  this._ready = [];
  toExec.forEach(function(dep) { dep.load(); }, this);
};

Polymer('x-app', {
  created: function() {
    this.clientId = CLIENT_ID;
    this.scopes = SCOPES.join(' ');

    this.width = 800;
    this.height = 600;

    this.error = null;

    this.depman = new DependencyManager();
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
  },
  resetModel: function() {
    this.annotator.reset();
  }
});
