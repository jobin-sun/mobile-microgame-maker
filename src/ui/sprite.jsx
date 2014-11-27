define(function(require) {
  var React = require('react');
  var GameData = require('../game-data');
  var CssSprite = require('jsx!./css-sprite');
  var PositionModal = require('jsx!./position-modal');
  var SpritesheetModal = require('jsx!./spritesheet-modal');

  var Sprite = React.createClass({
    handleChangeAnimation: function(e) {
      this.props.onChange(this.props.sprite.id, {
        animation: {$set: e.target.value}
      });
    },
    getInitialState: function() {
      return {isCollapsed: true};
    },
    handleToggleCollapse: function() {
      this.setState({isCollapsed: !this.state.isCollapsed});
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
      this.props.modalManager.show(PositionModal, {
        initialGameData: this.props.gameData,
        initialSprite: this.props.sprite,
        onSave: function(sprite) {
          this.props.onChange(this.props.sprite.id, {
            $set: sprite
          });
        }.bind(this)
      });
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
    render: function() {
      var sprite = this.props.sprite;
      var animations = this.props.gameData.animations[sprite.key] || [];
      return (
        <li className="list-group-item">
          <div>
            <div style={{display: 'inline-block', width: 38, height: 32, verticalAlign: 'bottom'}}>
              <CssSprite sprite={sprite} gameData={this.props.gameData} maxDimension={32} />
            </div>
            <code onClick={this.handleChangeName} style={{cursor: 'pointer'}}>{sprite.name}</code>
            <button className="btn btn-default" style={{float: 'right'}} onClick={this.handleToggleCollapse}>
              <span className={React.addons.classSet({
                'glyphicon': true,
                'glyphicon-chevron-down': this.state.isCollapsed,
                'glyphicon-chevron-up': !this.state.isCollapsed
              })}></span>
            </button>

          </div>
          {this.state.isCollapsed ? null :
          <div>
            <br/>
            <div className="form-group">
              <label>Animation</label>
              <select className="form-control" value={sprite.animation} onChange={this.handleChangeAnimation}>
                {animations.map(function(info) {
                  return <option key={info.name} value={info.name}>{info.name}</option>
                })}
              </select>
            </div>
            <button className="btn btn-block btn-default" onClick={this.handleSpritesheet}>
              Set Spritesheet&hellip;
            </button>
            <button className="btn btn-block btn-default" onClick={this.handlePosition}>
              Set Starting Position&hellip;
            </button>
            <br/>
            <button className="btn btn-xs btn-default" onClick={this.props.onRemove.bind(null, sprite.id)}>
              <span className="glyphicon glyphicon-trash"></span>
            </button>
          </div>}
        </li>
      );
    }
  });

  return Sprite;
});
