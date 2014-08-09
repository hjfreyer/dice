var dice = {};

// dice.Application = function(queryParams) {

// };

// d = function () {
//   var match,
//       pl     = /\+/g,  // Regex for replacing addition symbol with a space
//       search = /([^&=]+)=?([^&]*)/g,
//       decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
//       query  = window.location.search.substring(1);

//   var urlParams = {};
//   while (match = search.exec(query))
//     urlParams[decode(match[1])] = decode(match[2]);
//   return urlParams;
// })();

var CLIENT_ID = '895593330219-dagqsd3t6aqm8qtvp9t02mkd4aafnkbi.apps.googleusercontent.com';
var SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
  // Add other scopes needed by your application.
];

/**
 * Check if the current user has authorized the application.
 */
function checkAuth() {

  gapi.auth.authorize(
    {'client_id': CLIENT_ID, 'scope': SCOPES.join(' '), 'immediate': true},
    handleAuthResult);
}

/**
 * Called when authorization server replies.
 *
 * @param {Object} authResult Authorization result.
 */
function handleAuthResult(authResult) {
  console.log(authResult);
  if (authResult && !authResult.error) {
    // Access token has been successfully retrieved, requests can be sent to the API
  } else {
    // No access token could be retrieved, force the authorization flow.
    gapi.auth.authorize(
      {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false},
      handleAuthResult);
  }
}

// Use your own API developer key.
var developerKey = 'AIzaSyBlvPyizj2oXOt_EyrG-eh0WVO5R-DJT9o';

// Create and render a Picker object for searching images.
function createPicker(AUTH_TOKEN) {
  var view = new google.picker.DocsView(google.picker.ViewId.FOLDERS);
  var picker = new google.picker.PickerBuilder()
        .setAppId(895593330219)
        .setOAuthToken(AUTH_TOKEN)
        .addView(view)
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setDeveloperKey(developerKey)
        .setCallback(pickerCallback)
        .build();
  picker.setVisible(true);
}

// A simple callback implementation.
function pickerCallback(data) {
  if (data.action == google.picker.Action.PICKED) {
    var fileId = data.docs[0].id;
    alert('The user selected: ' + fileId);
  }
}
dice.main = function() {
  //    createPicker();
  checkAuth();
  //    console.log(JSON.parse(urlParams['state']));
};
