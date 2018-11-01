/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
	@struct
	@param {A3a.vpl.mode=} mode
*/
A3a.vpl.Program = function (mode) {
	/** @type {A3a.vpl.mode} */
	this.mode = mode || A3a.vpl.mode.basic;
	this.noVpl = false;	// true for source code editor without vpl counterpart
	this.teacherRole = true;
	this.experimentalFeatures = false;
	/** @type {Array.<A3a.vpl.EventHandler>} */
	this.program = [];
	this.uploaded = false;
	/** @type {?function():void} */
	this.onUpdate = null;

	this.undoState = new A3a.vpl.Undo();
	/** @type {?string} */
	this.code = null;

	this.customizationMode = false;
	/** @type {Array.<string>} */
	this.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
	/** @type {Array.<string>} */
	this.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
	/** @type {Array.<string>} */
	this.disabledUI = [];
};

/** @type {Array.<string>} */
A3a.vpl.Program.basicBlocks = [];

/** @type {Array.<string>} */
A3a.vpl.Program.advancedBlocks = [];

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
	this.code = null;
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
	this.code = null;
};

/** Save current state before modifying it
	@return {void}
*/
A3a.vpl.Program.prototype.saveStateBeforeChange = function () {
	this.undoState.saveStateBeforeChange(this.exportToObject(), this.uploaded);
	this.code = null;
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
		this.code = null;
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
		this.code = null;
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

/** Generate code for the whole program
	@param {Array.<A3a.vpl.Block>=} runBlocks if defined, override the initialization
	code
	@return {string}
*/
A3a.vpl.Program.prototype.generateCode = function (runBlocks) {
	var c = this.program.map(function (eh) {
		return eh.generateCode();
	});
	/** @type {Array.<string>} */
	var initVarDecl = [];
	/** @type {Array.<string>} */
	var initCodeExec = [];
	/** @type {Array.<string>} */
	var initCodeDecl = [];
	/** @dict */
	var folding = {};
		// folding[sectionBegin] = index in c fragments with same sectionBegin are folded into
	/** @type {Array.<number>} */
	var initEventIndices = [];
	c.forEach(function (evCode, i) {
		evCode.initVarDecl && evCode.initVarDecl.forEach(function (fr) {
			if (initVarDecl.indexOf(fr) < 0) {
				initVarDecl.push(fr);
			}
		});
		evCode.initCodeExec && evCode.initCodeExec.forEach(function (fr) {
			if (initCodeExec.indexOf(fr) < 0) {
				initCodeExec.push(fr);
			}
		});
		evCode.initCodeDecl && evCode.initCodeDecl.forEach(function (fr) {
			if (initCodeDecl.indexOf(fr) < 0) {
				initCodeDecl.push(fr);
			}
		});
		var statement = (evCode.statement || "");
		if (evCode.clause) {
			statement = "when " + evCode.clause + " do\n" + statement + "end\n";
		}
		if (evCode.sectionBegin) {
 			if (folding[evCode.sectionBegin] !== undefined) {
				// fold evCode into c[folding[evCode.sectionBegin]]
				var foldedFrag = c[folding[evCode.sectionBegin]];
				if (evCode.clauseInit &&
					(!foldedFrag.clauseInit || foldedFrag.clauseInit.indexOf(evCode.clauseInit) < 0)) {
					// concat all clauseInit fragments without duplicates
					foldedFrag.clauseInit = (foldedFrag.clauseInit || "") + evCode.clauseInit;
				}
				foldedFrag.statement += statement;
				evCode.statement = undefined;
			} else {
				// first fragment with that sectionBegin
				folding[evCode.sectionBegin] = i;
				evCode.statement = statement;
			}
		} else {
			// replace clauseBegin/statement/clauseEnd with statement
			evCode.statement = statement;
		}
		if (this.program[i].getEventBlockByType("init")) {
			initEventIndices.push(i);
		}
	}, this);

	// compile runBlocks
	var runBlocksCodeStatement = "";
	if (runBlocks) {
		var eh = new A3a.vpl.EventHandler();
		var initBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("init"), null, null);
		eh.setBlock(initBlock, null, null);
		runBlocks.forEach(function (block) {
			eh.setBlock(block, null, null);
		});
		var runBlocksCode = eh.generateCode();
		// check if initVarDecl and initCodeDecl are defined in the main program
		var runBlockPrerequisite = true;
		runBlocksCode.initVarDecl.forEach(function (fr) {
			if (initVarDecl.indexOf(fr) < 0) {
				runBlockPrerequisite = false;
			}
		});
		runBlocksCode.initCodeDecl.forEach(function (fr) {
			if (initCodeDecl.indexOf(fr) < 0) {
				runBlockPrerequisite = false;
			}
		});
		if (runBlockPrerequisite) {
			// yes, run same code as usual
			runBlocksCodeStatement = runBlocksCode.statement;
		} else if (runBlocksCode.statementWithoutInit) {
			runBlocksCodeStatement = runBlocksCode.statementWithoutInit;
		}
	}

	// build program from fragments:
	// init fragments (var declarations first, then code, without sub/onevent)
	var str = initVarDecl.length > 0 ? "\n" + initVarDecl.join("\n") : "";
	if (runBlocks) {
		str += "\n" + runBlocksCodeStatement;
	} else {
		if (initCodeExec.length > 0) {
			str += "\n" + initCodeExec.join("\n");
		}
		// init implicit event
		for (var i = 0; i < this.program.length; i++) {
			if (initEventIndices.indexOf(i) >= 0 && c[i].statement) {
				str += "\n";
				str += (c[i].sectionBegin || "") + (c[i].statement || "") + (c[i].sectionEnd || "");
			}
		}
	}
	// init fragments defining sub and onevent
	if (initCodeDecl.length > 0) {
		str += "\n" + initCodeDecl.join("\n");
	}
	// explicit events
	for (var i = 0; i < this.program.length; i++) {
		if (initEventIndices.indexOf(i) < 0 && c[i].statement) {
			str += "\n";
			str += (c[i].sectionBegin || "") + (c[i].clauseInit || "") + (c[i].statement || "") + (c[i].sectionEnd || "");
		}
	}
	// remove initial lf
	if (str[0] === "\n") {
		str = str.slice(1);
	}

	// pretty-print (fix indenting)
	var indent = 0;
	var lines = str
		.split("\n")
		.map(function (line) { return line.trim(); })
		.map(function (line) {
			function startsWithAnyOf(a) {
				for (var i = 0; i < a.length; i++) {
					if (line.slice(0, a[i].length) === a[i]
						&& !/^\w/.test(line.slice(a[i].length))) {
						return true;
					}
				}
				return false;
			}
			if (line.length > 0) {
				var preDec = startsWithAnyOf(["else", "elseif", "end", "onevent", "sub"]);
				var postInc = startsWithAnyOf(["if", "for", "onevent", "sub", "when", "while"]);
				if (preDec) {
					indent = Math.max(indent - 1, 0);
				}
				line = "\t\t\t\t\t".slice(0, indent) + line;
				if (postInc) {
					indent++;
				}
			}
			return line;
		});
	// align comments with following line
	for (var i = lines.length - 2; i >= 0; i--) {
		if (/^\s*#/.test(lines[i])) {
			var nextLineInitialBlanks = lines[i + 1].replace(/^(\s*).*$/, "$1");
			lines[i] = nextLineInitialBlanks + lines[i].replace(/^\s*/, "");
		}
	}
	str = lines.join("\n");

	// check duplicate events
	for (var i = 0; i < this.program.length; i++) {
		for (var j = i + 1; j < this.program.length; j++) {
			this.program[i].checkConflicts(this.program[j]);
		}
	}

	return str;
};

