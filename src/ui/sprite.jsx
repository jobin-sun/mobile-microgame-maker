define(function(require) {
  var React = require('react');
  var GameData = require('../game-data');
  var CssSprite = require('jsx!./css-sprite');
  var PositionModal = require('jsx!./modals/position-modal');
  var RectModal = require('jsx!./modals/rect-modal');
  var SpritesheetModal = require('jsx!./modals/spritesheet-modal');

  var Sprite = React.createClass({
    handleChangeAnimation: function(e) {
      this.props.onChange(this.props.sprite.id, {
        animation: {$set: e.target.value}
      });
    },
    handleSpritesheet: function() {
      this.props.modalManager.show(SpritesheetModal, {
        gameData: this.props.gameData,
        onSave: function(spritesheet, animation) {
          this.props.onChange(this.props.sprite.id, {
            key: {$set: spritesheet.key},
            animation: {$set: animation}
          });
        }.bind(this)
      });
    },
    handlePosition: function() {
      if (this.props.sprite.spawnArea) {
        this.props.modalManager.show(RectModal, {
          gameData: GameData.minimize(
            GameData.withoutSprite(this.props.gameData,
                                   this.props.sprite)
          ),
          initialRect: this.props.sprite.spawnArea,
          title: 'Set Starting Area',
          instructions: 'Draw a rectangle. When your game begins, the ' +
            'sprite will spawn at a random place within it.',
          onSave: function(rect) {
            this.props.onChange(this.props.sprite.id, {
              spawnArea: {$set: rect}
            });
          }.bind(this)
        });
      } else {
        this.props.modalManager.show(PositionModal, {
          initialGameData: this.props.gameData,
          initialSprite: this.props.sprite,
          onSave: function(sprite) {
            this.props.onChange(this.props.sprite.id, {
              $set: sprite
            });
          }.bind(this)
        });
      }
    },
    handleChangeName: function() {
      var name = window.prompt("Enter a new name for this sprite.",
                               this.props.sprite.name);
      if (name === null) return;
      if (!GameData.validateSymbol(name))
        return window.alert("The name must start with a letter and " +
                            "contain only alphanumeric characters and " +
                            "underscores.");
      this.props.onChange(this.props.sprite.id, {
        name: {$set: name}
      });
    },
    handleChangePositionType: function(e) {
      if (e.target.value == "random") {
        this.props.onChange(this.props.sprite.id, {
          spawnArea: {$set: {
            top: 0,
            left: 0,
            width: this.props.gameData.width,
            height: this.props.gameData.height,
          }}
        });
      } else {
        this.props.onChange(this.props.sprite.id, {
          spawnArea: {$set: undefined}
        });
      }
    },
    handleChangeDraggable: function(e) {
      this.props.onChange(this.props.sprite.id, {
        draggable: {$set: e.target.checked}
      });
    },
    render: function() {
      var sprite = this.props.sprite;
      var animations = this.props.gameData.animations[sprite.key] || [];
      var classes = React.addons.classSet({
        'list-group-item': true,
        'highlighted': this.props.highlighted
      });

      return (
        <li className={classes}>
          <div>
            <div style={{display: 'inline-block', width: 38, height: 32, verticalAlign: 'bottom'}}>
              <CssSprite sprite={sprite} gameData={this.props.gameData} maxDimension={32} />
            </div>
            <code onClick={this.handleChangeName} style={{cursor: 'pointer'}}>{sprite.name}</code>
          </div>
          <div>
            <br/>
            {animations.length > 1
             ? <div className="form-group">
                 <label>Animation</label>
                 <select className="form-control" value={sprite.animation} onChange={this.handleChangeAnimation}>
                   {animations.map(function(info) {
                     return <option key={info.name} value={info.name}>{info.name}</option>
                   })}
                 </select>
               </div>
             : null}
            <div className="form-group">
              <label>Starting Position</label>
              <br/>
              <label className="radio-inline">
                <input type="radio" value="fixed" checked={!sprite.spawnArea} onChange={this.handleChangePositionType}/> Fixed
              </label>
              <label className="radio-inline">
                <input type="radio" value="random" checked={!!sprite.spawnArea} onChange={this.handleChangePositionType}/> Random
              </label>
            </div>
            <button className="btn btn-block btn-awsm btn-awsmblue" onClick={this.handlePosition}>
              Set Starting {sprite.spawnArea ? 'Area' : 'Position'}&hellip;
            </button>
            <div className="checkbox">
              <label>
                <input type="checkbox" checked={!!sprite.draggable} onChange={this.handleChangeDraggable}/> Draggable
              </label>
            </div>
            <br/>
            <button className="btn btn-xs btn-awsm btn-awsmblue" onClick={this.props.onRemove.bind(null, sprite.id)}>
              <span className="glyphicon glyphicon-trash"></span>
            </button>
            &nbsp;
            <button className="btn btn-xs btn-awsm btn-awsmblue" onClick={this.handleSpritesheet}>
              Change Spritesheet&hellip;
            </button>
          </div>
        </li>
      );
    }
  });

  return Sprite;
});
