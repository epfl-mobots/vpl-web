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

Implementation of class A3a.vpl.Application, the main class of the
VPL3 web application.

*/

/** Main application class (container for VPL, editor and simulator)
	@constructor
	@param {Element} canvasEl
*/
A3a.vpl.Application = function (canvasEl) {
	// static initialization
	if (!A3a.vpl.Application.initialized) {
		A3a.vpl.Program.resetBlockLib();
		A3a.vpl.Application.initialized = true;
	}

	this.canvasEl = canvasEl;

	this.css = new CSSParser.VPL();
	this.i18n = new A3a.vpl.Translation();

	this.uiConfig = new A3a.vpl.UIConfig();
	var self = this;
	this.commands = new A3a.vpl.Commands(function (data) {
		self.log(data);
	});
	/** @type {?{
		disabled: boolean,
		isAvailable: boolean,
		isPressed: boolean,
		isEnabled: boolean,
		isSelected: boolean,
		state: ?string
	}} */
	this.forcedCommandState = null;

	this.vplToolbarConfig = [
		"vpl:close",
		"!space",
		"vpl:about",
		"vpl:help",
		"vpl:statement",
		"!space",
		"vpl:new",
		"vpl:save",
		"vpl:load",
		"vpl:upload",
		"vpl:nextProgram",
		"vpl:filename",
		"vpl:exportToHTML",
		"!space",
		"vpl:advanced",
		"!stretch",
		"vpl:readonly",
		"!stretch",
		"vpl:add-comment",
		"!stretch",
		"vpl:undo",
		"vpl:redo",
		"!stretch",
		"vpl:connected",
		"!stretch",
		"vpl:run",
		"vpl:stop",
		"!space",
		"vpl:slowdown",
		"vpl:debug",
		"vpl:robot",
		"!space",
		"vpl:flash",
		"!stretch",
		"vpl:sim",
		"vpl:text",
		"!stretch",
		"vpl:teacher-reset",
		"vpl:teacher-save",
		"vpl:teacher-setasnew",
		"vpl:teacher"
	];
	this.vplToolbar2Config = [
		"!!stretch",
		"vpl:message-error",
		"vpl:message-warning",
		"!!stretch",
		"vpl:duplicate",
		"vpl:disable",
		"vpl:lock",
		"vpl:trashcan",
	];
	this.srcToolbarConfig = [
		"src:close",
		"!space",
		"src:new",
		"src:save",
		"!space",
		"src:language",
		"src:disass",
		"!stretch",
		"src:run",
		"src:stop",
		"!stretch",
		"src:sim",
		"src:vpl",
		"!space",
		"src:locked",
		"!stretch",
		"src:teacher-reset",
		"src:teacher"
	];
	this.simToolbarConfig = [
		"sim:close",
		"!stretch",
		"sim:restart",
		"sim:pause",
		"!space",
		"sim:speedup",
		"sim:noise",
		"!stretch",
		"sim:pen",
		"sim:clear",
		"!space",
		"sim:map-kind",
		"sim:map",
		"sim:map-ground",
		"sim:map-obstacles",
		"sim:map-height",
		"!stretch",
		"sim:vpl",
		"sim:text",
		"!stretch",
		"sim:teacher-reset",
		"sim:teacher"
	];

	/** @type {Array.<string>} */
	this.views = ["vpl"];
	/** @type {Object.<string,number>} */
	this.viewRelativeSizes = {
		"vpl": 1,
		"src": 1,
		"sim": 1
	};

	/** @type {?Array.<string>} */
	this.simMaps = ["ground", "height", "obstacles"];

	/** @type {?string} */
	this.jsonForNew = null;	// json program to load upon "new"

	/** @type {A3a.vpl.HTMLPanel} */
	this.aboutBox = null;
	/** @type {A3a.vpl.Load} */
	this.loadBox = null;
	/** @type {A3a.vpl.HTMLPanel} */
	this.helpBox = null;
	/** @type {A3a.vpl.HTMLPanel} */
	this.statementBox = null;
	/** @type {A3a.vpl.HTMLPanel} */
	this.suspendBox = null;
	this.suspended = false;
	/**
		@type {Object}
		html doc where BLOCKS is replaced by block description (key=language)
	*/
	this.docTemplates = {};

	/** @type {?string} */
	this.username = null;

	this.program = new A3a.vpl.Program(A3a.vpl.mode.basic, this.uiConfig);
	this.program.setLogger(function (data) {
		self.log(data);
	});

	// true if restored from backup after some envisonment failure, to avoid
	// initializing program to empty or a default template
	this.restored = false;

	this.programNotUploadedToServerYet = true;	// program has never been uploaded to the server since last this.new()

	this.vplMessage = "";
	this.vplMessageIsWarning = false;	// false for error, true for warning

	/** @type {A3a.vpl.CanvasItem} */
	this.draggedItem = null;

	this.vplCanvas = new A3a.vpl.Canvas(canvasEl, {
		css: this.css,
		prepareDrag: function (draggedItem) {
			self.draggedItem = draggedItem;
			if (draggedItem) {
				self.renderProgramToCanvas();
			}
		}
	});
	this.vplCanvas.state = {
		vpl: new A3a.vpl.Program.CanvasRenderingState()
	};

	this.cssForHTMLDocument = "";

	this.executionHightlightDuration = 0.5;	// second

	/** @type {A3a.vpl.Canvas} */
	this.simCanvas = null;
	/** @type {A3a.vpl.VPLSim2DViewer} */
	this.sim2d = null;

	/** @type {Array.<{name:string,runGlue:A3a.vpl.RunGlue}>} */
	this.robots = [];
	/** @type {number} */
	this.currentRobotIndex = -1;

	this.multipleViews = false;
	this.useLocalStorage = false;

	/** @type {?string} */
	this.vplHint = null;	// before translation
	this.vplCanvas.defaultDoOver = function () {
		if (self.vplHint !== null) {
			self.vplHint = null;
			self.renderProgramToCanvas();
		}
	};

	this.vplCanvas.defaultEndDrag = function () {
		// restore normal view when self.draggedItem has been reset to null
		self.renderProgramToCanvas();
	};

	/** @type {?string} */
	this.simHint = null;	// before translation

	/** @type {Array.<A3a.vpl.Application.Logger>} */
	this.loggers = [];
	this.logDataPrevious = null;
	/** @type {?boolean} */
	this.supervisorConnected = null;

	// keyboard
	this.keyboard = new A3a.vpl.Keyboard();
	this.keyboard.attach();
	/** @type {?A3a.vpl.TextField} */
	this.textField = null;
	this.kbdControl = new A3a.vpl.KbdControl(this);
	this.vplCanvas.addPreMousedown(function (rawMouseEvent, mouseEvent) {
		if (!self.uiConfig.nodragAccessibility) {
			self.kbdControl.exit();
		}
		if (self.textField !== null) {
			var cursorIndex = self.textField.findCursorByPos(mouseEvent.x, mouseEvent.y);
			if (cursorIndex == null) {
				// click outside text field: update value and stop editing
				self.textField.finish(true);
				self.textField = null;
			} else {
				// click inside text field: set cursor position
				self.textField.selBegin = self.textField.selEnd = /** @type {number} */(cursorIndex);
			}
		}
		return true;
	});
};

