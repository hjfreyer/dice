Polymer('x-app', {
  // initialize the element's model
  ready: function() {
    this.view = null;

    var routes = {
      '/': function() {
        document.location.hash = "/e";
      }.bind(this),

      '/e': function(expId) {
        this.view = {name: 'experiment-index'};
      }.bind(this),

      '/e/new': function(expId) {
        this.view = {name: 'experiment-new'};
      }.bind(this),

      '/e/:expId/view': function(expId) {
        this.view = {name: 'experiment-view', id: parseInt(expId)};
      }.bind(this),

      '/e/:expId/upload': function(expId) {
        this.view = {name: 'uploader', expId: parseInt(expId)};
      }.bind(this),

      '/e/:expId/participants': function(expId) {
        this.view = {name: 'participants-list', expId: parseInt(expId)};
      }.bind(this),

      '/e/:expId/participant/new': function(expId) {
        this.view = {name: 'participants-new', expId: parseInt(expId)};
      }.bind(this),

      '/u/new': function() {
        this.view = {name: 'user-new'};
      }.bind(this),

      '/u/:userId/edit': function(userId) {
        this.view = {name: 'user-editor', userId: userId};
      }.bind(this),

      '/p/:photoId': function(photoId) {
        this.view = {name: 'annotator', photoId: photoId};
      }.bind(this)
    };

    var router = Router(routes).configure({
      notfound: function() {
        this.view = {name: 'not-found'};
      }.bind(this)
    });

    router.init('/');

    this.route = 'foo';
    this.owner = 'Rafael';
  }
});
