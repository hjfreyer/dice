globals =
  CLIENT_ID: ('895593330219-dagqsd3t6aqm8qtvp9t02mkd4aafnkbi.apps.' +
    'googleusercontent.com')
  API_KEY: 'AIzaSyBlvPyizj2oXOt_EyrG-eh0WVO5R-DJT9o',
  SCOPES: [
    'https://www.googleapis.com/auth/drive.install'
    'https://www.googleapis.com/auth/drive.file'
  ]

exec = (request) ->
  deferred = Q.defer()
  request.execute (jsonResp, rawResp) -> deferred.resolve(jsonResp)
  return deferred.promise

Polymer('x-header', {
  clientId: globals.CLIENT_ID
  scopes: globals.SCOPES.join(' ')
})

Polymer('x-body', {
  created: () ->
    @authReady = false

  ready: () ->
    @location = {}

    router = Router(
      '/': () =>
        @location =
          name: 'index'
      '/create/:folderId': (folderId) =>
        @location =
          name: 'create'
          folderId: folderId
      '/p/:projectId': (projectId) =>
        @location =
          name: 'overview'
          projectId: projectId
      '/p/:projectId/upload': (projectId) =>
        @location =
          name: 'upload'
          projectId: projectId
      '/p/:projectId/a/:photoId': (projectId, photoId) =>
        @location =
          name: 'annotator'
          projectId: projectId
          photoId: photoId
      '.*': () =>
        @location =
          name: 'not-found'
    )
    router.init('/')

  authSuccess: () ->
    @authReady = true
})

Polymer('x-create', {
  ready: () ->
    @api = null
    @auth = false
  driveReady: () ->
    @api = @$.drive.api
    @tryCreate()

  authReady: () ->
    @auth = true
    @tryCreate()

  tryCreate: () ->
    return if !@api or !@auth

    boundary = '-------314159265358979323846'
    delimiter = "\r\n--" + boundary + "\r\n"
    close_delim = "\r\n--" + boundary + "--"

    metadata =
      title: 'Dice Collection'
      mimeType: 'application/vnd.google-apps.drive-sdk'

    multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        close_delim

    request = gapi.client.request(
      'path': '/upload/drive/v2/files',
      'method': 'POST',
      'params': {'uploadType': 'multipart'},
      'headers': {
        'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
      },
      'body': multipartRequestBody)

    res = exec(request).then (file) ->
      location.hash = '#/p/' + file.id
})

groupBy: (property, records) ->
  results = {}
  for r in records
    results[r[property]] ?= []
    results[r[property]].push(r)
  return results

class Photo
  constructor: (@id, @annotations) ->

  isLabeled: () -> @annotations.user && @annotations.name

  isAnnotated: () ->
    @isLabeled() && @annotations.grid && @annotations.pips

# Overview.build = (root) ->
#   unlabeled = []
#   users = []
#
#   userMap = {}
#   photos = root.get('photos')
#   for item in photos.items()
#     id = item[0]
#     annotations = item[1].get('annotations')
#     if !annotations.user || !annotations.name
#       unlabeled.push([id, annotations])
#     else
#       userMap[annotations.user] ?= {}
#       userMap[annotations.user][annotations.name] ?= []
#       userMap[annotations.user][annotations.name].push(
#         new Photo(id, annotations))
#   for user, names of userMap
#     dice = []
#     for name, photos of names
#       dice.push(new Die(name, photos))
#     users.push(new User(user, dice))
#
#   return new Overview(unlabeled, users)

Polymer('x-project', {
  docReady: () ->
    @doc = @$.doc.doc
})

Polymer('photo-model', {
  created: () ->
    @doc = null
    @photoId = null
    @annotations = null

  observe:
    'annotations': 'pushAnnotations'
    'annotations.user': 'pushAnnotations'
    'annotations.name': 'pushAnnotations'
    'annotations.description': 'pushAnnotations'
    'annotations.grid': 'pushAnnotations'
    'annotations.pips': 'pushAnnotations'

  docChanged: () ->
    photo = @getPhoto()
    return if !photo
    photo.addEventListener(
      gapi.drive.realtime.EventType.VALUE_CHANGED,
      (e) =>
        return if e.isLocal || e.property != 'annotations'
        @annotations = e.newValue
    )
    @annotations = @getPhoto()?.get('annotations')

  pushAnnotations: (oldValue, newValue) ->
    photo = @getPhoto()
    return if !photo
    remote = photo.get('annotations')
    return if JSON.stringify(newValue) == JSON.stringify(remote)
    @getPhoto()?.set('annotations', @annotations)

  getPhoto: () ->
    @doc?.getModel().getRoot().get('photos')?.get(@photoId)
})

