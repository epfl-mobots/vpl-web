/*
	Copyright 2018-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Implementation of the Thymio II simulator and its user interface.

*/

/** Playground for robot simulator
	@constructor
	@param {number} width
	@param {number} height
*/
A3a.vpl.Playground = function (width, height) {
	this.width = width;
	this.height = height;
};

/** 2D viewer for robot simulator
	@constructor
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Robot} robot
	@param {?A3a.vpl.UIConfig=} uiConfig
*/
A3a.vpl.VPLSim2DViewer = function (canvas, robot, uiConfig) {
	var self = this;

	this.uiConfig = uiConfig || new A3a.vpl.UIConfig();

	this.robot = robot;
	this.running = false;
	this.paused = false;
	this.penDown = false;
	this.renderingPending = false;

	this.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.ground;

	this.playground = new A3a.vpl.Playground(10 * this.robot.robotSize, 7.07 * this.robot.robotSize);	// A4 ratio
	var posMargin = this.robot.robotSize;
	this.robot["setPositionLimits"](-this.playground.width / 2 + posMargin,
		this.playground.width / 2 - posMargin,
		-this.playground.height / 2 + posMargin,
		this.playground.height / 2 - posMargin);

	/** @type {Image} */
	this.groundImage = null;
	/** @type {Image} */
	this.disabledGroundImage = null;
	this.groundCanvas = /** @type {HTMLCanvasElement} */(document.createElement("canvas"));
	this.fuzzyGroundCanvas = /** @type {HTMLCanvasElement} */(document.createElement("canvas"));
	this.groundCanvasDirty = false;
	/** @type {Image} */
	this.heightImage = null;
	/** @type {Image} */
	this.disabledHeightImage = null;
	this.heightCanvas = /** @type {HTMLCanvasElement} */(document.createElement("canvas"));
	/** @type {A3a.vpl.Obstacles} */
	this.obstacles = new A3a.vpl.Obstacles();
	this.hasObstacles = false;
	/** @type {?string} */
	this.obstacleSVG = null;
	/** @type {?string} */
	this.disabledObstacleSVG = null;
	this.setPlaygroundLimits();
	this.robot.onMove =
		/** @type {A3a.vpl.VirtualThymio.OnMoveFunction} */(function () {
			self.updateGroundSensors();
			self.updateProximitySensors();
			self.updateAccelerometers();
		});

	this.simCanvas = canvas;
	this.simCanvas.state = {};

	this.sizeInitialized = false;
};

/** @enum {string}
*/
A3a.vpl.VPLSim2DViewer.playgroundMap = {
	ground: "ground",
	obstacle: "obstacle",
	height: "height"
};

/** Reset UI
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.resetUI = function () {
	this.uiConfig.reset();
};

/** Change role
	@param {boolean} b
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.setTeacherRole = function (b) {
	this.teacherRole = b;
};

A3a.vpl.VPLSim2DViewer.prototype.copyGroundToFuzzy = function () {
	var ctx = this.fuzzyGroundCanvas.getContext("2d");
	ctx.filter = "blur(" + (this.fuzzyGroundCanvas.width / 300).toFixed(1) + "px)";
	// render groundCanvas on a white background
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, this.fuzzyGroundCanvas.width, this.fuzzyGroundCanvas.height);
	ctx.drawImage(this.groundCanvas, 0, 0);
};

/** Restore ground (clear pen traces)
	@return {void}
*/
A3a.vpl.Application.prototype.restoreGround = function () {
	var sim2d = this.sim2d;
	if (sim2d.groundImage) {
		sim2d.groundCanvas.width = sim2d.groundImage.width;
		sim2d.groundCanvas.height = sim2d.groundImage.height;
		var ctx = sim2d.groundCanvas.getContext("2d");
		// render img on a white background
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, sim2d.groundImage.width, sim2d.groundImage.height);
		ctx.drawImage(sim2d.groundImage, 0, 0, sim2d.groundImage.width, sim2d.groundImage.height);
	} else {
		sim2d.groundCanvas.width = sim2d.simCanvas ? sim2d.simCanvas.width : 800;
		sim2d.groundCanvas.height = sim2d.groundCanvas.width * sim2d.playground.height / sim2d.playground.width;
		var ctx = sim2d.groundCanvas.getContext("2d");
		ctx.fillStyle = "white";
		// clear to white
		ctx.fillRect(0, 0, sim2d.groundCanvas.width, sim2d.groundCanvas.height);
	}
	sim2d.fuzzyGroundCanvas.width = sim2d.groundCanvas.width;
	sim2d.fuzzyGroundCanvas.height = sim2d.groundCanvas.height;
	sim2d.groundCanvasDirty = false;
	sim2d.copyGroundToFuzzy();
	this.renderSim2dViewer();
};

/** Set or change ground image
	@param {Image} img
	@return {void}
*/
A3a.vpl.Application.prototype.setGroundImage = function (img) {
	this.sim2d.groundImage = img;
	this.restoreGround();
	this.sim2d.updateGroundSensors();
	this.renderSim2dViewer();
};

/** Draw pen trace
	@param {A3a.vpl.Robot.TraceShape} shape
	@param {Array.<number>} param
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.drawPen = function (shape, param) {
	if (this.penDown) {
		var ctx = this.groundCanvas.getContext("2d");
		ctx.save();
		ctx.translate(this.groundCanvas.width / 2, this.groundCanvas.height / 2);
		ctx.scale(this.groundCanvas.width / this.playground.width, -this.groundCanvas.height / this.playground.height);
		ctx.beginPath();
		switch (shape) {
		case A3a.vpl.Robot.TraceShape.line:
			ctx.moveTo(param[0], param[1]);
			ctx.lineTo(param[2], param[3]);
			break;
		case A3a.vpl.Robot.TraceShape.arc:
			ctx.arc(param[0], param[1], Math.abs(param[2]), param[3], param[4], param[2] < 0);
			break;
		}
		ctx.strokeStyle = "#060";
		ctx.lineCap = "round";
		ctx.lineWidth = 0.1 * this.robot.robotSize;
		ctx.stroke();
		ctx.restore();
		this.groundCanvasDirty = true;
		this.copyGroundToFuzzy();
	}
};

/** Set or change height image
	@param {Image} img
	@return {void}
*/
A3a.vpl.Application.prototype.setHeightImage = function (img) {
	var sim2d = this.sim2d;
	sim2d.heightImage = img;
	if (sim2d.heightImage) {
		sim2d.heightCanvas.width = sim2d.heightImage.width;
		sim2d.heightCanvas.height = sim2d.heightImage.height;
		var ctx = sim2d.heightCanvas.getContext("2d");
		// render img on a white background
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, sim2d.heightImage.width, sim2d.heightImage.height);
		ctx.drawImage(sim2d.heightImage, 0, 0, sim2d.heightImage.width, sim2d.heightImage.height);
	} else {
		sim2d.heightCanvas.width = 1;
		sim2d.heightCanvas.height = 1;
	}
	sim2d.updateAccelerometers();
	this.renderSim2dViewer();
};

