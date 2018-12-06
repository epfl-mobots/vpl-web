/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
	@param {A3a.vpl.mode=} mode
*/
A3a.vpl.Program = function (mode) {
	/** @type {A3a.vpl.mode} */
	this.mode = mode || A3a.vpl.mode.basic;
	this.noVPL = false;	// true for source code editor without vpl counterpart
	this.teacherRole = true;
	this.experimentalFeatures = false;
	/** @type {Array.<A3a.vpl.EventHandler>} */
	this.program = [];
	this.uploaded = false;
	/** @type {?function():void} */
	this.onUpdate = null;

	/** @type {?function():?string} */
	this.getEditedSourceCodeFun = null;
	/** @type {?function(?string):void} */
	this.setEditedSourceCodeFun = null;

	this.undoState = new A3a.vpl.Undo();
	/** @type {Object<string,string>} */
	this.code = {};
	this.currentLanguage = A3a.vpl.defaultLanguage;

	this.customizationMode = false;
	/** @type {Array.<string>} */
	this.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
	/** @type {Array.<string>} */
	this.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
	/** @type {Array.<string>} */
	this.disabledUI = [];
};

/** @type {Object<string,A3a.vpl.CodeGenerator>} */
A3a.vpl.Program.codeGenerator = {};

/** @type {Array.<string>} */
A3a.vpl.Program.basicBlocks = [];

/** @type {Array.<string>} */
A3a.vpl.Program.advancedBlocks = [];

/** Reset basic and advanced blocks
	@return {void}
*/
A3a.vpl.Program.resetBlockLib = function () {
	A3a.vpl.Program.basicBlocks = A3a.vpl.BlockTemplate
		.getBlocksByMode(A3a.vpl.mode.basic)
		.map(function (b) { return b.name; });
	A3a.vpl.Program.advancedBlocks = A3a.vpl.BlockTemplate
		.getBlocksByMode(A3a.vpl.mode.advanced)
		.map(function (b) { return b.name; });
};

/** Clear program
	@return {void}
*/
A3a.vpl.Program.prototype.new = function () {
	this.mode = A3a.vpl.mode.basic;
	this.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
	this.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
	this.disabledUI = [];
	this.program = [];
	this.undoState.reset();
	this.code = {};
};

/** Check if empty (no non-empty event handler)
	@return {boolean}
*/
A3a.vpl.Program.prototype.isEmpty = function () {
	for (var i = 0; i < this.program.length; i++) {
		if (!this.program[i].isEmpty()) {
			return false;
		}
	}
	return true;
};

/** Check if should display a single event (not advanced mode, up to
	one event per event handler, no state block)
	@return {boolean}
*/
A3a.vpl.Program.prototype.displaySingleEvent = function () {
	if (this.mode !== A3a.vpl.mode.basic) {
		return false;
	}
	for (var i = 0; i < this.program.length; i++) {
		if (this.program[i].events.length > 1 ||
			(this.program[i].events.length > 0 &&
				this.program[i].events[0].blockTemplate.type === A3a.vpl.blockType.state)) {
			return false;
		}
	}
	return true;
};

/** Make code invalid so that it's generated again when needed
	@return {void}
*/
A3a.vpl.Program.prototype.invalidateCode = function () {
	this.code = {};
};

/** Save current state before modifying it
	@return {void}
*/
A3a.vpl.Program.prototype.saveStateBeforeChange = function () {
	this.undoState.saveStateBeforeChange(this.exportToObject(), this.uploaded);
	this.code = {};
	this.uploaded = false;
};

/** Undo last change, saving current state and retrieving previous one
	@param {function():void=} updateFun called at the end and for further
	asynchrounous loading if necessary
	@return {void}
*/
A3a.vpl.Program.prototype.undo = function (updateFun) {
	if (this.undoState.canUndo()) {
		var markedState = this.undoState.undo(this.exportToObject(), this.uploaded);
		this.importFromObject(/** @type {Object} */(markedState.state), updateFun);
		this.uploaded = markedState.mark;
		this.code = {};
	}
};

