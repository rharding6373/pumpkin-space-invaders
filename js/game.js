// Maths
var Vector2d = function (x, y) {
    this.x = x;
    this.y = y;
};
function vectorAdd(v1, v2) {
    return new Vector2d(v1.x + v2.x, v1.y + v2.y);
}

// Subtracts v2 from v1
function vectorSubtract(v1, v2) {
    return new Vector2d(v1.x - v2.x, v1.y - v2.y);
}

function vectorScalarMultiply(v, a) {
    return new Vector2d(v.x * a, v.y * a);
}

function vectorLength(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vectorNormalize(v) {
    // Reciprocal; prevents division by 0.
    var r = 1.0 / (vectorLength(v) + 1.0e-037);
    return vectorScalarMultiply(v, r);
}

// Rectangle
function Rectangle (x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height=height;
}

Rectangle.prototype.left = function() {
    return this.x;
};
Rectangle.prototype.right = function() {
    return this.x + this.width;
};
Rectangle.prototype.top = function() {
    return this.y;
};
Rectangle.prototype.bottom = function() {
    return this.y + this.height;
};
Rectangle.prototype.intersects = function (r) {
    return this.right() >= r.left() && this.left() <= r.right() && this.top() <= r.bottom() && this.bottom() >= r.top();
};

function rectangleUnion(r1, r2) {
    var x, y, width, height;
    if (r1 === undefined) {
        return r2;
    }
    if (r2 === undefined) {
        return r1;
    }
    x = Math.min(r1.x, r2.x);
    y = Math.min(r1.y, r2.y);
    width = Math.max(r1.right, r2.right) - x;
    height = Math.max(r1.bottom, r2.bottom) - y;
    return new Rectangle(x, y, width, height);
}

// Parent entity class
function Entity(position, speed, direction) {
    this.position = position;
    this.speed = speed;
    this.direction = direction;
    this.time = 0;
    this.width = 5;
    this.height = 5;
    this.hp = 1;
}

Entity.prototype.update = function(dt) {
    this.time += dt;
};

Entity.prototype.collisionRectangle = function () {
    return new Rectangle(this.position.x - this.width/2, this.position.y - this.height/2, this.width, this.height);
}

// Player
function Player(position, speed, direction) {
    Entity.call(this, position, speed, direction);
    this.width = 50;
    this.height = 30;
    this.movingLeft = false;
    this.movingRight = false;
}
Player.prototype = Object.create(Entity.prototype);

Player.prototype.updateDirection = function () {
    var direction = new Vector2d(0, 0);
    if (this.movingLeft) {
        direction = vectorAdd(direction, new Vector2d(-1, 0));
    }
    if (this.movingRight) {
        direction = vectorAdd(direction, new Vector2d(1, 0));
    }
    this.direction = direction;
};

Player.prototype.moveRight = function (enable) {
    this.movingRight = enable;
    this.updateDirection();
};

Player.prototype.moveLeft = function (enable) {
    this.movingLeft = enable;
    this.updateDirection();
};

Player.prototype.fire = function () {
    console.log("TODO");
};

Player.prototype.update = function (dt) {
    Entity.prototype.update.call(this, dt);
};

// Player Actions
var playerActions = (function () {
    var _ongoingActions = [];
    
    function _startAction(id, playerAction) {
        if (playerAction === undefined) {
            return;
        }
        var f,
            acts = {"moveLeft": function () {
                if(game.player()) game.player().moveLeft(true);},
                    "moveRight": function () {
                        if (game.player()) game.player().moveRight(true);
                    },
                    "fire": function () {
                        if (game.player()) game.player().fire();
                    }
            };
        if (f = acts[playerAction]) f();
        _ongoingActions.push( {identifier:id,
                              playerAction: playerAction});
    }
    
    function _endAction(id) {
        var f,
            acts = {"moveLeft": function () {
                if(game.player()) game.player().moveLeft(false);},
                    "moveRight": function () {
                        if (game.player()) game.player().moveRight(false);
                    }};
        var idx = _ongoingActions.findIndex(function(a) {return a.identifier === id; });
        
        if (idx >= 0) {
            if (f = acts[_ongoingActions[idx].playerAction]) f();
            _ongoingActions.splice(idx, 1);
        }
            
    }
    
    return {
        startAction: _startAction,
        endAction: _endAction
    };
    
})();

function Enemy(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.direction = 1;
}
Enemy.prototype.update = function () {
    if (this.y <= 0 | this.y + this.height >= game.gameFieldHeight()) {
        this.direction *=-1;
    }
}

// Renderer
var renderer = (function () {
    var _canvas = document.getElementById("game-layer"),
        _context = _canvas.getContext("2d");
    function _drawRectangle(color, entity) {
        _context.fillStyle = color;
        _context.fillRect(entity.position.x - entity.width/2,
                         entity.position.y - entity.height/2,
                         entity.width,
                         entity.height)
    }
    
    function _render() {
        // Background
        _context.fillStyle = "black";
        _context.fillRect(0, 0, _canvas.width, _canvas.height);
        
        var i, entity, entities = game.entities();
        
        for (i = 0; i < entities.length; i++) {
            entity = entities[i];
            if (entity instanceof Enemy) {
                _drawRectangle(
"rgb(56, 150, 7)", entity);
            } else if (entity instanceof Player) {
                _drawRectangle("rgb(255, 255, 0)", entity);
            }
        }
    }
    
    return {
        render: _render
    };
})();

// Physics
var physics = (function () {
   function _update(dt) {
       var i,
           entity,
           velocity,
           entities = game.entities();
       for (i = 0; i < entities.length; i++) {
           entity = entities[i];
           velocity = vectorScalarMultiply(entity.direction, entity.speed);
           entity.position = vectorAdd(entity.position, vectorScalarMultiply(velocity, dt));
       }
   } 
    return {
        update: _update
    };
})();

// Keyboard inputs
var keybinds = { 32: "fire",
               37: "moveLeft",
               39: "moveRight"};

function keyDown(e) {
    var x = e.which || e.keyCode;
    if (keybinds[x] !== undefined) {
        e.preventDefault();
        playerActions.startAction(x, keybinds[x]);
    }
}

function keyUp(e) {
    var x = e.which || e.keyCode;
    if (keybinds[x] !== undefined) {
        e.preventDefault();
        playerActions.endAction(x);
    }
}
document.body.addEventListener('keydown', keyDown);
document.body.addEventListener('keyup', keyUp);

// Game
var game = (function () {
    var _gameFieldHeight = 500;
    var _entities = [];
    var _player,
        _enemies,
        _gameField,
        _started = false;
    function _start() {
        _player = new Player (new Vector2d(300, 300), 90, new Vector2d(0, 0));
        _entities.push(_player);
        // _entities.push(new Enemy(20, 20));
        // _entities.push(new Enemy(400, 300));
       
        if (!_started) {
            window.requestAnimationFrame(this.update.bind(this));
            _started = true;
        }
    }
    
    function _update() {
        var dt = 1/60;
        physics.update(dt);
        var i;
        for (i = 0; i < _entities.length; i++) {
            _entities[i].update(dt);
        }
        renderer.render();
        window.requestAnimationFrame(this.update.bind(this));
    }
    
    return {
        start: _start,
        update: _update,
        entities: function () { return _entities; },
        gameFieldHeight: function () { return _gameFieldHeight; },
        player: function () { return _player; },
        enemies: function () { return _enemies; }
    };
})();

game.start();
