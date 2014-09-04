DIR_MIME = 'application/vnd.google-apps.folder'

execute = (request) ->
  deferred = Q.defer()
  request.execute (jsonResp, rawResp) -> deferred.resolve(jsonResp)
  return deferred.promise

class File
  constructor: (@file, @realtime, @contents, @subdirs) ->
  isTrashed: () -> @file.labels.trashed
  isDir: () -> @file.mimeType == DIR_MIME
  isImage: () -> @file.mimeType == 'image/jpeg'

getFile = (drive, id, maxDepth) ->
  getDir = (dirFile) ->
    if maxDepth == 0
      return newFile(dirFile, null, [], [])

    execute drive.children.list(folderId: dirFile.id)
    .then (children) ->
      Q.all(getFile(drive, child.id, maxDepth - 1) for child in children.items)
    .then (childFiles) ->
      subdirs = (f for f in childFiles when f.isDir())
      contents = (f for f in childFiles when !f.isDir())
      return new File(dirFile, null, contents, subdirs)

  getImage = (imageFile) ->
    req = gapi.client.request(
      path: "/drive/v2/files/#{ imageFile.id }/realtime"
      method: 'GET'
    )

    execute(req).then (realtime) ->
      return new File(imageFile, realtime.data, [], [])

  execute drive.files.get(fileId: id)
  .then (file) ->
    return getDir(file) if file.mimeType == DIR_MIME
    return getImage(file) if file.mimeType == 'image/jpeg'
    return new File(file, null, [], [])

class UserSet
  constructor: (@users) ->

UserSet.fromFile = (file) ->
  new UserSet(User.fromFile(subDir) for subDir in file.subdirs)

class User
  constructor: (@name, @dice) ->

User.fromFile = (file) ->
  new User(file.file.title, (Die.fromFile(subDir) for subDir in file.subdirs))

class Die
  constructor: (@name, @faces) ->

Die.fromFile = (file) ->
  new Die(file.file.title,
    (Face.fromFile(f) for f in file.contents when f.isImage() && !f.isTrashed()))

class Face
  constructor: (@grid, @pips, @description) ->

Face.fromFile = (file) ->
  root = file.realtime.value
  console.log(file.realtime)
  new Face(null, root.pips?.json, null)


window.getUserSet = (drive, dirId) ->
  getFile(drive, dirId, 3).then (file) -> UserSet.fromFile(file)