/** @typedef {function(Object=):void}
*/
A3a.vpl.Application.Logger;

A3a.vpl.Application.initialized = false;

/** Change the current UI language
	@param {string} language code ("en" etc.)
	@return {void}
*/
A3a.vpl.Application.prototype.setUILanguage = function (language) {
	return this.i18n.setLanguage(language);
};

/** Push to the keyboard handler stack the shortcuts for VPL
	@return {void}
*/
A3a.vpl.Application.prototype.pushVPLKeyShortcuts = function () {
	var self = this;
	this.keyboard.pushHandler(function (event) {
		if (!self.uiConfig.keyboardShortcutsEnabled ||
			self.views.indexOf("src") >= 0 ||
			(event.altKey || event.ctrlKey || event.metaKey)) {
			return false;
		}
		if (self.views.indexOf("vpl") >= 0) {
			var cmd = self.commands.findByKeyShortcut(event.key,
				self.vplToolbarConfig.concat(self.vplToolbar2Config));
			if (cmd) {
				cmd.execute(event.altKey);
				return true;
			}
		}
		return false;
	});
	if (this.uiConfig.keyboardAccessibility) {
		this.kbdControl.addHandlers();
	}
};

/** Start editing text field
	@param {A3a.vpl.TextField.Options} options
	@return {void}
*/
A3a.vpl.Application.prototype.startTextField = function (options) {
	if (this.textField !== null) {
		if (options.ref != undefined && options.ref === this.textField.ref) {
			// same ref, nothing to do
			return;
		}
		this.textField.finish(true);
	}
	this.textField = window["vplTextFieldInputEvents"]
		? new A3a.vpl.TextFieldInput(this, options)
		: new A3a.vpl.TextField(this, options);
};