/** Initialize obstacles to playground limits
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.setPlaygroundLimits = function () {
	this.obstacles.clear();

	// playground limits
	this.obstacles.add(new A3a.vpl.ObstaclePoly(
		[
			-this.playground.width / 2,
			this.playground.width / 2,
			this.playground.width / 2,
			-this.playground.width / 2
		],
		[
			-this.playground.height / 2,
			-this.playground.height / 2,
			this.playground.height / 2,
			this.playground.height / 2
		],
		true));
};

/** Set or change obstacle image
	@param {?string} svgSrc
	@return {void}
*/
A3a.vpl.Application.prototype.setObstacleImage = function (svgSrc) {
	var sim2d = this.sim2d;

	sim2d.setPlaygroundLimits();

	// add svg
	sim2d.obstacleSVG = svgSrc;
	if (svgSrc) {
		var svg = new SVG(svgSrc);
		// scaling from svg.viewBox ([xmin,ymin,width,height]) to centered sim2d.playground
		var scx = sim2d.playground.width / svg.viewBox[2];
		var ox = -sim2d.playground.width * (0.5 + svg.viewBox[0] / svg.viewBox[2]);
		var scy = -sim2d.playground.height / svg.viewBox[3];	// positive y upward
		var oy = sim2d.playground.height * (0.5 + svg.viewBox[1] / svg.viewBox[3]);
		svg.draw(null, {
			cb: {
				line: function (x, y, isPolygon) {
					sim2d.obstacles.add(new A3a.vpl.ObstaclePoly(
						x.map(function (x1) { return ox + scx * x1; }),
						y.map(function (y1) { return oy + scy * y1; }),
						isPolygon));
				},
				circle: function (x, y, r) {
					sim2d.obstacles.add(new A3a.vpl.ObstacleCylinder(
						ox + scx * x,
						oy + scy * y,
						(scx - scy) / 2 * r));
				}
			}
		});
	}
	sim2d.hasObstacles = svgSrc != null;

	sim2d.updateProximitySensors();
	this.renderSim2dViewer();
};

/** Get the ground value (red) at the specified position
	@param {number} x (0 = left)
	@param {number} y (0 = bottom)
	@return {number} ground value, from 0 (black) to 1 (white)
*/
A3a.vpl.VPLSim2DViewer.prototype.groundValue = function (x, y) {
	// scale position to (i,j)
	var i = Math.round(this.fuzzyGroundCanvas.width * (x + this.playground.width / 2) / this.playground.width);
	var j = Math.round(this.fuzzyGroundCanvas.height * (this.playground.height / 2 - y) / this.playground.height);
	var pixel = this.fuzzyGroundCanvas.getContext("2d").getImageData(i, j, 1, 1).data;
	return pixel[0] / 255;
};

/** Get the height value (minus mean rgb) at the specified position
	@param {number} x (0 = left)
	@param {number} y (0 = bottom)
	@return {number} height value, from 0 (black) to -1 (white)
*/
A3a.vpl.VPLSim2DViewer.prototype.heightValue = function (x, y) {
	if (this.heightImage == null) {
		// no height image: flat ground
		return 0;
	}
	// scale position to (i,j)
	var i = Math.round(this.heightCanvas.width * (x + this.playground.width / 2) / this.playground.width);
	var j = Math.round(this.heightCanvas.height * (this.playground.height / 2 - y) / this.playground.height);
	var pixel = this.heightCanvas.getContext("2d").getImageData(i, j, 1, 1).data;
	return -(pixel[0] + pixel[1] + pixel[2]) / 765;
};

/** Update the values of the ground sensors
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.updateGroundSensors = function () {
	// from 0 (black) to 1 (white)
	var g = [];
	for (var i = 0; i < 2; i++) {
		// ground sensor positions
		var x = this.robot.pos[0] +
			this.robot.groundSensorLon * Math.cos(this.robot.theta) +
			(i === 0 ? -1 : 1) * this.robot.groundSensorLat * Math.sin(this.robot.theta);
		var y = this.robot.pos[1] +
			this.robot.groundSensorLon * Math.sin(this.robot.theta) -
			(i === 0 ? -1 : 1) * this.robot.groundSensorLat * Math.cos(this.robot.theta);
		// ground value at (x, y)
		g.push(this.groundValue(x, y) + this.robot.noise(0.05));
	}
	this.robot["set"]("prox.ground.delta", g);
};

/** Update the values of the proximity sensors
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.updateProximitySensors = function () {
	// from 0 (nothing close) to 1 (close)

	/** Mapping from distance to sensor value in [0,1]
		@param {number} dist
		@return {number} sensor value
	*/
	function sensorMapping(dist) {
		/** @const */
		var dmin = 100;
		/** @const */
		var dmax = 300;
		/** @const */
		var xi = 50;
		// parabole from (dmin,1) to (dmax,0) with minimum at dmax
		return dist < dmin ? 1 : dist > dmax ? 0 :
			(dist - dmax) * (dist - dmax) / ((dmax - dmin) * (dmax - dmin));
	}

	var costh = Math.cos(this.robot.theta);
	var sinth = Math.sin(this.robot.theta);
	var prox = [
		{lon: 70, lat: 60, phi: 0.7},
		{lon: 85, lat: 30, phi: 0.35},
		{lon: 95, lat: 0, phi: 0},
		{lon: 85, lat: -30, phi: -0.35},
		{lon: 70, lat: -60, phi: -0.7},
		{lon: -25, lat: 35, phi: 2.8},
		{lon: -25, lat: -35, phi: -2.8}
	].map(function (p) {
		var dist = this.obstacles.distance(
			this.robot.pos[0] + p.lon * costh - p.lat * sinth,
			this.robot.pos[1] + p.lon * sinth + p.lat * costh,
			this.robot.theta + p.phi);
		return sensorMapping(dist + this.robot.noise(0.01 * this.robot.r));
	}, this);

	this.robot["set"]("prox.horizontal", prox);
};

