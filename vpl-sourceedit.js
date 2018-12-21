/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Source editor for code generated by VPL
	@constructor
	@param {boolean} noVPL true if only text editor without VPL
	@param {string=} language
	@param {?A3a.vpl.UIConfig=} uiConfig
	@param {?A3a.vpl.RunGlue=} runGlue
*/
A3a.vpl.VPLSourceEditor = function (noVPL, language, uiConfig, runGlue) {
	this.noVPL = noVPL;
	this.language = language || A3a.vpl.defaultLanguage;
	this.runGlue = runGlue || null;
	this.code0 = "";	// from VPL, to restore when VPL lock is set
	this.isLockedWithVPL = true;
	/** @type {?function():{language:string,code:string}} */
	this.changeLanguage = null;
	this.teacherRole = false;
	this.customizationMode = false;
	this.uiConfig = uiConfig || new A3a.vpl.UIConfig();
	this.textEditor = new A3a.vpl.TextEditor("editor", "editor-lines");
	this.textEditor.setReadOnly(this.isLockedWithVPL);
	this.textEditor.onBreakpointChanged = function (bp) {
		window["vplBreakpointsFunction"] && window["vplBreakpointsFunction"](bp);
	};

	var canvasElement = document.getElementById("editorTBCanvas");
	this.tbCanvas = new A3a.vpl.Canvas(canvasElement);

	var self = this;

	// initial canvas resize
	this.resize();

	// editor control update
	document.getElementById("editor").addEventListener("input",
		function () {
			self.toolbarRender();
		},
		false);
	// editor tab key
	document.getElementById("editor").addEventListener("keydown", function (e) {
		if (e.keyCode === 9) {
			// prevent loss of focus in textarea
			e.preventDefault();
			e.cancelBubbles = true;
			var textarea = document.getElementById("editor");
			var text = textarea.value;
			var start = this.selectionStart, end = this.selectionEnd;
			text = text.slice(0, start) + "\t" + text.slice(end);
			self.textEditor.setContent(text);
			this.selectionStart = this.selectionEnd = start + 1;
			return false;
		}
		// normal behavior
		return true;
	}, false);

	this.toolbarRender();
};

/** Reset UI
	@return {void}
*/
A3a.vpl.VPLSourceEditor.prototype.resetUI = function () {
	this.uiConfig.reset();
};

/** Change role
	@param {boolean} b
	@return {void}
*/
A3a.vpl.VPLSourceEditor.prototype.setTeacherRole = function (b) {
	this.teacherRole = b;
};

/** Set the code generated from VPL
	@param {?string} code source code, or null to reset it
	@return {void}
*/
A3a.vpl.VPLSourceEditor.prototype.setCode = function (code) {
	if (code === null) {
		this.textEditor.setContent(this.code0);
	} else {
		this.code0 = code;
		this.textEditor.setContent(code);
	}
};

/** Get the current code
	@return {string}
*/
A3a.vpl.VPLSourceEditor.prototype.getCode = function () {
	return document.getElementById("editor").value.trim();
};

/** Check if source code matches vpl
	@return {boolean}
*/
A3a.vpl.VPLSourceEditor.prototype.doesMatchVPL = function () {
	return this.getCode() === this.code0.trim();
};

/** Select a text range
	@param {number} begin
	@param {number} end
*/
A3a.vpl.VPLSourceEditor.prototype.selectRange = function (begin, end) {
	this.textEditor.selectRange(begin, end);
};

/** Calculate the toolbar height
	@return {number}
*/
A3a.vpl.VPLSourceEditor.prototype.srcToolbarHeight = function () {
	var dims = this.tbCanvas.dims;
	return dims.controlSize + 2 * dims.interBlockSpace;
};