/** Get code for the whole program, generating it if it's stale
	@return {string}
*/
A3a.vpl.Program.prototype.getCode = function () {
	if (this.code === null) {
		this.code = this.generateCode();
	}
	return this.code;
};

/** Generate code for the actions of an event handler
	@param {A3a.vpl.EventHandler} eventHandler
	@return {string}
*/
A3a.vpl.Program.prototype.codeForActions = function (eventHandler) {
	return this.generateCode(eventHandler.actions);
};

/** Generate code for the actions of an event handler
	@param {A3a.vpl.Block} block
	@return {string}
*/
A3a.vpl.Program.prototype.codeForBlock = function (block) {
	return this.generateCode([block]);
};

/** Export program to a plain object which can be serialized
	@return {Object}
*/
A3a.vpl.Program.prototype.exportToObject = function () {
	/** @type {Array.<Array.<Object>>} */
	var p = this.program.map(function (eventHandler) {
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

	return {
		"advanced": this.mode === A3a.vpl.mode.advanced,
		"basicBlocks": this.enabledBlocksBasic,
		"advancedBlocks": this.enabledBlocksAdvanced,
		"program": p
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
	@param {function():void=} updateFun called at the end and for further
	asynchrounous loading if necessary
	@return {void}
*/
A3a.vpl.Program.prototype.importFromObject = function (obj, updateFun) {
	var self = this;
	var importFinished = false;
	try {
		if (obj) {
			this.mode = obj["advanced"]
				? A3a.vpl.mode.advanced
				: A3a.vpl.mode.basic;
			this.enabledBlocksBasic = obj["basicBlocks"] || A3a.vpl.Program.basicBlocks;
			this.enabledBlocksAdvanced = obj["advancedBlocks"] || A3a.vpl.Program.advancedBlocks;
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
										updateFun();
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
		}
	} catch (e) {}
	updateFun && updateFun();
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
