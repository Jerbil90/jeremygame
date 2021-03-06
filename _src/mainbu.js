import $ from 'jquery';
import {Sprite, InitiativeSprite, BattleSprite, PoisonEffectSprite, StunnedEffectSprite} from './Sprite';
import {Unit, Hero, Monster, Fighter, Knight, Wolf, Snake, HealthBar, Equipment} from './Unit';
import {Stats, CombatStats, EquippedStats} from './Stats';
import {DamageDisplay, PoisonedDisplayIndicator, InitiativeDisplay} from './UI';
import {Item, BattleItem, MinorHealthPotion, Antidote} from './Item';
import {Menu, HeroSelectionMenu, ActionMenu, SpecialMenu, ItemMenu, MonsterTargetMenu, HeroTargetMenu, TurnConfirmButton, BattleSelectMenu} from './Menu';
import {Manager, HeroManager, MonsterManager, LogManager, EnvironmentManager, MenuEnvironmentManager} from './Manager';
import {Battle} from './Battle';
import {BattleEndScreen, ExperienceBar} from './BattleEndScreen';
import {MainMenuScreen} from './MainMenuScreen';

//Game class constructor, this is the main object that holds and manages the game
function Game() {
  this.userHeroList = [];
  this.userItemList = [];
  this.inventory = null;
  this.gameTime = 0;
  this.elapsedTime = 0;
  this.state = "none";
  this.targetState = "none";
  this.battle = null;
  this.battleEndScreen = null;
  this.mainMenuScreen = null;
  this.fade = new Fade();
}
//This method is responsible for requesting the user's Heros from the server, atm it just provides default heros
Game.prototype.loadUserData = function() {
  //placeholder code for retrieveing player characters
  this.userHeroList.push(new Fighter("robbie"));
  let knight = new Knight("sammy");
  this.userHeroList.push(knight);

  this.inventory = new Inventory();
  this.inventory.load();
  this.userItemList = this.inventory.itemList;
}
//This method is responsible for creating an instance of a Battle
Game.prototype.startBattle = function (battleID) {
  this.targetState = "battle";
  this.battle = new Battle(battleID);
  let partyHeros = [];
  let battleItems = [];
  for(let i = 0;i < this.userHeroList.length;i++) {
    if(this.userHeroList[i].isInParty) {
      this.userHeroList[i].setPartyPosition(i);
      this.userHeroList[i].loadBattleSprite();
      partyHeros.push(this.userHeroList[i]);
    }
  }
  for(let i = 0 ; i < this.userItemList.length; i++) {
    if(this.userItemList[i].isBattleItem && this.userItemList[i].quantity != 0) {
      battleItems.push(this.userItemList[i]);
    }
  }
  this.battle.loadBattle(partyHeros, battleItems);
}
Game.prototype.endBattle = function(battle) {
  if(this.targetState != "battleEndScreen") {
    this.battleEndScreen = new BattleEndScreen(battle);
    this.targetState = "battleEndScreen";
    this.fade.startFade();
  }
}
//This is the game's main Update function it is responsible for determining gameTime and elapsedTime before calling the update functions of the appropriate managers
Game.prototype.update = function() {
  let currentDate = new Date();
  let currentTime = currentDate.getTime();
  this.elapsedTime = currentTime - this.gameTime;
  this.gameTime = currentTime;

  if(this.fade.fadeState == "none") {
    if(this.state=="battle") {
      this.battle.update(this.gameTime, this.elapsedTime);
      if(this.battle.battleSurManager.battleState == "victory" || this.battle.battleSurManager.battleState == "defeat") {
        this.endBattle(this.battle);
      }
    }
    else if(this.state == "battleEndScreen") {
      this.battleEndScreen.update(this.gameTime, this.elapsedTime);
      if(this.battleEndScreen.surManager.menuManager.isScreenOver) {
        if(this.battleEndScreen.surManager.menuManager.newID != 100) {
          this.userHeroList = this.battleEndScreen.surManager.heroManager.assetList;
          this.startBattle(this.battleEndScreen.surManager.menuManager.newID)
          this.fade.startFade();
        }
        else{
          this.openMainMenu();
        }

      }
    }
    else if(this.state == "mainMenuScreen") {
      this.mainMenuScreen.update(this.gameTime, this.elapsedTime);
    }
  }
  else {
    this.fade.update(this.gameTime, this.elapsedTime);
    if(this.fade.fadeState == "faded") {
      this.state = this.targetState;
    }
    else if(this.fade.hasFadeEnded) {
      this.fade.hasFadeEnded = false
    }
  }

}
Game.prototype.openMainMenu = function() {
  this.mainMenuScreen = new MainMenuScreen(this.battleEndScreen);
  this.targetState = "mainMenuScreen";
  this.fade.startFade();
}

//This is the game's main draw function
Game.prototype.draw = function(ctx) {
  switch(this.state) {
    case "battle":
      this.battle.draw(ctx);
      break;
      case "battleEndScreen":
      this.battleEndScreen.draw(ctx);
      break;
      case "mainMenuScreen":
      this.mainMenuScreen.draw(ctx);
      break;
  }
  this.fade.draw(ctx);
}