/** Redo last undone change, saving current state and retrieving next one
	@param {function():void=} updateFun called at the end and for further
	asynchrounous loading if necessary
	@return {void}
*/
A3a.vpl.Program.prototype.redo = function (updateFun) {
	if (this.undoState.canRedo()) {
		var markedState = this.undoState.redo(this.exportToObject(), this.uploaded);
		this.importFromObject(/** @type {Object} */(markedState.state), updateFun);
		this.uploaded = markedState.mark;
		this.code = {};
	}
};

/** Change mode
	@param {A3a.vpl.mode} mode
	@return {void}
*/
A3a.vpl.Program.prototype.setMode = function (mode) {
	if (mode !== this.mode) {
		this.saveStateBeforeChange();
		this.mode = mode;

		// convert blocks
		this.program.forEach(function (eventHandler) {
			/** Convert block
				@param {A3a.vpl.Block} block
				@param {boolean=} isState
				@return {A3a.vpl.Block}
			*/

			function convertBlock(block, isState) {
/*
				if (block === null) {
					if (isState && eventHandler.event && mode === A3a.vpl.mode.advanced) {
						// new state block
						block = new A3a.vpl.Block(A3a.vpl.BlockTemplate.stateBlock,
							eventHandler, null);
						block.onPrepareChange = eventHandler.event.onPrepareChange;
						return block;
					}
					return null;
				}
				if (block.blockTemplate.changeMode) {
					var newBlock = block.blockTemplate.changeMode(block, mode);
					if (newBlock !== null) {
						newBlock.eventHandlerContainer = block.eventHandlerContainer;
						newBlock.positionInContainer = block.positionInContainer;
					}
					return newBlock;
				}
*/
				return block;
			}

			eventHandler.events.forEach(function (event, i) {
				eventHandler.events[i] = convertBlock(event);
			});
			eventHandler.actions.forEach(function (action, i) {
				eventHandler.actions[i] = convertBlock(action);
			});
		});
	}
};

/** Change role
	@param {boolean} b
	@return {void}
*/
A3a.vpl.Program.prototype.setTeacherRole = function (b) {
	this.teacherRole = b;
};

/** Append an empty event handler
	@param {boolean=} withState
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandler = function (withState) {
	this.program.push(new A3a.vpl.EventHandler());
};

/** If there is no trailing event handler, add one; if there are more than one,
	remove superfluous ones to kee just one
	@return {void}
*/
A3a.vpl.Program.prototype.enforceSingleTrailingEmptyEventHandler = function () {
	if (this.program.length === 0 || !this.program[this.program.length - 1].isEmpty()) {
		this.addEventHandler();
	} else {
		while (this.program.length > 1 && this.program[this.program.length - 2].isEmpty()) {
			this.program.splice(-2, 1);
		}
	}
};

/** Export program to a plain object which can be serialized
	@return {Object}
*/
A3a.vpl.Program.prototype.exportToObject = function () {
	var src = this.getEditedSourceCodeFun ? this.getEditedSourceCodeFun() : null;

	/** @type {?Array.<Array.<Object>>} */
	var p = null;

	if (src == null) {
		p = this.program.map(function (eventHandler) {
			/** @type {Array.<Object>} */
			var b = [];
			function addBlock(block) {
				if (block) {
					b.push({
						"name": block.blockTemplate.name,
						"disabled": block.disabled,
						"locked": block.locked,
						"param":
							block.blockTemplate.exportParam
								? block.blockTemplate.exportParam(block)
								: block.param ? block.param.slice() : null
					});
				}
			}
			eventHandler.events.forEach(function (event) {
				addBlock(event);
			});
			eventHandler.actions.forEach(function (action) {
				addBlock(action);
			});
			return {
				"blocks": b,
				"disabled": eventHandler.disabled,
				"locked": eventHandler.locked
			};
		});
	}

	return {
		"advanced": this.mode === A3a.vpl.mode.advanced,
		"basicBlocks": this.enabledBlocksBasic,
		"advancedBlocks": this.enabledBlocksAdvanced,
		"program": p,
		"code": src
	};
};