/** Add a control button, taking care of disabled ones
	@param {A3a.vpl.ControlBar} controlBar
	@param {string} id
	@param {A3a.vpl.Canvas.controlDraw} draw
	@param {?A3a.vpl.Canvas.controlAction=} action
	@param {?A3a.vpl.CanvasItem.doDrop=} doDrop
	@param {?A3a.vpl.CanvasItem.canDrop=} canDrop
	@param {boolean=} keepEnabled
	@return {void}
*/
A3a.vpl.VPLSourceEditor.prototype.addControl = function (controlBar, id, draw, action, doDrop, canDrop, keepEnabled) {
	var self = this;
	var canvas = controlBar.canvas;
	var disabled = this.uiConfig.isDisabled(id);
	if (this.customizationMode || !disabled) {
		controlBar.addControl(
			function (ctx, width, height, isDown) {
				draw(ctx, width, height, isDown);
				if (disabled) {
					canvas.disabledMark(0, 0, canvas.dims.controlSize, canvas.dims.controlSize);
				}
			},
			this.customizationMode && !keepEnabled
				? function (canvas, data, width, height, x, y, downEvent) {
					self.uiConfig.toggle(id);
					self.toolbarRender();
					return 1;
				}
				: action,
			doDrop, canDrop,
			id);
	}
};

