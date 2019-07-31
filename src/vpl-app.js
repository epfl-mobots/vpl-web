/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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

	this.uiConfig = new A3a.vpl.UIConfig();
	var self = this;
	this.commands = new A3a.vpl.Commands(function (data) {
		self.log(data);
	});

	/** @type {Array.<string>} */
	this.views = ["vpl"];
	/** @type {Object.<string,number>} */
	this.viewRelativeSizes = {
		"vpl": 1,
		"src": 1,
		"sim": 1
	};

	/** @type {A3a.vpl.About} */
	this.aboutBox = null;
	/** @type {A3a.vpl.Load} */
	this.loadBox = null;

	this.program = new A3a.vpl.Program(A3a.vpl.mode.basic, this.uiConfig);
	this.program.setLogger(function (data) {
		self.log(data);
	});

	this.vplMessage = "";
	this.vplMessageIsWarning = false;	// false for error, true for warning

	this.vplCanvas = new A3a.vpl.Canvas(canvasEl, {css: this.css});
	this.vplCanvas.state = {};

	this.cssForHTMLDocument = "";

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

	/** @type {Array.<A3a.vpl.Application.Logger>} */
	this.loggers = [];
};

/** @typedef {function(Object=):void}
*/
A3a.vpl.Application.Logger;

A3a.vpl.Application.initialized = false;

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
	var width = window.innerWidth;
	var height = window.innerHeight;
	this.layout(width < height);
	if (window["vplDisableResize"]) {
		var bnd = this.vplCanvas.canvas.getBoundingClientRect();
		width = bnd.width;
		height = bnd.height;
	}

	// vpl, editor and simulator
	this.vplCanvas.resize(width, height);
	if (this.editor) {
		this.editor.resize();
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
	this.aboutBox.center();
};

/** Stop robot
	@return {void}
*/
A3a.vpl.Application.prototype.stopRobot = function () {
	if (this.currentRobotIndex >= 0) {
		var stopBlock = A3a.vpl.BlockTemplate.findByName("!stop");
		var language = this.program.currentLanguage;
		var stopGenCode = stopBlock && stopBlock.genCode[language];
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
		// default data: program metadata
		data = {
	        "type": "vpl-changed",
	        "data": {
	            "nrules": this.program.program.length,
				"nblocks": this.program.program.reduce(function (acc, cur) {
					return acc + cur;
				}, 0),
				"err": this.vplMessage
			}
		};
	}

	this.loggers.forEach(function (logger) {
		logger(data);
	});
};
