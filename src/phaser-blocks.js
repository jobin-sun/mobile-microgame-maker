define(function(require) {
  var _ = require('underscore');
  var Blockly = require('blockly');
  var GameData = require('./game-data');
  var gameData = null;
  var soundsUsed = null;

  var EMPTY_LIST = [['--', '']];
  var SPRITE_NUMERIC_PROPS = [
    ['x', 'x'],
    ['y', 'y'],
    ['x scale', 'scale.x'],
    ['y scale', 'scale.y'],
    ['alpha', 'alpha'],
    ['angle', 'angle']
  ];

  function soundList() {
    if (!(gameData && gameData.sounds.length))
      return EMPTY_LIST;
    return gameData.sounds.map(function(sound) {
      return [sound.key, sound.key];
    });    
  }

  function playSound(key) {
    var sound, url;

    if (!(gameData && gameData.sounds.length)) return;
    sound = _.findWhere(gameData.sounds, {key: key});
    if (!sound) return;
    url = GameData.resolveURL(gameData, sound.url);

    // If an exception is raised by playing the sound, we don't
    // want it to crash the app, so wrap it in a setTimeout().
    setTimeout(function() {
      var audio = document.createElement('audio');
      audio.setAttribute('src', url);
      audio.play();
    }, 0);
  }

  function generateJsBranch(block) {
    var branch = Blockly.JavaScript.statementToCode(block, 'STACK');
    if (Blockly.JavaScript.STATEMENT_PREFIX) {
      branch = Blockly.JavaScript.prefixLines(
          Blockly.JavaScript.STATEMENT_PREFIX.replace(/%1/g,
          '\'' + block.id + '\''), Blockly.JavaScript.INDENT) + branch;
    }
    if (Blockly.JavaScript.INFINITE_LOOP_TRAP) {
      branch = Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,
          '\'' + block.id + '\'') + branch;
    }

    return branch;
  }

  function animationList(spriteDropdown) {
    var spriteId = typeof(spriteDropdown) == 'string'
                   ? spriteDropdown : spriteDropdown.getValue();

    var sprite = spriteWithId(spriteId);
    if (sprite) {
      var animations = gameData.animations[sprite.key];
      if (animations && animations.length) {
        return animations.map(function(animation) {
          return [animation.name, animation.name];
        });
      }
    }
    return EMPTY_LIST;
  }

  function filteredSpriteList(filter) {
    return function() {
      if (!gameData) return EMPTY_LIST;
      return spriteList(gameData.sprites.filter(filter));
    };
  }

  function spriteList(list) {
    if (!gameData) return EMPTY_LIST;
    list = list || gameData.sprites;
    if (!list.length) return EMPTY_LIST;
    return list.map(function(sprite) {
      return [sprite.name, sprite.id];
    });
  }

  function spriteWithId(id) {
    return _.findWhere(gameData.sprites, {id: id});
  }

  function spriteName(block, fieldName) {
    fieldName = fieldName || 'SPRITE';
    var sprite = spriteWithId(block.getFieldValue(fieldName));
    return sprite && ('sprites.' + sprite.name);
  }

  Blockly.Phaser = {
    setGameData: function(newGameData) {
      gameData = newGameData;

      Blockly.mainWorkspace.clear();
      var xml = Blockly.Xml.textToDom(gameData.blocklyXml);
      Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
    },
    generateJs: function(newGameData) {
      Blockly.Phaser.setGameData(newGameData);
      var currentSoundsUsed = soundsUsed = [];

      var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
      xml = Blockly.Xml.domToText(xml);

      try {
        var blocklyLines = Blockly.JavaScript.workspaceToCode().split('\n');
      } finally {
        soundsUsed = null;
      }

      var lines = [
        'function start(state) {',
        '  var game = state.game;',
        '  var microgame = state.microgame;',
        '  var sprites = state.sprites;',
        '  var sounds = state.sounds;',
        '  ',
      ];

      lines.push.apply(lines, blocklyLines.map(function(line) {
        return '  ' + line;
      }));
      lines.push('}');

      return {
        start: lines.join('\n'),
        soundsUsed: currentSoundsUsed
      };
    }
  };

  Blockly.Blocks['phaser_add_event'] = {
    init: function() {
      this.appendDummyInput().appendField('after')
        .appendField(new Blockly.FieldTextInput(
          '1000',
          Blockly.FieldTextInput.numberValidator
        ), 'MS').appendField('ms');
      this.appendStatementInput('STACK');
    }
  };

  Blockly.JavaScript['phaser_add_event'] = function(block) {
    var branch = generateJsBranch(block);

    return 'game.time.events.add(time.ms(' + this.getFieldValue('MS') +
           '), function() {\n' + branch + '});\n';
  };

  Blockly.Blocks['phaser_repeat_event'] = {
    init: function() {
      this.appendDummyInput().appendField('every')
        .appendField(new Blockly.FieldTextInput(
          '1000',
          Blockly.FieldTextInput.numberValidator
        ), 'MS').appendField('ms');
      this.appendStatementInput('STACK');
    }
  };

  Blockly.JavaScript['phaser_repeat_event'] = function(block) {
    var branch = generateJsBranch(block);

    return 'game.time.events.loop(time.ms(' + this.getFieldValue('MS') +
           '), function() {\n' + branch + '});\n';
  };

  Blockly.Blocks['phaser_on_update'] = {
    init: function() {
      this.appendDummyInput().appendField('when game updates')
      this.appendStatementInput('STACK');
    }
  };

  Blockly.JavaScript['phaser_on_update'] = function(block) {
    var branch = generateJsBranch(block);

    return 'state.on("update", function() {\n' + branch + '});\n';
  };

  Blockly.Blocks['phaser_on_outoftime'] = {
    init: function() {
      this.appendDummyInput().appendField('when time limit expires')
      this.appendStatementInput('STACK');
    }
  };

  Blockly.JavaScript['phaser_on_outoftime'] = function(block) {
    var branch = generateJsBranch(block);

    return 'state.on("outoftime", function() {\n' + branch + '});\n';
  };

  Blockly.Blocks['phaser_on_tap'] = {
    init: function() {
      this.appendDummyInput().appendField('when')
        .appendField(new Blockly.FieldDropdown(spriteList), 'SPRITE');
      this.appendStatementInput('STACK').appendField('is tapped');
    }
  };

  Blockly.JavaScript['phaser_on_tap'] = function(block) {
    var sprite = spriteName(block);
    if (!sprite) return '';
    var branch = generateJsBranch(block);

    return sprite + '.inputEnabled = true;\n' +
           sprite + '.events.onInputDown.add(function() {\n' + branch + '});\n';
  };

  Blockly.Blocks['phaser_set_main_text'] = {
    init: function() {
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.interpolateMsg("set main text to %1",
                          ['TEXT', null, Blockly.ALIGN_RIGHT],
                          Blockly.ALIGN_RIGHT);
    }
  };

  Blockly.JavaScript['phaser_set_main_text'] = function(block) {
    var text = Blockly.JavaScript.valueToCode(block, 'TEXT',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';

    return 'microgame.mainText.setText(' + text + ');\n';
  };

  Blockly.Blocks['phaser_tween'] = {
    init: function() {
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.appendDummyInput().appendField('tween')
        .appendField(new Blockly.FieldDropdown(SPRITE_NUMERIC_PROPS),
               'PROPERTY');
      this.appendDummyInput().appendField('of')
        .appendField(new Blockly.FieldDropdown(spriteList), 'SPRITE');
      this.appendValueInput('NUMBER').setCheck('Number').appendField('to');
      this.appendValueInput('MS').setCheck('Number').appendField('over');
      this.appendDummyInput().appendField('ms');
      this.setInputsInline(true);
    }
  };

  Blockly.JavaScript['phaser_tween'] = function(block) {
    var sprite = spriteName(block);
    if (!sprite) return '';
    var property = block.getFieldValue('PROPERTY');
    var number = Blockly.JavaScript.valueToCode(block, 'NUMBER',
      Blockly.JavaScript.ORDER_ATOMIC) || '0';
    var ms = Blockly.JavaScript.valueToCode(block, 'MS',
      Blockly.JavaScript.ORDER_ATOMIC) || '0';
    var lastDotIndex = property.lastIndexOf('.');

    if (lastDotIndex != -1) {
      sprite += '.' + property.slice(0, lastDotIndex);
      property = property.slice(lastDotIndex + 1);
    }

    return 'game.add.tween(' + sprite + ').to({' +
      property + ': ' + number +
      '}, time.ms(' + ms + ')).start();\n';
  };

  Blockly.Blocks['phaser_play_sound'] = {
    init: function() {
      var field = new Blockly.FieldDropdown(soundList, playSound);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.appendDummyInput().appendField('play')
        .appendField(field, 'SOUND');
    }
  };

  Blockly.JavaScript['phaser_play_sound'] = function(block) {
    if (soundsUsed)
      soundsUsed.push(block.getFieldValue('SOUND'));
    return 'sounds.' + block.getFieldValue('SOUND') + '.play();\n';
  };

  Blockly.Blocks['phaser_win'] = {
    init: function() {
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.appendDummyInput().appendField('win');
    }
  };

  Blockly.JavaScript['phaser_win'] = function(block) {
    return 'microgame.win();\n';
  };

  Blockly.Blocks['phaser_lose'] = {
    init: function() {
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.appendDummyInput().appendField('lose');
    }
  };

  Blockly.JavaScript['phaser_lose'] = function(block) {
    return 'microgame.lose();\n';
  };

  Blockly.Blocks['phaser_set_sprite_numeric_prop'] = {
    init: function() {
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.appendDummyInput().appendField('set')
        .appendField(new Blockly.FieldDropdown(SPRITE_NUMERIC_PROPS),
                     'PROPERTY');
      this.appendDummyInput().appendField('of')
        .appendField(new Blockly.FieldDropdown(spriteList), 'SPRITE');
      this.appendValueInput('NUMBER').setCheck('Number').appendField('to');
      this.setInputsInline(true);
    }
  };

  Blockly.JavaScript['phaser_set_sprite_numeric_prop'] = function(block) {
    var sprite = spriteName(block);
    if (!sprite) return '';
    var number = Blockly.JavaScript.valueToCode(block, 'NUMBER',
      Blockly.JavaScript.ORDER_ATOMIC) || '0';

    return sprite + '.' + block.getFieldValue('PROPERTY') +
      ' = ' + number + ';\n';
  };

  Blockly.Blocks['phaser_get_sprite_numeric_prop'] = {
    init: function() {
      this.appendDummyInput().appendField('get')
        .appendField(new Blockly.FieldDropdown(SPRITE_NUMERIC_PROPS),
                     'PROPERTY');
      this.appendDummyInput().appendField('of')
        .appendField(new Blockly.FieldDropdown(spriteList), 'SPRITE');
      this.setOutput(true, 'Number');
      this.setInputsInline(true);
    }
  };

  Blockly.JavaScript['phaser_get_sprite_numeric_prop'] = function(block) {
    var sprite = spriteName(block);
    if (!sprite) return ['0', Blockly.JavaScript.ORDER_ATOMIC];

    return [sprite + '.' + block.getFieldValue('PROPERTY'),
            Blockly.JavaScript.ORDER_ATOMIC];
  };

  Blockly.Blocks['phaser_sprites_overlap_with_tolerance'] = {
    init: function() {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(spriteList), 'SPRITE1');
      this.appendDummyInput().appendField('overlaps')
        .appendField(new Blockly.FieldDropdown(spriteList), 'SPRITE2');
      this.appendDummyInput().appendField('with tolerance')
        .appendField(new Blockly.FieldTextInput(
          '0',
          Blockly.FieldTextInput.numberValidator
        ), 'TOLERANCE');
      this.setOutput(true, 'Boolean');
      this.setInputsInline(true);
    }
  };

  Blockly.JavaScript['phaser_sprites_overlap_with_tolerance'] = function(block) {
    var sprite1 = spriteName(block, 'SPRITE1');
    var sprite2 = spriteName(block, 'SPRITE2');
    var tolerance = this.getFieldValue('TOLERANCE');
    var functionName = Blockly.JavaScript.provideFunction_(
      'spritesOverlap',
      ['function ' + Blockly.JavaScript.FUNCTION_NAME_PLACEHOLDER_ +
       '(a, b, tolerance) {',
       '  var bBounds = b.getBounds();',
       '  return a.getBounds().intersectsRaw(',
       '    bBounds.left, bBounds.right, bBounds.top, bBounds.bottom,',
       '    tolerance',
       '  );',
       '}']
    );
    if (!sprite1 || !sprite2)
      return ['false', Blockly.JavaScript.ORDER_ATOMIC];

    return ['spritesOverlap(' + sprite1 + ', ' + sprite2 + ', ' +
                            tolerance + ')',
            Blockly.JavaScript.ORDER_ATOMIC];
  };

  Blockly.Blocks['phaser_set_animation'] = {
    init: function() {
      var spritesWithMultipleAnims = filteredSpriteList(function(sprite) {
        var animations = gameData.animations[sprite.key];
        return animations.length > 1;
      });
      var spriteDropdown = new Blockly.FieldDropdown(spritesWithMultipleAnims, function(id) {
        var animations = animationList(id);
        var currAnimation = _.findWhere(animations, {
          1: animationDropdown.getValue()
        });
        if (!currAnimation)
          animationDropdown.setValue(animations[0][1]);
      });
      var animationDropdown = new Blockly.FieldDropdown(
        animationList.bind(null, spriteDropdown)
      );

      this.setPreviousStatement(true);
      this.setNextStatement(true);
  
      this.appendDummyInput().appendField('set animation of')
        .appendField(spriteDropdown, 'SPRITE');
      this.appendDummyInput().appendField('to')
        .appendField(animationDropdown, 'ANIMATION');
    }
  };

  Blockly.JavaScript['phaser_set_animation'] = function(block) {
    var sprite = spriteName(block);
    if (!sprite) return '';
    var animation = block.getFieldValue('ANIMATION');

    return sprite + '.animations.play("' + animation + '");\n';
  };

  Blockly.Blocks['phaser_set_bg'] = {
    init: function() {
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.appendValueInput('COLOUR').setCheck('Colour')
        .appendField('set background to');
    }
  };

  Blockly.JavaScript['phaser_set_bg'] = function(block) {
    var colour = Blockly.JavaScript.valueToCode(block, 'COLOUR',
      Blockly.JavaScript.ORDER_COMMA) || '\'#FFFFFF\'';

    return 'game.stage.backgroundColor = ' + colour + ';\n';
  };

  Blockly.Blocks['phaser_on_win_or_lose'] = {
    init: function() {
      this.appendDummyInput().appendField('when game is')
        .appendField(new Blockly.FieldDropdown([
          ['won', 'win'],
          ['lost', 'lose'],
          ['won or lost', 'ending']
        ]), 'EVENT');
      this.appendStatementInput('STACK');
    }
  };

  Blockly.JavaScript['phaser_on_win_or_lose'] = function(block) {
    var branch = generateJsBranch(block);

    return 'state.on("' + block.getFieldValue('EVENT') +
           '", function() {\n' + branch + '});\n';
  };

  return Blockly;
});
