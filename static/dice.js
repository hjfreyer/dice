var dice = window.dice || {};
window.dice = dice;

dice.imgLoc = 'IMG_20140723_163827168.jpg';

dice.sizeX = 800;

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

var Controller = function(context, width, height, image) {
    this.context = context;
    this.width = width;
    this.height = height;
    this.image = image;

    var scale = Math.max(image.width / width, image.height / height);

    this.vp_to_img = new Transform(0, 0, scale, scale);

    this.clickStack = [];
    this.mode = 'grid';

    this.grid = null;
    this.pips = [];
};

Controller.prototype.draw = function() {
    this.context.setStrokeColor('red');
    this.context.setFillColor('red');

    var map = this.vp_to_img.reverse();

    var rect = map.mapRect(
        0, 0, this.image.width, this.image.height);
    this.context.drawImage(this.image, rect.x, rect.y, rect.w, rect.h);

    if (this.grid != null) {
        var grid = map.mapRect(
            this.grid.x, this.grid.y, this.grid.w, this.grid.h);
        this.context.strokeRect(grid.x, grid.y, grid.w, grid.h);
    }

    this.pips.forEach(function(pip) {
        pip = map.map(pip);
        this.context.fillRect(pip.x - 2, pip.y - 2, 4, 4);
    }, this);
};

Controller.prototype.onClick = function(x, y) {
    var pt = this.vp_to_img.map({x: x, y: y});
    this.clickStack.push(pt);
    if (this.mode == 'grid' && this.clickStack.length == 2) {
        var c1 = this.clickStack[0];
        var c2 = this.clickStack[1];

        this.grid = {x: c1.x, y: c1.y, w: (c2.x - c1.x), h: (c2.y - c1.y)};

        var newSide = Math.max(this.grid.w, this.grid.h);
        var vpMin = Math.min(this.width, this.height);
        this.vp_to_img = TransformFromExample({x: 0, y: 0},
                                              {x: this.grid.x - newSide * 0.1,
                                               y: this.grid.y - newSide * 0.1},
                                              {x: vpMin, y: vpMin},
                                              {x: this.grid.x + newSide * 1.1,
                                               y: this.grid.y + newSide * 1.1}
                                             );
        console.log(this.grid);
        console.log(this.vp_to_img.mapRect(0, 0, this.width, this.height));


        this.mode = 'pips';
        this.clickStack = [];
    } else if (this.mode == 'pips') {
        this.pips.push(this.clickStack[0]);

        this.clickStack = [];
    }
    this.draw();
};

dice.scale = function(x, y) {
    return [dice.sizeX, y * (dice.sizeX / x)];
};

dice.main = function() {
    var canvas = $('canvas').get(0);
    var ctx = canvas.getContext('2d');

    var img = new window.Image();
    img.src = dice.imgLoc;
    img.onload = function() {
        var cont = new Controller(ctx, canvas.width, canvas.height, img);
        window.c = cont;
        $(canvas).click(function(e) {
            var offset = $(canvas).offset();
            var x = e.pageX - offset.left;
            var y = e.pageY - offset.top;
            cont.onClick(x, y);
        });
        cont.draw();

    }.bind(this);
};


$(dice.main);
