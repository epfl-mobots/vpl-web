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
*/
A3a.vpl.VPLSim2DViewer = function (robot) {
	this.robot = robot;
	this.running = false;
	this.paused = false;

	this.playground = new A3a.vpl.Playground(800, 600);
	var posMargin = 50;
	this.robot["setPositionLimits"](-this.playground.width / 2 + posMargin,
		this.playground.width / 2 - posMargin,
		-this.playground.height / 2 + posMargin,
		this.playground.height / 2 - posMargin);

	var canvasElement = document.getElementById("simCanvas");
	this.simCanvas = new A3a.vpl.Canvas(canvasElement);
	this.simCanvas.state = {};
	var self = this;
	this.simCanvas.onUpdate = function () {
		self.render();
	};

	// initial canvas resize
	this.resize();

	this.render();
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

	// start with an empty canvas
	this.simCanvas.clearItems();

	// top controls
	var canvasSize = this.simCanvas.getSize();

	// top controls
	var controlBar = new A3a.vpl.ControlBar(this.simCanvas);

	var self = this;

	controlBar.addStretch();

	// start
	controlBar.addControl(
		// draw
		function (ctx, item, dx, dy) {
			ctx.save();
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				self.simCanvas.dims.controlSize, self.simCanvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(item.x + dx + self.simCanvas.dims.controlSize * 0.3,
				item.y + dy + self.simCanvas.dims.controlSize * 0.25);
			ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.3,
				item.y + dy + self.simCanvas.dims.controlSize * 0.75);
			ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.8,
				item.y + dy + self.simCanvas.dims.controlSize * 0.5);
			ctx.closePath();
			ctx.fillStyle = "white";
			ctx.fill();
			ctx.restore();
		},
		// mousedown
		function (data, x, y, ev) {
			self.robot["start"](A3a.vpl.VPLSim2DViewer.currentTime());
			self.running = true;
			self.paused = false;
			self.render();
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	// pause
	controlBar.addControl(
		// draw
		function (ctx, item, dx, dy) {
			ctx.save();
			ctx.fillStyle = self.paused ? "#06f" : "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				self.simCanvas.dims.controlSize, self.simCanvas.dims.controlSize);
			ctx.fillStyle = self.running ? "white" : "#777";
			ctx.fillRect(item.x + dx + self.simCanvas.dims.controlSize * 0.28,
				item.y + dy + self.simCanvas.dims.controlSize * 0.28,
				self.simCanvas.dims.controlSize * 0.15, self.simCanvas.dims.controlSize * 0.44);
			if (self.paused) {
				ctx.beginPath();
				ctx.moveTo(item.x + dx + self.simCanvas.dims.controlSize * 0.54,
					item.y + dy + self.simCanvas.dims.controlSize * 0.28);
				ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.62,
					item.y + dy + self.simCanvas.dims.controlSize * 0.28);
				ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.75,
					item.y + dy + self.simCanvas.dims.controlSize * 0.5);
				ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.62,
					item.y + dy + self.simCanvas.dims.controlSize * 0.72);
				ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.54,
					item.y + dy + self.simCanvas.dims.controlSize * 0.72);
				ctx.fill();
			} else {
				ctx.fillRect(item.x + dx + self.simCanvas.dims.controlSize * 0.57,
					item.y + dy + self.simCanvas.dims.controlSize * 0.28,
					self.simCanvas.dims.controlSize * 0.15, self.simCanvas.dims.controlSize * 0.44);
			}
			ctx.restore();
		},
		// mousedown
		function (data, x, y, ev) {
			if (self.running) {
				self.paused = !self.paused;
				if (self.paused) {
					self.robot["suspend"]();
				} else {
					self.robot["resume"](A3a.vpl.VPLSim2DViewer.currentTime());
					self.render();
				}
			}
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	controlBar.addStretch();

	// vpl
	controlBar.addControl(
		// draw
		function (ctx, item, dx, dy) {
			ctx.save();
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				self.simCanvas.dims.controlSize, self.simCanvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(item.x + dx + self.simCanvas.dims.controlSize * 0.25,
				item.y + dy + self.simCanvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.25,
				item.y + dy + self.simCanvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.75,
				item.y + dy + self.simCanvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.75,
				item.y + dy + self.simCanvas.dims.controlSize * 0.3);
			ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.65,
				item.y + dy + self.simCanvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(item.x + dx + self.simCanvas.dims.controlSize * 0.65,
				item.y + dy + self.simCanvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.65,
				item.y + dy + self.simCanvas.dims.controlSize * 0.3);
			ctx.lineTo(item.x + dx + self.simCanvas.dims.controlSize * 0.75,
				item.y + dy + self.simCanvas.dims.controlSize * 0.3);
			ctx.strokeStyle = "white";
			ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
			ctx.stroke();
			ctx.fillStyle = "#99a";
			for (var y = 0.15; y < 0.6; y += 0.15) {
				ctx.fillRect(item.x + dx + self.simCanvas.dims.controlSize * 0.3,
					item.y + dy + self.simCanvas.dims.controlSize * (0.2 + y),
					self.simCanvas.dims.controlSize * 0.4,
					self.simCanvas.dims.controlSize * 0.10);
			}
			ctx.restore();
		},
		// mousedown
		function (data, x, y, ev) {
			window["vplProgram"].setView("vpl");
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	controlBar.addStretch();

	controlBar.calcLayout(this.simCanvas.dims.margin, canvasSize.width - this.simCanvas.dims.margin,
		this.simCanvas.dims.controlSize,
		this.simCanvas.dims.interBlockSpace, 2 * this.simCanvas.dims.interBlockSpace);
	controlBar.addToCanvas();

	// add buttons for events
	var smallBtnSize = this.simCanvas.dims.controlSize * 0.6;
	var yRobotControl = 2 * this.simCanvas.dims.margin + this.simCanvas.dims.controlSize;
	function drawButtonTri(ctx, x, y, rot) {
		ctx.save();
		ctx.fillStyle = "navy";
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
		function (ctx, item, dx, dy) {
			drawButtonTri(ctx, item.x + dx, item.y + dy, 1);
		},
		// mousedown
		function (data, x, y, ev) {
			self.robot["set"]("button.forward", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.forward", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
			return 0;
		});
	// left
	this.simCanvas.addControl(this.simCanvas.dims.margin,
		yRobotControl + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, item, dx, dy) {
			drawButtonTri(ctx, item.x + dx, item.y + dy, 2);
		},
		// mousedown
		function (data, x, y, ev) {
			self.robot["set"]("button.left", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.left", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
			return 0;
		});
	// center
	this.simCanvas.addControl(this.simCanvas.dims.margin + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		yRobotControl + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.save();
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy, smallBtnSize, smallBtnSize);
			ctx.beginPath();
			ctx.arc(item.x + dx + 0.5 * smallBtnSize, item.y + dy + 0.5 * smallBtnSize, 0.25 * smallBtnSize, 0, 2 * Math.PI);
			ctx.strokeStyle = "white";
			ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
			ctx.stroke();
			ctx.restore();
		},
		// mousedown
		function (data, x, y, ev) {
			self.robot["set"]("button.center", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.center", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
			return 0;
		});
	// right
	this.simCanvas.addControl(this.simCanvas.dims.margin + 2 * smallBtnSize + 2 * this.simCanvas.dims.stripHorMargin,
		yRobotControl + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, item, dx, dy) {
			drawButtonTri(ctx, item.x + dx, item.y + dy, 0);
		},
		// mousedown
		function (data, x, y, ev) {
			self.robot["set"]("button.right", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.right", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
			return 0;
		});
	// backward
	this.simCanvas.addControl(this.simCanvas.dims.margin + smallBtnSize + this.simCanvas.dims.stripHorMargin,
		yRobotControl + 2 * smallBtnSize + 2 * this.simCanvas.dims.stripHorMargin,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, item, dx, dy) {
			drawButtonTri(ctx, item.x + dx, item.y + dy, 3);
		},
		// mousedown
		function (data, x, y, ev) {
			self.robot["set"]("button.backward", true);
			self.robot["sendEvent"]("buttons", null);
			self.robot["set"]("button.backward", false);
			self.robot["sendEvent"]("buttons", null);	// reset "when" state
			return 0;
		});
	yRobotControl += 3.5 * smallBtnSize + 3 * this.simCanvas.dims.stripHorMargin;

	// tap
	this.simCanvas.addControl(this.simCanvas.dims.margin + 0.5 * smallBtnSize + 0.5 * this.simCanvas.dims.stripHorMargin,
		yRobotControl,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.save();
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy, smallBtnSize, smallBtnSize);
			ctx.beginPath();

			ctx.strokeStyle = "white";
			ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
			ctx.translate(item.x + dx + 0.6 * smallBtnSize, item.y + dy + 0.6 * smallBtnSize);
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
		// mousedown
		function (data, x, y, ev) {
			self.robot["sendEvent"]("tap", null);
			return 0;
		});
	// clap
	this.simCanvas.addControl(this.simCanvas.dims.margin + 1.5 * smallBtnSize + 1.5 * this.simCanvas.dims.stripHorMargin,
		yRobotControl,
		smallBtnSize, smallBtnSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.save();
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy, smallBtnSize, smallBtnSize);
			ctx.beginPath();

			ctx.strokeStyle = "white";
			ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
			ctx.translate(item.x + dx + 0.5 * smallBtnSize, item.y + dy + 0.5 * smallBtnSize);
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
		// mousedown
		function (data, x, y, ev) {
			self.robot["sendEvent"]("mic", null);
			return 0;
		});
	yRobotControl += 2 * smallBtnSize;

	// draw robot back side
	var yRobotSide = yRobotControl;
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
		ctx.strokeStyle = "black";
		ctx.lineJoin = "round";
		ctx.lineWidth = 1;
		ctx.strokeRect(self.simCanvas.dims.margin + 0.3 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
			yRobotSide,
			2.4 * smallBtnSize, smallBtnSize);
		ctx.restore();
	});
	yRobotControl += 2 * smallBtnSize;

	// draw yellow arc leds
	var ledsY0 = yRobotControl + 1.5 * smallBtnSize;
	this.simCanvas.addDecoration(function (ctx) {
		var leds = self.robot["get"]("leds.circle");
		for (var i = 0; i < 8; i++) {
			A3a.vpl.Canvas.drawArc(ctx,
				self.simCanvas.dims.margin + 1.5 * smallBtnSize + self.simCanvas.dims.stripHorMargin,
				ledsY0,
				1.2 * smallBtnSize, 1.5 * smallBtnSize,
				Math.PI * (0.5 - 0.07 - i * 0.25), Math.PI * (0.5 + 0.07 - i * 0.25),
				leds[i] ? "#fa0" : "white",
 				"black", self.simCanvas.dims.blockLineWidth);
		}
	});
	yRobotControl += 4 * smallBtnSize;

	// draw timer 0
	var timerY0 = yRobotControl + smallBtnSize;
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
	var robotSize = 50;
	var playgroundItem = new A3a.vpl.CanvasItem(null,
		this.playground.width * playgroundView.scale, this.playground.height * playgroundView.scale,
		playgroundView.x + playgroundView.ox,
		playgroundView.y + playgroundView.oy,
		function(ctx, item, dx, dy) {
			ctx.save();

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
			ctx.lineTo(0,
				-0.8 * robotSize);
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
				ctx.arc(0, -robotSize, 0.1 * robotSize, 0, 2 * Math.PI);
				ctx.fillStyle = self.simCanvas.state.orienting ? "navy" : "white";
				ctx.strokeStyle = "black";
				ctx.lineWidth = self.simCanvas.dims.blockLineWidth;
				ctx.fill();
				ctx.stroke();
			}

			ctx.restore();
		},
		{
			mousedown: function (canvas, data, width, height, left, top, ev) {
				if (!self.running || self.paused) {
					var x = ((ev.clientX - left) - width / 2) / playgroundView.scale;
					var y = (height / 2 - (ev.clientY - top)) / playgroundView.scale;
					var xr = x - self.robot.pos[0];
					var yr = y - self.robot.pos[1];
					var xHandle = robotSize * Math.cos(self.robot.theta);
					var yHandle = robotSize * Math.sin(self.robot.theta);
					if ((xr - xHandle) * (xr - xHandle) + (yr - yHandle) * (yr - yHandle) <
						0.02 * robotSize * robotSize) {
						self.simCanvas.state.orienting = true;
						return 1;
					}
					if (xr * xr + yr * yr < robotSize * robotSize) {
						self.simCanvas.state.x = x;
 						self.simCanvas.state.y = y;
						return 0;
					}
				}
				return null;
			},
			mousedrag: function (canvas, data, dragIndex, width, height, left, top, ev) {
				var x = ((ev.clientX - left) - width / 2) / playgroundView.scale;
				var y = (height / 2 - (ev.clientY - top)) / playgroundView.scale;
				switch (dragIndex) {
				case 0:
					self.robot["setPosition"]([
							self.robot.pos[0] + x - self.simCanvas.state.x,
							self.robot.pos[1] + y - self.simCanvas.state.y
						],
						self.robot.theta);
						self.simCanvas.state.x = x;
 						self.simCanvas.state.y = y;
					break;
				case 1:
					var theta = Math.atan2(y - self.robot.pos[1], x - self.robot.pos[0]);
					self.robot["setPosition"](self.robot.pos, theta);
					break;
				}
			},
			mouseup: function (canvas, data, dragIndex) {
				self.simCanvas.state.moving = false;
				self.simCanvas.state.orienting = false;
			}
		});
	playgroundItem.draggable = false;
	this.simCanvas.setItem(playgroundItem);

	this.simCanvas.redraw();

	if (!this.paused) {
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
