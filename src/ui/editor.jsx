define(function(require) {
  var React = require('react');
  var PhaserState = require('../phaser-state');
  var GameData = require('../game-data');
  var Player = require('jsx!./player');
  var SpriteList = require('jsx!./sprite-list');
  var ExportModal = require('jsx!./modals/export-modal');
  var ImportModal = require('jsx!./modals/import-modal');
  var PublishModal = require('jsx!./modals/publish-modal');
  var AboutModal = require('jsx!./modals/about-modal');
  var SpritesheetModal = require('jsx!./modals/spritesheet-modal');
  var devServerTools = require('../dev-server-tools');

  var Editor = React.createClass({
    makePhaserState: function(options) {
      var blockly = this.props.blockly;
      var gameData = this.state.gameData;

      var state = PhaserState.Generators.makeStateObject({
        autoplay: options.autoplay,
        gameData: gameData,
        difficulty: this.state.difficulty,
        blocklyInfo: blockly.Phaser.generateJs(gameData),
        onGameEnded: options.onGameEnded
      });

      return state;
    },
    getInitialState: function() {
      return {
        undo: [],
        redo: [],
        difficulty: 'Easy',
        gameData: GameData.maximize(this.props.initialGameData,
                                    this.props.assetLibrary)
      };
    },
    changeGameData: function(changes) {
      this.setState(React.addons.update(this.state, {
        undo: {$push: [this.state.gameData]},
        redo: {$set: []},
        gameData: changes
      }));    
    },
    handleAddSprite: function() {
      var gameData = this.state.gameData;

      this.props.modalManager.show(SpritesheetModal, {
        gameData: gameData,
        onSave: function(spritesheet, animation) {
          var sprite = GameData.makeSprite(gameData, spritesheet, animation);
          this.changeGameData({sprites: {$push: [sprite]}});
        }.bind(this)
      });
    },
    spriteIndex: function(id) {
      return GameData.spriteIndex(this.state.gameData, id);
    },
    handleChangeSprite: function(id, changes) {
      var index = this.spriteIndex(id);
      var sprites = {};
      sprites[index] = changes;
      this.changeGameData({sprites: sprites});
    },
    handleRemoveSprite: function(id) {
      this.changeGameData({
        sprites: {
          $splice: [[this.spriteIndex(id), 1]]
        }
      });
    },
    handleUndo: function(e) {
      e.preventDefault();
      if (!this.state.undo.length) return;
      this.setState(React.addons.update(this.state, {
        undo: {$splice: [[-1, 1]]},
        redo: {$push: [this.state.gameData]},
        gameData: {$set: this.state.undo[this.state.undo.length - 1]}
      }));
    },
    handleRedo: function(e) {
      e.preventDefault();
      if (!this.state.redo.length) return;
      this.setState(React.addons.update(this.state, {
        undo: {$push: [this.state.gameData]},
        redo: {$splice: [[-1, 1]]},
        gameData: {$set: this.state.redo[this.state.redo.length - 1]}
      }));
    },
    refreshBlocklyXml: function() {
      var blockly = this.props.blockly;
      var xml = blockly.Xml.workspaceToDom(blockly.mainWorkspace);

      xml = blockly.Xml.domToText(xml);
      if (xml == this.state.gameData.blocklyXml) return;
      this.changeGameData({
        blocklyXml: {$set: xml}
      });
    },
    handleOpenBlockly: function() {
      this.props.onOpenBlockly();
      this.props.blockly.Phaser.setGameData(this.state.gameData);
    },
    handleExport: function(e) {
      e.preventDefault();
      this.props.modalManager.show(ExportModal, {
        gameData: this.state.gameData
      });
    },
    handleImport: function(e) {
      e.preventDefault();
      this.props.modalManager.show(ImportModal, {
        onSave: this.importGameData
      });
    },
    handlePublish: function(e) {
      e.preventDefault();
      this.props.modalManager.show(PublishModal, {
        gameData: this.state.gameData
      });
    },
    handleAbout: function(e) {
      e.preventDefault();
      this.props.modalManager.show(AboutModal, {
        onReset: this.props.onReset
      });
    },
    importGameData: function(gameData) {
      this.changeGameData({
        $set: GameData.maximize(gameData, this.props.assetLibrary)
      });
    },
    handleDisplayObjectClick: function(item, phaserState) {
      var sprite = PhaserState.getSprite(this.state.gameData, item, phaserState);
      if (!sprite) return;
      this.refs.spriteList.highlightSprite(sprite.id);
    },
    handleBeforeScaleResize: function() {
      var style = "";
      var playerHolderSizer = this.refs.playerHolderSizer.getDOMNode();
      var playerHolder = this.refs.playerHolder.getDOMNode();
      var rect;

      if ($(playerHolderSizer).is(':visible')) {
        // We're on something wider than a mobile device, so fix the player
        // in place.
        rect = playerHolderSizer.getBoundingClientRect();
        style = "position: fixed; left: " + rect.left + "px; " +
                "width: " + rect.width + "px";
      }
      playerHolder.setAttribute("style", style);
    },
    handleRegenerateAllExamples: function(e) {
      e.preventDefault();
      devServerTools.regenerateAllExamples();
    },
    handleExportToFilesystem: function(e) {
      e.preventDefault();
      devServerTools.exportToFilesystem(this.state.gameData, function(name) {
        if (name != this.state.gameData.name)
          this.changeGameData({
            name: {$set: name}
          });
      }.bind(this));
    },
    handleImportFromFilesystem: function(e) {
      e.preventDefault();
      devServerTools.importFromFilesystem(this.state.gameData.name,
                                          this.importGameData);
    },
    handleChangeDifficulty: function(difficulty) {
      this.setState({difficulty: difficulty});
    },
    adjustScale: function(newScale) {
      if (this.refs.playerHolder.getDOMNode().style.position != 'fixed')
        return newScale;

      // We're on something wider than a mobile device, so the player is
      // fixed in place and can't be scrolled. Make sure it's fully
      // visible, and that we have some breathing room below it for some
      // buttons.
      var MIN_EXTRA_VERTICAL_PX = 200;
      var MIN_HEIGHT = 120;
      var maxHeight = Math.max(window.innerHeight - MIN_EXTRA_VERTICAL_PX,
                               MIN_HEIGHT);
      var idealHeight = this.state.gameData.height;
      if (idealHeight * newScale > maxHeight)
        newScale = maxHeight / idealHeight;
      return newScale;
    },
    componentDidUpdate: function(prevProps, prevState) {
      if (prevState.gameData !== this.state.gameData)
        this.props.onGameDataChange(this.state.gameData);
    },
    render: function() {
      var usingDevServer = window.USING_DEV_SERVER;

      return (
        <div>
          <div className="row">
            <div className="col-sm-8 col-sm-push-4">
              <div ref="playerHolderSizer" className="hidden-xs"></div>
              <div ref="playerHolder">
                <Player gameData={this.state.gameData} difficulty={this.state.difficulty} makePhaserState={this.makePhaserState} onBeforeScaleResize={this.handleBeforeScaleResize} adjustScale={this.adjustScale} onDisplayObjectClick={this.handleDisplayObjectClick} onChangeDifficulty={this.handleChangeDifficulty}/>
                <br/>
                <div className="btn-group btn-group-justified">
                  <div className="btn-group">
                    <button type="button" className="btn btn-awsm" onClick={this.handleAddSprite}>
                      <span className="glyphicon glyphicon-plus"></span> <span className="hidden-teensy">Sprite</span>
                    </button>
                  </div>
                  <div className="btn-group">
                    <button type="button" className="btn btn-awsm btn-block" onClick={this.handleOpenBlockly}>
                      <span className="glyphicon glyphicon-wrench"></span> <span className="hidden-teensy">Code</span>
                    </button>
                  </div>
                  <div className="btn-group">
                    <button type="button" className="btn btn-awsm" onClick={this.handlePublish}>
                      <span className="glyphicon glyphicon-cloud-upload"></span> <span className="hidden-teensy">Publish</span>
                    </button>
                  </div>
                  <div className="btn-group hidden-xs hidden-sm">
                    <button type="button" className="btn btn-awsm" disabled={!this.state.undo.length} onClick={this.handleUndo}>
                      Undo
                    </button>
                  </div>
                  <div className="btn-group hidden-xs hidden-sm">
                    <button type="button" className="btn btn-awsm" disabled={!this.state.redo.length} onClick={this.handleRedo}>
                      Redo
                    </button>
                  </div>
                  <div className="btn-group dropup">
                    <button type="button" className="btn btn-awsm dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                      <span className="glyphicon glyphicon-flash"></span> <span className="hidden-teensy">Moar</span>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-right" role="menu">
                      <li><a href="#" onClick={this.handleAbout}><span className="glyphicon glyphicon-info-sign"></span> About this App</a></li>
                      <li><a href="#" onClick={this.handleExport}><span className="glyphicon glyphicon-export"></span> Export to HTML</a></li>
                      <li><a href="#" onClick={this.handleImport}><span className="glyphicon glyphicon-import"></span> Import from HTML</a></li>
                      <li className={"hidden-md hidden-lg " + (this.state.undo.length ? "" : "disabled")}><a href="#" onClick={this.handleUndo}>Undo</a></li>
                      <li className={"hidden-md hidden-lg " + (this.state.redo.length ? "" : "disabled")}><a href="#" onClick={this.handleRedo}>Redo</a></li>
                      {usingDevServer
                       ? <li><a href="#" onClick={this.handleExportToFilesystem}>Export to filesystem</a></li>
                       : null}
                      {usingDevServer
                       ? <li><a href="#" onClick={this.handleImportFromFilesystem}>Import from filesystem</a></li>
                       : null}
                      {usingDevServer
                       ? <li><a href="#" onClick={this.handleRegenerateAllExamples}>Regenerate all examples</a></li>
                       : null}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="visible-xs"><br/></div>
            </div>
            <div className="col-sm-4 col-sm-pull-8">
              <SpriteList ref="spriteList"
               gameData={this.state.gameData}
               onRemove={this.handleRemoveSprite}
               onChange={this.handleChangeSprite}
               modalManager={this.props.modalManager}/>
            </div>
          </div>
        </div>
      );
    }
  });

  return Editor;
});