/** Export program to JSON
	@return {string}
*/
A3a.vpl.Program.prototype.exportToJSON = function () {
	return JSON.stringify(this.exportToObject());
};

/** Import program from an object, as created by exportToObject
	@param {Object} obj
	@param {function(string):void=} updateFun called at the end and for further
	asynchronous loading if necessary; arg is "vpl" or "src"
	@return {void}
*/
A3a.vpl.Program.prototype.importFromObject = function (obj, updateFun) {
	var self = this;
	var importFinished = false;
	var view = "vpl";
	try {
		if (obj) {
			this.mode = obj["advanced"]
				? A3a.vpl.mode.advanced
				: A3a.vpl.mode.basic;
			this.enabledBlocksBasic = obj["basicBlocks"] || A3a.vpl.Program.basicBlocks;
			this.enabledBlocksAdvanced = obj["advancedBlocks"] || A3a.vpl.Program.advancedBlocks;
			if (obj["program"]) {
				this.program = obj["program"].map(function (eventHandler) {
					var eh = new A3a.vpl.EventHandler();
					eventHandler["blocks"].forEach(function (block) {
						var bt = A3a.vpl.BlockTemplate.findByName(block["name"]);
						if (bt) {
							var b = new A3a.vpl.Block(bt, null, null);
							b.disabled = block["disabled"] || false;
							b.locked = block["locked"] || false;
							if (bt.importParam) {
								bt.importParam(b, block["param"],
									function () {
										if (importFinished && updateFun) {
											updateFun("vpl");
										}
									});
							} else {
								b.param = block["param"];
							}
							eh.setBlock(b, null,
								function () {
									self.saveStateBeforeChange();
								},
								true);
						}
					}, this);
					eh.disabled = eventHandler["disabled"] || false;
					eh.locked = eventHandler["locked"] || false;
					return eh;
				}, this);
			} else {
				this.program = [];
			}
			if (this.setEditedSourceCodeFun) {
				var code = obj["code"];
				this.setEditedSourceCodeFun(obj["code"] == undefined ? null : code);
				if (code != null) {
					view = "src";
				}
			}
		}
	} catch (e) {}
	updateFun && updateFun(view);
	importFinished = true;
};

/** Import program from its JSON representation, as created by exportToJSON
	@param {string} json
	@param {function():void=} updateFun called at the end and for further
	asynchrounous loading if necessary
	@return {void}
*/
A3a.vpl.Program.prototype.importFromJSON = function (json, updateFun) {
	try {
		var obj = JSON.parse(json);
		this.importFromObject(/** @type {Object} */(obj), updateFun);
		this.undoState.reset();
	} catch (e) {}
};


/** Get code for the whole program, generating it if it's stale
	@param {string} language
	@return {string}
*/
A3a.vpl.Program.prototype.getCode = function (language) {
	if (typeof this.code[language] !== "string") {
		var codeGenerator = A3a.vpl.Program.codeGenerator[language];
		this.code[language] = codeGenerator.generate(this);
	}
	return this.code[language];
};

/** Generate code for the actions of an event handler
	@param {A3a.vpl.EventHandler} eventHandler
	@param {string} language
	@return {string}
*/
A3a.vpl.Program.prototype.codeForActions = function (eventHandler, language) {
	var codeGenerator = A3a.vpl.Program.codeGenerator[language];
	return codeGenerator.generate(this, eventHandler.actions);
};

/** Generate code for the actions of an event handler
	@param {A3a.vpl.Block} block
	@param {string} language
	@return {string}
*/
A3a.vpl.Program.prototype.codeForBlock = function (block, language) {
	var codeGenerator = A3a.vpl.Program.codeGenerator[language];
	return codeGenerator.generate(this, [block]);
};