/** Translate message using the current language
	@param {string} messageKey
	@param {string=} language target language to override the current language
	@return {string}
*/
A3a.vpl.Application.prototype.translate = function (messageKey, language) {
	return this.i18n.translate(messageKey, language);
};

/** Replace current VPL program with a new (empty) one
	@param {boolean=} resetUndoStack
	@return {void}
*/
A3a.vpl.Application.prototype.newVPL = function (resetUndoStack) {
	this.program.new(resetUndoStack);
	this.kbdControl.reset();
	if (this.uiConfig.nodragAccessibility) {
		this.kbdControl.targetType = A3a.vpl.KbdControl.ObjectType.rule;
		this.kbdControl.targetIndex1 = 0;
	}
};

/** Set or clear html content of About box
	@param {?string} html
	@return {void}
*/
A3a.vpl.Application.prototype.setAboutBoxContent = function (html) {
	var self = this;
	this.aboutBox = html
		? new A3a.vpl.HTMLPanel(html,
			this.uiConfig.keyboardShortcutsEnabled
				? {
					onShow: function () {
						self.keyboard.pushKeyHandler("Escape", function () {
							self.aboutBox.hide();
						});
					},
					onHide: function () {
						self.keyboard.popHandler();
					}
				}
				: null)
		: null;
};

/** Set or clear html content of Help
	@param {?string} html
	@param {boolean=} isStatement true for statement box, false for help box (default)
	@return {void}
*/
A3a.vpl.Application.prototype.setHelpContent = function (html, isStatement) {
	var app = this;
	var saveBox = new CSSParser.VPL.Box();
	saveBox.width = saveBox.height = 64;
	var dims = A3a.vpl.Canvas.calcDims(16, 16);
	var saveDataURL = A3a.vpl.Canvas.controlToDataURL(function (ctx, box, isPressed) {
		(app.program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS)(app, "vpl:save", ctx, dims, app.css, ["vpl", "top", "detached"], saveBox, app.i18n, true, false, false, null);
	}, saveBox.width, saveBox.height, saveBox, dims, 1);

	var saveEl = '<img src="' + saveDataURL.url +
		'" width=' + saveDataURL.width + ' height=' + saveDataURL.height + '>';
	var self = this;
	var panel = html
		? new A3a.vpl.HTMLPanel(html, {
			otherWidgets: [
				{
					title: "\u21d3",
					htmlElement: saveEl,
					fun: function () {
						A3a.vpl.Program.downloadText(/** @type {string} */(html),
							"doc.html", "text/html");
					}
				}
			],
			scroll: true,
			onShow: this.uiConfig.keyboardShortcutsEnabled
				? function () {
					self.keyboard.pushKeyHandler("Escape", function () {
						self.helpBox.hide();
					});
				}
				: null,
			onHide: this.uiConfig.keyboardShortcutsEnabled
				? function () {
					self.keyboard.popHandler();
				}
				: null
		})
		: null;
	if (isStatement) {
		this.statementBox = panel;
	} else {
		this.helpBox = panel;
	}
};