/** Render toolbar for source code editor
	@return {void}
*/
A3a.vpl.VPLSourceEditor.prototype.toolbarRender = function () {
	// start with an empty canvas
	this.tbCanvas.clearItems();

	// top controls
	var canvasSize = this.tbCanvas.getSize();

	// top controls
	var controlBar = new A3a.vpl.ControlBar(this.tbCanvas);

	var self = this;

	// new
	this.addControl(controlBar, "src:new",
		// draw
		function (ctx, width, height, isDown) {
			var enabled = !self.isLockedWithVPL;
			ctx.fillStyle = isDown && enabled
				? self.tbCanvas.dims.controlDownColor
				: self.tbCanvas.dims.controlColor;
			ctx.fillRect(0, 0,
				self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(self.tbCanvas.dims.controlSize * 0.25,
				self.tbCanvas.dims.controlSize * 0.2);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.25,
				self.tbCanvas.dims.controlSize * 0.8);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
				self.tbCanvas.dims.controlSize * 0.8);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
				self.tbCanvas.dims.controlSize * 0.3);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.65,
				self.tbCanvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(self.tbCanvas.dims.controlSize * 0.65,
				self.tbCanvas.dims.controlSize * 0.2);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.65,
				self.tbCanvas.dims.controlSize * 0.3);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
				self.tbCanvas.dims.controlSize * 0.3);
			ctx.strokeStyle = enabled ? "white" : "#777";
			ctx.lineWidth = self.tbCanvas.dims.blockLineWidth;
			ctx.stroke();
		},
		// action
		function (ev) {
			if (!self.isLockedWithVPL) {
				self.textEditor.setContent("");
				self.tbCanvas.redraw();
			}
		},
		// doDrop
		null,
		// canDrop
		null);

	// save
	var isEditorEmpty = this.getCode().length === 0;
	this.addControl(controlBar, "src:save",
		// draw
		function (ctx, width, height, isDown) {
			ctx.fillStyle = isDown
				? self.tbCanvas.dims.controlDownColor
				: self.tbCanvas.dims.controlColor;
			ctx.fillRect(0, 0,
				self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(self.tbCanvas.dims.controlSize * 0.25,
				self.tbCanvas.dims.controlSize * 0.2);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.25,
				self.tbCanvas.dims.controlSize * 0.7);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.67,
				self.tbCanvas.dims.controlSize * 0.7);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.67,
				self.tbCanvas.dims.controlSize * 0.27);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.6,
				self.tbCanvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(self.tbCanvas.dims.controlSize * 0.6,
				self.tbCanvas.dims.controlSize * 0.2);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.6,
				self.tbCanvas.dims.controlSize * 0.27);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.67,
				self.tbCanvas.dims.controlSize * 0.27);
			ctx.strokeStyle = isEditorEmpty ? "#777" : "white";
			ctx.lineWidth = self.tbCanvas.dims.blockLineWidth;
			ctx.stroke();
			ctx.lineWidth = 2 * self.tbCanvas.dims.blockLineWidth;
			ctx.beginPath();
			ctx.moveTo(self.tbCanvas.dims.controlSize * 0.8,
				self.tbCanvas.dims.controlSize * 0.5);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.8,
				self.tbCanvas.dims.controlSize * 0.8);
			ctx.moveTo(self.tbCanvas.dims.controlSize * 0.7,
				self.tbCanvas.dims.controlSize * 0.7);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.8,
				self.tbCanvas.dims.controlSize * 0.8);
			ctx.lineTo(self.tbCanvas.dims.controlSize * 0.9,
				self.tbCanvas.dims.controlSize * 0.7);
			ctx.stroke();
		},
		// action
		function (ev) {
			if (!isEditorEmpty) {
				// var src = self.getCode();
				// var aesl = A3a.vpl.Program.toAESLFile(src);
				// A3a.vpl.Program.downloadText(aesl, "code.aesl");
				var json = window["vplProgram"].exportToJSON();
				A3a.vpl.Program.downloadText(json, "vpl.json", "application/json");
			}
		},
		// doDrop
		null,
		// canDrop
		null);

	// vpl
	if (!this.noVPL) {
		// switch to VPL
		this.addControl(controlBar, "src:vpl",
			// draw
			function (ctx, width, height, isDown) {
				var enabled = self.doesMatchVPL();
				ctx.save();
				ctx.fillStyle = isDown
					? self.tbCanvas.dims.controlDownColor
					: self.tbCanvas.dims.controlColor;
				ctx.fillRect(0, 0,
					self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
				ctx.beginPath();
				ctx.moveTo(self.tbCanvas.dims.controlSize * 0.25,
					self.tbCanvas.dims.controlSize * 0.2);
				ctx.lineTo(self.tbCanvas.dims.controlSize * 0.25,
					self.tbCanvas.dims.controlSize * 0.8);
				ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
					self.tbCanvas.dims.controlSize * 0.8);
				ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
					self.tbCanvas.dims.controlSize * 0.3);
				ctx.lineTo(self.tbCanvas.dims.controlSize * 0.65,
					self.tbCanvas.dims.controlSize * 0.2);
				ctx.closePath();
				ctx.moveTo(self.tbCanvas.dims.controlSize * 0.65,
					self.tbCanvas.dims.controlSize * 0.2);
				ctx.lineTo(self.tbCanvas.dims.controlSize * 0.65,
					self.tbCanvas.dims.controlSize * 0.3);
				ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
					self.tbCanvas.dims.controlSize * 0.3);
				ctx.strokeStyle = enabled ? "white" : "#777";
				ctx.lineWidth = self.tbCanvas.dims.blockLineWidth;
				ctx.stroke();
				ctx.fillStyle = "#99a";
				for (var y = 0.15; y < 0.6; y += 0.15) {
					ctx.fillRect(self.tbCanvas.dims.controlSize * 0.3,
						self.tbCanvas.dims.controlSize * (0.2 + y),
						self.tbCanvas.dims.controlSize * 0.4,
						self.tbCanvas.dims.controlSize * 0.10);
				}
				ctx.restore();
			},
			// action
			function (ev) {
				var enabled = self.doesMatchVPL();
				if (enabled) {
					window["vplProgram"].setView("vpl");
				}
			},
			// doDrop
			null,
			// canDrop
			null);

		// locked with VPL
		this.addControl(controlBar, "src:locked",
			// draw
			function (ctx, width, height, isDown) {
				ctx.save();
				ctx.fillStyle = isDown
					? self.tbCanvas.dims.controlDownColor
					: self.isLockedWithVPL
						? self.tbCanvas.dims.controlActiveColor
						: self.tbCanvas.dims.controlColor;
				ctx.fillRect(0, 0,
					self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
				ctx.strokeStyle = "white";
				ctx.lineWidth = self.tbCanvas.dims.blockLineWidth;
				ctx.fillStyle = self.isLockedWithVPL ? "#ddf" : "#99a";
				for (var y = 0.15; y < 0.6; y += 0.15) {
					ctx.fillRect(self.tbCanvas.dims.controlSize * 0.15,
						self.tbCanvas.dims.controlSize * (0 + y),
						self.tbCanvas.dims.controlSize * 0.4,
						self.tbCanvas.dims.controlSize * 0.10);
				}
				A3a.vpl.Canvas.lock(ctx,
					self.tbCanvas.dims.controlSize * 0.77,
					self.tbCanvas.dims.controlSize * 0.36,
					self.tbCanvas.dims.controlSize * 0.06,
					"white",
					!self.isLockedWithVPL);
	            ctx.fillStyle = self.isLockedWithVPL || isDown ? "white" : "#44a";
	            ctx.fillRect(self.tbCanvas.dims.controlSize * 0.1,
	                self.tbCanvas.dims.controlSize * 0.8,
	                self.tbCanvas.dims.controlSize * 0.8,
	                self.tbCanvas.dims.controlSize * 0.1);
				ctx.restore();
			},
			// action
			function (ev) {
				self.lockWithVPL(!self.isLockedWithVPL);
				self.tbCanvas.redraw();
			},
			// doDrop
			null,
			// canDrop
			null);
	}

	if (this.changeLanguage != null) {
		controlBar.addSpace();
		// change language
		this.addControl(controlBar, "src:language",
			// draw
			function (ctx, width, height, isDown) {
				/** @const */
				var languageAbbr = {"aseba": "Aa", "l2": "l2", "js": "js"};
				var s = self.tbCanvas.dims.controlSize;
				ctx.save();
				ctx.fillStyle = isDown
					? self.tbCanvas.dims.controlDownColor
					: self.tbCanvas.dims.controlColor;
				ctx.fillRect(0, 0, s, s);
				ctx.beginPath();
				for (var i = 0; i < 3; i++) {
					ctx.moveTo(s * 0.2, s * (0.2 + 0.1 * i));
					ctx.lineTo(s * 0.5, s * (0.2 + 0.1 * i));
				}
				ctx.strokeStyle = "white";
				ctx.lineWidth = self.tbCanvas.dims.blockLineWidth;
				ctx.stroke();
				for (var i = 0; i < 3; i++) {
					var phi = 2 * (i + 0.25) / 3 * Math.PI;
					A3a.vpl.Canvas.drawArcArrow(ctx, 0.75 * s, 0.3 * s, 0.15 * s,
						phi - Math.PI * 0.3,
						phi + Math.PI * 0.3,
						{
							arrowAtStart: false,
							arrowSize: 3 * self.tbCanvas.dims.blockLineWidth,
							style: "white"
						});
				}
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.font = "bold " + Math.round(s / 3).toString(10) + "px sans-serif";
				ctx.fillStyle = "white";
				ctx.fillText(languageAbbr[self.language], s * 0.5, s * 0.7);
				ctx.restore();
			},
			// action
			function (ev) {
				var r = self.changeLanguage();
				self.language = r.language;
				if (self.isLockedWithVPL) {
					self.setCode(r.code);
				}
			},
			// doDrop
			null,
			// canDrop
			null);
	}

	controlBar.addStretch();

	if (this.runGlue) {
		// run
		this.addControl(controlBar, "src:run",
			// draw
			function (ctx, width, height, isDown) {
				ctx.fillStyle = isDown
					? self.tbCanvas.dims.controlDownColor
					: self.tbCanvas.dims.controlColor;
				ctx.fillRect(0, 0,
					self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
				ctx.beginPath();
				ctx.moveTo(self.tbCanvas.dims.controlSize * 0.3,
					self.tbCanvas.dims.controlSize * 0.25);
				ctx.lineTo(self.tbCanvas.dims.controlSize * 0.3,
					self.tbCanvas.dims.controlSize * 0.75);
				ctx.lineTo(self.tbCanvas.dims.controlSize * 0.8,
					self.tbCanvas.dims.controlSize * 0.5);
				ctx.closePath();
				ctx.fillStyle = self.runGlue.isEnabled(self.language) ? "white" : "#777";
				ctx.fill();
			},
			// action
			function (ev) {
				var code = self.getCode();
				self.runGlue.run(code, self.language);
			},
			// doDrop
			null,
			// canDrop
			null);

		// stop
		this.addControl(controlBar, "src:stop",
			// draw
			function (ctx, width, height, isDown) {
				ctx.fillStyle = isDown
					? self.tbCanvas.dims.controlDownColor
					: self.tbCanvas.dims.controlColor;
				ctx.fillRect(0, 0,
					self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
				ctx.fillStyle = self.runGlue.isEnabled(self.language) ? "white" : "#777";
				ctx.fillRect(self.tbCanvas.dims.controlSize * 0.28,
					self.tbCanvas.dims.controlSize * 0.28,
					self.tbCanvas.dims.controlSize * 0.44, self.tbCanvas.dims.controlSize * 0.44);
				ctx.fill();
			},
			// action
			function (ev) {
				self.runGlue.stop(self.language);
			},
			// doDrop
			null,
			// canDrop
			null);

		if (window["vplSim"]) {
			controlBar.addSpace();

			// simulator view
			this.addControl(controlBar, "src:sim",
				// draw
				function (ctx, width, height, isDown) {
					ctx.fillStyle = isDown
						? self.tbCanvas.dims.controlDownColor
						: self.tbCanvas.dims.controlColor;
					ctx.fillRect(0, 0,
						self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
					ctx.save();
					ctx.translate(self.tbCanvas.dims.controlSize / 2, self.tbCanvas.dims.controlSize * 0.35);
					ctx.scale(0.4, 0.4);
					ctx.rotate(0.2);
					ctx.beginPath();
					// middle rear
					ctx.moveTo(0, 0.5 * self.tbCanvas.dims.controlSize);
					// right side
					ctx.lineTo(0.5 * self.tbCanvas.dims.controlSize, 0.5 * self.tbCanvas.dims.controlSize);
					ctx.lineTo(0.5 * self.tbCanvas.dims.controlSize, -0.25 * self.tbCanvas.dims.controlSize);
					ctx.bezierCurveTo(0.3 * self.tbCanvas.dims.controlSize, -0.5 * self.tbCanvas.dims.controlSize,
						self.tbCanvas.dims.controlSize * 0.02, -0.5 * self.tbCanvas.dims.controlSize,
						0, -0.5 * self.tbCanvas.dims.controlSize);
					// left side
					ctx.lineTo(0, -0.5 * self.tbCanvas.dims.controlSize);
					ctx.bezierCurveTo(-0.02 * self.tbCanvas.dims.controlSize, -0.5 * self.tbCanvas.dims.controlSize,
						-0.3 * self.tbCanvas.dims.controlSize, -0.5 * self.tbCanvas.dims.controlSize,
						-0.5 * self.tbCanvas.dims.controlSize, -0.25 * self.tbCanvas.dims.controlSize);
					ctx.lineTo(-0.5 * self.tbCanvas.dims.controlSize, 0.5 * self.tbCanvas.dims.controlSize);
					ctx.closePath();
					ctx.fillStyle = "white";
					ctx.fill();
					ctx.beginPath();
					ctx.arc(self.tbCanvas.dims.controlSize, 0.5 * self.tbCanvas.dims.controlSize, 1.4 * self.tbCanvas.dims.controlSize,
						-3.2, -3.8, true);
					ctx.strokeStyle = "#999";
					ctx.lineWidth = 0.2 * self.tbCanvas.dims.controlSize;
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(self.tbCanvas.dims.controlSize, 0.5 * self.tbCanvas.dims.controlSize, 0.6 * self.tbCanvas.dims.controlSize,
						-3.3, -3.8, true);
					ctx.stroke();

					ctx.restore();
				},
				// action
				function (ev) {
					window["vplProgram"].setView("sim");
				},
				// doDrop
				null,
				// canDrop
				null);
		}

		controlBar.addStretch();
	}

	if (this.teacherRole) {
		if (self.customizationMode) {
			this.addControl(controlBar, "src:teacher-reset",
				// draw
				function (ctx, width, height, isDown) {
					ctx.fillStyle = "#a00";
					ctx.fillRect(0, 0,
						self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
					ctx.beginPath();
					ctx.moveTo(self.tbCanvas.dims.controlSize * 0.25,
						self.tbCanvas.dims.controlSize * 0.2);
					ctx.lineTo(self.tbCanvas.dims.controlSize * 0.25,
						self.tbCanvas.dims.controlSize * 0.8);
					ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
						self.tbCanvas.dims.controlSize * 0.8);
					ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
						self.tbCanvas.dims.controlSize * 0.3);
					ctx.lineTo(self.tbCanvas.dims.controlSize * 0.65,
						self.tbCanvas.dims.controlSize * 0.2);
					ctx.closePath();
					ctx.moveTo(self.tbCanvas.dims.controlSize * 0.65,
						self.tbCanvas.dims.controlSize * 0.2);
					ctx.lineTo(self.tbCanvas.dims.controlSize * 0.65,
						self.tbCanvas.dims.controlSize * 0.3);
					ctx.lineTo(self.tbCanvas.dims.controlSize * 0.75,
						self.tbCanvas.dims.controlSize * 0.3);
					ctx.strokeStyle = "white";
					ctx.lineWidth = self.tbCanvas.dims.blockLineWidth;
					ctx.stroke();
					ctx.fillStyle = "white";
					A3a.vpl.Canvas.drawHexagonalNut(ctx,
						self.tbCanvas.dims.controlSize * 0.63,
						self.tbCanvas.dims.controlSize * 0.7,
						self.tbCanvas.dims.controlSize * 0.2);
				},
				// action
				function (ev) {
					self.resetUI();
					self.toolbarRender();
				},
				// doDrop
				null,
				// canDrop
				null,
				true);
		}
		this.addControl(controlBar, "src:teacher",
			// draw
			function (ctx, width, height, isDown) {
				ctx.fillStyle = isDown
					? self.customizationMode ? "#f50" : "#d00"
					: self.customizationMode ? "#d10" : "#a00";
				ctx.fillRect(0, 0,
					self.tbCanvas.dims.controlSize, self.tbCanvas.dims.controlSize);
				ctx.fillStyle = "white";
				A3a.vpl.Canvas.drawHexagonalNut(ctx,
					self.tbCanvas.dims.controlSize * 0.5,
					self.tbCanvas.dims.controlSize * 0.4,
					self.tbCanvas.dims.controlSize * 0.27);
				ctx.fillStyle = self.customizationMode || isDown ? "white" : "#c66";
				ctx.fillRect(self.tbCanvas.dims.controlSize * 0.1,
					self.tbCanvas.dims.controlSize * 0.8,
					self.tbCanvas.dims.controlSize * 0.8,
					self.tbCanvas.dims.controlSize * 0.1);
			},
			// action
			function (ev) {
				self.customizationMode = !self.customizationMode;
				self.toolbarRender();
			},
			// doDrop
			null,
			// canDrop
			null,
			true);
	}

	controlBar.calcLayout(this.tbCanvas.dims.margin, canvasSize.width - this.tbCanvas.dims.margin,
		this.tbCanvas.dims.controlSize,
		this.tbCanvas.dims.interBlockSpace, 2 * this.tbCanvas.dims.interBlockSpace);
	controlBar.addToCanvas();
	this.tbCanvas.redraw();
};

/** Change the lock status
	@param {boolean} b
	@return {void}
*/
A3a.vpl.VPLSourceEditor.prototype.lockWithVPL = function (b) {
	this.isLockedWithVPL = b;
	if (b) {
		this.textEditor.setContent(this.code0);
	}
	this.textEditor.setReadOnly(b);
	this.toolbarRender();
};

/** Resize the source code editor
	@return {void}
*/
A3a.vpl.VPLSourceEditor.prototype.resize = function () {
	var width = window.innerWidth;
	var height = window.innerHeight;
	if (window["vplDisableResize"]) {
		var bnd = this.tbCanvas.canvas.getBoundingClientRect();
		width = bnd.width;
		height = bnd.height;
	}

	this.tbCanvas.dims = this.tbCanvas.dims;
	this.tbCanvas.resize(width, this.srcToolbarHeight());
	this.tbCanvas.canvas.style.height = this.tbCanvas.height + "px";
	this.toolbarRender();
	var editor = document.getElementById("editor");
	editor.parentElement.style.height = (window.innerHeight - this.tbCanvas.canvas.getBoundingClientRect().height) + "px";
};

/** Set the focus to the editor
	@return {void}
*/
A3a.vpl.VPLSourceEditor.prototype.focus = function () {
	document.getElementById("editor").focus();
	this.tbCanvas.redraw();	// update toolbar state
};
