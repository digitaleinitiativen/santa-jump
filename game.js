var JUMP = 390; // jump height
var ASSET_VERSION = (new Date()).getTime();
var BASE_PATH = '';
var VELOCITY = 330; // speed left-right
var DISTANCE = 150;

WebFontConfig = {

    //active: function() { game.time.events.add(Phaser.Timer.SECOND, createText, this); },

    google: {
        families: ['Revalia']
    }

};

var state = {
    preload: function() {
        this.game.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');
        this.load.image('redpixel', BASE_PATH + 'assets/redpixel.png?' + ASSET_VERSION, 800, 8);
        this.load.image('santa-idle', 'assets/santa-idle.png');
        this.load.image('gameover', 'assets/GameOverBild02.png');
        this.load.image('background', 'assets/background03.png');
        this.load.image('santa-jump1', 'assets/santa-jump01.png');
        this.load.image('santa-jump2', 'assets/santa-jump02.png');
        this.load.image('santa-jump3', 'assets/santa-jump03.png');
        this.load.image('platform1', 'assets/present01.png');
        this.load.image('platform2', 'assets/present02.png');
        this.load.image('platform3', 'assets/present03.png');
        this.load.image('platform4', 'assets/present04.png');
        this.load.image('powerup', 'assets/squirrel.png');
        this.load.image('ground', 'assets/ground02.png');
    },

    start: function() {
        this.isGameOver = false;
        this.isPlaying = true;
        this.count = 0;
        this.countPowerUp = 0;
        this.score = 0;
        this.currentJump = 0;
        this.nextPowerUpScore = 500;
    },

    addBackground: function() {
        var background = this.backgrounds.create(0, - 800 * this.backgroundCount , 'background');
        background.alpha = 0.5;
        this.backgroundCount++;
    },

    create: function() {
        this.backgroundCount = 0;
        this.backgrounds = this.add.group();

        this.addBackground();

        this.isGameOver = false;
        this.isPlaying = false;

        // interface
        this.addScoreText();

        // Stage
        this.stage.backgroundColor = '#404389';

        // Scaling
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.maxWidth = this.game.width;
        this.scale.maxHeight = this.game.height;
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;
        //this.scale.setScreenSize( true );

        this.game.physics.startSystem(Phaser.Physics.ARCADE);

        // camera and platform tracking vars
        this.cameraYMin = 99999;
        this.platformYMin = 99999;

        this.floor = this.add.sprite(0, this.world.height - 10, 'redpixel');
        this.game.physics.enable(this.floor);
        this.floor.body.immovable = true;

        // Create all platforms
        this.powerUps = this.add.group();

        this.platformsCreate();

        this.createPlayer();

        this.cursor = this.input.keyboard.createCursorKeys();
    },

    addScoreText: function() {
        this.scoreText = this.add.text(
            5,
            5,
            "",
            {
                //fill: '#ffdd00',
            }
        );
        this.scoreText.font = 'Revalia';
        this.scoreText.anchor.setTo(0, 0);
        this.scoreText.fontSize = 24;
        this.scoreText.fixedToCamera = true;

        grd = this.scoreText.context.createLinearGradient(0, 0, 0, this.scoreText.canvas.height);
        grd.addColorStop(0, '#ffdd00');
        grd.addColorStop(1, '#ff2211');
        this.scoreText.fill = grd;

        this.scoreText.setShadow(-3, 3, 'rgba(0,0,0,0.5)', 0);
        this.scoreText.fixedToCamera = true;
    },

    calculateScore: function() {
        this.score = Math.round(this.player.yChange);
    },

    onCollide: function(platform, player) {
        // only jump when falling.
        if (this.player.body.velocity.y > -1 && player.y > platform.y + 10) {
            this.playerJump();
        }
    },

    launchPowerUp: function() {
        this.createPowerUp();
    },

    checkPowerUp: function() {
        if (this.score >= this.nextPowerUpScore) {

            this.launchPowerUp();

            this.nextPowerUpScore = this.rnd.integerInRange(this.score + 600, this.score + 1400);
        }
    },

    displayJumpImage: function() {
        this.currentJump++;
        if (this.currentJump > 3) {
            this.currentJump = 1;
        }
        this.player.loadTexture('santa-jump'+this.currentJump);
    },

    onPowerUpCollide: function(a, b) {
        velocity = this.player.body.velocity.y - 800;

        this.player.body.velocity.y = Math.min(2000, this.player.body.velocity.y - 800);

        this.game.camera.shake(0.02, 500);
        b.kill();
    },

    renderBackground: function() {
        var maxY = 0;
        this.backgrounds.forEachAlive(function( elem ) {
            if (elem.y < maxY) {
                maxY = elem.y;
            }
            if( elem.y > this.camera.y + this.game.height + 10) {
                elem.kill();
            }
        }, this );
        if (maxY + 500 > this.score * -1 ) {
            this.addBackground();
        }
    },

    update: function() {
        this.calculateScore();

        this.renderBackground();

        // check if a new powerup is launched
        this.checkPowerUp();

        //this.background.cameraOffset = this.player.yChange;
        //this.background.offsetY = this.player.yChange;
        //this.background.tilePosition.y = this.player.yChange;

        this.scoreText.setText("SCORE: "+this.score);
        this.physics.arcade.collide(this.player, this.platforms, this.onCollide.bind(this));
        this.physics.arcade.collide(this.player, this.powerUps, this.onPowerUpCollide.bind(this));


        if (!this.isPlaying) {
            if(this.isGameOver) {
                this.animateGameOver();
            }

            if(this.game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
                if (this.isGameOver) {
                    this.shutdown();
                    this.create();
                }
                this.start();
            }
            return;
        }

        // this is where the main magic happens
        // the y offset and the height of the world are adjusted
        // to match the highest point the hero has reached
        this.world.setBounds( 0, -this.player.yChange, this.world.width, this.game.height + this.player.yChange );

        // the built in camera follow methods won't work for our needs
        // this is a custom follow style that will not ever move down, it only moves up
        this.cameraYMin = Math.min( this.cameraYMin, this.player.y - this.game.height + 300 );
        this.camera.y = this.cameraYMin;

        // hero collisions and movement
        this.playerMove();
        this.movePlatforms();

        // for each plat form, find out which is the highest
        // if one goes below the camera view, then create a new one at a distance from the highest one
        // these are pooled so they are very performant
        this.platforms.forEachAlive( function( elem ) {
            this.platformYMin = Math.min( this.platformYMin, elem.y );
            if( elem.y > this.camera.y + this.game.height ) {
                elem.kill();
                // at least 1, max 6
                var isMovingPlatform = this.rnd.integerInRange(1,10) > Math.min(6, Math.max(1, 30000 / this.score));
                this.createPlatform( this.rnd.integerInRange( 0, this.world.width - 50 ), this.platformYMin - DISTANCE, isMovingPlatform);
            }
        }, this );

        this.rotatePowerUps();
    },

    movePlatforms: function() {
        this.platforms.forEachAlive(function(elem) {
            if(elem.isMoving) {
                // Speed is at least 2, max 10
                var speed = Math.min(Math.max(2, (this.score / 1000) -1), 10);
                // speed variation +-1
                speed += this.rnd.integerInRange(-1,1);

                if (elem.moveDirection == 'left') {
                    speed *= -1;
                }
                elem.x += speed;

                if (elem.moveDirection == 'left' && elem.x < 5) {
                    elem.moveDirection = 'right';
                } else if (elem.moveDirection == 'right' && elem.x > this.world.width - 55) {
                    elem.moveDirection = 'left';
                }
            }
        }.bind(this));
    },

    rotatePowerUps: function() {
        this.powerUps.forEachAlive(function(elem){
            if( elem.y > this.camera.y + this.game.height ) {
                elem.kill;
            }
            elem.angle += 2;
        }.bind(this));
    },

    shutdown: function() {
        // reset everything, or the world will be messed up
        this.world.setBounds( 0, 0, this.game.width, this.game.height );
        this.cursor = null;
        this.player.destroy();
        this.player = null;
        this.platforms.destroy();
        this.platforms = null;
        this.powerUps.destroy();
        this.powerUps = null;
        this.scoreText.destroy();
        this.gameOverScreen.destroy();
    },

    getRandX() {
        return this.rnd.integerInRange( 0, this.world.width - 50);
    },

    platformsCreate: function() {
        this.platforms = this.add.group();
        this.platforms.enableBody = true;
        this.platforms.createMultiple(10, 'redpixel');

        // Floor
        this.platformsCreateOne( -16, this.world.height - 16, this.world.width + 16 );

        var width = this.world.width;
        var ratio = 4.70;
        var height = width / ratio;

        var ground = this.add.sprite(0, this.world.height - height, 'ground');

        ground.width = width;
        ground.height = height;

        // create a batch of platforms that start to move up the level
        for( var i = 0; i < 9; i++ ) {
            this.createPlatform( this.rnd.integerInRange( 0, this.world.width - 50 ), this.world.height - DISTANCE - DISTANCE * i, false);
        }
    },

    platformsCreateOne: function( x, y, width) {
        var platform = this.platforms.getFirstDead();
        platform.reset( x, y );
        platform.scale.x = width;
        platform.scale.y = 16;
        platform.body.immovable = true;
        this.game.debug.body(platform);


        return platform;
    },

    createPlatform: function(x, y, isMoving) {
        var platform = this.platforms.create(
            x, y, 'platform' + this.rnd.integerInRange(1, 4)
        );
        platform.scale.x = 0.1
        platform.scale.y = 0.1;
        platform.body.immovable = true;

        // Moveparameter.
        platform.isMoving = isMoving;
        var direction = this.rnd.integerInRange(0,1);
        platform.moveDirection = direction == 1 ? 'left' : 'right';

        return platform;
    },


    createPowerUp: function() {
        var powerUp = this.powerUps.create(this.getRandX(), this.camera.y, 'powerup');
        powerUp.width = 40;
        powerUp.height = 40;
        //powerUp.anchor.set( 0.5 );

        this.physics.arcade.enable( powerUp );
        powerUp.body.gravity.y = 400;

        this.player.body.checkCollision.right = false;
    },

    createPlayer: function() {
        this.player = game.add.sprite(this.world.centerX, this.world.height - 66, 'santa-idle');
        this.player.anchor.set( 0.5 );

        // track distance
        this.player.yOrig = this.player.y;
        this.player.yChange = 0;

        this.physics.arcade.enable( this.player );
        this.player.body.gravity.y = 500;
        this.player.body.checkCollision.up = false;
        this.player.body.checkCollision.left = false;
        this.player.body.checkCollision.right = false;
        this.player.width = 100;
        this.player.height = 90;
    },

    playerJump: function() {
        if (this.isPlaying) {
            this.player.body.velocity.y = -JUMP;
            this.isJumping = true;
            this.displayJumpImage();
        }
    },

    animateGameOver: function() {
    },

    displayGameOverScreen: function() {
        this.gameOverScreen = this.add.group();

        var text = this.add.text(
            20,
            100,
            "GAME\nOVER!\nHoHoHo",
            {
                //fill: '#ffdd00',
            },
            this.gameOverScreen
        );

        text.font = 'Revalia';
        text.anchor.setTo(0, 0);
        text.fontSize = 90;
        text.fixedToCamera = true;
        grd = text.context.createLinearGradient(0, 0, 0, text.canvas.height);
        grd.addColorStop(0, '#ff0033');
        grd.addColorStop(1, '#ffdd00');
        text.fill = grd;
        text.setShadow(-5, 5, 'rgba(0,0,0,0.5)', 0);
        text.fixedToCamera = true;
        this.gameOverText = text;


        var gameover = this.gameOverScreen.create(this.world.centerX, this.camera.y + 800, 'gameover');
        gameover.anchor.set( 0.5 );

        this.physics.arcade.enable( gameover );
        gameover.body.gravity.y = 500;
    },

    playerMove: function() {
        // handle the left and right movement of the hero
        if( this.cursor.left.isDown ) {
            this.player.body.velocity.x = -VELOCITY;
        } else if( this.cursor.right.isDown ) {
            this.player.body.velocity.x = VELOCITY;
        } else {
            this.player.body.velocity.x = 0;
        }

        // wrap world coordinated so that you can warp from left to right and right to  left
        this.world.wrap( this.player, this.player.width / 2, false );

        // track the maximum amount that the hero has travelled
        this.player.yChange = Math.max( this.player.yChange, Math.abs( this.player.y - this.player.yOrig ) );

        // game over
        if( this.player.y > this.cameraYMin + this.game.height && this.player.alive ) {
            this.isGameOver = true;
            this.isPlaying = false;
            this.displayGameOverScreen();
        }
    }
};

var game = new Phaser.Game(
    500,
    800,
    Phaser.CANVAS,
    '',//document.querySelector('#screen'),
    state
);
