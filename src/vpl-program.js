/*
	Copyright 2018-2023 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Implementation of A3a.vpl.Program, a class which contains a VPL3 program
(basically a collection of A3a.vpl.Rule objects), and settings related
to programming.

*/

/**
	@constructor
	@param {A3a.vpl.mode=} mode
	@param {?A3a.vpl.UIConfig=} uiConfig
*/
A3a.vpl.Program = function (mode, uiConfig) {
	/** @type {?string} */
	this.filename = null;
	this.readOnly = false;
	this.fixedFilename = false;
	/** @type {A3a.vpl.mode} */
	this.mode = mode || A3a.vpl.mode.basic;
	this.supportTracing = false;	// true to generate tracing code for each rule
	this.noVPL = false;	// true for source code editor without vpl counterpart
	this.teacherRole = A3a.vpl.Program.teacherRoleType.student;
	this.experimentalFeatures = false;
	/** @type {?number} */
	this.volume = null;	// null for unchanged, 0=muted, 10=max
	/** @type {Array.<A3a.vpl.Rule>} */
	this.program = [];
	this.executedRuleIndex = -1;	// index of rule being executed (tracing)
	this.slowdownFactor = 1;
	this.uploaded = false;	// program matches what's running
	this.notUploadedYet = true;	// program has never been loaded since last this.new()
	this.uploadedToServer = false;	// program matches what's been uploaded to the server
	this.flashed = false;	// program matches what's flashed
	/** @type {?function():void} */
	this.onUpdate = null;
	/** @type {?function():void} */
	this.saveChanges = null;

	/** @type {?function():?string} */
	this.getEditedSourceCodeFun = null;
	/** @type {?function(?string):void} */
	this.setEditedSourceCodeFun = null;

	this.undoState = new A3a.vpl.Undo();
	/** @type {Object<string,string>} */
	this.code = {};
	this.currentLanguage = A3a.vpl.defaultLanguage;

	/** @type {?string} */
	this.message = null;	// text message displayed in lieu of vpl program

	/** @type {Array.<string>} */
	this.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
	/** @type {boolean} */
	this.multiEventBasic = A3a.vpl.Program.basicMultiEvent;
	/** @type {Array.<string>} */
	this.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
	/** @type {boolean} */
	this.multiEventAdvanced = A3a.vpl.Program.advancedMultiEvent;
	/** @type {A3a.vpl.UIConfig} */
	this.uiConfig = uiConfig || new A3a.vpl.UIConfig();
	/** @type {?function(Object=):void} */
	this.logger = null;
};

/** @const */
A3a.vpl.Program.mimetype = "application/x-vpl3";

/** @const */
A3a.vpl.Program.suffix = "vpl3";

/** @const */
A3a.vpl.Program.defaultFilename = "program." + A3a.vpl.Program.suffix;

/** @const */
A3a.vpl.Program.mimetypeUI = "application/x-vpl3-ui";

/** @const */
A3a.vpl.Program.suffixUI = "vpl3ui";

/** @const */
A3a.vpl.Program.defaultFilenameUI = "ui." + A3a.vpl.Program.suffixUI;

/** @type {Object<string,A3a.vpl.CodeGenerator>} */
A3a.vpl.Program.codeGenerator = {};

A3a.vpl.Program.advancedModeEnabled = true;

/** @type {Array.<string>} */
A3a.vpl.Program.basicBlocks = [];

A3a.vpl.Program.basicMultiEvent = false;
A3a.vpl.Program.advancedMultiEvent = true;

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

/** Enable all blocks in the specified mode
	@param {A3a.vpl.mode} mode
	@return {void}
*/
A3a.vpl.Program.enableAllBlocks = function (mode) {
	var blocks = A3a.vpl.BlockTemplate.lib.map(function (b) { return b.name; });
	switch (mode) {
	case A3a.vpl.mode.basic:
		A3a.vpl.Program.basicBlocks = blocks;
		break;
	case A3a.vpl.mode.advanced:
		A3a.vpl.Program.advancedBlocks = blocks;
		break;
	}
};

/** Reset UI
	@return {void}
*/
A3a.vpl.Program.prototype.resetUI = function () {
	this.uiConfig.reset();
};