/** Set the help content based on dynamicHelp and the current language and ui settings
	@return {void}
*/
A3a.vpl.Application.prototype.setHelpForCurrentAppState = function () {

	/** Produce the union of two arrays
		@param {Array.<*>} a
		@param {Array.<*>} b
		@return {Array.<*>}
	*/
	function mergeArrays(a, b) {
		var c = a.slice();
		b.forEach(function (el) {
			if (c.indexOf(el) < 0) {
				c.push(el);
			}
		});
		return c;
	}

	if (this.dynamicHelp) {
		var commands = this.vplToolbarConfig.concat(this.vplToolbar2Config)
			.filter(function (id) {
				return id[0] !== "!" && this.commands.isAvailable(id);
			}, this);

		var blocks = this.program.mode === A3a.vpl.mode.basic
		 	? this.program.enabledBlocksBasic
			: this.program.enabledBlocksAdvanced;
		blocks.sort(function (a, b) {
			var aIx = A3a.vpl.BlockTemplate.lib.indexOf(A3a.vpl.BlockTemplate.findByName(a));
			var bIx = A3a.vpl.BlockTemplate.lib.indexOf(A3a.vpl.BlockTemplate.findByName(b));
			return aIx < bIx ? -1 : aIx > bIx ? 1 : 0;
		});
		this.dynamicHelp.clearImageMapping();
		var dims = A3a.vpl.Canvas.calcDims(100, 100);
		var cssBoxes = this.getCSSBoxes(this.css);
		var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbarConfig, ["vpl", "top"]);
		var toolbar2ItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbar2Config, ["vpl", "bottom"]);
		this.forcedCommandState = {
			disabled: false,
			isAvailable: true,
			isPressed: false,
			isEnabled: true,
			isSelected: false,
			state: null
		};
		var controlBar = this.createVPLToolbar(this.vplToolbarConfig, ["vpl", "top"],
			cssBoxes.toolbarBox, cssBoxes.toolbarSeparatorBox, toolbarItemBoxes);
		var controlBar2 = this.createVPLToolbar(this.vplToolbar2Config, ["vpl", "bottom"],
			cssBoxes.toolbar2Box, cssBoxes.toolbarSeparator2Box, toolbar2ItemBoxes);
		var scale = 50 / toolbarItemBoxes["vpl:new"].width;
		this.vplToolbarConfig.forEach(function (id) {
			var url = controlBar.toolbarButtonToDataURL(id, toolbarItemBoxes[id], dims, scale);
			if (url) {
				this.dynamicHelp.addImageMapping("vpl:cmd:" + id.replace(/:/g, "-"), url.url);
			}
		}, this);
		this.vplToolbar2Config.forEach(function (id) {
			var url = controlBar2.toolbarButtonToDataURL(id, toolbar2ItemBoxes[id], dims, scale);
			if (url) {
				this.dynamicHelp.addImageMapping("vpl:cmd:" + id.replace(/:/g, "-"), url.url);
			}
		}, this);
		this.forcedCommandState = null;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate) {
			try {
				var block = new A3a.vpl.Block(blockTemplate, null, null);
				block.param = blockTemplate.typicalParam ? blockTemplate.typicalParam() : block.param;
				var urlMD = "vpl:block:" + blockTemplate.name.replace(/ /g, "-");
				var url = block.toDataURL(this.css, dims, 1);
				this.dynamicHelp.addImageMapping(urlMD, url);
			} catch (e) {}
		}, this);
		var html = this.dynamicHelp.generate(this.i18n.language, commands, blocks, this.docTemplates);
		this.setHelpContent(html);
	}
};

/** React to a trace event sent by the robot on execution of a rule
	@param {number} ruleIndex
	@return {void}
*/
A3a.vpl.Application.prototype.notifyTraceEvent = function (ruleIndex) {
	this.highlightRuleExecution(ruleIndex);
};

/** Download json block list based on current settings
	@return {void}
*/
A3a.vpl.Application.prototype.generateBlockList = function () {
	/** @type {Array.<string>} */
	var blockList = [];

	A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
		if (blockTemplate.type === A3a.vpl.blockType.event ||
			blockTemplate.type === A3a.vpl.blockType.state) {
			blockList.push(blockTemplate.name);
		}
	});
	A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
		if (blockTemplate.type === A3a.vpl.blockType.action ||
				blockTemplate.type === A3a.vpl.blockType.comment) {
			blockList.push(blockTemplate.name);
		}
	});

	var str = JSON.stringify(blockList, null, "\t");
	A3a.vpl.Program.downloadText(str, "block-list.json", "application/json");
};

