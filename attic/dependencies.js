(function(window) {
  var isEmpty = function(obj) {
    for (var x in obj) {
      return false;
    }
    return true;
  };

  var Dependency = function(requires, load) {
    this.requires = requires;
    this.load = load;

    this.stillRequires = {};
    this.requires.forEach(function(req) {
      this.stillRequires[req] = true;
    }, this);
  };

  var DependencyManager = function() {
    this._ready = [];
    this._waiting = [];

    this._providedValues = {};
  };

  DependencyManager.prototype.add = function(requires, load) {
    this._waiting.push(new Dependency(requires, load));
  };

  DependencyManager.prototype.get = function(name) {
    return this._providedValues[name];
  };

  DependencyManager.prototype.provide = function(name, value) {
    this._providedValues[name] = value;

    var stillWaiting = [];
    this._waiting.forEach(function(dep) {
      delete dep.stillRequires[name];
      if (isEmpty(dep.stillRequires)) {
        this._ready.push(dep);
      } else {
        stillWaiting.push(dep);
      }
    }, this);
    this._waiting = stillWaiting;
    this.go();
  };

  DependencyManager.prototype.go = function() {
    var toExec = this._ready;
    this._ready = [];
    toExec.forEach(function(dep) { dep.load(); }, this);
  };

  window.dice = window.dice || {};
  window.dice.DependencyManager = DependencyManager;
}(window));
