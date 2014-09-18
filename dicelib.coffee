pt = (x, y) -> {x: x, y: y}

class Map1D
  constructor: (@s, @t) ->

  map: (x) -> @s * x + @t

  inv: () ->
    return new Map1D(1.0 / @s, -@t / @s)

Map1D.fromExample = (before1, after1, before2, after2) ->
  s = (after2 - after1) / (before2 - before1)
  t = ((before1 * after2) - (after1 * before2)) / (before1 - before2)
  return new Map1D(s, t)

class Map2D
  constructor: (@x, @y) ->

  map: (pt) ->
    return {
      x: @x.map(pt.x)
      y: @y.map(pt.y)
    }

  mapRect: (rect) ->
    pt1 = @map(x: rect.x, y: rect.y)
    pt2 = @map(x: rect.x + rect.width, y: rect.y + rect.height)
    return {x: pt1.x, y: pt1.y, width: pt2.x - pt1.x, height: pt2.y - pt1.y}

  inv: () ->
    new Map2D(@x.inv(), @y.inv())

Map2D.fromExample = (before1, after1, before2, after2) ->
  mx = Map1D.fromExample(before1.x, after1.x, before2.x, after2.x)
  my = Map1D.fromExample(before1.y, after1.y, before2.y, after2.y)
  return new Map2D(mx, my)

class Annotator
  constructor: (@canvas) ->
    @image = null
    @annotations = null

    @cxt = @canvas.getContext('2d')
    @clickStack = []
    @canvas.onclick = (e) => @click(e)

  setImage: (@image) -> @update()

  setAnnotations: (@annotations) ->
    @clickStack = []
    @update()

  isReady: () ->
    return @image && @annotations

  click: (e) ->
    return if !@isReady()
    canvasRect = @canvas.getBoundingClientRect()
    x = e.pageX - (canvasRect.left + window.pageXOffset)
    y = e.pageY - (canvasRect.top + window.pageYOffset)
    @clickStack.push(@vpToImage.map(pt(x, y)))

    if @state == 'grid' && @clickStack.length == 2
      c1 = @clickStack[0]
      c2 = @clickStack[1]

      @annotations.grid =
        {x: c1.x, y: c1.y, width: (c2.x - c1.x), height: (c2.y - c1.y)}

      @clickStack = []
    else if @state == 'pips'
      @annotations.pips ?= []
      @annotations.pips.push(@clickStack[0])
      @clickStack = []

    @update()

  update: () ->
    return if !@isReady()
    grid = @annotations.grid

    if grid
      @state = 'pips'

      newSide = Math.max(grid.width, grid.height)
      vpMin = Math.min(@canvas.width, @canvas.height)

      @vpToImage = Map2D.fromExample(
        pt(0, 0),
        pt(grid.x - newSide * 0.1, grid.y - newSide * 0.1),
        pt(vpMin, vpMin),
        pt(grid.x + newSide * 1.1, grid.y + newSide * 1.1))
    else
      @state = 'grid'
      scale = Math.max(@image.width / @canvas.width,
        @image.height / @canvas.height)
      @vpToImage = new Map2D(new Map1D(scale, 0), new Map1D(scale, 0))

    @draw()

  draw: () ->
    @cxt.clearRect(0, 0, @canvas.width, @canvas.height)

    @cxt.setStrokeColor('red')
    @cxt.setFillColor('red')

    imgToVp = @vpToImage.inv()
    rect = imgToVp.mapRect(
      x: 0, y: 0, width: @image.width, height: @image.height)

    @cxt.drawImage(@image, rect.x, rect.y, rect.width, rect.height)

    LINE_COUNT = 10
    grid = @annotations.grid
    if grid
      for i in [0..LINE_COUNT]
        yOff = grid.height * (i / LINE_COUNT)
        mapped = imgToVp.mapRect(
          x: grid.x, y: grid.y + yOff,
          width: grid.width, height: grid.height - yOff)
        @cxt.strokeRect(mapped.x, mapped.y, mapped.width, mapped.height)

        xOff = grid.width * (i / LINE_COUNT)
        mapped = imgToVp.mapRect(
          x: grid.x + xOff, y: grid.y,
          width: grid.width - xOff, height: grid.height)
        @cxt.strokeRect(mapped.x, mapped.y, mapped.width, mapped.height)

    pips = @annotations.pips
    if pips
      for pip in pips
        pip = imgToVp.map(pip)
        @cxt.fillRect(pip.x - 2, pip.y - 2, 4, 4)

window.Annotator = Annotator
