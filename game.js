var SPEED = 180;
var GRAVITY = 1200;
var JUMP = 580;
var ASSET_VERSION = (new Date()).getTime();
var BASE_PATH = '';
var VELOCITY = 400;

WebFontConfig = {

    //active: function() { game.time.events.add(Phaser.Timer.SECOND, createText, this); },

    google: {
        families: ['Revalia']
    }

};

var state = {
    preload: function() {
        this.game.load.script('webfont', 'http://ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');
        this.load.image('redpixel', BASE_PATH + 'assets/redpixel.png?' + ASSET_VERSION, 800, 8);
        this.load.image('player', 'assets/santa-player.png');

    },

    start: function() {
        this.isGameOver = false;
        this.isPlaying = true;
        this.count = 0;
        this.countPowerUp = 0;
        this.score = 0;
    },

    create: function() {
        this.isGameOver = true;
        this.isPlaying = false;
        
        // interface
        this.addScoreText();

        // Stage
        this.stage.backgroundColor = '#6bf';

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
                fill: '#ffdd00',
            }
        );
        this.scoreText.font = 'Revalia';
        this.scoreText.anchor.setTo(0, 0);
        this.scoreText.fontSize = 24;
        this.scoreText.fixedToCamera = true;
    },

    calculateScore: function() {
        this.score = Math.round(this.player.yChange);
    },

    onCollide: function(a, b, c) {
        // only jump when falling.
        if (this.player.body.velocity.y > -1) {
            this.playerJump();
        }
    },

    launchPowerUp: function() {
        this.createPowerUp();
    },

    checkPowerUp: function() {
        if (this.score / 500 > this.countPowerUp) {

            //TODO: 
            this.launchPowerUp();

            this.countPowerUp++;
        }
    },

    update: function() {
        this.calculateScore();
        // check if a new powerup is launched
        this.checkPowerUp();

        this.scoreText.setText("SCORE: "+this.score);
        this.physics.arcade.collide(this.player, this.platforms, this.onCollide.bind(this));

        if (!this.isPlaying) {
            if(this.isGameOver) {
            
            } 

            if(this.game.input.keyboard.isDown(Phaser.Keyboard.UP) 
                || this.game.input.activePointer.isDown
            ) {
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
        this.cameraYMin = Math.min( this.cameraYMin, this.player.y - this.game.height + 200 );
        this.camera.y = this.cameraYMin;

        // hero collisions and movement
        this.playerMove();

        // for each plat form, find out which is the highest
        // if one goes below the camera view, then create a new one at a distance from the highest one
        // these are pooled so they are very performant
        this.platforms.forEachAlive( function( elem ) {
            this.platformYMin = Math.min( this.platformYMin, elem.y );
            if( elem.y > this.camera.y + this.game.height ) {
                elem.kill();
                this.platformsCreateOne( this.rnd.integerInRange( 0, this.world.width - 50 ), this.platformYMin - 100, 50 );
            }
        }, this );

        this.lastVelocity = this.player.body.velocity.y;
    },

    shutdown: function() {
        // reset everything, or the world will be messed up
        this.world.setBounds( 0, 0, this.game.width, this.game.height );
        this.cursor = null;
        this.player.destroy();
        this.player = null;
        this.platforms.destroy();
        this.platforms = null;
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

        // create a batch of platforms that start to move up the level
        for( var i = 0; i < 9; i++ ) {
            this.platformsCreateOne( this.rnd.integerInRange( 0, this.world.width - 50 ), this.world.height - 100 - 100 * i, 50 );
        }
    },

    platformsCreateOne: function( x, y, width ) {
        var platform = this.platforms.getFirstDead();
        platform.reset( x, y );
        platform.scale.x = width;
        platform.scale.y = 16;
        platform.body.immovable = true;

        return platform;
    },

    createPowerUp: function() {
        if (!this.powerUps) {
            this.powerUps = this.add.group();
        }

        // basic hero setup
        powerUp = game.add.sprite(this.getRandX(), 0, 'player');
        //powerUp.anchor.set( 0.5 );

        this.physics.arcade.enable( powerUp );
        powerUp.body.gravity.y = 400;
        //this.player.body.checkCollision.up = false;
        //this.player.body.checkCollision.left = false;
        //this.player.body.checkCollision.right = false;
    },

    createPlayer: function() {
        // basic hero setup
        this.player = game.add.sprite(this.world.centerX, this.world.height - 66, 'player');
        this.player.anchor.set( 0.5 );

        // track where the hero started and how much the distance has changed from that point
        this.player.yOrig = this.player.y;
        this.player.yChange = 0;

        // hero collision setup
        // disable all collisions except for down
        this.physics.arcade.enable( this.player );
        this.player.body.gravity.y = 500;
        this.player.body.checkCollision.up = false;
        this.player.body.checkCollision.left = false;
        this.player.body.checkCollision.right = false;
    },

    playerJump: function() {
        if (this.isPlaying) {
            this.player.body.velocity.y = -350;
        }
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

        // wrap world coordinated so that you can warp from left to right and right to left
        this.world.wrap( this.player, this.player.width / 2, false );

        // track the maximum amount that the hero has travelled
        this.player.yChange = Math.max( this.player.yChange, Math.abs( this.player.y - this.player.yOrig ) );

        if( this.player.y > this.cameraYMin + this.game.height && this.player.alive ) {
            this.isGameOver = true;
            this.isPlaying = false;
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