/** Download json help skeleton for buttons
	@param {string=} language
	@return {void}
*/
A3a.vpl.Application.prototype.generateDynamicHelpButtonContentSkeleton = function (language) {
	language = language || this.i18n.language;
	var languageName = {
		"en": "english",
		"fr": "french",
		"de": "german",
		"it": "italian",
		"sp": "spanish"
	}[language] || "unknown";

	var buttons = {};
	this.vplToolbarConfig.concat(this.vplToolbar2Config).forEach(function (id) {
		if (id[0] !== "!") {
			buttons[id] = [
				"# " + this.translate(id, language),
				"![" + id + "](vpl:cmd:" + id.replace(/:/g, "-") + ")",
				"..."
			];
		}
	}, this);

	var c = {
		"help": {}
	};
	c["help"][language] = {};
	c["help"][language]["buttons"] = buttons;
	var str = JSON.stringify(c, null, "\t");

	A3a.vpl.Program.downloadText(str,
		"help-buttons-" + languageName + ".json",
		"application/json");
};

/** Download json help skeleton for blocks
	@param {string=} language
	@return {void}
*/
A3a.vpl.Application.prototype.generateDynamicHelpBlockContentSkeleton = function (language) {
	language = language || this.i18n.language;
	var languageName = {
		"en": "english",
		"fr": "french",
		"de": "german",
		"it": "italian",
		"sp": "spanish"
	}[language] || "unknown";
	var typeDictI18N = {
		"en": {
			"e": "Type: event or condition block",
			"a": "Type: action block",
			"s": "Type: condition block",
			"c": "Type: comment block"
		},
		"fr": {
			"e": "Type: bloc d'événement ou de condition",
			"a": "Type: bloc d'action",
			"s": "Type: bloc de condition",
			"c": "Type: block de commentaire"
		},
		"de": {
			"e": "Art: Ereignisblock oder Zustandblock",
			"a": "Art: Aktionblock",
			"s": "Art: Zustandblock",
			"c": "Art: Anmerkungblock"
		}
	};
	var typeDict = typeDictI18N[language] || typeDictI18N["en"];

	var blocks = {};
	A3a.vpl.BlockTemplate.lib
		.forEach(function (b) {
			if (b.type !== A3a.vpl.blockType.hidden) {
				blocks[b.name] = [
					"# " + this.translate(b.name, language),
					"![" + b.name + "](vpl:block:" + b.name.replace(/ /g, "-") + ")",
					typeDict[b.type],
					"..."
				];
			}
		}, this);

	var c = {
		"help": {}
	};
	c["help"][language] = {};
	c["help"][language]["blocks"] = blocks;
	var str = JSON.stringify(c, null, "\t");

	A3a.vpl.Program.downloadText(str,
		"help-blocks-" + languageName + ".json",
		"application/json");
};

/** Set or clear html content of Suspend box
	@param {?string} html
	@return {void}
*/
A3a.vpl.Application.prototype.setSuspendBoxContent = function (html) {
	var suspended = this.suspended;
	if (suspended && this.suspendBox) {
		this.suspendBox.hide();
	}
	this.suspendBox = html ? new A3a.vpl.HTMLPanel(html, {noCloseWidget: true}) : null;
	if (html && suspended) {
		this.suspendBox.show();
	}
};

