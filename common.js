(function() {
  var GLOBALS, getFileIdsFromUrl;

  GLOBALS = {
    CLIENT_ID: '895593330219-dagqsd3t6aqm8qtvp9t02mkd4aafnkbi.apps.' + 'googleusercontent.com',
    API_KEY: 'AIzaSyBlvPyizj2oXOt_EyrG-eh0WVO5R-DJT9o',
    SCOPES: ['https://www.googleapis.com/auth/drive.install', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly']
  };

  getFileIdsFromUrl = function() {
    var driveState, url;
    url = purl();
    if (!url.param('state')) {
      return null;
    }
    driveState = JSON.parse(url.param('state'));
    return driveState.ids;
  };

  window.globals = GLOBALS;

  window.common = {
    getFileIdsFromUrl: getFileIdsFromUrl
  };

}).call(this);
