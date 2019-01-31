/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
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
	@param {A3a.vpl.Robot} robot
	@param {?A3a.vpl.UIConfig=} uiConfig
*/
A3a.vpl.VPLSim2DViewer = function (robot, uiConfig) {
	var self = this;

	this.uiConfig = uiConfig || new A3a.vpl.UIConfig();

	this.robot = robot;
	this.running = false;
	this.paused = false;
	this.penDown = false;

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

	var canvasElement = document.getElementById("simCanvas");
	this.simCanvas = new A3a.vpl.Canvas(canvasElement);
	this.simCanvas.state = {};
	this.simCanvas.onUpdate = function () {
		self.render();
	};

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

/** Restore ground (clear pen traces)
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.restoreGround = function () {
	if (this.groundImage) {
		this.groundCanvas.width = this.groundImage.width;
		this.groundCanvas.height = this.groundImage.height;
		var ctx = this.groundCanvas.getContext("2d");
		// render img on a white background
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, this.groundImage.width, this.groundImage.height);
		ctx.drawImage(this.groundImage, 0, 0, this.groundImage.width, this.groundImage.height);
	} else {
		this.groundCanvas.width = this.simCanvas ? this.simCanvas.width : 800;
		this.groundCanvas.height = this.groundCanvas.width * this.playground.height / this.playground.width;
		var ctx = this.groundCanvas.getContext("2d");
		ctx.fillStyle = "white";
		// clear to white
		ctx.fillRect(0, 0, this.groundCanvas.width, this.groundCanvas.height);
	}
	this.render();
};

/** Set or change ground image
	@param {Image} img
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.setGroundImage = function (img) {
	this.groundImage = img;
	this.restoreGround();
	this.updateGroundSensors();
	this.render();
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
	}
};

/** Set or change height image
	@param {Image} img
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.setHeightImage = function (img) {
	this.heightImage = img;
	if (this.heightImage) {
		this.heightCanvas.width = this.heightImage.width;
		this.heightCanvas.height = this.heightImage.height;
		var ctx = this.heightCanvas.getContext("2d");
		// render img on a white background
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, this.heightImage.width, this.heightImage.height);
		ctx.drawImage(this.heightImage, 0, 0, this.heightImage.width, this.heightImage.height);
	} else {
		this.heightCanvas.width = 1;
		this.heightCanvas.height = 1;
	}
	this.updateAccelerometers();
	this.render();
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
A3a.vpl.VPLSim2DViewer.prototype.setObstacleImage = function (svgSrc) {
	this.setPlaygroundLimits();

//this.obstacles.add(new A3a.vpl.ObstaclePoly([0, 0], [-100, 100], false));
//this.obstacles.add(new A3a.vpl.ObstacleCylinder(0, 0, 100));
//return;

	// add svg
	this.obstacleSVG = svgSrc;
	if (svgSrc) {
		var svg = new SVG(svgSrc);
		// scaling from svg.viewBox ([xmin,ymin,width,height]) to centered this.playground
		var scx = this.playground.width / svg.viewBox[2];
		var ox = -this.playground.width * (0.5 + svg.viewBox[0] / svg.viewBox[2]);
		var scy = -this.playground.height / svg.viewBox[3];	// positive y upward
		var oy = this.playground.height * (0.5 + svg.viewBox[1] / svg.viewBox[3]);
		var self = this;
		svg.draw(null, {
			cb: {
				line: function (x, y, isPolygon) {
					self.obstacles.add(new A3a.vpl.ObstaclePoly(
						x.map(function (x1) { return ox + scx * x1; }),
						y.map(function (y1) { return oy + scy * y1; }),
						isPolygon));
				},
				circle: function (x, y, r) {
					self.obstacles.add(new A3a.vpl.ObstacleCylinder(
						ox + scx * x,
						oy + scy * y,
						(scx - scy) / 2 * r));
				}
			}
		});
	}
	this.hasObstacles = svgSrc != null;

	this.updateProximitySensors();
	this.render();
};

/** Get the ground value (red) at the specified position
	@param {number} x (0 = left)
	@param {number} y (0 = bottom)
	@return {number} ground value, from 0 (black) to 1 (white)
*/
A3a.vpl.VPLSim2DViewer.prototype.groundValue = function (x, y) {
	// scale position to (i,j)
	var i = Math.round(this.groundCanvas.width * (x + this.playground.width / 2) / this.playground.width);
	var j = Math.round(this.groundCanvas.height * (this.playground.height / 2 - y) / this.playground.height);
	var pixel = this.groundCanvas.getContext("2d").getImageData(i, j, 1, 1).data;
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
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.setImage = function (img) {
	switch (this.currentMap) {
	case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
		this.disabledGroundImage = img == null ? this.groundImage : null;
		this.setGroundImage(img);
		break;
	case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
		this.disabledHeightImage = img == null ? this.heightImage : null;
		this.setHeightImage(img);
		break;
	}
};

/** Set or change playground svg image for the obstacles
	@param {?string} svgSrc
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.setSVG = function (svgSrc) {
	switch (this.currentMap) {
	case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
		this.disabledObstacleSVG = svgSrc == null ? this.obstacleSVG : null;
		this.setObstacleImage(svgSrc);
		break;
	}
};

/** Start simulator, rendering once if suspended or continuously else
	@param {boolean} suspended
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.start = function (suspended) {
	this.paused = suspended;
	this.running = !suspended;
	this.render();
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

/** Render viewer
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.render = function () {
	// abort if hidden
	if (document.getElementById("sim-view").style.display === "none") {
		return;
	}

	if (!this.sizeInitialized) {
		// initial canvas resize
		this.sizeInitialized = true;
		this.resize();
		this.restoreGround();
	}

	// start with an empty canvas
	this.simCanvas.clearItems();

	// top controls
	var canvasSize = this.simCanvas.getSize();

	// top controls
	var controlBar = new A3a.vpl.ControlBar(this.simCanvas);
	controlBar.setButtons(this.uiConfig,
		this.tollbarConfig || [
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
			"!stretch",
			"sim:vpl",
			"sim:text",
			"!stretch",
			"sim:teacher-reset",
			"sim:teacher"
		],
		this.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
		this.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);

	var smallBtnSize = this.simCanvas.dims.controlSize * 0.6;

	var controlBarPos = {
		xmin: 2 * this.simCanvas.dims.margin + 3 * smallBtnSize + 2 * this.simCanvas.dims.stripHorMargin,
		xmax: canvasSize.width - this.simCanvas.dims.margin,
		ymin: this.simCanvas.dims.margin,
		ymax: this.simCanvas.dims.margin + this.simCanvas.dims.controlSize
	};
	controlBar.calcLayout(controlBarPos,
		this.simCanvas.dims.interBlockSpace, 2 * this.simCanvas.dims.interBlockSpace);
	controlBar.addToCanvas();

	// add buttons for events
	var self = this;
	var yRobotControl = this.simCanvas.dims.margin;
	function drawButtonTri(ctx, x, y, rot, isPressed) {
		ctx.save();
		ctx.fillStyle = isPressed
			? self.simCanvas.dims.controlDownColor
			: self.simCanvas.dims.controlColor;
		ctx.fillRect(x, y, smallBtnSize, smallBtnSize);
		ctx.translate(x + smallBtnSize / 2, y + smallBtnSize / 2);
		ctx.rotate(-rot * Math.PI / 2);
		ctx.translate(-x - smallBtnSize / 2, -y - smallBtnSize / 2);
		ctx.beginPath();
		ctx.moveTo(x + smallBtnSize * 0.3557, y + smallBtnSize * 0.25);
		ctx.lineTo(x + smallBtnSize * 0.3557, y + smallBtnSize * 0.75);
		ctx.lineTo(x + smallBtnSize * 0.7887, y + smallBtnSize * 0.5);
		ctx.closePath();
		ctx.strokeStyle = "white";
		ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
		ctx.stroke();
		ctx.restore();
	}

	// forward
	this.simCanvas.addControl(this.simCanvas.dims.margin + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		yRobotControl,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, width, height, isPressed) {
			drawButtonTri(ctx, 0, 0, 1, isPressed);
		},
		// action
		function (ev) {
			self.robot["set"]("button.forward", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.forward", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
		},
		null, null,
		"button.forward");
	// left
	this.simCanvas.addControl(this.simCanvas.dims.margin,
		yRobotControl + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, width, height, isPressed) {
			drawButtonTri(ctx, 0, 0, 2, isPressed);
		},
		// action
		function (ev) {
			self.robot["set"]("button.left", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.left", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
		},
		null, null,
		"button.left");
	// center
	this.simCanvas.addControl(this.simCanvas.dims.margin + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		yRobotControl + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, width, height, isPressed) {
			ctx.save();
			ctx.fillStyle = isPressed
				? self.simCanvas.dims.controlDownColor
				: self.simCanvas.dims.controlColor;
			ctx.fillRect(0, 0, smallBtnSize, smallBtnSize);
			ctx.beginPath();
			ctx.arc(0.5 * smallBtnSize, 0.5 * smallBtnSize, 0.25 * smallBtnSize, 0, 2 * Math.PI);
			ctx.strokeStyle = "white";
			ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
			ctx.stroke();
			ctx.restore();
		},
		// action
		function (ev) {
			self.robot["set"]("button.center", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.center", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
		},
		null, null,
		"button.center");
	// right
	this.simCanvas.addControl(this.simCanvas.dims.margin + 2 * smallBtnSize + 2 * this.simCanvas.dims.stripHorMargin,
		yRobotControl + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, width, height, isPressed) {
			drawButtonTri(ctx, 0, 0, 0, isPressed);
		},
		// action
		function (ev) {
			self.robot["set"]("button.right", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.right", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
		},
		null, null,
		"button.right");
	// backward
	this.simCanvas.addControl(this.simCanvas.dims.margin + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		yRobotControl + 2 * smallBtnSize + 2 * this.simCanvas.dims.stripHorMargin,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, width, height, isPressed) {
			drawButtonTri(ctx, 0, 0, 3, isPressed);
		},
		// action
		function (ev) {
			self.robot["set"]("button.backward", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.backward", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
		},
		null, null,
		"button.backward");
	yRobotControl += 3.5 * smallBtnSize + 3 * this.simCanvas.dims.stripHorMargin;

	// tap
	this.simCanvas.addControl(this.simCanvas.dims.margin + 0.5 * smallBtnSize + 0.5 * this.simCanvas.dims.stripHorMargin,
		yRobotControl,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, width, height, isPressed) {
			ctx.save();
			ctx.fillStyle = isPressed
				? self.simCanvas.dims.controlDownColor
				: self.simCanvas.dims.controlColor;
			ctx.fillRect(0, 0, smallBtnSize, smallBtnSize);
			ctx.beginPath();

			ctx.strokeStyle = "white";
			ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
			ctx.translate(0.6 * smallBtnSize, 0.6 * smallBtnSize);
			for (var i = 1; i <= 3; i++) {
				ctx.beginPath();
				ctx.arc(0, 0,
					0.15 * smallBtnSize * i,
					Math.PI * 0.9, Math.PI * 1.7);
				ctx.stroke();
			}
			ctx.moveTo(0.3 * smallBtnSize, 0);
			ctx.lineTo(0, 0);
			ctx.lineTo(0, 0.3 * smallBtnSize);
			ctx.stroke();
			ctx.restore();
		},
		// action
		function (ev) {
			self.robot["sendEvent"]("tap", null);
		},
		null, null,
		"tap");
	// clap
	this.simCanvas.addControl(this.simCanvas.dims.margin + 1.5 * smallBtnSize + 1.5 * this.simCanvas.dims.stripHorMargin,
		yRobotControl,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, width, height, isPressed) {
			ctx.save();
			ctx.fillStyle = isPressed
				? self.simCanvas.dims.controlDownColor
				: self.simCanvas.dims.controlColor;
			ctx.fillRect(0, 0, smallBtnSize, smallBtnSize);
			ctx.beginPath();

			ctx.strokeStyle = "white";
			ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
			ctx.translate(0.5 * smallBtnSize, 0.5 * smallBtnSize);
			ctx.rotate(0.1);
			for (var i = 0; i < 9; i++) {
				ctx.beginPath();
				ctx.moveTo(0.12 * smallBtnSize, 0);
				ctx.lineTo(0.24 * smallBtnSize, 0);
				ctx.moveTo(0.28 * smallBtnSize, 0);
				ctx.lineTo(0.36 * smallBtnSize, 0);
				ctx.stroke();
				ctx.rotate(Math.PI / 4.5);
			}
			ctx.restore();
		},
		// action
		function (ev) {
			self.robot["sendEvent"]("mic", null);
		},
		null, null,
		"clap");
	yRobotControl += 2 * smallBtnSize;

	// draw robot from top
	var yRobotTop = yRobotControl + 3.5 * smallBtnSize;	// rear
	this.simCanvas.addDecoration(function (ctx) {
		ctx.save();
		ctx.beginPath();
		// rear left
		ctx.moveTo(self.simCanvas.dims.margin + 0.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop);
		ctx.lineTo(self.simCanvas.dims.margin + 0.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 1.8 * smallBtnSize);
		ctx.bezierCurveTo(self.simCanvas.dims.margin + 0.78 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.4 * smallBtnSize,
			self.simCanvas.dims.margin + 1.45 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.4 * smallBtnSize,
			self.simCanvas.dims.margin + 1.5 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.4 * smallBtnSize);
		// left side
		ctx.bezierCurveTo(self.simCanvas.dims.margin + 1.55 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.4 * smallBtnSize,
			self.simCanvas.dims.margin + 2.22 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.4 * smallBtnSize,
			self.simCanvas.dims.margin + 2.7 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 1.8 * smallBtnSize);
		ctx.lineTo(self.simCanvas.dims.margin + 2.7 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop);
		ctx.closePath();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "black";
		ctx.stroke();

		/** Draw a sensor value as a value between 0 and 1 in a pie chart
			@param {number} x
			@param {number} y
			@param {number} r
			@param {number} val
			@param {string=} color0
			@param {string=} color1
		*/
		function drawSensor(x, y, r, val, color0, color1) {
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

		// ground left
		var groundSensorValues = self.robot["get"]("prox.ground.delta");
		drawSensor(self.simCanvas.dims.margin + 1.05 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 1.8 * smallBtnSize,
			0.4 * smallBtnSize,
			groundSensorValues[0],
			"#afa", "#060");
		// ground right
		drawSensor(self.simCanvas.dims.margin + 1.95 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 1.8 * smallBtnSize,
			0.4 * smallBtnSize,
			groundSensorValues[1],
			"#9f9", "#060");

		// proximity
		var proxSensorValues = self.robot["get"]("prox.horizontal");
		// front left
		drawSensor(self.simCanvas.dims.margin + 0.05 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.3 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[0],
			"#fcc", "#d00");
		drawSensor(self.simCanvas.dims.margin + 0.7 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.8 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[1],
			"#fcc", "#d00");
		// center
		drawSensor(self.simCanvas.dims.margin + 1.5 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 3 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[2],
			"#fcc", "#d00");
		// front right
		drawSensor(self.simCanvas.dims.margin + 2.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.8 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[3],
			"#fcc", "#d00");
		drawSensor(self.simCanvas.dims.margin + 2.95 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop - 2.3 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[4],
			"#fcc", "#d00");
		// back left
		drawSensor(self.simCanvas.dims.margin + 0.7 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop + 0.5 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[5],
			"#fcc", "#d00");
		// back right
		drawSensor(self.simCanvas.dims.margin + 2.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotTop + 0.5 * smallBtnSize,
			0.4 * smallBtnSize,
			proxSensorValues[6],
			"#fcc", "#d00");

		ctx.restore();
	});
	yRobotControl += 5 * smallBtnSize;

	// draw robot back side
	var yRobotSide = yRobotControl;	// top
	this.simCanvas.addDecoration(function (ctx) {
		ctx.save();
		ctx.fillStyle = "black";
		ctx.fillRect(self.simCanvas.dims.margin + 0.35 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide + 0.5 * smallBtnSize,
			0.3 * smallBtnSize, 0.6 * smallBtnSize);
		ctx.fillRect(self.simCanvas.dims.margin + 2.35 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide + 0.5 * smallBtnSize,
			0.3 * smallBtnSize, 0.6 * smallBtnSize);
		ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(/** @type {Array.<number>} */(self.robot["get"]("leds.top")));
		ctx.fillRect(self.simCanvas.dims.margin + 0.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide,
			2.4 * smallBtnSize, 0.5 * smallBtnSize);
		ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(/** @type {Array.<number>} */(self.robot["get"]("leds.bottom.left")));
		ctx.fillRect(self.simCanvas.dims.margin + 0.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide + 0.5 * smallBtnSize,
			1.2 * smallBtnSize, 0.5 * smallBtnSize);
		ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(/** @type {Array.<number>} */(self.robot["get"]("leds.bottom.right")));
		ctx.fillRect(self.simCanvas.dims.margin + 1.5 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide + 0.5 * smallBtnSize,
			1.2 * smallBtnSize, 0.5 * smallBtnSize);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(self.simCanvas.dims.margin + 0.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide + 0.5 * smallBtnSize);
		ctx.lineTo(self.simCanvas.dims.margin + 2.7 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide + 0.5 * smallBtnSize);
		ctx.moveTo(self.simCanvas.dims.margin + 1.5 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide + 0.5 * smallBtnSize);
		ctx.lineTo(self.simCanvas.dims.margin + 1.5 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide + smallBtnSize);
		ctx.strokeStyle = "white";
		ctx.stroke();
		ctx.lineJoin = "round";
		ctx.strokeStyle = "black";
		ctx.strokeRect(self.simCanvas.dims.margin + 0.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide,
			2.4 * smallBtnSize, smallBtnSize);
		ctx.restore();
	});
	yRobotControl += 1.5 * smallBtnSize;

	// draw accelerometers if there is a height map
	if (self.heightImage != null) {
		var accY0 = yRobotControl + smallBtnSize;	// center
		this.simCanvas.addDecoration(function (ctx) {
			var acc = self.robot["get"]("acc");
			var angles = [
				Math.atan2(acc[0], acc[1]),
				Math.atan2(acc[1], acc[2]),
				Math.atan2(acc[0], acc[2])
			];
			ctx.save();
			ctx.strokeStyle = "black";
			ctx.lineWidth = 0.7 * self.simCanvas.dims.blockLineWidth;
			for (var i = 0; i < 3; i++) {
				ctx.save();
				ctx.translate(self.simCanvas.dims.margin + self.simCanvas.dims.stripHorMargin + (0.5 + i) * smallBtnSize,
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
		});
		yRobotControl += 2 * smallBtnSize;
	}

	// draw yellow arc leds
	if (this.robot.ledsCircleUsed) {
		var ledsY0 = yRobotControl + 1.5 * smallBtnSize;	// center
		this.simCanvas.addDecoration(function (ctx) {
			var leds = self.robot["get"]("leds.circle");
			for (var i = 0; i < 8; i++) {
				A3a.vpl.Canvas.drawArc(ctx,
					self.simCanvas.dims.margin + 1.5 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
					ledsY0,
					0.9 * smallBtnSize, 1.2 * smallBtnSize,
					Math.PI * (0.5 - 0.06 - i * 0.25), Math.PI * (0.5 + 0.06 - i * 0.25),
					leds[i] ? "#fa0" : "white",
	 				"black", self.simCanvas.dims.blockLineWidth);
			}
		});
		yRobotControl += 3.5 * smallBtnSize;
	}

	// draw timer 0
	var timerY0 = yRobotControl + smallBtnSize;	// center
	this.simCanvas.addDecoration(function (ctx) {
		var x0 = self.simCanvas.dims.margin + 1.5 * smallBtnSize + self.simCanvas.dims.stripHorMargin;
		var y0 = timerY0;
		var tRemaining = self.robot["getTimer"](0);
		if (tRemaining >= 0) {
			if (!self.simCanvas.state.timeScale) {
				// set timeScale to "lin" or "log" the first time it's displayed
				self.simCanvas.state.timeScale = tRemaining > 4 ? "log" : "lin";
			} else if (self.simCanvas.state.timeScale === "lin" && tRemaining > 4) {
				// ...but in case it's changed before it's elapsed, switch to log if useful
				self.simCanvas.state.timeScale = "log";
			}
			A3a.vpl.Canvas.drawTimer(ctx,
				x0, y0, smallBtnSize,
				self.simCanvas.dims.blockLineWidth,
				function (t) {
					ctx.textAlign = "start";
					ctx.textBaseline = "top";
					ctx.font = (smallBtnSize / 2).toFixed(1) + "px sans-serif";
					ctx.fillStyle = "black";
					ctx.fillText(t.toFixed(1), self.simCanvas.dims.margin, y0 - smallBtnSize);
				},
				Math.min(tRemaining, self.simCanvas.state.timeScale === "log" ? 9.9 : 3.95),
				false, self.simCanvas.state.timeScale === "log");
		} else {
			// forget timeScale, will choose it again next time the timer is shown
			self.simCanvas.state.timeScale = false;
		}
	});
	yRobotControl += 3 * smallBtnSize;

	// simCanvas area available to display the playground
	var playgroundView = {
		x: 2 * this.simCanvas.dims.margin + 3 * smallBtnSize + 2 * this.simCanvas.dims.stripHorMargin,
		y: 2 * self.simCanvas.dims.margin + self.simCanvas.dims.controlSize
	};
	playgroundView.width = this.simCanvas.width - playgroundView.x - this.simCanvas.dims.margin;
	playgroundView.height = this.simCanvas.height - playgroundView.y - this.simCanvas.dims.margin;

	// playground scaling and displacement to center it in playgroundView
	playgroundView.scale = Math.min(playgroundView.width / this.playground.width,
		playgroundView.height / this.playground.height);
	playgroundView.ox = (playgroundView.width - this.playground.width * playgroundView.scale) / 2;
	playgroundView.oy = (playgroundView.height - this.playground.height * playgroundView.scale) / 2;

	// draw robot and playground as a single CanvasItem
	var robotSize = this.robot.robotSize;
	var temporaryPause = false;
	var playgroundItem = new A3a.vpl.CanvasItem(null,
		this.playground.width * playgroundView.scale, this.playground.height * playgroundView.scale,
		playgroundView.x + playgroundView.ox,
		playgroundView.y + playgroundView.oy,
		function(ctx, item, dx, dy) {
			ctx.save();

			switch (self.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				ctx.drawImage(self.groundCanvas, item.x + dx, item.y + dy, item.width, item.height);
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				if (self.heightImage != null) {
					ctx.drawImage(self.heightCanvas, item.x + dx, item.y + dy, item.width, item.height);
				}
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				ctx.save();
				// map self.playground to item.x+dx,item.y+dy,item.width,item.height
				ctx.translate(item.x + dx + item.width / 2, item.y + dy + item.height / 2);
				ctx.scale(playgroundView.scale, -playgroundView.scale);	// upside-down
				self.obstacles.draw(ctx);
				ctx.restore();
				break;
			}

			ctx.strokeStyle = "silver";
			ctx.lineWidth = 3;
			ctx.strokeRect(item.x + dx, item.y + dy, item.width, item.height);

			// set playground origin in the middle of the playground
			ctx.translate(item.x + dx + item.width / 2, item.y + dy + item.height / 2);
			ctx.scale(playgroundView.scale, playgroundView.scale);

			ctx.translate(self.robot.pos[0], -self.robot.pos[1]);	// y upside-down
			ctx.rotate(0.5 * Math.PI - self.robot.theta);

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
			ctx.fillStyle = A3a.vpl.VPLSim2DViewer.color(/** @type {Array.<number>} */(self.robot["get"]("leds.top")));
			ctx.strokeStyle = "black";
			ctx.lineJoin = "round";
			ctx.lineWidth = 2;
			ctx.moveTo(0.05 * robotSize, 0);
			ctx.arc(0, 0, 0.05 * robotSize, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();

			if (!self.running || self.paused) {
				ctx.beginPath();
				ctx.arc(0, 0, robotSize, 0, 2 * Math.PI);
				ctx.strokeStyle = self.simCanvas.state.moving ? "navy" : "#3cf";
				ctx.lineWidth = robotSize * 0.1;
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(0, -robotSize, 0.15 * robotSize, 0, 2 * Math.PI);
				ctx.fillStyle = self.simCanvas.state.orienting ? "navy" : "white";
				ctx.strokeStyle = self.simCanvas.state.orienting ? "navy" : "#3cf";
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
				var xr = x - self.robot.pos[0];
				var yr = y - self.robot.pos[1];
				var xHandle = robotSize * Math.cos(self.robot.theta);
				var yHandle = robotSize * Math.sin(self.robot.theta);
				if ((!self.running || self.paused) &&
					(xr - xHandle) * (xr - xHandle) + (yr - yHandle) * (yr - yHandle) <
					0.1 * robotSize * robotSize) {
					self.simCanvas.state.x = x;
						self.simCanvas.state.y = y;
					self.simCanvas.state.orienting = true;
					return 1;
				}
				if (xr * xr + yr * yr < robotSize * robotSize) {
					if (!self.paused) {
						// suspend during drag
						self.robot["suspend"]();
						temporaryPause = true;
					} else {
						temporaryPause = false;
					}
					self.simCanvas.state.x = x;
					self.simCanvas.state.y = y;
					self.simCanvas.state.moving = true;
					return 0;
				}
				return null;
			},
			mousedrag: function (canvas, data, dragIndex, width, height, left, top, ev) {
				var x = ((ev.x - left) - width / 2) / playgroundView.scale;
				var y = (height / 2 - (ev.y - top)) / playgroundView.scale;
				switch (dragIndex) {
				case 0:
					var pt0 = self.robot.pos;
					self.robot["setPosition"]([
							self.robot.pos[0] + x - self.simCanvas.state.x,
							self.robot.pos[1] + y - self.simCanvas.state.y
						],
						self.robot.theta);
					self.drawPen(A3a.vpl.Robot.TraceShape.line,
						[pt0[0], pt0[1], self.robot.pos[0], self.robot.pos[1]]);
					break;
				case 1:
					var dtheta = Math.atan2(y - self.robot.pos[1], x - self.robot.pos[0]) -
						Math.atan2(self.simCanvas.state.y - self.robot.pos[1],
							self.simCanvas.state.x - self.robot.pos[0]);
					self.robot["setPosition"](self.robot.pos, self.robot.theta + dtheta);
					break;
				}
				self.simCanvas.state.x = x;
				self.simCanvas.state.y = y;
			},
			mouseup: function (canvas, data, dragIndex) {
				self.simCanvas.state.moving = false;
				self.simCanvas.state.orienting = false;
				if (temporaryPause) {
					self.robot["resume"](A3a.vpl.VPLSim2DViewer.currentTime());
				}
			}
		});
	playgroundItem.draggable = false;
	this.simCanvas.setItem(playgroundItem);

	this.simCanvas.redraw();

	if (!this.paused && this.robot["shouldRunContinuously"]()) {
		window.requestAnimationFrame(function () {
			self.render();
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
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.resize = function () {
	var width = window.innerWidth;
	var height = window.innerHeight;
	if (window["vplDisableResize"]) {
		var bnd = this.simCanvas.canvas.getBoundingClientRect();
		width = bnd.width;
		height = bnd.height;
	}

	this.simCanvas.dims = this.simCanvas.dims;
	this.simCanvas.resize(width, height);
	this.render();
};
