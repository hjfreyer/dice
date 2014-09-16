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
  constructor: (@canvas, @image, @annotations) ->
    @cxt = @canvas.getContext('2d')
    @annotations.listen(() => @annotationsChanged())
    @clickStack = []
    @canvas.onclick = (e) => @click(e)
    @update()

  annotationsChanged: () ->
    @clickStack = []
    @update()

  click: (e) ->
    canvasRect = @canvas.getBoundingClientRect()
    x = e.pageX - (canvasRect.left + window.pageXOffset)
    y = e.pageY - (canvasRect.top + window.pageYOffset)
    @clickStack.push(@vpToImage.map(pt(x, y)))

    if @state == 'grid' && @clickStack.length == 2
      c1 = @clickStack[0]
      c2 = @clickStack[1]

      @annotations.value.grid =
        {x: c1.x, y: c1.y, width: (c2.x - c1.x), height: (c2.y - c1.y)}
      @annotations.alert()

      @clickStack = []
    else if @state == 'pips'
      @annotations.value.pips ?= []
      @annotations.value.pips.push(@clickStack[0])
      @annotations.alert()

      @clickStack = []
    @update()

  update: () ->
    grid = @annotations.value.grid

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
    grid = @annotations.value.grid
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

    pips = @annotations.value.pips
    if pips
      for pip in pips
        pip = imgToVp.map(pip)
        @cxt.fillRect(pip.x - 2, pip.y - 2, 4, 4)

#   var Annotator = function(canvas, image, model) {
#     this.canvas = canvas;
#     this.image = image;
#     this.model = model;
#
#     this.cxt = this.canvas.getContext('2d');
#     this.canvas.onclick = function(e) {
#       var rect = this.canvas.getBoundingClientRect()
#       var x = e.pageX - (rect.left + window.pageXOffset);
#       var y = e.pageY - (rect.top + window.pageYOffset);
#       this.onClick(x, y);
#     }.bind(this);
#
#     this.model.getRoot().addEventListener(
#       gapi.drive.realtime.EventType.VALUE_CHANGED,
#       function(e) {
#         this.update();
#       }.bind(this));
#
#     this.clickStack = [];
#
#     this.update();
#   };
#
#   Annotator.prototype.reset = function() {
#     this.model.getRoot().clear();
#     this.update();
#   };
#
#   Annotator.prototype.update = function() {
#     this.grid = this.model.getRoot().get('grid');
#     this.pips = this.model.getRoot().get('pips');
#
#     if (!this.grid) {
#       this.mode = 'grid';
#     } else {
#       this.mode = 'pips';
#     }
#
#     if (this.grid) {
#       var newSide = Math.max(this.grid.w, this.grid.h);
#       var vpMin = Math.min(this.canvas.width, this.canvas.height);
#
#       this.vp_to_img = TransformFromExample({x: 0, y: 0},
#                                             {x: this.grid.x - newSide * 0.1,
#                                              y: this.grid.y - newSide * 0.1},
#                                             {x: vpMin, y: vpMin},
#                                             {x: this.grid.x + newSide * 1.1,
#                                              y: this.grid.y + newSide * 1.1}
#                                            );
#
#     } else {
#       var scale = Math.max(this.image.width / this.canvas.width,
#                            this.image.height / this.canvas.height);
#       this.vp_to_img = new Transform(0, 0, scale, scale);
#     }
#     this.draw();
#   };
#
#   Annotator.prototype.draw = function() {
#     this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
#
#     this.context.setStrokeColor('red');
#     this.context.setFillColor('red');
#
#     var map = this.vp_to_img.reverse();
#     var rect = map.mapRect(0, 0, this.image.width, this.image.height);
#     this.context.drawImage(this.image, rect.x, rect.y, rect.w, rect.h);
#
#     if (this.grid != null) {
#       for (var i = 0; i < 10; i++) {
#         var yOff = this.grid.h * (i / 10.0);
#         var mapped = map.mapRect(this.grid.x, this.grid.y + yOff,
#                                  this.grid.w, this.grid.h - yOff);
#         this.context.strokeRect(mapped.x, mapped.y, mapped.w, mapped.h);
#       }
#       for (var i = 0; i < 10; i++) {
#         var xOff = this.grid.w * (i / 10.0);
#         var mapped = map.mapRect(this.grid.x + xOff, this.grid.y,
#                                  this.grid.w - xOff, this.grid.h);
#         this.context.strokeRect(mapped.x, mapped.y, mapped.w, mapped.h);
#       }
#     }
#
#     if (this.pips != null) {
#       this.pips.forEach(function(pip) {
#         pip = map.map(pip);
#         this.context.fillRect(pip.x - 2, pip.y - 2, 4, 4);
#       }, this);
#     }
#   };
#
#   Annotator.prototype.onClick = function(x, y) {
#     var pt = this.vp_to_img.map({x: x, y: y});
#     this.clickStack.push(pt);
#     if (this.mode == 'grid' && this.clickStack.length == 2) {
#       var c1 = this.clickStack[0];
#       var c2 = this.clickStack[1];
#
#       var grid = {x: c1.x, y: c1.y, w: (c2.x - c1.x), h: (c2.y - c1.y)};
#       this.model.getRoot().set('grid', grid);
#
#       this.clickStack = [];
#     } else if (this.mode == 'pips') {
#       var pips = this.pips || [];
#       pips.push(this.clickStack[0]);
#
#       this.model.getRoot().set('pips', pips);
#
#       this.clickStack = [];
#     }
#     this.update();
#   };
#
#   window.Annotator = Annotator;
# }(window));

# // var dicelib = {};
#
# // var dice = window.dice || {};
# // window.dice = dice;
#
# // dice.imgLoc = 'IMG_20140723_163827168.jpg';
#
# // dice.sizeX = 800;
#
# // var Controller = function(context, width, height, image) {
# // };
#
# // dice.scale = function(x, y) {
# //     return [dice.sizeX, y * (dice.sizeX / x)];
# // };
#
# // dice.main = function() {
# //     var canvas = $('canvas').get(0);
# //     var ctx = canvas.getContext('2d');
#
# //     var img = new window.Image();
# //     img.src = dice.imgLoc;
# //     img.onload = function() {
# //         var cont = new Controller(ctx, canvas.width, canvas.height, img);
# //         window.c = cont;
# //         $(canvas).click(function(e) {
# //             var offset = $(canvas).offset();
# //             var x = e.pageX - offset.left;
# //             var y = e.pageY - offset.top;
# //             cont.onClick(x, y);
# //         });
# //         cont.draw();
#
# //     }.bind(this);
# // };
#
#
# // $(dice.main);

window.Annotator = Annotator