initDoc = (doc) ->
  return if !doc
  if !doc.getModel().getRoot().get('photos')
    photos = doc.getModel().createMap()
    doc.getModel().getRoot().set('photos', photos)

initPhoto = (doc, photoId, defaultAnno) ->
  photos = doc.getModel().getRoot().get('photos')
  photo = photos.get(photoId)
  if !photo
    photo = doc.getModel().createMap()
    photos.set(photoId, photo)
  anno = photo.get('annotations')
  if !anno
    photo.set('annotations', defaultAnno)

Polymer('x-overview', {
  created: () ->
    @fileId = null
    @doc = null
    @overview = null

  docChanged: () ->
    initDoc(@doc)
    @doc.getModel().getRoot().get('photos').addEventListener(
      gapi.drive.realtime.EventType.VALUE_CHANGED,
      () => @update()
    )
    @update()

  update: () ->
    photos = @getPhotos()
    return if !photos
    unlabeled = (p for p in photos when !p.isAnnotated())
    @overview =
      all: photos
      unlabeled: unlabeled

  getPhotos: () ->
    photos = @doc?.getModel().getRoot().get('photos')
    return if !photos
    return (new Photo(item[0],
      item[1].get('annotations')) for item in photos.items())
})

Polymer('x-upload', {
  created: () ->
    @projectId = null
    @doc = null
    @pickerApi = false
    gapi.load('picker', () => @pickerReady())

  pickerReady: () ->
    @pickerApi = true

  showPicker: () ->
    view = new google.picker.DocsView()
    view.setIncludeFolders(true)
    view.setMimeTypes('image/jpeg,image/png')
    picker = new google.picker.PickerBuilder()
      .setOAuthToken(gapi.auth.getToken().access_token)
      .setDeveloperKey(globals.API_KEY)
      .setCallback((o) => @pickerCb(o))
      .addView(view)
      .enableFeature(google.picker.Feature.MINE_ONLY)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .build()
    picker.setVisible(true)

  pickerCb: (o) ->
    console.log o
    return if o.action != 'picked'
    model = @doc.getModel()

    for doc in o.docs
      initPhoto(@doc, doc.id, {user: @user, name: @name})

    location.hash = '/#/p/' + @projectId

  update: () ->
    photos = @getPhotos()
    return if !photos
    unlabeled = (p for p in photos when !p.isLabeled())
    @overview =
      unlabeled: unlabeled
})

Polymer('x-annotator', {
  created: () ->
    @width = 600
    @height = 600
    @image = new Image()

  ready: () ->
    @annotator = new Annotator(@$.canvas)
    @image.onload = () => @annotator.setImage(@image)
    @image.src = "https://docs.google.com/uc?id=" + @photoId

  annotationsChanged: () ->
    @annotator.setAnnotations(@annotations)

  resetAnno: () ->
    @annotations.grid = null
    @annotations.pips = null
    @annotator.setAnnotations(@annotations)

  deletePhoto: () ->

})

realtimePromise = null
getRealtime = () ->
  if !realtimePromise
    deferred = Q.defer()
    gapi.load('drive-realtime', () -> deferred.resolve(true))
    realtimePromise = deferred.promise
  return realtimePromise

docPromises = {}
getDoc = (fileId) ->
  if !docPromises[fileId]
    console.log('Loading doc')
    docPromises[fileId] = getRealtime().then(() ->
      deferred = Q.defer()
      gapi.drive.realtime.load(fileId, (doc) -> deferred.resolve(doc))
      return deferred.promise
    )
  return docPromises[fileId]

Polymer('realtime-doc', {
  created: () ->
    @fileId = ''
    @doc = null

  authReady: () ->
    getDoc(@fileId).then((doc) => @onFileLoaded(doc)).done()

  onFileLoaded: (@doc) ->
    initDoc(@doc)
    @fire('realtime-doc-loaded')
})

Polymer('x-picker', {
  created: () ->
    @authToken = null
    @apiReady = null
    @picker = null

  ready: () ->
    gapi.load('picker', () => @apiReady())

  apiReady: () ->
    @apiReady = true
    @tryLoad()

  authReady: () ->
    @auth = true
    @tryLoad()

  tryLoad: () ->
    return if !@auth or !@api
    gapi.drive.realtime.load(@fileId, (doc) => @onFileLoaded(doc))

  onFileLoaded: (doc) ->
    @doc = doc
    @fire('realtime-doc-loaded')
})
