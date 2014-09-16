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

class SyncedValueGroup
  constructor: () ->
    @members_ = {}
    @count_ = 0
    @value_ = {}

  add: () ->
    val = new Alerter(this, @count_)
    @members_[@count_] = val
    @count_++
    return val

  alertAllBut_: (id) ->
    for id2, member of @members_
      if id != id2 && member.listener_
        member.listener_()

class Alerter
  constructor: (@group_, @id_) ->
    @listener_ = null
    Object.defineProperty(this, 'value', {
      get: () => @group_.value_
      set: (x) => @group_.value_ = x
    })

  listen: (cb) ->
    @listener_ = cb

  alert: () ->
    @group_.alertAllBut_(@id_)

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

syncGroupFromPhoto =  (photo) ->
  g = new SyncedValueGroup()
  m = g.add()
  m.value = photo.get('annotations')
  m.listen(() -> photo.set('annotations', m.value))
  photo.addEventListener(
    gapi.drive.realtime.EventType.VALUE_CHANGED,
    (e) ->
      return if e.isLocal || e.property != 'annotations'
      m.value = e.newValue
      m.alert()
  )
  return g

class ModelWrapper
  constructor: (@model) ->
    @syncGroups = {}
    photos = @model.getRoot().get('photos')
    for item in photos.items()
      console.log(item[0])
      console.log(item[1].get('annotations'))
      @syncGroups[item[0]] = syncGroupFromPhoto(item[1])
    photos.addEventListener(
      gapi.drive.realtime.EventType.VALUE_CHANGED,
      (e) =>
        return if @syncGroups[e.property]
        @syncGroups[e.property] = syncGroupFromPhoto(e.newValue)
    )

  getPhotoIds: () ->
    photos = @model.getRoot().get('photos')
    return [] if !photos
    return photos.keys()

  addPhoto: (fileId) ->
    photos = @model.getRoot().get('photos')
    if !photos
      photos = @model.createMap()
      @model.getRoot().set('photos', photos)
    photo = photos.get(fileId)
    if !photo
      photo = @model.createMap()
      photo.set('annotations', {})
      photos.set(fileId, photo)

  getAnnotations: (fileId) ->
    console.log(@syncGroups)
    return @syncGroups[fileId].add()

class ModelSnapshot
  constructor: (@photos) ->


Polymer('x-overview', {
  created: () ->
    @fileId = ''
    @model = null
    @authToken = null
    @pickerApi = false
    gapi.load('picker', () => @pickerReady())

    @unlabeled = []

  loaded: () ->
    @doc = @$.doc.doc
    @model = new ModelWrapper(@doc.getModel())
    @update()

  pickerReady: () ->
    @pickerApi = true

  authReady: (e) ->
    @authToken = e.detail.result.access_token

  showPicker: () ->
    view = new google.picker.DocsView()
    view.setIncludeFolders(true)
    view.setMimeTypes('image/jpeg,image/png')
    picker = new google.picker.PickerBuilder()
      .setOAuthToken(@authToken)
      .setDeveloperKey(globals.API_KEY)
      .setCallback((o) => @pickerCb(o))
      .addView(view)
      .enableFeature(google.picker.Feature.MINE_ONLY)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .build()
    picker.setVisible(true)

  pickerCb: (o) ->
    return if o.action != 'picked'

    for doc in o.docs
      @model.addPhoto(doc.id)

  update: () ->
    @unlabeled = []
    for id in @model.getPhotoIds()
      if !photo.annotations.user || !photo.annotations.user
        @unlabeled.push([id, photo])
})

Polymer('x-annotator', {
  created: () ->
    @width = 600
    @height = 600
    @description = ''

  descriptionChanged: (oldValue, newValue) ->
    @annotations.value.description = newValue
    @annotations.alert()

  ready: () ->
    @doc = getDoc(@projectId)
    Q.all([@getImage(), @doc]).then((deps) =>
      @image = deps[0]
      @doc = deps[1]
      @model = new ModelWrapper(@doc.getModel())
      @annotations = @model.getAnnotations(@photoId)
      @annotations.listen(() =>
        @description = @annotations.value.description
      )


      @annotator = new Annotator(
        @$.canvas,
        @image,
        @model.getAnnotations(@photoId))
    ).done()

  getImage: () ->
    deferred = Q.defer()
    image = new Image()
    image.onload = () -> deferred.resolve(image)
    image.src = "https://docs.google.com/uc?id=" + @photoId
    return deferred.promise
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

  onFileLoaded: (doc) ->
    @doc = doc
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