/** Clear program
	@param {boolean=} resetUndoStack
	@return {void}
*/
A3a.vpl.Program.prototype.new = function (resetUndoStack) {
	if (resetUndoStack) {
		this.undoState.reset();
	} else {
		this.saveStateBeforeChange();
	}
	this.mode = A3a.vpl.mode.basic;
	this.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
	this.multiEventBasic = A3a.vpl.Program.basicMultiEvent;
	this.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
	this.multiEventAdvanced = A3a.vpl.Program.advancedMultiEvent;
	this.filename = null;
	this.program = [];
	this.code = {};
	this.notUploadedYet = true;
	this.enforceSingleTrailingEmptyEventHandler();
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

/** Get first error
	@return {?A3a.vpl.Error}
*/
A3a.vpl.Program.prototype.getError = function () {
	for (var i = 0; i < this.program.length; i++) {
		if (this.program[i].error !== null) {
			return this.program[i].error;
		}
	}
	return null;
};

/** Check if should display a single event (not advanced mode, up to
	one event per event handler, no state block)
	@return {boolean}
*/
A3a.vpl.Program.prototype.displaySingleEvent = function () {
	if (this.mode === A3a.vpl.mode.basic ? this.multiEventBasic : this.multiEventAdvanced) {
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

/** Change the slowdown factor
	@param {number} slowdownFactor
	@return {void}
*/
A3a.vpl.Program.prototype.setSlowdownFactor = function (slowdownFactor) {
	this.slowdownFactor = slowdownFactor;
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
	this.undoState.saveStateBeforeChange(this.exportToObject({filename: true}),
		{
			uploaded: this.uploaded,
			uploadedToServer: this.uploadedToServer,
			flashed: this.flashed
		});
	this.code = {};
	this.uploaded = false;
	this.uploadedToServer = false;
	this.flashed = false;
};

/** Save current state after modifying it
	@return {void}
*/
A3a.vpl.Program.prototype.saveStateAfterChange = function () {
	if (this.saveChanges) {
		this.saveChanges();
	}
};

/** Undo last change, saving current state and retrieving previous one
	@param {function(string):void=} updateFun called at the end and for further
	asynchrounous loading if necessary
	@return {void}
*/
A3a.vpl.Program.prototype.undo = function (updateFun) {
	if (this.undoState.canUndo()) {
		var markedState = this.undoState.undo(this.exportToObject({filename: true}),
			{
				uploaded: this.uploaded,
				uploadedToServer: this.uploadedToServer,
				flashed: this.flashed
			});
		this.importFromObject(/** @type {Object} */(markedState.state), updateFun);
		this.uploaded = markedState.marks.uploaded;
		this.uploadedToServer = markedState.marks.uploadedToServer;
		this.flashed = markedState.marks.flashed;
		this.code = {};
	}
};

/** Redo last undone change, saving current state and retrieving next one
	@param {function(string):void=} updateFun called at the end and for further
	asynchrounous loading if necessary
	@return {void}
*/
A3a.vpl.Program.prototype.redo = function (updateFun) {
	if (this.undoState.canRedo()) {
		var markedState = this.undoState.redo(this.exportToObject({filename: true}),
			{
				uploaded: this.uploaded,
				uploadedToServer: this.uploadedToServer,
				flashed: this.flashed
			});
		this.importFromObject(/** @type {Object} */(markedState.state), updateFun);
		this.uploaded = markedState.marks.uploaded;
		this.uploadedToServer = markedState.marks.uploadedToServer;
		this.flashed = markedState.marks.flashed;
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
		this.program.forEach(function (rule) {
			/** Convert block
				@param {A3a.vpl.Block} block
				@param {boolean=} isState
				@return {A3a.vpl.Block}
			*/

			function convertBlock(block, isState) {
/*
				if (block === null) {
					if (isState && rule.event && mode === A3a.vpl.mode.advanced) {
						// new state block
						block = new A3a.vpl.Block(A3a.vpl.BlockTemplate.stateBlock,
							rule, null);
						block.onPrepareChange = rule.event.onPrepareChange;
						return block;
					}
					return null;
				}
				if (block.blockTemplate.changeMode) {
					var newBlock = block.blockTemplate.changeMode(block, mode);
					if (newBlock !== null) {
						newBlock.ruleContainer = block.ruleContainer;
						newBlock.positionInContainer = block.positionInContainer;
					}
					return newBlock;
				}
*/
				return block;
			}

			rule.events.forEach(function (event, i) {
				rule.events[i] = convertBlock(event);
			});
			rule.actions.forEach(function (action, i) {
				rule.actions[i] = convertBlock(action);
			});
		});
	}
};

/** @enum {string}
*/
A3a.vpl.Program.teacherRoleType = {
	student: "s",
	teacher: "t",
	customizableBlocks: "custb"
};

/** Change role
	@param {A3a.vpl.Program.teacherRoleType} teacherRole
	@return {void}
*/
A3a.vpl.Program.prototype.setTeacherRole = function (teacherRole) {
	this.teacherRole = teacherRole;
};

/** Append an empty event handler
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandler = function () {
	this.program.push(new A3a.vpl.Rule());
	this.enforceSingleTrailingEmptyEventHandler();
};

/** Add a comment
	@param {string=} comment
	@param {?number=} position position in program (default: end)
	@return {number} effective index in program
*/
A3a.vpl.Program.prototype.addComment = function (comment, position) {
	var ruleComment = new A3a.vpl.RuleComment(comment);

	if (position != null && position < this.program.length) {
		// at position
		this.program.splice(position, 0, ruleComment);
	} else if (this.program.length === 0 || !this.program[this.program.length - 1].isEmpty()) {
		// append
		position = this.program.length;
		this.program.push(ruleComment);
	} else {
		// append before trailing empty rule
		position = this.program.length - 1;
		this.program.splice(position, 0, ruleComment);
	}

	this.enforceSingleTrailingEmptyEventHandler();

	return position;
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
	@param {A3a.vpl.Program.ExportOptions=} opt
	@return {Object}
*/
A3a.vpl.Program.prototype.exportToObject = function (opt) {
	var obj = {};
	if (!opt || opt.lib !== false) {
		obj["basicBlocks"] = this.enabledBlocksBasic;
		obj["basicMultiEvent"] = this.multiEventBasic;
		if (A3a.vpl.Program.advancedModeEnabled) {
			obj["advanced"] = this.mode === A3a.vpl.mode.advanced;
			obj["advancedBlocks"] = this.enabledBlocksAdvanced;
			obj["advancedMultiEvent"] = this.multiEventAdvanced;
		}
		obj["disabledUI"] = this.uiConfig.disabledUI;
	}
	if (opt && opt.filename) {
		obj["filename"] = this.filename;
	}
	if (opt && opt.prog === false) {
		return obj;
	}

	var src = this.getEditedSourceCodeFun ? this.getEditedSourceCodeFun() : null;

	/** @type {?Array.<Array.<Object>>} */
	var p = null;

	if (src == null) {
		p = this.program.map(function (rule) {
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

			if (rule instanceof A3a.vpl.RuleComment) {
				return {
					"comment": /** @type {A3a.vpl.RuleComment} */(rule).comment,
					"disabled": rule.disabled,
					"locked": rule.locked
				}
			} else {
				rule.events.forEach(function (event) {
					addBlock(event);
				});
				rule.actions.forEach(function (action) {
					addBlock(action);
				});
				return {
					"blocks": b,
					"disabled": rule.disabled,
					"locked": rule.locked
				};
			}
		});
	}

	obj["program"] = p;
	obj["code"] = src;
	return obj;
};

/**
	@typedef {{
		lib: (boolean | undefined),
		prog: (boolean | undefined),
		filename: (boolean | undefined)
	}}
	export options: .lib=true to export the block lib & ui settings,
	.prog=true to export the program,
	.filename=true to export the filename
	(default: {lib:true,prog:true,filename=false})
*/
A3a.vpl.Program.ExportOptions;

/** Export program to JSON
	@param {{lib:boolean,prog:boolean}=} opt .lib=true to export the block lib & ui settings,
	.prog=true to export the program (default: {lib:true,prog:true})
	@return {string}
*/
A3a.vpl.Program.prototype.exportToJSON = function (opt) {
	return JSON.stringify(this.exportToObject(opt), null, "\t");
};

/**
	@typedef {{
			dontChangeProgram: (boolean | undefined),
			dontChangeBlocks: (boolean | undefined),
			dontChangeUI: (boolean | undefined),
			dontChangeFilename: (boolean | undefined)
	}}
*/
A3a.vpl.Program.ImportOptions;

/** Import program from an object, as created by exportToObject
	@param {Object} obj
	@param {function(string):void=} updateFun called at the end and for further
	asynchronous loading if necessary; arg is "vpl" or "src"
	@param {A3a.vpl.Program.ImportOptions=} options
	@return {void}
*/
A3a.vpl.Program.prototype.importFromObject = function (obj, updateFun, options) {
	var self = this;
	var importFinished = false;
	var view = "vpl";
	try {
		if (obj) {
			if (obj["disabledUI"] && (!options || !options.dontChangeUI)) {
				this.uiConfig.setDisabledFeatures(obj["disabledUI"]);
			}
			if (!options || !options.dontChangeBlocks) {
				var isAdvanced = obj["advanced"] == true;
				if (A3a.vpl.Program.advancedModeEnabled) {
					// import what's found into basic and advanced
					this.mode = isAdvanced
						? A3a.vpl.mode.advanced
						: A3a.vpl.mode.basic;
					this.enabledBlocksBasic = obj["basicBlocks"] || A3a.vpl.Program.basicBlocks;
					this.multiEventBasic = obj["basicMultiEvent"] !== undefined
						? obj["basicMultiEvent"]
						: A3a.vpl.Program.basicMultiEvent;
					this.enabledBlocksAdvanced = obj["advancedBlocks"] || A3a.vpl.Program.advancedBlocks;
					this.multiEventAdvanced = obj["advancedMultiEvent"] !== undefined
		 				? obj["advancedMultiEvent"]
						: A3a.vpl.Program.advancedMultiEvent;
				} else {
					// import selected mode into basic
					this.mode = A3a.vpl.mode.basic;
					this.enabledBlocksBasic = isAdvanced
						? obj["advancedBlocks"] || A3a.vpl.Program.advancedBlocks
						: obj["basicBlocks"] || A3a.vpl.Program.basicBlocks;
					this.multiEventBasic = isAdvanced
						? obj["advancedMultiEvent"] !== undefined
							? obj["advancedMultiEvent"]
							: A3a.vpl.Program.advancedMultiEvent
						: obj["basicMultiEvent"] !== undefined
							? obj["basicMultiEvent"]
							: A3a.vpl.Program.basicMultiEvent;
				}
			}
			if (!options || !options.dontChangeProgram) {
				if (obj["program"]) {
					this.program = obj["program"].map(function (rule) {
						if (rule.hasOwnProperty("comment")) {
							var rc = new A3a.vpl.RuleComment(rule.comment);
							rc.disabled = rule["disabled"] || false;
							rc.locked = rule["locked"] || false;
							return rc;
						} else {
							var eh = new A3a.vpl.Rule();
							rule["blocks"].forEach(function (block) {
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
										function () {
											self.saveStateAfterChange();
										},
										true);
								}
							}, this);
							eh.disabled = rule["disabled"] || false;
							eh.locked = rule["locked"] || false;
							return eh;
						}
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
			if (!options || !options.dontChangeFilename) {
				if (obj.hasOwnProperty("filename")) {
					this.filename = obj["filename"];
				}
			}
		}
	} catch (e) {}
    this.enforceSingleTrailingEmptyEventHandler();
	this.noVPL = view === "src";
	updateFun && updateFun(view);
	importFinished = true;
};

/** Import program from its JSON representation, as created by exportToJSON
	@param {string} json
	@param {function(string):void=} updateFun called at the end and for further
	asynchrounous loading if necessary
	@param {A3a.vpl.Program.ImportOptions=} options
	@return {void}
*/
A3a.vpl.Program.prototype.importFromJSON = function (json, updateFun, options) {
	try {
		var obj = JSON.parse(json);
		this.importFromObject(/** @type {Object} */(obj), updateFun, options);
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

/** Get code location corresponding to a block or an event handler
	@param {string} language
	@param {Object} ref
	@return {?{begin:number,end:number}}
*/
A3a.vpl.Program.prototype.getCodeLocation = function (language, ref) {
	var codeGenerator = A3a.vpl.Program.codeGenerator[language];
	var pos1 = codeGenerator.findMark(ref, true);
	var pos2 = codeGenerator.findMark(ref, false);
	return pos1 >= 0 && pos2 >= 0 ? {begin: pos1, end: pos2} : null;
};

/** Generate code for the actions of an event handler
	@param {A3a.vpl.Rule} rule
	@param {string} language
	@return {string}
*/
A3a.vpl.Program.prototype.codeForActions = function (rule, language) {
	var codeGenerator = A3a.vpl.Program.codeGenerator[language];
	return codeGenerator.generate(this, rule.actions);
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

/** Set the logger function
	@param {function(Object=):void} logger
*/
A3a.vpl.Program.prototype.setLogger = function (logger) {
	this.logger = logger;
};

/** Log data
	@param {Object=} data data, or null/undefined for default (program metadata)
	@return {void}
*/
A3a.vpl.Program.prototype.log = function (data) {
	if (this.logger) {
		this.logger(data);
	}
};