/** Update the values of the proximity sensors
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.updateAccelerometers = function () {
	// relative ground contact positions (assume small angles)
	var lonContact = [
		0,	// left
		0,	// right
		this.robot.r	// front
	];
	var latContact = [
		-this.robot.r,	// left
		this.robot.r,	// right
		0	// front
	];
	// from 0 (black) to 1 (white)
	var h = [];
	for (var i = 0; i < 3; i++) {
		// ground contact positions
		var x = this.robot.pos[0] +
			lonContact[i] * Math.cos(this.robot.theta) +
			latContact[i] * Math.sin(this.robot.theta);
		var y = this.robot.pos[1] +
			lonContact[i] * Math.sin(this.robot.theta) -
			latContact[i] * Math.cos(this.robot.theta);
		// height value at (x, y)
		h.push(this.heightValue(x, y));	// white=low, black=high
	}
	// convert 3 heights to roll and pitch angles
	var gain = 200;
	var roll = gain * (h[1] - h[0]) / (2 * this.robot.r);
	var pitch = gain * (h[2] - (h[0] + h[1]) / 2) / this.robot.groundSensorLon;
	// convert roll and pitch to accelerations along x (left), y (forward), z (down) (g=1)
	var acc = [
		roll + this.robot.noise(0.02),
		pitch + this.robot.noise(0.02),
		Math.sqrt(1 - roll * roll - pitch * pitch) + this.robot.noise(0.02)
	];
	this.robot["set"]("acc", acc);
};

/** Whether simulator requests dragged files as images or svg text
	@return {boolean} true for svg text
*/
A3a.vpl.VPLSim2DViewer.prototype.wantsSVG = function () {
	return this.currentMap === A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle;
};

/** Set or change playground image for the currently-selected type (ground, height or obstacles)
	@param {Image} img
	@param {A3a.vpl.VPLSim2DViewer.playgroundMap=} map map (default: currentMap)
	@return {void}
*/
A3a.vpl.Application.prototype.setImage = function (img, map) {
	switch (map || this.sim2d.currentMap) {
	case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
		this.sim2d.disabledGroundImage = img == null ? this.sim2d.groundImage : null;
		this.setGroundImage(img);
		break;
	case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
		this.sim2d.disabledHeightImage = img == null ? this.sim2d.heightImage : null;
		this.setHeightImage(img);
		break;
	}
};

/** Set or change playground svg image for the obstacles
	@param {?string} svgSrc
	@param {A3a.vpl.VPLSim2DViewer.playgroundMap=} map map (default: currentMap)
	@return {void}
*/
A3a.vpl.Application.prototype.setSVG = function (svgSrc, map) {
	switch (map || this.sim2d.currentMap) {
	case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
		this.sim2d.disabledObstacleSVG = svgSrc == null ? this.sim2d.obstacleSVG : null;
		this.setObstacleImage(svgSrc);
		break;
	}
};

/** Set or change audio file
	@param {string} filename
	@param {?ArrayBuffer} audioArrayBuffer
	@return {void}
*/
A3a.vpl.Application.prototype.setAudio = function (filename, audioArrayBuffer) {
	this.sim2d.robot["setFile"](filename, audioArrayBuffer);
};

/** Start simulator, rendering once if suspended or continuously else
	@param {boolean} suspended
	@return {void}
*/
A3a.vpl.Application.prototype.start = function (suspended) {
	this.sim2d.paused = suspended;
	this.sim2d.running = !suspended;
	this.renderSim2dViewer();
};

/** Convert rgb color from array[3] in [0,1] to css
	@param {Array.<number>} rgb
	@return {string}
*/
A3a.vpl.VPLSim2DViewer.color = function (rgb) {
	var rgb1 = [
		rgb[0],
		Math.max(0.2 + 0.8 * rgb[1], rgb[2] / 2),
		rgb[2]
	];
	var max = Math.max(rgb1[0], Math.max(rgb1[1], rgb1[2]));
	return "rgb(" +
		rgb1.map(function (x) {
				return Math.round(225 * (1 - max) + (30 + 225 * max) * x);
			}).join(",") +
		")";
};

/** Make a function suitable for ControlBar doOver callback
	@return {function(string):void} function which displays hint if it has changed
*/
A3a.vpl.Application.prototype.createSimControlBarDoOverFun = function () {
	var app = this;

	return function (id) {
		if (app.simHint !== id) {
			app.simHint = id;
			app.requestRendering();
		}
	};
};

