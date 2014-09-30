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

class Csv
  constructor: () ->
    @rows = []

  addRow: (row) ->
    @rows.push(row)

  toString: () ->
    rowStrs = ('"' + row.join('","') + '"' for row in @rows)
    return rowStrs.join('\n')

COLORS = ['Yellow', 'Green', 'Blue', 'Red']

getCsv = (doc) ->
  header = ['ID', 'Name', 'Sex', 'Group']
  for color in COLORS
    for face in [3..6]
      for attr in ['Coords', 'Desc']
        header.push("#{color} (#{face}) #{attr}")

  csv = new Csv()
  csv.addRow(header)

  photos = doc.getModel().getRoot().get('photos')
  photos = (new Photo(item[0],
    item[1].get('annotations')) for item in photos.items())

  for user, photos of groupBy('user', photos)
    userData = doc.getModel().getRoot().get('users').get(user)?.get('data')
    row = [user, userData?.name, userData?.sex, userData?.group]

    byDie = groupBy('name', photos)
    for color in COLORS
      photos = byDie[color] ? []
      byPips = groupByFunc(((x) -> x.pips?.length ? 0), photos)
      for face in [3..6]
        photos = byPips[face]
        if !photos
          row.push('')
          row.push('')
        else
          row.push(photos[0].getCoordsString())
          row.push(photos[0].description)

    csv.addRow(row)


  return csv.toString()

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

groupByFunc = (func, records) ->
  results = {}
  for r in records
    p = func(r)
    continue unless p
    results[p] ?= []
    results[p].push(r)
  return results

groupBy = (property, records) ->
  return groupByFunc(((x) -> x[property]), records)

class Photo
  constructor: (@id, annotations) ->
    for k, v of annotations
      this[k] = v

  isLabeled: () -> @user && @name

  isAnnotated: () ->
    return (@isLabeled() && @grid && @pips && @description)

  getCoordsString: () ->
    return '' unless @grid && @grid.x? && @grid.y? &&
      @grid.width && @grid.height && @pips
    coords = []
    for p in @pips
      x = Math.round((p.x - @grid.x) / @grid.width * 10.0)
      y = Math.round((p.y - @grid.y) / @grid.height * 10.0)
      coords.push("(#{x},#{y})")
    return coords.join(',')

class User
  constructor: (@id, @data) ->

  isComplete: () ->
    @data.sex && @data.name && @data.group

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
    @fire('changed')
    photo = @getPhoto()
    return if !photo
    remote = photo.get('annotations')
    return if JSON.stringify(newValue) == JSON.stringify(remote)
    @getPhoto()?.set('annotations', @annotations)

  getPhoto: () ->
    @doc?.getModel().getRoot().get('photos')?.get(@photoId)
})

Polymer('user-model', {
  created: () ->
    @doc = null
    @userId = null
    @data = null

  observe:
    'data': 'pushData'
    'data.name': 'pushData'
    'data.sex': 'pushData'
    'data.group': 'pushData'

  docChanged: () ->
    user = @getUser()
    if !user
      initUser(@doc, @userId, {})
      user = @getUser()
    user.addEventListener(
      gapi.drive.realtime.EventType.VALUE_CHANGED,
      (e) =>
        return if e.isLocal || e.property != 'data'
        @data = e.newValue
    )
    @data = user.get('data')

  pushData: (oldValue, newValue) ->
    @fire('changed')
    user = @getUser()
    return if !user
    remote = user.get('data')
    return if JSON.stringify(newValue) == JSON.stringify(remote)
    user.set('data', @data)

  getUser: () ->
    @doc?.getModel().getRoot().get('users').get(@userId)
})

initDoc = (doc) ->
  return if !doc
  if !doc.getModel().getRoot().get('photos')
    photos = doc.getModel().createMap()
    doc.getModel().getRoot().set('photos', photos)
  if !doc.getModel().getRoot().get('users')
    users = doc.getModel().createMap()
    doc.getModel().getRoot().set('users', users)

initPhoto = (doc, photoId, defaultAnno) ->
  photos = doc.getModel().getRoot().get('photos')
  photo = photos.get(photoId)
  if !photo
    photo = doc.getModel().createMap()
    photos.set(photoId, photo)
  anno = photo.get('annotations')
  if !anno
    photo.set('annotations', defaultAnno)

initUser = (doc, userId, defaultData) ->
  users = doc.getModel().getRoot().get('users')
  user = users.get(userId)
  if !user
    user = doc.getModel().createMap()
    users.set(userId, user)
  data = user.get('data')
  if !data
    user.set('data', defaultData)

Polymer('x-overview', {
  created: () ->
    @fileId = null
    @doc = null
    @unlabeled = null
    @problems = null
    @users = null


  docChanged: () ->
    @doc.getModel().getRoot().get('photos').addEventListener(
      gapi.drive.realtime.EventType.VALUE_CHANGED,
      () => @update()
    )
    @doc.getModel().getRoot().get('users').addEventListener(
      gapi.drive.realtime.EventType.VALUE_CHANGED,
      () => @update()
    )
    @update()

  update: () ->
    photos = @getPhotos()
    return if !photos
    userIds = {}
    for p in photos
      if p.user
        userIds[p.user] = true
    @userIds = (id for id of userIds)

    @unlabeled = []
    @badPips = []
    dieToPhotos = {}
    until photos.length == 0
      p = photos.pop()
      if !p.isAnnotated()
        @unlabeled.push(p)
        continue
      if !(2 < p.pips.length <= 6)
        @badPips.push(p)
        continue
      key = p.user + ',' + p.name
      dieToPhotos[key] ?= []
      dieToPhotos[key].push(p)

    @dieProblems = []
    for key, photos of dieToPhotos
      covered = {}
      for c in [3..6]
        covered[c] = []
      for p in photos
        covered[p.pips.length].push(p)
      for c in [3..6]
        if covered[c].length != 1
          @dieProblems.push(
            user: photos[0].user
            name: photos[0].name
            side: c,
            photos: covered[c]
          )
    @csv = getCsv(@doc)

  export: () ->
    @update()
    document.location = 'data:text/csv,' + encodeURIComponent(@csv)

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

    location.hash = '#/p/' + @projectId
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
    @doc.getModel().getRoot().get('photos').delete(@photoId)
    location.hash = '#/p/' + @projectId
})

Polymer('user-editor', {
  update: () ->
    @isComplete = @data.name && @data.sex && @data.group
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
