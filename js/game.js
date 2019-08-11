// Maths
var Vector2d = function (x, y) {
    this.x = x;
    this.y = y;
};

Vector2d.prototype.set = function (x, y) {
    this.x = x;
    this.y = y;
}

Vector2d.prototype.clone = function () {
    return new Vector2d(this.x, this.y);
}

Vector2d.prototype.add = function (v) {
    this.x += v.x;
    this.y += v.y;
}
Vector2d.prototype.subtract = function (v) {
    this.x -= v.x;
    this.y -= v.y;
}
Vector2d.prototype.scalarMultiply = function (c) {
    this.x *= c;
    this.y *= c;
}

function vectorLength(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vectorNormalize(v) {
    // Reciprocal; prevents division by 0.
    var r = 1.0 / (vectorLength(v) + 1.0e-037);
    return v.clone().scalarMultiply(r);
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

function Pool (template) {
    this.template = template;
    this.pool = [];
}

Pool.prototype.get = function () {
    for (var i = this.pool.length-1; i >= 0; i--) {
        if (this.pool[i].available) {
            this.pool[i].available = false;
            this.pool[i].object.init();
            return this.pool[i].object;
        }
    }
    var obj = this.template.clone();
    obj.init();
    this.pool.push({available: false, object: obj});
    return obj;
}
Pool.prototype.put = function (object) {
    for (var i = 0; i < this.pool.length; i++) {
        if (this.pool[i].object === object) {
            this.pool[i].available = true;
            break;
        }
    }
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
    this._collisionRect = new Rectangle(this.position.x - this.width/2, this.position.y - this.height/2, this.width, this.height);
}

Entity.prototype.init = function() {
    this.position.set(0, 0);
    this.speed = 0;
    this.direction.set(0, 0);
    this.time = 0;
    this.width = 5;
    this.height = 5;
    this.hp = 1;
    this._collisionRect = new Rectangle(this.position.x - this.width/2, this.position.y - this.height/2, this.width, this.height);
}

Entity.prototype.clone = function() {
    return new Entity(this.position.clone(), this.speed, this.direction.clone());
}

Entity.prototype.update = function(dt) {
    this.time += dt;
};

Entity.prototype.collisionRectangle = function () {
    this._collisionRect.x = this.position.x - this.width/2;
    this._collisionRect.y = this.position.y - this.height/2;
    this._collisionRect.width = this.width;
    this._collisionRect.height = this.height;
    return this._collisionRect;
}

// Projectile
function Projectile(position, speed, direction, type) {
    Entity.call(this, position, speed, direction);
    this.type = type;
    this.width = 3;
    this.height = 5;
}
Projectile.prototype = Object.create(Entity.prototype);

Projectile.prototype.init = function () {
    Entity.prototype.init.call(this);
    this.type = "";
    this.width = 3;
    this.height = 5;
}

Projectile.prototype.clone = function () {
    return new Projectile(this.position.clone(), this.speed, this.direction.clone(), this.type);
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
    this.direction.set(0, 0);
    if (this.movingLeft && this.position.x > game.gameFieldRect().left()) {
        this.direction.set(-1, 0);
    }
    if (this.movingRight && this.position.x < game.gameFieldRect().right()) {
        this.direction.set(1, 0)
    }
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
        var projectile = game.projectilePool().get();
        projectile.position.set(this.position.x, this.position.y);
        projectile.speed = 180;
        projectile.direction.set(0, -1);
        projectile.type = "player";
        game.add(projectile);
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

function HappyEnding(position, speed, direction) {
		Entity.call(this, position, speed, direction);
		this.width = 200;
		this.height = 200;
		this.dropTarget = 150;
		this.dropAmount = 1;
}
HappyEnding.prototype = Object.create(Entity.prototype);

HappyEnding.prototype.update = function (dt) {
		this.direction.set(0,0);
		if (this.position.y < this.dropTarget) {
        this.direction.set(0, 1);
    }
}

function SadEnding(position, speed, direction) {
		Entity.call(this, position, speed, direction);
		this.width = 200;
		this.height = 200;
		this.dropTarget = 150;
		this.dropAmount = 1;
}
SadEnding.prototype = Object.create(Entity.prototype);

SadEnding.prototype.update = function (dt) {
		this.direction.set(0,0);
		if (this.position.y < this.dropTarget) {
        this.direction.set(0, 1);
    }
}

function Enemy(position, speed, direction) {
    Entity.call(this, position, speed, direction);
    this.width = 30;
    this.height = 24;
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
        this.direction.set(0, 1);
    } else if (this.direction.y > 0 ) {
        if (right > gameRightEdge) {
            this.direction.set(-1, 0);
        } else {
            this.direction.set(1, 0);
        }
    }
    
    // Fire on the player, if it's time...
    var p = new Vector2d(0, 5);
    p.add(this.position);
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
    var projectile = game.projectilePool().get();
    projectile.position.set(position.x, position.y);
    projectile.speed = 60;
    projectile.direction.set(0, 1);
    projectile.type = "enemy";
    game.add(projectile);
}

function Explosion(position, speed, direction, duration) {
    Entity.call(this, position, speed, direction);
    this.width = 20;
    this.height = 20;
    this.duration = duration;
}
Explosion.protype = Object.create(Entity.prototype);

Explosion.prototype.init = function () {
	Entity.prototype.init.call(this);
	this.width = 20;
    this.height = 20;
    this.duration = 1;	
}

Explosion.prototype.clone = function () {
	return new Explosion(this.position.clone(), this.speed, this.direction.clone(), this.duration);
}

Explosion.prototype.update = function (dt) {
    Entity.prototype.update.call(this, dt);
    if (this.time > this.duration) {
        this.hp = 0;
    }
};

// Sprite
function Sprite(imgPath, frames, frameRate, r, g, b) {
    var spriteImage = new Image();
    var image = new Image();
    
    spriteImage.onload = function() {
        var spriteCanvas = document.createElement("canvas");
        var spriteContext = spriteCanvas.getContext('2d');
        spriteCanvas.width = spriteImage.width;
        spriteCanvas.height = spriteImage.height;
        
        spriteContext.drawImage(spriteImage, 0, 0, spriteImage.width, spriteImage.height, 0, 0, spriteCanvas.width, spriteCanvas.height);
        
        var sourceData = spriteContext.getImageData(0, 0, spriteImage.width, spriteImage.height);
        
        var data = sourceData.data;
        for (var i = 0; i < data.length; i += 4) {
            data[i] = r;
            data[i+1] = g;
            data[i+2] = b;
            // Fourth element is the alpha channel.
        }
        spriteContext.putImageData(sourceData, 0, 0);
        image.src = spriteCanvas.toDataURL('image/png');
    };
    
    spriteImage.src = imgPath;
    this.frames = frames;
    this.frameRate = frameRate;
    this.timer = 0;
    this.currentFrame = 0;
    this.image = image;
}

Sprite.prototype.update = function (dt) {
    this.timer += dt;
    if (this.timer > 1/this.frameRate) {
        this.timer = 0;
        this.currentFrame= (this.currentFrame+1)%this.frames;
    }
};

// Renderer
var renderer = (function () {
    var _canvas = document.getElementById("game-layer"),
        _context = _canvas.getContext("2d"),
        _projectileColors = {"player": "rgb(196, 208, 106)",
                             "enemy": "rgb(96, 195, 96)"};
    var _playerSprite = new Sprite("img/mushroom2.png", 1, 1, 148, 0, 211);
    var _enemySprite = new Sprite("img/pumpkin_44.png", 2, 1, 255, 140, 0);
    var _explosionSprite = new Sprite("img/explosion.png", 3, 3, 238, 130, 238);
		var _happySprite = new Sprite("img/rings.png", 1, 1, 255,255,102);
		var _sadSprite = new Sprite("img/gameover.png", 1, 1, 139,0,0 );
    var _sprites = [].concat(_playerSprite, _enemySprite, _explosionSprite);
    
    function _updateUI() {
        var scoreElement = document.getElementById("score");
        var menuElement = document.getElementById("menu");
        var titleElement = document.getElementById("title");
        
        // Update score.
        var scoreText = "Score " + Math.round(game.score());
        if (scoreElement.innerHTML != scoreText) {
            scoreElement.innerHTML = scoreText;
        }
        menuElement.style.display = "none";
        titleElement.style.display = "none";
    }
    
    function _drawSprite(sprite, entity) {
        _context.drawImage(sprite.image, (sprite.image.width/sprite.frames)*sprite.currentFrame, 0, sprite.image.width/sprite.frames, sprite.image.height, entity.position.x-entity.width/2, entity.position.y-entity.height/2, entity.width, entity.height);
    }
    function _drawRectangle(color, entity) {
        _context.fillStyle = color;
        _context.fillRect(entity.position.x - entity.width/2,
                         entity.position.y - entity.height/2,
                         entity.width,
                         entity.height)
    }
    
    function _render(dt) {
        var i, entity, entities = game.entities();
        var _scaleFactor = _canvas.clientWidth / game.gameFieldRect().width;
        _scaleFactor = Math.max(1, Math.min(2, _scaleFactor));
        _canvas.width = game.gameFieldRect().width * _scaleFactor;
        _canvas.height = game.gameFieldRect().height * _scaleFactor;
        _context.scale(_scaleFactor, _scaleFactor);
        // Update sprites 
        for (i = 0; i < _sprites.length; i++) {
            _sprites[i].update(dt);
        }
             
        // Background
        _context.fillStyle = "black";
        _context.fillRect(0, 0, _canvas.width, _canvas.height);
        
        
        for (i = 0; i < entities.length; i++) {
            entity = entities[i];
            if (entity instanceof Enemy) {
                _drawSprite(_enemySprite, entity);
            } else if (entity instanceof Player) {
                _drawSprite(_playerSprite, entity);
            } else if (entity instanceof Projectile) {
                _drawRectangle(_projectileColors[entity.type], entity);
            } else if (entity instanceof Explosion) {
                _drawSprite(_explosionSprite, entity);
            } else if (entity instanceof HappyEnding) {
				_drawSprite(_happySprite, entity);
			} else if (entity instanceof SadEnding) {
				_drawSprite(_sadSprite, entity);
			}
        }
        _updateUI();
    }
    
    return {
        render: _render
    };
})();

// Physics
var physics = (function () {
    var velocity = new Vector2d(0, 0);
   function _update(dt) {
       var i, j,
           entity,
           entities = game.entities(),
           enemies = game.enemies(),
           player = game.player(),
					 end1 = game.end1(),
		 			 end2 = game.end2(),
           projectiles = game.projectiles();
       for (i = 0; i < entities.length; i++) {
           entity = entities[i];
           velocity.set(entity.direction.x, entity.direction.y);
           velocity.scalarMultiply(entity.speed*dt);
           entity.position.add(velocity);
       }
       // List of pairs of entities that we want to check for collisions.
       var collisionPairs = [];
       
       // Enemies vs Player
       for (i = 0; i < enemies.length; i++) {
           collisionPairs.push({first: enemies[i],
                               second: player});
       }
       // Projectiles vs Enemies or Player or endings
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
		   // Collisions during the ending.
		   if (end1 && end2 && projectiles.length > 0) {
				 if (end1.collisionRectangle().intersects(projectiles[0].collisionRectangle())) {
					player.hp -= 1;
				 	end2.hp -= 1;
					 projectiles[0].hp -= 1;
				 } else if (end2.collisionRectangle().intersects(projectiles[0].collisionRectangle())) {
					player.hp -= 1;
				 	end1.hp -= 1;
					 projectiles[0].hp -= 1;
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
    var __player,
        _enemies,
        _projectiles,
				_end1,
				_end2,
        _entities,
        _score = 0,
        _gameFieldRect,
        _enemiesRect,
        _enemySpeed,
        _enemyFirePercent,
        _enemyDropAmount,
        _started = false,
				_ended = false,
				_fireworks = false,
        _level,
        _lastFrameTime,
        _projectilePool = new Pool(new Projectile(new Vector2d(0,0), 0, new Vector2d(0, 0), "")),
        _explosionPool = new Pool(new Explosion(new Vector2d(0,0), 0, new Vector2d(0,0), 0)),
        _letterDesign = {"A":[[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[2,1],[2,2],[2,3],[2,4]],
                         "E":[[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[2,0],[1,2],[1,4],[2,4]],
                         "I":[[0,0],[1,0],[2,0],[1,1],[1,2],[1,3],[0,4],[1,4],[2,4]],
                         "L":[[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4]],
                         "M":[[0,0],[0,1],[0,2],[0,3],[0,4],[1,1],[2,2],[3,1],[4,0],[4,1],[4,2],[4,3],[4,4]],
                         "O":[[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4]],
                         "R":[[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[2,1],[2,3],[2,4]],
                         "U":[[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4]],
                        "W":[[0,0],[0,1],[0,2],[1,3],[1,4],[2,2],[3,4],[3,3],[4,2],[4,1],[4,0]],
                        "Y":[[0,0],[0,1],[1,2],[1,3],[1,4],[2,0],[2,1]],
                        "?":[[0,1],[1,0],[1,3],[1,4],[2,1],[2,2]],
                        "#":[[0,0],[0,1],[0,2],[0,3],[0,4]]},
        _levelDesign = ["##########",
                       "WILL",
                        "YOU",
                       "MARRY",
                       "ME?"];
    
    function _start() {
        _lastFrameTime = 0;
        _level = 0;
        _entities = [];
        _enemies = [];
        _projectiles = [];
				_end1 = undefined;
				_end2 = undefined;
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
    
    function  _removeAtIndex(array, index) {
        if (index < 0 || index >= array.length || array.length === 0) {
            return;
        }
        array[index] = array[array.length-1];
        array[array.length-1] = undefined;
        array.length = array.length - 1;
    }
    
    function _remove(entities) {
        if (!entities) return;
        for (var i = 0; i < entities.length; i++) {
            var idx = _entities.indexOf(entities[i]);
            if (idx >= 0) {
                _removeAtIndex(_entities, idx);
            }
            idx = _projectiles.indexOf(entities[i]);
            if (idx >= 0) {
                _removeAtIndex(_projectiles, idx);
                _projectilePool.put(entities[i]);
            }
            idx = _enemies.indexOf(entities[i]);
            if (idx >= 0) {
                _removeAtIndex(_enemies, idx);
            }
            _explosionPool.put(entities[i]);
        }
        if (entities.includes(_player)) {
            _player = undefined;
        }
    }
    
    function _update(time) {
        var dt = Math.min((time - _lastFrameTime) / 1000, 3/60);
        physics.update(dt);
        
        // Create grid of enemies if there are none.
        var i, j, c = 0;
        if (_enemies.length === 0 ) {
            if (_level < _levelDesign.length) {
                for (var l = 0; l < _levelDesign[_level].length; l++) {   
                    var letter = _levelDesign[_level].charAt(l),
                        max_i = 0;
                    for (var x = 0; x < _letterDesign[letter].length; x++) {
                        i = _letterDesign[letter][x][0] * 32 + l * 40 + c * 32 + 50;
                        j = _letterDesign[letter][x][1];
                        var dropTarget = 10 + j * 25,
                            position = new Vector2d(i, dropTarget - 100),
                            direction = new Vector2d(1, 0),
                            enemy = new Enemy(position, _enemySpeed, direction);
                        enemy.dropTarget = dropTarget;
                        enemy.firePercent = _enemyFirePercent;
                        enemy.dropAmount = _enemyDropAmount;
                        _enemies.push(enemy);
                        _entities.push(enemy);
                        max_i = Math.max(max_i, _letterDesign[letter][x][0]);
                    }
                    c += max_i;
                }
                _enemySpeed += 5;
                _enemyFirePercent += 5;
                _enemyDropAmount += 1;
                _level += 1;
            } else if (!_ended) { // Game over, no more levels
                _end1 = new HappyEnding(new Vector2d(150, -100), 5, new Vector2d(1, 0));
				_end2 = new SadEnding(new Vector2d(450, -100), 5, new Vector2d(1, 0));
				_entities.push(_end1);
				_entities.push(_end2);
				_ended = true;
            } else if (_fireworks) {
                var randInt = Math.random() * 100;
                if (randInt < 10) {
						var expl = _explosionPool.get();
						expl.position.x = Math.random() * game.gameFieldRect().right();
                        expl.position.y = Math.random() * game.gameFieldRect().bottom();
						this.add(expl);
				}
            }
        }
        _enemiesRect = _enemies.reduce(function(rect, e) { return rectangleUnion(rect, e.collisionRectangle())}, undefined);
        for (i = 0; i < _entities.length; i++) {
            _entities[i].update(dt);
        }
        // Clean up after collisions.
        var entitiesToRemove = [];
        var player_hit = false;
        for (i = 0; i < _entities.length; i++) {
            var e = _entities[i];
            if (e.hp <= 0) {
                entitiesToRemove.push(e);
                if (e instanceof Enemy) {
                    _score += 5;
                    var eexpl = _explosionPool.get();
                    eexpl.position = e.position;
                    eexpl.speed = e.speed;
                    eexpl.direction = e.direction;
                    this.add(eexpl);
                }
                if (e instanceof Player) {
                    _score -= 25;
                    player_hit = true;
                }
				if (e instanceof SadEnding) {
                    _fireworks = true;
				}
            }
        }
        _remove(entitiesToRemove);
        if (player_hit && !_ended) {
            _player = new Player(new Vector2d(300, 375), 90, new Vector2d(0, 0));
            _entities.push(_player);
        }
        renderer.render(dt);
        window.requestAnimationFrame(this.update.bind(this));
    }
    
    return {
        start: _start,
        update: _update,
        add: _add,
        remove: _remove,
        removeAtIndex: _removeAtIndex,
        score: function() {return _score;},
        entities: function () { return _entities; },
        player: function () { return _player; },
        enemies: function () { return _enemies; },
        gameFieldRect: function() { return _gameFieldRect; },
        enemiesRect: function() { return _enemiesRect; },
        projectiles: function() { return _projectiles; },
        end1: function() { return _end1; },
        end2: function() {return _end2; },
        projectilePool: function() { return _projectilePool; },
        explosionPool: function() { return _explosionPool; },
    };
})();
