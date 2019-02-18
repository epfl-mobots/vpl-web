/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
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

	this.uiConfig = new A3a.vpl.UIConfig();
	this.commands = new A3a.vpl.Commands();

	/** @type {Array.<string>} */
	this.views = ["vpl"];

	this.program = new A3a.vpl.Program(A3a.vpl.mode.basic, this.uiConfig);

	this.vplCanvas = new A3a.vpl.Canvas(canvasEl);
	this.vplCanvas.state = {};

	/** @type {A3a.vpl.Canvas} */
	this.simCanvas = null;
	/** @type {A3a.vpl.VPLSim2DViewer} */
	this.sim2d = null;

	/** @type {A3a.vpl.RunGlue} */
	this.runGlue = null;

	this.useLocalStorage = false;
};

A3a.vpl.Application.initialized = false;

/** Change current view
	@param {Array.<string>} views array of "vpl", "src" and "sim"
	@param {{noVPL:(boolean|undefined),unlocked:(boolean|undefined),fromView:(string|undefined)}=} options
	noVPL:true to prevent vpl (default: false),
	unlocked:true (with "src") for source code editor in unlocked state (disconnected
	from vpl),
	fromView:v to change another view from view v (keep v, change other)
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
	}
	this.views = views;

	document.getElementById("src-editor").style.display = views.indexOf("src") >= 0 ? "block" : "none";

	if (this.sim2d != null) {
		this.simCanvas.hide();
	}
	this.vplCanvas.hide();
	this.editor.tbCanvas.hide();
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
					app.editor.setCode(app.program.getCode(app.program.currentLanguage));
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

	var onDraw = function () {
		views.indexOf("vpl") >= 0 && app.vplCanvas.redraw();
		views.indexOf("src") >= 0 && app.editor.tbCanvas.redraw();
		views.indexOf("sim") >= 0 && app.simCanvas.redraw();
	};
	if (this.vplCanvas) {
		this.vplCanvas.onDraw = onDraw;
	}
	if (this.editor.tbCanvas) {
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
	for (var i = 0; i < this.views.length; i++) {
		var relArea = verticalLayout
			? {
				xmin: 0,
				xmax: 1,
				ymin: i / this.views.length,
				ymax: (i + 1) / this.views.length
			} : {
				xmin: i / this.views.length,
				xmax: (i + 1) / this.views.length,
				ymin: 0,
				ymax: 1
			};
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
	this.editor.resize();
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
};