/** Change current view
	@param {Array.<string>} views array of "vpl", "src" and "sim"
	@param {{noVPL:(boolean|undefined),unlocked:(boolean|undefined),fromView:(string|undefined),closeView:(string|undefined)}=} options
	noVPL:true to prevent vpl (default: false),
	unlocked:true (with "src") for source code editor in unlocked state (disconnected
	from vpl),
	fromView:v to change another view from view v (keep v, change other),
	closeView:true to close views,
	openView:true to add a view,
	toggle:true to add a view or close it
	@return {void}
*/
A3a.vpl.Application.prototype.setView = function (views, options) {
	var app = this;

	if (options && (options.noVPL || options.unlocked)) {
		this.program.noVPL = true;
		this.editor.noVPL = true;
		this.editor.lockWithVPL(false);
	}

	if (views.length === 1 && options && options.fromView && this.views.length > 1) {
		if (this.views.indexOf(views[0]) >= 0) {
			// options.fromView already visible
			return;
		}
		var viewIx = this.views[0] === options.fromView ? 1 : 0;
		var views1 = this.views.slice();
		views1[viewIx] = views[0];
		views = views1;
	} else if (options && options.openView) {
		if (this.views.indexOf(views[0]) < 0) {
			views = this.views.concat(views);
		}
	} else if (views.length === 1 && options && options.closeView &&
		this.views.length > 1 && this.views.indexOf(views[0]) >= 0) {
		this.views.splice(this.views.indexOf(views[0]), 1);
		views = this.views;
	} else if (views.length === 1 && options && options.toggle) {
		if (this.views.indexOf(views[0]) >= 0) {
			// close
			this.views.splice(this.views.indexOf(views[0]), 1);
			views = this.views;
		} else {
			// open
			views = this.views.concat(views);
		}
	}
	this.views = views;

	if (this.sim2d != null) {
		this.simCanvas.hide();
	}
	this.vplCanvas.hide();
	if (this.editor != null) {
		document.getElementById("src-editor").style.display = views.indexOf("src") >= 0 ? "block" : "none";
		this.editor.tbCanvas.hide();
	}
	if (views.indexOf("vpl") >= 0) {
		this.vplCanvas.show();
	}
	if (views.indexOf("src") >= 0) {
		this.editor.tbCanvas.show();
	}
	if (this.sim2d != null && views.indexOf("sim") >= 0) {
		this.simCanvas.show();
	}

	this.layout(window.innerWidth < window.innerHeight);

	for (var i = 0; i < views.length; i++) {
		switch (views[i]) {
		case "vpl":
			this.vplCanvas.onUpdate = function () {
				if (!app.program.noVPL) {
					app.program.invalidateCode();
					app.program.enforceSingleTrailingEmptyEventHandler();
					if (app.editor) {
						app.editor.changeCode(app.program.getCode(app.program.currentLanguage));
					}
					app.log();
				}
				app.renderProgramToCanvas();
			};
			break;
		case "src":
			this.editor.lockWithVPL(!(options && (options.noVPL || options.unlocked)));
			this.editor.focus();
			this.editor.resize(window.innerWidth, window.innerHeight);
			break;
		case "sim":
			this.simCanvas.onUpdate = function () {
				app.renderSim2dViewer();
			};
			break;
		}
	}

	if (options && (options.closeView || options.openView)) {
		app.vplResize();
	}

	var onDraw = function () {
		views.indexOf("vpl") >= 0 && app.vplCanvas.redraw();
		views.indexOf("src") >= 0 && app.editor.tbCanvas.redraw();
		views.indexOf("sim") >= 0 && app.simCanvas.redraw();
	};
	if (this.vplCanvas) {
		this.vplCanvas.onDraw = onDraw;
	}
	if (this.editor && this.editor.tbCanvas) {
		this.editor.tbCanvas.onDraw = onDraw;
	}
	if (this.simCanvas) {
		this.simCanvas.onDraw = onDraw;
	}

	if (views.indexOf("vpl") >= 0) {
		this.vplCanvas.onUpdate();
		this.vplCanvas.onDraw ? this.vplCanvas.onDraw() : this.vplCanvas.redraw();
	}
	if (views.indexOf("src") >= 0) {
		this.renderSourceEditorToolbar();
		this.editor.tbCanvas.onDraw ? this.editor.tbCanvas.onDraw() : this.editor.tbCanvas.redraw();
	}
	if (views.indexOf("sim") >= 0) {
		this.start(false);
		this.simCanvas.onUpdate();
		this.simCanvas.onDraw ? this.simCanvas.onDraw() : this.simCanvas.redraw();
	}
};

A3a.vpl.Application.prototype["setView"] = A3a.vpl.Application.prototype.setView;

/** Calculate canvas layout
	@param {boolean} verticalLayout
	@return {void}
*/
A3a.vpl.Application.prototype.layout = function (verticalLayout) {
	var relSizes = this.views.map(function (view) {
		return this.viewRelativeSizes[view];
	}, this);
	var sumRelSizes = relSizes.reduce(function (acc, rs) { return acc + rs; }, 0);
	var x = 0;
	for (var i = 0; i < this.views.length; i++) {
		var relArea = verticalLayout
			? {
				xmin: 0,
				xmax: 1,
				ymin: x,
				ymax: x + relSizes[i] / sumRelSizes
			} : {
				xmin: x,
				xmax: x + relSizes[i] / sumRelSizes,
				ymin: 0,
				ymax: 1
			};
		x += relSizes[i] / sumRelSizes;
		switch (this.views[i]) {
		case "vpl":
			this.vplCanvas.setRelativeArea(relArea);
			break;
		case "src":
			this.editor.tbCanvas.setRelativeArea(relArea);
			break;
		case "sim":
			this.simCanvas.setRelativeArea(relArea);
			break;
		}
	}
};