A3a.vpl.Application.prototype.createSim2dToolbar = function (toolbarConfig,
	toolbarBox, toolbarSeparatorBox, toolbarItemBoxes) {
	// top controls
	var controlBar = new A3a.vpl.ControlBar(this.simCanvas);
	controlBar.setButtons(this,
		toolbarConfig,
		["sim", "top"],
		this.sim2d.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
		this.sim2d.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
	controlBar.calcLayout(toolbarBox, toolbarItemBoxes, toolbarSeparatorBox);
	return controlBar;
};

/** Render viewer
	@return {void}
*/
A3a.vpl.Application.prototype.renderSim2dViewer = function () {
	var app = this;
	var sim2d = this.sim2d;
	var robot = sim2d.robot;
	var simCanvas = this.simCanvas;

	if (!simCanvas.visible) {
		return;
	}

	if (!sim2d.sizeInitialized) {
		// initial canvas resize
		sim2d.sizeInitialized = true;
		sim2d.resize(this);
		this.restoreGround();
	}

	// start with an empty canvas
	simCanvas.clearItems();

	// toolbar button boxes and height
	var toolbarConfig = sim2d.toolbarConfig || this.simToolbarConfig;
	var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, toolbarConfig, ["sim", "top"]);
	var toolbarItemHeight = A3a.vpl.ControlBar.maxBoxHeight(toolbarItemBoxes);

	// boxes
	var canvasSize = simCanvas.getSize();
	simCanvas.recalcSize();

	var viewBox = simCanvas.css.getBox({tag: "view", clas: ["sim"]});
	var smallButtonBox = simCanvas.css.getBox({tag: "button", clas: ["sim", "event"]});
	var robotControlBox = simCanvas.css.getBox({tag: "sim-controller"});
	var separatorControlBox = simCanvas.css.getBox({tag: "separator", id: "sim-controller-separator"});
	var separatorBox = simCanvas.css.getBox({tag: "separator", clas: ["sim", "top"]});
	var toolbarBox = simCanvas.css.getBox({tag: "toolbar", clas: ["sim", "top"]});
	var playgroundAreaBox = simCanvas.css.getBox({tag: "sim-playground-area"});
	var playgroundBox = simCanvas.css.getBox({tag: "sim-playground"});

	// box sizes
	viewBox.setTotalWidth(canvasSize.width);
	viewBox.setTotalHeight(canvasSize.height);
	viewBox.setPosition(0, 0);
	var smallBtnSize = Math.max(smallButtonBox.width, smallButtonBox.height);
	robotControlBox.width = 3 * smallButtonBox.totalWidth();
	robotControlBox.setTotalHeight(viewBox.height);
	robotControlBox.setPosition(viewBox.x + viewBox.width - robotControlBox.totalWidth(), viewBox.y);
	toolbarBox.setTotalWidth(viewBox.width - robotControlBox.totalWidth());
	toolbarBox.height = toolbarItemHeight;
	toolbarBox.setPosition(viewBox.x, viewBox.y);
	playgroundAreaBox.setTotalWidth(viewBox.width - robotControlBox.totalWidth());
	playgroundAreaBox.setTotalHeight(viewBox.height - toolbarBox.totalHeight());
	playgroundAreaBox.setPosition(viewBox.x, viewBox.y + toolbarBox.totalHeight());

	// view (background)
	simCanvas.addDecoration(function (ctx) {
		viewBox.draw(ctx);
	});

	// top controls
	var controlBar = this.createSim2dToolbar(toolbarConfig, toolbarBox, separatorBox, toolbarItemBoxes);
	controlBar.addToCanvas(toolbarBox, toolbarItemBoxes,
		this.createSimControlBarDoOverFun());

	// add buttons for events
	simCanvas.addDecoration(function (ctx) {
		robotControlBox.draw(ctx);
		// ignore other boxes
	});

	/** @type {Array.<A3a.vpl.CanvasItem>} */
	var simControls = [];

	/** Create a doOver function for the specified button id
		@param {string} id
		@return {A3a.vpl.CanvasItem.doOver}
	*/
	function createDoOverFun(id) {
		return function () {
			if (app.simHint !== id) {
				app.simHint = id;
				app.requestRendering();
			}
		};
	}

	function drawButton(id, ctx, box, isPressed) {
		var bnds = (sim2d.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS)(id, simCanvas.dims);
		var sc = Math.min(box.width / (bnds.xmax - bnds.xmin),
			box.height / (bnds.ymax - bnds.ymin));
		ctx.save();
		ctx.translate(-bnds.xmin, -bnds.ymin);
		ctx.scale(sc, sc);
		(sim2d.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS)(app, id,
			ctx, simCanvas.dims, simCanvas.css, ["sim", "event"], null,
			true, false, isPressed);
		ctx.restore();
	}

	var yRobotControl = robotControlBox.y + smallButtonBox.offsetTop();

	// forward
	simControls.push(simCanvas.addControl(
		robotControlBox.x + smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(),
		yRobotControl,
		smallButtonBox,
		// draw
		function (ctx, box, isPressed) {
			drawButton("sim-event:forward", ctx, box, isPressed);
		},
		{
			doMouseDown: function (ev) {
				robot["set"]("button.forward", true);
				robot["sendEvent"]("button.forward", null);
			},
			doMouseUp: function (ev) {
				robot["set"]("button.forward", false);
				robot["sendEvent"]("button.forward", null);
			},
			doOver: createDoOverFun("sim:btn-button.forward")
		},
		"button.forward"));
	// left
	yRobotControl += smallButtonBox.totalHeight();
	simControls.push(simCanvas.addControl(
		robotControlBox.x + smallButtonBox.offsetLeft(),
		yRobotControl,
		smallButtonBox,
		// draw
		function (ctx, box, isPressed) {
			drawButton("sim-event:left", ctx, box, isPressed);
		},
		{
			doMouseDown: function (ev) {
				robot["set"]("button.left", true);
				robot["sendEvent"]("button.left", null);
			},
			doMouseUp: function (ev) {
				robot["set"]("button.left", false);
				robot["sendEvent"]("button.left", null);
			},
			doOver: createDoOverFun("sim:btn-button.left")
		},
		"button.left"));
	// center
	simControls.push(simCanvas.addControl(
		robotControlBox.x + smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(),
		yRobotControl,
		smallButtonBox,
		// draw
		function (ctx, box, isPressed) {
			drawButton("sim-event:center", ctx, box, isPressed);
		},
		{
			doMouseDown: function (ev) {
				robot["set"]("button.center", true);
				robot["sendEvent"]("button.center", null);
			},
			doMouseUp: function (ev) {
				robot["set"]("button.center", false);
				robot["sendEvent"]("button.center", null);
			},
			doOver: createDoOverFun("sim:btn-button.center")
		},
		"button.center"));
	// right
	simControls.push(simCanvas.addControl(
		robotControlBox.x + 2 * smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(),
		yRobotControl,
		smallButtonBox,
		// draw
		function (ctx, box, isPressed) {
			drawButton("sim-event:right", ctx, box, isPressed);
		},
		{
			doMouseDown: function (ev) {
				robot["set"]("button.center", true);
				robot["sendEvent"]("button.center", null);
			},
			doMouseUp: function (ev) {
				robot["set"]("button.center", false);
				robot["sendEvent"]("button.center", null);
			},
			doOver: createDoOverFun("sim:btn-button.right")
		},
		"button.right"));
	// backward
	yRobotControl += smallButtonBox.totalHeight();
	simControls.push(simCanvas.addControl(
		robotControlBox.x + smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(),
		yRobotControl,
		smallButtonBox,
		// draw
		function (ctx, box, isPressed) {
			drawButton("sim-event:backward", ctx, box, isPressed);
		},
		{
			doMouseDown: function (ev) {
				robot["set"]("button.backward", true);
				robot["sendEvent"]("button.backward", null);
			},
			doMouseUp: function (ev) {
				robot["set"]("button.backward", false);
				robot["sendEvent"]("button.backward", null);
			},
			doOver: createDoOverFun("sim:btn-button.backward")
		},
		"button.backward"));
	yRobotControl += smallButtonBox.totalHeight() + separatorControlBox.totalHeight();

	// tap
	simControls.push(simCanvas.addControl(
		robotControlBox.x + 0.5 * smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(),
		yRobotControl,
		smallButtonBox,
		// draw
		function (ctx, box, isPressed) {
			drawButton("sim-event:tap", ctx, box, isPressed);
		},
		{
			action: function (ev) {
				robot["sendEvent"]("tap", null);
			},
			doOver: createDoOverFun("sim:btn-tap")
		},
		"tap"));
	// clap
	simControls.push(simCanvas.addControl(
		robotControlBox.x + 1.5 * smallButtonBox.totalWidth() + smallButtonBox.offsetLeft(),
		yRobotControl,
		smallButtonBox,
		// draw
		function (ctx, box, isPressed) {
			drawButton("sim-event:clap", ctx, box, isPressed);
		},
		{
			action: function (ev) {
				robot["sendEvent"]("mic", null);
			},
			doOver: createDoOverFun("sim:btn-clap")
		},
		"clap"));
	yRobotControl += 2 * smallBtnSize;

	// draw robot from top
	var xRobotControl = robotControlBox.x + 1.5 * smallButtonBox.totalWidth();	// center
	var yRobotTop = yRobotControl + 3.5 * smallBtnSize;	// rear
	simControls.push(simCanvas.addDecoration(function (ctx) {
		ctx.save();
		ctx.beginPath();
		// rear left
		ctx.moveTo(xRobotControl - 1.2 * smallBtnSize,
			yRobotTop);
		ctx.lineTo(xRobotControl - 1.2 * smallBtnSize,
			yRobotTop - 1.8 * smallBtnSize);
		ctx.bezierCurveTo(xRobotControl - 0.72 * smallBtnSize,
			yRobotTop - 2.4 * smallBtnSize,
			xRobotControl - 0.05 * smallBtnSize,
			yRobotTop - 2.4 * smallBtnSize,
			xRobotControl,
			yRobotTop - 2.4 * smallBtnSize);
		// left side
		ctx.bezierCurveTo(xRobotControl + 0.05 * smallBtnSize,
			yRobotTop - 2.4 * smallBtnSize,
			xRobotControl + 0.72 * smallBtnSize,
			yRobotTop - 2.4 * smallBtnSize,
			xRobotControl + 1.2 * smallBtnSize,
			yRobotTop - 1.8 * smallBtnSize);
		ctx.lineTo(xRobotControl + 1.2 * smallBtnSize,
			yRobotTop);
		ctx.closePath();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "black";
		ctx.stroke();

		/** Draw a sensor value as a value between 0 and 1 in a hollow pie chart
			@param {number} x
			@param {number} y
			@param {number} r
			@param {number} val
			@param {string=} color0
			@param {string=} color1
			@return {void}
		*/
		function drawSensorArc(x, y, r, val, color0, color1) {
			ctx.save();
			ctx.translate(x, y);
			// color0 (or light gray) background
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, 2 * Math.PI);
			ctx.arc(0, 0, r / 2, 2 * Math.PI, 0, true);
			ctx.fillStyle = color0 || "#bbb";
			ctx.fill();
			// color1 (or dark gray) pie
			ctx.beginPath();
			ctx.arc(0, 0, r, (-0.5 + 2 * val) * Math.PI, -0.5 * Math.PI, true);
			ctx.arc(0, 0, r / 2, -0.5 * Math.PI, (-0.5 + 2 * val) * Math.PI, false);
			ctx.fillStyle = color1 || "#222";
			ctx.fill();
			ctx.restore();
		}

		/** Draw a sensor value as a value between 0 and 1 as two discs
			@param {number} x
			@param {number} y
			@param {number} r
			@param {number} val
			@param {string=} color0
			@param {string=} color1
			@return {void}
		*/
		function drawSensorDisc(x, y, r, val, color0, color1) {
			function disc(r, fillStyle) {
				ctx.beginPath();
				ctx.arc(0, 0, r, 0, 2 * Math.PI);
				ctx.fillStyle = fillStyle;
				ctx.fill();
			}
			ctx.save();
			ctx.translate(x, y);
			// color0 (or dark gray) background
			disc(r, color1 || "#222");
			disc(r * 0.95, color0 || "#bbb");
			disc(r * 0.95 * val, color1 || "#222");
			ctx.restore();
		}

		/** Draw a sensor value as a value between 0 and 1 in a pie chart
			@param {number} x
			@param {number} y
			@param {number} r
			@param {number} val
			@param {string=} color0
			@param {string=} color1
			@return {void}
		*/
		function drawSensor(x, y, r, val, color0, color1) {
			drawSensorDisc(x, y, r, val, color0, color1);
		}

		// ground left
		var groundSensorValues = robot["get"]("prox.ground.delta");
		drawSensor(xRobotControl - 0.45 * smallBtnSize,
			yRobotTop - 1.8 * smallBtnSize,
			0.4 * smallBtnSize,
			groundSensorValues[0],
			"#afa", "#060");
		// ground right
		drawSensor(xRobotControl + 0.45 * smallBtnSize,
			yRobotTop - 1.8 * smallBtnSize,
			0.4 * smallBtnSize,
			groundSensorValues[1],
			"#9f9", "#060");

		// proximity
		var proxSensorValues = robot["get"]("prox.horizontal");
		// front left
		drawSensor(xRobotControl - 1.45 * smallBtnSize,
			yRobotTop - 2.3 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[0],
			"#fcc", "#d00");
		drawSensor(xRobotControl - 0.8 * smallBtnSize,
			yRobotTop - 2.8 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[1],
			"#fcc", "#d00");
		// center
		drawSensor(xRobotControl,
			yRobotTop - 3 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[2],
			"#fcc", "#d00");
		// front right
		drawSensor(xRobotControl + 0.8 * smallBtnSize,
			yRobotTop - 2.8 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[3],
			"#fcc", "#d00");
		drawSensor(xRobotControl + 1.45 * smallBtnSize,
			yRobotTop - 2.3 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[4],
			"#fcc", "#d00");
		// back left
		drawSensor(xRobotControl - 0.8 * smallBtnSize,
			yRobotTop + 0.5 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[5],
			"#fcc", "#d00");
		// back right
		drawSensor(xRobotControl + 0.8 * smallBtnSize,
			yRobotTop + 0.5 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[6],
			"#fcc", "#d00");

		ctx.restore();
	}));
	yRobotControl += 5 * smallBtnSize;

	// draw robot back side
	var yRobotSide = yRobotControl;	// top
	simControls.push(simCanvas.addDecoration(function (ctx) {

		/** Draw a signed motor target value as a dial
			@param {number} x
			@param {number} y
			@param {number} r
			@param {number} val value in range [-1,1]
			@return {void}
		*/
		function drawSpeed(x, y, r, val) {
			val = Math.max(-1, Math.min(1, val));
			ctx.save();
			ctx.translate(x, y);
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, 2 * Math.PI);
			ctx.fillStyle = "#ccc";
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(r * Math.sin(3 * val), -r * Math.cos(3 * val));
			ctx.lineWidth = Math.max(r / 6, 1);
			ctx.strokeStyle = "black";
			ctx.stroke();
			ctx.restore();
		}

		ctx.save();
		ctx.fillStyle = "black";
		ctx.fillRect(xRobotControl - 1.15 * smallBtnSize,
			yRobotSide + 0.5 * smallBtnSize,
			0.3 * smallBtnSize, 0.6 * smallBtnSize);
		ctx.fillRect(xRobotControl + 0.85 * smallBtnSize,
			yRobotSide + 0.5 * smallBtnSize,
			0.3 * smallBtnSize, 0.6 * smallBtnSize);
		ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(/** @type {Array.<number>} */(robot["get"]("leds.top")));
		ctx.fillRect(xRobotControl - 1.2 * smallBtnSize,
			yRobotSide,
			2.4 * smallBtnSize, 0.5 * smallBtnSize);
		ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(/** @type {Array.<number>} */(robot["get"]("leds.bottom.left")));
		ctx.fillRect(xRobotControl - 1.2 * smallBtnSize,
			yRobotSide + 0.5 * smallBtnSize,
			1.2 * smallBtnSize, 0.5 * smallBtnSize);
		ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(/** @type {Array.<number>} */(robot["get"]("leds.bottom.right")));
		ctx.fillRect(xRobotControl,
			yRobotSide + 0.5 * smallBtnSize,
			1.2 * smallBtnSize, 0.5 * smallBtnSize);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(xRobotControl - 1.2 * smallBtnSize,
			yRobotSide + 0.5 * smallBtnSize);
		ctx.lineTo(xRobotControl + 1.2 * smallBtnSize,
			yRobotSide + 0.5 * smallBtnSize);
		ctx.moveTo(xRobotControl,
			yRobotSide + 0.5 * smallBtnSize);
		ctx.lineTo(xRobotControl,
			yRobotSide + smallBtnSize);
		ctx.strokeStyle = "white";
		ctx.stroke();
		ctx.lineJoin = "round";
		ctx.strokeStyle = "black";
		ctx.strokeRect(xRobotControl - 1.2 * smallBtnSize,
			yRobotSide,
			2.4 * smallBtnSize, smallBtnSize);
		// left speed
		drawSpeed(xRobotControl - 1.7 * smallBtnSize,
			yRobotSide + smallBtnSize,
			0.4 * smallBtnSize,
			robot["get"]("motor.left") / 2);
		// right speed
		drawSpeed(xRobotControl + 1.7 * smallBtnSize,
			yRobotSide + smallBtnSize,
			0.4 * smallBtnSize,
			robot["get"]("motor.right") / 2);
		ctx.restore();
	}));
	yRobotControl += 1.5 * smallBtnSize;

	// draw accelerometers if there is a height map
	if (sim2d.heightImage != null) {
		var accY0 = yRobotControl + 1.5 * smallBtnSize;	// center
		simControls.push(simCanvas.addDecoration(function (ctx) {
			var acc = robot["get"]("acc");
			var angles = [
				Math.atan2(acc[0], acc[1]),
				Math.atan2(acc[1], acc[2]),
				Math.atan2(acc[0], acc[2])
			];
			ctx.save();
			ctx.strokeStyle = "black";
			ctx.lineWidth = 0.7 * simCanvas.dims.blockLineWidth;
			for (var i = 0; i < 3; i++) {
				ctx.save();
				ctx.translate(xRobotControl + (i - 1) * smallBtnSize,
					accY0);

				// cross
				ctx.save();
				ctx.strokeStyle = "silver";
				ctx.beginPath();
				ctx.moveTo(-0.4 * smallBtnSize, 0);
				ctx.lineTo(0.4 * smallBtnSize, 0);
				ctx.moveTo(0, -0.4 * smallBtnSize);
				ctx.lineTo(0, 0.4 * smallBtnSize);
				ctx.stroke();
				ctx.restore();

				ctx.rotate(-angles[i]);
				switch (i) {
				case 0:	// yaw, display from top
					var sz = 0.25 * smallBtnSize;
					ctx.translate(0, 1.2 * sz);
					ctx.beginPath();
					// rear left
					ctx.moveTo(-1.2 * sz,
						0);
					ctx.lineTo(-1.2 * sz,
						-1.8 * sz);
					ctx.bezierCurveTo(-0.72 * sz,
						-2.4 * sz,
						-0.05 * sz,
						-2.4 * sz,
						0,
						-2.4 * sz);
					// left side
					ctx.bezierCurveTo(0.05 * sz,
						-2.4 * sz,
						0.72 * sz,
						-2.4 * sz,
						1.2 * sz,
						-1.8 * sz);
					ctx.lineTo(1.2 * sz,
						0);
					ctx.closePath();
					ctx.lineWidth = 2;
					ctx.strokeStyle = "black";
					ctx.stroke();
					break;
				case 1:	// pitch, display from right
					ctx.strokeRect(-0.4 * smallBtnSize, -0.15 * smallBtnSize,
						0.8 * smallBtnSize, 0.3 * smallBtnSize);
					ctx.beginPath();
					ctx.arc(-0.2 * smallBtnSize, 0.05 * smallBtnSize,
						0.15 * smallBtnSize,
						0, 2 * Math.PI);
					ctx.fillStyle = "white";
					ctx.fill();
					ctx.lineWidth = 0.07 * smallBtnSize;
					ctx.stroke();
					break;
				case 2:	// roll, display from back
					ctx.strokeRect(-0.4 * smallBtnSize, -0.15 * smallBtnSize,
						0.8 * smallBtnSize, 0.3 * smallBtnSize);
					ctx.fillStyle = "black";
					ctx.fillRect(-0.35 * smallBtnSize, 0.15 * smallBtnSize,
						0.15 * smallBtnSize,
						0.08 * smallBtnSize);
					ctx.fillRect(0.2 * smallBtnSize, 0.15 * smallBtnSize,
						0.15 * smallBtnSize,
						0.08 * smallBtnSize);
					break;
				}
				ctx.restore();
			}
			ctx.restore();
		}));
		yRobotControl += 2.5 * smallBtnSize;
	}

	// draw yellow arc leds
	if (robot.ledsCircleUsed) {
		var ledsY0 = yRobotControl + 2 * smallBtnSize;	// center
		simControls.push(simCanvas.addDecoration(function (ctx) {
			var leds = robot["get"]("leds.circle");
			for (var i = 0; i < 8; i++) {
				A3a.vpl.Canvas.drawArc(ctx,
					xRobotControl,
					ledsY0,
					0.9 * smallBtnSize, 1.2 * smallBtnSize,
					Math.PI * (0.5 - 0.06 - i * 0.25), Math.PI * (0.5 + 0.06 - i * 0.25),
					leds[i] ? "#fa0" : "white",
	 				"black", simCanvas.dims.blockLineWidth);
			}
		}));
		yRobotControl += 3.5 * smallBtnSize;
	}

	// draw timer 0
	var timerY0 = yRobotControl + 1.5 * smallBtnSize;	// center
	var tRemaining = robot["getTimer"](0);
	if (tRemaining >= 0) {
		simControls.push(simCanvas.addDecoration(function (ctx) {
			var x0 = xRobotControl;
			var y0 = timerY0;
				if (!simCanvas.state.timeScale) {
					// set timeScale to "lin" or "log" the first time it's displayed
					simCanvas.state.timeScale = tRemaining > 4 ? "log" : "lin";
				} else if (simCanvas.state.timeScale === "lin" && tRemaining > 4) {
					// ...but in case it's changed before it's elapsed, switch to log if useful
					simCanvas.state.timeScale = "log";
				}
				A3a.vpl.Canvas.drawTimer(ctx,
					x0, y0, smallBtnSize,
					simCanvas.dims.blockLineWidth,
					function (t) {
						ctx.textAlign = "start";
						ctx.textBaseline = "top";
						ctx.font = (smallBtnSize / 2).toFixed(1) + "px sans-serif";
						ctx.fillStyle = "black";
						ctx.fillText(t.toFixed(1), robotControlBox.x, y0 - smallBtnSize);
					},
					Math.min(tRemaining, simCanvas.state.timeScale === "log" ? 9.9 : 3.95),
					false, simCanvas.state.timeScale === "log");
		}));
		yRobotControl += 2.5 * smallBtnSize;
	} else {
		// forget timeScale, will choose it again next time the timer is shown
		simCanvas.state.timeScale = false;
	}

	// push down items in simControls to center them if there is enough room
	var dy = Math.min((playgroundAreaBox.y - robotControlBox.y + robotControlBox.y + robotControlBox.height - yRobotControl) / 2,
		robotControlBox.y + robotControlBox.height - yRobotControl);
	if (dy > 0) {
		simControls.forEach(function (item) {
			item.y += dy;
		});
	}

	// simCanvas area available to display the playground
	var playgroundView = {
		x: playgroundAreaBox.x,
		y: playgroundAreaBox.y,
		width: playgroundAreaBox.width,
		height: playgroundAreaBox.height
	};

	// playground scaling and displacement to center it in playgroundView
	playgroundView.scale = Math.min(playgroundView.width / sim2d.playground.width,
		playgroundView.height / sim2d.playground.height);
	playgroundView.ox = (playgroundView.width - sim2d.playground.width * playgroundView.scale) / 2;
	playgroundView.oy = (playgroundView.height - sim2d.playground.height * playgroundView.scale) / 2;

	// playground box
	playgroundBox.width = sim2d.playground.width * playgroundView.scale;
	playgroundBox.height = sim2d.playground.height * playgroundView.scale;
	playgroundBox.x = playgroundView.x + playgroundView.ox;
	playgroundBox.y = playgroundView.y + playgroundView.oy;

	if (this.uiConfig.toolbarCustomizationMode) {
		// draw vpl:customization widget
		var customizationBox = simCanvas.css.getBox({tag: "widget", id: "vpl-customize"});
		simCanvas.addDecoration(function (ctx) {
			simCanvas.drawWidget("vpl:customize",
				playgroundView.x + playgroundView.width / 2,
				playgroundView.y + playgroundView.height / 2,
				customizationBox);
		});
	} else {
		// draw robot and playground as a single CanvasItem
		var robotSize = robot.robotSize;
		var temporaryPause = false;
		var playgroundItem = new A3a.vpl.CanvasItem(null,
			sim2d.playground.width * playgroundView.scale, sim2d.playground.height * playgroundView.scale,
			playgroundView.x + playgroundView.ox,
			playgroundView.y + playgroundView.oy,
			function(canvas, item, dx, dy) {
				var ctx = canvas.ctx;
				ctx.save();
				playgroundAreaBox.draw(ctx);
				playgroundBox.draw(ctx);

				if (app.simMaps === null) {
					// display currentMap
					switch (sim2d.currentMap) {
					case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
						ctx.drawImage(sim2d.groundCanvas, item.x + dx, item.y + dy, item.width, item.height);
						break;
					case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
						if (sim2d.heightImage != null) {
							ctx.drawImage(sim2d.heightCanvas, item.x + dx, item.y + dy, item.width, item.height);
						}
						break;
					case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
						ctx.save();
						// map sim2d.playground to item.x+dx,item.y+dy,item.width,item.height
						ctx.translate(item.x + dx + item.width / 2, item.y + dy + item.height / 2);
						ctx.scale(playgroundView.scale, -playgroundView.scale);	// upside-down
						sim2d.obstacles.draw(ctx);
						ctx.restore();
						break;
					}
				} else {
					// display all maps
					ctx.drawImage(sim2d.groundCanvas, item.x + dx, item.y + dy, item.width, item.height);
					if (sim2d.heightImage != null) {
						ctx.save();
						ctx.globalAlpha = 0.5;
						ctx.drawImage(sim2d.heightCanvas, item.x + dx, item.y + dy, item.width, item.height);
						ctx.restore();
					}
					if (sim2d.hasObstacles) {
						ctx.save();
						// map sim2d.playground to item.x+dx,item.y+dy,item.width,item.height
						ctx.translate(item.x + dx + item.width / 2, item.y + dy + item.height / 2);
						ctx.scale(playgroundView.scale, -playgroundView.scale);	// upside-down
						sim2d.obstacles.draw(ctx);
						ctx.restore();
					}
				}

				// set playground origin in the middle of the playground
				ctx.translate(item.x + dx + item.width / 2, item.y + dy + item.height / 2);
				ctx.scale(playgroundView.scale, playgroundView.scale);

				ctx.translate(robot.pos[0], -robot.pos[1]);	// y upside-down
				ctx.rotate(0.5 * Math.PI - robot.theta);

				ctx.beginPath();
				// middle rear
				ctx.moveTo(0, 0.2 * robotSize);
				// right side
				ctx.lineTo(0.5 * robotSize, 0.2 * robotSize);
				ctx.lineTo(0.5 * robotSize, -0.55 * robotSize);
				ctx.bezierCurveTo(0.3 * robotSize, -0.8 * robotSize,
					0.02 * robotSize, -0.8 * robotSize,
					0, -0.8 * robotSize);
				// left side
				ctx.bezierCurveTo(-0.02 * robotSize, -0.8 * robotSize,
					-0.3 * robotSize, -0.8 * robotSize,
					-0.5 * robotSize, -0.55 * robotSize);
				ctx.lineTo(-0.5 * robotSize, 0.2 * robotSize);
				ctx.closePath();
				ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(/** @type {Array.<number>} */(robot["get"]("leds.top")));
				ctx.strokeStyle = "black";
				ctx.lineJoin = "round";
				ctx.lineWidth = 2;
				ctx.moveTo(0.05 * robotSize, 0);
				ctx.arc(0, 0, 0.05 * robotSize, 0, 2 * Math.PI);
				ctx.fill();
				ctx.stroke();

				if (!sim2d.running || sim2d.paused) {
					ctx.beginPath();
					ctx.arc(0, 0, robotSize, 0, 2 * Math.PI);
					ctx.strokeStyle = simCanvas.state.moving ? "navy" : "#3cf";
					ctx.lineWidth = robotSize * 0.1;
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(0, -robotSize, 0.15 * robotSize, 0, 2 * Math.PI);
					ctx.fillStyle = simCanvas.state.orienting ? "navy" : "white";
					ctx.strokeStyle = simCanvas.state.orienting ? "navy" : "#3cf";
					ctx.lineWidth = robotSize * 0.06;
					ctx.fill();
					ctx.stroke();
				}

				ctx.restore();
			},
			{
				mousedown: function (canvas, data, width, height, left, top, ev) {
					var x = ((ev.x - left) - width / 2) / playgroundView.scale;
					var y = (height / 2 - (ev.y - top)) / playgroundView.scale;
					var xr = x - robot.pos[0];
					var yr = y - robot.pos[1];
					var xHandle = robotSize * Math.cos(robot.theta);
					var yHandle = robotSize * Math.sin(robot.theta);
					if ((!sim2d.running || sim2d.paused) &&
						(xr - xHandle) * (xr - xHandle) + (yr - yHandle) * (yr - yHandle) <
						0.1 * robotSize * robotSize) {
						simCanvas.state.x = x;
							simCanvas.state.y = y;
						simCanvas.state.orienting = true;
						return 1;
					}
					if (xr * xr + yr * yr < robotSize * robotSize) {
						if (!sim2d.paused) {
							// suspend during drag
							robot["suspend"]();
							temporaryPause = true;
						} else {
							temporaryPause = false;
						}
						simCanvas.state.x = x;
						simCanvas.state.y = y;
						simCanvas.state.moving = true;
						return 0;
					}
					return null;
				},
				mousedrag: function (canvas, data, dragIndex, width, height, left, top, ev) {
					var x = ((ev.x - left) - width / 2) / playgroundView.scale;
					var y = (height / 2 - (ev.y - top)) / playgroundView.scale;
					switch (dragIndex) {
					case 0:
						var pt0 = robot.pos;
						robot["setPosition"]([
								robot.pos[0] + x - simCanvas.state.x,
								robot.pos[1] + y - simCanvas.state.y
							],
							robot.theta);
						sim2d.drawPen(A3a.vpl.Robot.TraceShape.line,
							[pt0[0], pt0[1], robot.pos[0], robot.pos[1]]);
						break;
					case 1:
						var dtheta = Math.atan2(y - robot.pos[1], x - robot.pos[0]) -
							Math.atan2(simCanvas.state.y - robot.pos[1],
								simCanvas.state.x - robot.pos[0]);
						robot["setPosition"](robot.pos, robot.theta + dtheta);
						break;
					}
					simCanvas.state.x = x;
					simCanvas.state.y = y;
				},
				mouseup: function (canvas, data, dragIndex) {
					simCanvas.state.moving = false;
					simCanvas.state.orienting = false;
					if (temporaryPause) {
						robot["resume"](A3a.vpl.VPLSim2DViewer.currentTime());
					}
				}
			});
		playgroundItem.draggable = false;
		simCanvas.setItem(playgroundItem);
	}

	// hint
	if (this.simHint) {
		simCanvas.addDecoration(function (ctx) {
			var box = simCanvas.css.getBox({tag: "hint"});
			ctx.fillStyle = box.color;
			ctx.font = box.cssFontString();
			ctx.textAlign = "start";
			ctx.textBaseline = "middle";
			var msg = app.i18n.translate(/** @type {string} */(app.simHint));

			box.width = ctx.measureText(msg).width;
			box.height = box.fontSize * 1.2;

			box.drawAt(ctx, box.marginLeft, canvasSize.height - box.totalHeight() + box.marginTop, true);
			ctx.fillText(msg,
				box.offsetLeft(),
				canvasSize.height - box.totalHeight() + box.offsetTop() + box.height / 2);
		});
	}

	simCanvas.redraw();

	if (!sim2d.paused && robot["shouldRunContinuously"]()) {
		this.requestRendering();
	}
};

/** Request rendering viewer
	@return {void}
*/
A3a.vpl.Application.prototype.requestRendering = function () {
	if (!this.sim2d.renderingPending) {
		this.sim2d.renderingPending = true;
		var app = this;
		window.requestAnimationFrame(function () {
			app.sim2d.renderingPending = false;
			app.renderSim2dViewer();
		});
	}
};

/** Get the current time in seconds
	@return {number}
*/
A3a.vpl.VPLSim2DViewer.currentTime = function () {
	return new Date().getTime() * 1e-3;
};

/** Resize the 2d viewer
	@param {A3a.vpl.Application} app
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.resize = function (app) {
	var width = window.innerWidth;
	var height = window.innerHeight;
	if (window["vplDisableResize"]) {
		var bnd = this.simCanvas.canvas.getBoundingClientRect();
		width = bnd.width;
		height = bnd.height;
	}

	this.simCanvas.dims = this.simCanvas.dims;
	this.simCanvas.resize(width, height);
	app.renderSim2dViewer();
};