function Fade() {
  this.alpha = 0;
  this.stateStartTime = null;
  this.fadeState = "none"
  this.fadeTime = 500;
  this.hasFadeEnded = false;
}
Fade.prototype.update = function(gameTime, elapsedTime) {
  switch(this.fadeState) {
    case "none":
    break;
    case "startingFade":
    this.fadeState = "fadingOut";
    this.stateStartTime = gameTime;
    break;
    case "fadingOut":
    if(gameTime > this.stateStartTime + this.fadeTime) {
      this.stateStartTime = gameTime;
      this.fadeState = "faded";
      this.alpha = 1;
    }
          this.alpha = ((gameTime-this.stateStartTime)/this.fadeTime);
    break;
    case "faded":
    if(gameTime > this.stateStartTime + this.fadeTime) {
      this.stateStartTime = gameTime;
      this.fadeState = "fadingIn";
    }
    this.alpha = 1;
    break;
    case "fadingIn" :
    if(gameTime > this.stateStartTime + this.fadeTime) {
      this.stateStartTime = null;
      this.fadeState = "none";
      this.hasFadeEnded = true;
    }
    this.alpha = 1 - ((gameTime-this.stateStartTime)/this.fadeTime);
    break;
    default:
    console.log("error in fade update method, invalid fadeState");
    break;
  }
}
Fade.prototype.draw = function(ctx) {
  if(this.fadeState != "none") {
    ctx.fillStyle = "rgba(0, 0, 0," + this.alpha + ")";
    ctx.fillRect(0, 0, 640, 480);
  }
}
Fade.prototype.startFade = function() {
  this.fadeState = "startingFade";
}

function Inventory() {
  this.itemList = [];
}
Inventory.prototype.load = function(){
  this.itemList = [];
  let minorHealthPotion = new MinorHealthPotion();
  minorHealthPotion.quantity = 1;
  this.itemList.push(minorHealthPotion);
  let antidote = new Antidote();
  antidote.quantity = 1;
  this.itemList.push(antidote);
}

//This class is responsible for managing the game while in the manorExploration phase
function ManorExplore() {
  this.heroList = [];
}



//This is the surManager's constructor function, the surManager holds and manages all the other managers
function SurManager() {
  this.heroManager = null;
  this.monsterManager = null;
  this.logManager = null;
  this.environmentManager = null;
  //this.menuManager = null;
  this.lastMouseX = 0;
  this.lastMouseY = 0;
  this.mousex = 0;
  this.mousey = 0;
}
SurManager.prototype.enableHandPointer = function() {
  $("#gameArea").addClass("handPointer");
}
SurManager.prototype.disableHandPointer = function() {
  $("#gameArea").removeClass("handPointer");
}
SurManager.prototype.setMouseDetails = function(x, y) {
  this.lastMouseY = this.mousey;
  this.lastMouseX = this.mousex;
  this.mousex = x;
  this.mousey = y;
}
//This is surManager's main load function
SurManager.prototype.load = function() {

}
//This is surManager's main update function, responsible for calling all the managers individual update functions
SurManager.prototype.update = function(gameTime, elapsedTime){
  if(this.heroManager != null) {
    this.heroManager.update(gameTime, elapsedTime);
  }
  if(this.monsterManager != null) {
    this.monsterManager.update(gameTime, elapsedTime);
  }
  if(this.logManager != null) {
    this.logManager.update(gameTime, elapsedTime);
  }
  this.environmentManager.update(gameTime, elapsedTime);
  if(this.menuManager != null) {
    this.menuManager.update(gameTime, elapsedTime);

  }

}
//This is surManager's main draw function
SurManager.prototype.draw = function(ctx) {
  this.environmentManager.draw(ctx);
  if(this.heroManager != null) {
    this.heroManager.draw(ctx);
  }
  if(this.monsterManager != null) {
    this.monsterManager.draw(ctx);
  }
  if(this.logManager != null) {
    this.logManager.draw(ctx);
  }
  if(this.menuManager != null) {
    this.menuManager.draw(ctx);
  }

}

$(document).ready(function() {
  var game = new Game();
  game.loadUserData();
  game.state = "battle";
  game.startBattle(-1);
  var canvas = document.getElementById('gameArea');
  canvas.addEventListener("mousemove", function(event) {
    var rect = canvas.getBoundingClientRect();
    let mousex = event.clientX - rect.left;
    let mousey = event.clientY - rect.top;
    game.battle.battleSurManager.setMouseDetails(mousex, mousey);
    if(game.battleEndScreen != null) {
      game.battleEndScreen.surManager.setMouseDetails(mousex, mousey);
    }
    if(game.mainMenuScreen != null) {
      game.mainMenuScreen.surManager.setMouseDetails(mousex, mousey);
    }
  });
  canvas.addEventListener("click", function(event) {
    switch(game.state) {
      case "battle":
      game.battle.battleSurManager.menuManager.handleClick();
      break;
      case "battleEndScreen":
      game.battleEndScreen.surManager.menuManager.handleClick();
      break;
      case "mainMenuScreen":
        game.mainMenuScreen.surManager.menuManager.handleClick();
      break;
      default:
      console.log("error in handleclick, invalid game.state");
      break;
    }
  });

  var intervalFunction = setInterval(function() {
    game.update();

    if (canvas.getContext) {
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      game.draw(ctx);
    }
  }, 16.67);

});


export {SurManager}