A3a.vpl.Application.prototype.vplResize = function () {
	var bounds = this.vplCanvas.canvas.parentElement.getBoundingClientRect();
	var width = bounds.width;
	var height = window.innerHeight - bounds.top;
	this.layout(width < height);
	if (window["vplDisableResize"]) {
		var bnd = this.vplCanvas.canvas.getBoundingClientRect();
		width = bnd.width;
		height = bnd.height;
	}

	// vpl, editor and simulator
	this.vplCanvas.resize(width, height);
	if (this.editor) {
		this.editor.resize(width, height);
	}
	if (this.sim2d) {
		this.simCanvas.resize(width, height);
	}
	this.views.forEach(function (view) {
		switch (view) {
		case "vpl":
			this.renderProgramToCanvas();
			break;
		case "src":
			this.editor.tbCanvas.redraw();
			break;
		case "sim":
			if (this.sim2d) {
				this.renderSim2dViewer();
			}
			break;
		}
	}, this);

	// modal boxes
	if (this.aboutBox) {
		this.aboutBox.center();
	}
};

/** Stop robot
	@param {boolean=} abnormal
	@return {void}
*/
A3a.vpl.Application.prototype.stopRobot = function (abnormal) {
	if (this.currentRobotIndex >= 0) {
		var stopBlockTemplate = null;
		if (abnormal) {
			stopBlockTemplate = A3a.vpl.BlockTemplate.findByName("!stop and blink");
		}
		if (!stopBlockTemplate) {
			stopBlockTemplate = A3a.vpl.BlockTemplate.findByName("!stop");
		}
		var language = this.program.currentLanguage;
		var stopGenCode = stopBlockTemplate && stopBlockTemplate.genCode[language];
		if (stopGenCode) {
			this.robots[this.currentRobotIndex].runGlue.run(stopGenCode(null).statement, language);
		}
	}
};

/** Check if stopRobot is enabled
	@return {boolean}
*/
A3a.vpl.Application.prototype.canStopRobot = function () {
	return !this.program.noVPL &&
		this.robots[this.currentRobotIndex].runGlue.isEnabled(this.program.currentLanguage);
};

/** Add a logger
	@param {A3a.vpl.Application.Logger} logger
	@return {void}
*/
A3a.vpl.Application.prototype.addLogger = function (logger) {
	this.loggers.push(logger);
};

/** Call all loggers
	@param {Object=} data
	@return {void}
*/
A3a.vpl.Application.prototype.log = function (data) {
	if (data == null) {
		// default data: program metadata (recompile for updated error message)
		this.updateErrorInfo();
		data = {
	        "type": "vpl-changed",
	        "data": {
				"filename": this.program.filename,
	            "nrules": this.program.program.reduce(function (acc, cur) {
					return cur.events.length + cur.actions.length > 0 ? acc + 1 : acc;
				}, 0),
				"nblocks": this.program.program.reduce(function (acc, cur) {
					return acc + cur.events.length + cur.actions.length;
				}, 0),
				"uploadedToServer": this.program.uploadedToServer,
				"error": this.vplMessage && !this.vplMessageIsWarning ? this.vplMessage : null,
				"warning": this.vplMessage && this.vplMessageIsWarning ? this.vplMessage : null,
				"error-tr": this.vplMessage && !this.vplMessageIsWarning ? this.i18n.translate(this.vplMessage) : null,
				"warning-tr": this.vplMessage && this.vplMessageIsWarning ? this.i18n.translate(this.vplMessage) : null,
				"robot": this.currentRobotIndex >= 0
					? this.robots[this.currentRobotIndex].runGlue.isConnected() && this.robots[this.currentRobotIndex].runGlue.getName()
					: null
			}
		};
		var dataStr = JSON.stringify(data);
		if (dataStr === this.logDataPrevious) {
			// avoid duplicates
			return;
		}
		this.logDataPrevious = dataStr;
	}

	this.loggers.forEach(function (logger) {
        try {
		  logger(data);
        } catch (e) {}
	});
};
