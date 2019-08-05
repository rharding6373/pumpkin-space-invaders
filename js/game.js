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
    width = Math.max(r1.right(), r2.right()) - x;
    height = Math.max(r1.bottom(), r2.bottom()) - y;
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

// Projectile
function Projectile(position, speed, direction, type) {
    Entity.call(this, position, speed, direction);
    this.type = type;
    this.width = 3;
    this.height = 5;
}
Projectile.prototype = Object.create(Entity.prototype);

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
    if (this.movingLeft && this.position.x > game.gameFieldRect().left()) {
        direction = vectorAdd(direction, new Vector2d(-1, 0));
    }
    if (this.movingRight && this.position.x < game.gameFieldRect().right()) {
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
    function isPlayerType(proj) {
        return (proj.type === "player");
    }
    var count = game.projectiles().filter(isPlayerType).length;
    if (count === 0) {
        game.add(new Projectile(this.position, 180, new Vector2d(0, -1), "player"));
    }
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

function Enemy(position, speed, direction) {
    Entity.call(this, position, speed, direction);
    this.width = 20;
    this.height = 10;
    this.dropTarget = 0;
    this.dropAmount = 1;
    this.timer = 0;
    this.firePercent = 10;
    this.fireWait = Math.random() * 5;
    
}
Enemy.prototype = Object.create(Entity.prototype);

Enemy.prototype.update = function (dt) {
    var left = game.enemiesRect().left(),
        right = game.enemiesRect().right(),
        edgeMargin = 5,
        gameLeftEdge = game.gameFieldRect().left() + edgeMargin,
        gameRightEdge = game.gameFieldRect().right() - edgeMargin;
    Entity.prototype.update.call(this, dt);
    // Drop when enemies reach the edge of the game space.
    if ( (this.direction.x < 0 && left < gameLeftEdge) || (this.direction.x > 0 && right > gameRightEdge)) {
        this.dropTarget += this.dropAmount;
    }
    // Determine the enemy's direction.
    if (this.position.y < this.dropTarget) {
        this.direction = new Vector2d(0, 1);
    } else if (this.direction.y > 0 ) {
        if (right > gameRightEdge) {
            this.direction = new Vector2d(-1, 0);
        } else {
            this.direction = new Vector2d(1, 0);
        }
    }
    
    // Fire on the player, if it's time...
    var p = vectorAdd(this.position, new Vector2d(0, 5));
    function hasEnemyBelow(e) {
        var rect = e.collisionRectangle();
        return p.y <= rect.top() && rect.left() <= p.x && p.x <= rect.right();
    }
    this.timer += dt;
    if (this.timer > this.fireWait) {
        this.timer = 0;
        this.fireWait = 1 + Math.random() * 4;
        var randInt = Math.random() * 100;
        if (randInt < this.firePercent && !game.enemies().find(hasEnemyBelow)) {
            this.fire(p);
        }
    }
}

Enemy.prototype.fire = function(position) {
    game.add(new Projectile(position, 60, new Vector2d(0, 1), "enemy"));
}

// Renderer
var renderer = (function () {
    var _canvas = document.getElementById("game-layer"),
        _context = _canvas.getContext("2d"),
        _projectileColors = {"player": "rgb(196, 208, 106)",
                             "enemy": "rgb(96, 195, 96)"};
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
            } else if (entity instanceof Projectile) {
                _drawRectangle(_projectileColors[entity.type], entity);
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
       var i, j,
           entity,
           velocity,
           entities = game.entities(),
           enemies = game.enemies(),
           player = game.player(),
           projectiles = game.projectiles();
       for (i = 0; i < entities.length; i++) {
           entity = entities[i];
           velocity = vectorScalarMultiply(entity.direction, entity.speed);
           entity.position = vectorAdd(entity.position, vectorScalarMultiply(velocity, dt));
       }
       // List of pairs of entities that we want to check for collisions.
       var collisionPairs = [];
       
       // Enemies vs Player
       for (i = 0; i < enemies.length; i++) {
           collisionPairs.push({first: enemies[i],
                               second: player});
       }
       // Projectiles vs Enemies or Player
       for (i=0; i < projectiles.length; i++) {
           if (projectiles[i].type === "enemy") {
               collisionPairs.push({first: projectiles[i],
                                   second: player});
           } else if (projectiles[i].type === "player") {
               for (j=0; j < enemies.length; j++) {
                collisionPairs.push({first: projectiles[i],
                                   second: enemies[j]});
               }
           }
       }
       // Detect collisions.
       for (i = 0; i < collisionPairs.length; i++) {
           var first = collisionPairs[i].first;
           var second = collisionPairs[i].second;
           if (first && second && first.collisionRectangle().intersects(second.collisionRectangle())) {
               first.hp -= 1;
               second.hp -= 1;
           }
       }
       // If enemies touch the floor, just delete them and start the next level.
       if (game.enemiesRect() && player && game.enemiesRect().bottom() > player.collisionRectangle().bottom()) {
           for (i = 0; i < enemies.length; i++) {
               enemies[i].hp -= 1;
           }
       }
       // Projectile leaves game field.
       for (i = 0; i < projectiles.length; i++) {
           var proj = projectiles[i];
           if (!game.gameFieldRect().intersects(proj.collisionRectangle())) {
               proj.hp -= 1;
           }
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
    var _player,
        _enemies,
        _projectiles,
        _entities,
        _gameFieldRect,
        _enemiesRect,
        _enemySpeed,
        _enemyFirePercent,
        _enemyDropAmount,
        _started = false,
        _lastFrameTime;
    
    function _start() {
        _lastFrameTime = 0;
        _entities = [];
        _enemies = [];
        _projectiles = [];
        _gameFieldRect = new Rectangle(0, 0, 600, 400);
        _enemiesRect = new Rectangle(0, 0, 0, 0);
        _enemySpeed = 10;
        _enemyFirePercent = 10;
        _enemyDropAmount = 1;
        _player = new Player(new Vector2d(300, 375), 90, new Vector2d(0, 0));
        _entities.push(_player);
        if (!_started ) {
            window.requestAnimationFrame(this.update.bind(this));
            _started = true;
        }
    }
    
    function _add(entity) {
        _entities.push(entity);
        if (entity instanceof Projectile) {
            _projectiles.push(entity);
        }
    }
    
    function _remove(entities) {
        if (!entities) return;
        function isNotPresent(item) { return !entities.includes(item); }
        _entities = _entities.filter(isNotPresent);
        _enemies = _enemies.filter(isNotPresent);
        _projectiles = _projectiles.filter(isNotPresent);
        if (entities.includes(_player)) {
            _player = undefined;
        }
    }
    
    function _update(time) {
        var dt = Math.min((time - _lastFrameTime) / 1000, 3/60);
        physics.update(dt);
        
        // TODO: update enemy speed as enemies die.
        // Create grid of enemies if there are none.
        // TODO: Each level should have a unique design.
        var i, j;
        if (_enemies.length === 0) {
            for (i = 0; i < 11; i ++) {
                for (j = 0; j<5; j++) {
                    var dropTarget = 10 + j * 20,
                        position = new Vector2d(50 + i * 30, dropTarget - 100),
                        direction = new Vector2d(1, 0),
                        enemy = new Enemy(position, _enemySpeed, direction);
                    enemy.dropTarget = dropTarget;
                    enemy.firePercent = _enemyFirePercent;
                    enemy.dropAmount = _enemyDropAmount;
                    _enemies.push(enemy);
                    _entities.push(enemy);
                }
            }
            _enemySpeed += 5;
            _enemyFirePercent += 5;
            _enemyDropAmount += 1;
        }
        _enemiesRect = _enemies.reduce(function(rect, e) { return rectangleUnion(rect, e.collisionRectangle())}, undefined);
        for (i = 0; i < _entities.length; i++) {
            _entities[i].update(dt);
        }
        // Clean up after collisions.
        var entitiesToRemove = [];
        var gameOver = false;
        for (i = 0; i < _entities.length; i++) {
            var e = _entities[i];
            if (e.hp <= 0) {
                entitiesToRemove.push(e);
                if (e instanceof Player) {
                    gameOver = true;
                }
            }
        }
        _remove(entitiesToRemove);
        if (gameOver) {
            _player = new Player(new Vector2d(300, 375), 90, new Vector2d(0, 0));
            _entities.push(_player);
        }
        renderer.render();
        window.requestAnimationFrame(this.update.bind(this));
    }
    
    return {
        start: _start,
        update: _update,
        add: _add,
        remove: _remove,
        entities: function () { return _entities; },
        player: function () { return _player; },
        enemies: function () { return _enemies; },
        gameFieldRect: function() { return _gameFieldRect; },
        enemiesRect: function() { return _enemiesRect; },
        projectiles: function() { return _projectiles; }
    };
})();

game.start();
