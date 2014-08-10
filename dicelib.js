(function(window) {

  var Transform = function(tx, ty, sx, sy) {
    this.tx = tx;
    this.ty = ty;
    this.sx = sx;
    this.sy = sy;
  };

  Transform.prototype.map = function(pt) {
    return {x: this.sx * pt.x + this.tx, y: this.sy * pt.y + this.ty};
  };

  Transform.prototype.mapRect = function(x, y, w, h) {
    var pt1 = this.map({x: x, y: y});
    var pt2 = this.map({x: x + w, y: y + h});

    return {x: pt1.x, y: pt1.y, w: pt2.x - pt1.x, h: pt2.y - pt1.y};
  };

  Transform.prototype.reverse = function() {
    return new Transform(-this.tx / this.sx, -this.ty / this.sy,
                         1.0 / this.sx, 1.0 / this.sy);
  };

  var Scale1D = function(x1b, x1a, x2b, x2a) {
    var s = (x1a - x2a)/(x1b - x2b);
    var t = (x1b*x2a - x1a*x2b)/(x1b - x2b);
    return {s: s, t: t};
  };

  var TransformFromExample = function(pt1before, pt1after, pt2before, pt2after) {
    var fx = Scale1D(pt1before.x, pt1after.x, pt2before.x, pt2after.x);
    var fy = Scale1D(pt1before.y, pt1after.y, pt2before.y, pt2after.y);

    return new Transform(fx.t, fy.t, fx.s, fy.s);
  };

  var Annotator = function(canvas, image, model) {
    this.canvas = canvas;
    this.image = image;
    this.model = model;

    this.context = this.canvas.getContext('2d');
    this.canvas.onclick = function(e) {
      var rect = this.canvas.getBoundingClientRect()
      var x = e.pageX - (rect.left + window.pageXOffset);
      var y = e.pageY - (rect.top + window.pageYOffset);
      this.onClick(x, y);
    }.bind(this);

    this.model.getRoot().addEventListener(
      gapi.drive.realtime.EventType.VALUE_CHANGED,
      function(e) {
        this.update();
      }.bind(this));

    this.clickStack = [];

    this.update();
  };

  Annotator.prototype.reset = function() {
    this.model.getRoot().clear();
    this.update();
  };

  Annotator.prototype.update = function() {
    this.grid = this.model.getRoot().get('grid');
    this.pips = this.model.getRoot().get('pips');

    if (!this.grid) {
      this.mode = 'grid';
    } else {
      this.mode = 'pips';
    }

    if (this.grid) {
      var newSide = Math.max(this.grid.w, this.grid.h);
      var vpMin = Math.min(this.canvas.width, this.canvas.height);

      this.vp_to_img = TransformFromExample({x: 0, y: 0},
                                            {x: this.grid.x - newSide * 0.1,
                                             y: this.grid.y - newSide * 0.1},
                                            {x: vpMin, y: vpMin},
                                            {x: this.grid.x + newSide * 1.1,
                                             y: this.grid.y + newSide * 1.1}
                                           );

    } else {
      var scale = Math.max(this.image.width / this.canvas.width,
                           this.image.height / this.canvas.height);
      this.vp_to_img = new Transform(0, 0, scale, scale);
    }
    this.draw();
  };

  Annotator.prototype.draw = function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.setStrokeColor('red');
    this.context.setFillColor('red');

    var map = this.vp_to_img.reverse();
    var rect = map.mapRect(0, 0, this.image.width, this.image.height);
    this.context.drawImage(this.image, rect.x, rect.y, rect.w, rect.h);

    if (this.grid != null) {
      for (var i = 0; i < 10; i++) {
        var yOff = this.grid.h * (i / 10.0);
        var mapped = map.mapRect(this.grid.x, this.grid.y + yOff,
                                 this.grid.w, this.grid.h - yOff);
        this.context.strokeRect(mapped.x, mapped.y, mapped.w, mapped.h);
      }
      for (var i = 0; i < 10; i++) {
        var xOff = this.grid.w * (i / 10.0);
        var mapped = map.mapRect(this.grid.x + xOff, this.grid.y,
                                 this.grid.w - xOff, this.grid.h);
        this.context.strokeRect(mapped.x, mapped.y, mapped.w, mapped.h);
      }
    }

    if (this.pips != null) {
      this.pips.forEach(function(pip) {
        pip = map.map(pip);
        this.context.fillRect(pip.x - 2, pip.y - 2, 4, 4);
      }, this);
    }
  };

  Annotator.prototype.onClick = function(x, y) {
    var pt = this.vp_to_img.map({x: x, y: y});
    this.clickStack.push(pt);
    if (this.mode == 'grid' && this.clickStack.length == 2) {
      var c1 = this.clickStack[0];
      var c2 = this.clickStack[1];

      var grid = {x: c1.x, y: c1.y, w: (c2.x - c1.x), h: (c2.y - c1.y)};
      this.model.getRoot().set('grid', grid);

      this.clickStack = [];
    } else if (this.mode == 'pips') {
      var pips = this.pips || [];
      pips.push(this.clickStack[0]);

      this.model.getRoot().set('pips', pips);

      this.clickStack = [];
    }
    this.update();
  };

  window.Annotator = Annotator;
}(window));

// var dicelib = {};

// var dice = window.dice || {};
// window.dice = dice;

// dice.imgLoc = 'IMG_20140723_163827168.jpg';

// dice.sizeX = 800;

// var Controller = function(context, width, height, image) {
// };

// dice.scale = function(x, y) {
//     return [dice.sizeX, y * (dice.sizeX / x)];
// };

// dice.main = function() {
//     var canvas = $('canvas').get(0);
//     var ctx = canvas.getContext('2d');

//     var img = new window.Image();
//     img.src = dice.imgLoc;
//     img.onload = function() {
//         var cont = new Controller(ctx, canvas.width, canvas.height, img);
//         window.c = cont;
//         $(canvas).click(function(e) {
//             var offset = $(canvas).offset();
//             var x = e.pageX - offset.left;
//             var y = e.pageY - offset.top;
//             cont.onClick(x, y);
//         });
//         cont.draw();

//     }.bind(this);
// };


// $(dice.main);
