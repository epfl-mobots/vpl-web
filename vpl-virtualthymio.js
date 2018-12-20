/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** JavaScript-based virtual Thymio class
	@constructor
	@extends {A3a.vpl.Robot}
*/
A3a.vpl.VirtualThymio = function () {
	A3a.vpl.Robot.call(this);

	this.playground = {
		xmin: -Infinity,
		xmax: +Infinity,
		ymin: -Infinity,
		ymax: +Infinity
	};

	this.t0 = 0;	// time origin, set upon reset
	this.t = 0;	// current time
	this.dt = 0.01;	// integration step in s
	this.r = 70;	// distance between wheel and robot center in mm
	this.pos = [0, 0];	// current position [x, y] in mm
	this.theta = 0;	// current orientation (counterclockwise, 0=going to the right)

	this.robotSize = 120;	// robot width and length
	this.groundSensorLon = 80;	// distance from robot center to ground sensors along x axis
	this.groundSensorLat = 20;	// distance from robot center to ground sensors along y axis

	this.state = {};
	this.stateChangeListener = {};
	/** @type {?A3a.vpl.VirtualThymio.OnMoveFunction} */
	this.onMove = null;
	this.clientState = {};
	/** @type {Array.<number>} */
	this.timers = [];	// trigger times
	this.eventListeners = {};

	this.ledsCircleUsed = false;

	this.audioContext = new (window["AudioContext"] || window["webkitAudioContext"]);

	// remaining initialization: call VirtualThymio's methods (too early to call overridden method)
	A3a.vpl.VirtualThymio.prototype["reset"].call(this, 0);
	A3a.vpl.VirtualThymio.prototype["resetEventListeners"].call(this);
};
A3a.vpl.VirtualThymio.prototype = Object.create(A3a.vpl.Robot.prototype);
A3a.vpl.VirtualThymio.prototype.constructor = A3a.vpl.VirtualThymio;

/** @typedef {function(this:A3a.vpl.VirtualThymio):void}
*/
A3a.vpl.VirtualThymio.OnMoveFunction;

/** Set playground bounds (limits on robot position)
	@param {number} xmin
	@param {number} xmax
	@param {number} ymin
	@param {number} ymax
	@return {void}
*/
A3a.vpl.VirtualThymio.prototype["setPositionLimits"] = function (xmin, xmax, ymin, ymax) {
	this.playground = {
		xmin: xmin,
		xmax: xmax,
		ymin: ymin,
		ymax: ymax
	};
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["reset"] = function (t0) {
	this.t0 = t0;
	this.t = t0;

	this.pos = [0, 0];
	this.theta = 0;

	this.state = {
		"button.center": false,
		"button.left": false,
		"button.right": false,
		"button.forward": false,
		"button.backward": false,

		"prox.ground.delta": [1, 1],
		"prox.horizontal": [0, 0, 0, 0, 0, 0, 0],
		"acc": [0, 0, 1],

		"motor.left": 0,
		"motor.right": 0,

		"leds.top": [0, 0, 0],
		"leds.bottom.left": [0, 0, 0],
		"leds.bottom.right": [0, 0, 0],
		"leds.circle": [0, 0, 0, 0, 0, 0, 0, 0],

		"sound": {}
	};

	this.ledsCircleUsed = false;

	var self = this;
	this.stateChangeListener = {
		"leds.circle": function (name, val) {
			self.ledsCircleUsed = true;
		},

		"sound": function (name, val) {
			if (!val["f"]) {
				return;
			}

			var i = 0;

			function playNote() {
				if (i >= val["f"].length) {
					return;
				}
				var oscNode = self.audioContext.createOscillator();
				oscNode.type = 'sawtooth';
				oscNode.frequency.value = val["f"][i];
				var gainNode = self.audioContext.createGain();
				gainNode.connect(self.audioContext.destination);
				oscNode.connect(gainNode);
				oscNode.start(0);
				var d = val["d"][i] / 50;
				gainNode.gain.exponentialRampToValueAtTime(0.01, self.audioContext.currentTime + d);
				oscNode.stop(self.audioContext.currentTime + d);
				oscNode.addEventListener("ended", playNote);
				i++;
			}

			playNote();
		}
	};

	this.timers = [];
	this.suspended = false;
};

/** Reset event listeners
	@return {void}
*/
A3a.vpl.VirtualThymio.prototype["resetEventListeners"] = function () {
	this.eventListeners = {};
};

/** Enforce playground limits on position
	@return {void}
*/
A3a.vpl.VirtualThymio.prototype["enforcePositionLimits"] = function () {
	this.pos = [
		Math.max(this.playground.xmin, Math.min(this.playground.xmax, this.pos[0])),
		Math.max(this.playground.ymin, Math.min(this.playground.ymax, this.pos[1]))
	];
};

/** Set the robot position
	@param {Array.<number>} pos
	@param {number} theta
	@return {void}
*/
A3a.vpl.VirtualThymio.prototype["setPosition"] = function (pos, theta) {
	this.pos = pos;
	this.theta = theta;
	this["enforcePositionLimits"]();
	this.onMove && this.onMove.call(this);
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["set"] = function (name, val) {
	this.state[name] = val;
	this.stateChangeListener[name] && this.stateChangeListener[name](name, val);
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["get"] = function (name) {
	return this.state[name];
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["setClientState"] = function (name, val) {
	this.clientState[name] = val;
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["getClientState"] = function (name) {
	var val = this.clientState[name];
	if (val instanceof Array) {
		val = val.slice();	// make a copy to avoid corrupting state if it's changed
	}
	return val;
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["addEventListener"] = function (name, fun) {
	this.eventListeners[name] = fun;
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["sendEvent"] = function (name, val) {
	this.eventListeners[name] && this.eventListeners[name].call(this, name, val);
	// call also event handlers with correct prefix
	for (var key in this.eventListeners) {
		if (key.indexOf(name + ".") === 0) {
			this.eventListeners[key](name, val);
		}
	}
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["setTimer"] = function (id, period) {
	this.timers[id] = this.t - this.t0 + period;
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["getTimer"] = function (id) {
	return this.timers[id] === undefined || this.timers[id] < 0
		? -1
		: this.t0 + this.timers[id] - this.t;
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["loadCode"] = function (code) {
	// compile code
	var fun = new Function(code);
	// execute it
	fun.call(this);
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["shouldRunContinuously"] = function () {
	if (this.suspended) {
		return false;
	}
	if (this["get"]("motor.left") !== 0 || this["get"]("motor.right") !== 0) {
		return true;
	}

	// check timers
	for (var i = 0; i < this.timers.length; i++) {
		if (this.timers[i] > 0) {
			return true;
		}
	}

	return false;
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["run"] = function (tStop, traceFun) {
	// real time: simulate from this.t to tStop
	// sim time: simulate from this.t-this.t0 to this.t-this.t0+(tStop-this.t)f
	// therefore adjust this.t and this.t0 to lengthen simulation time by f while
	// keeping the same initial simulation time and end real time tStop:
	// this.t0 -= (f - 1)(tStop - this.t)
	// this.t -= (f - 1)(tStop - this.t)
	if (this.speedupFactor !== 1) {
		this.t0 -= (this.speedupFactor - 1) * (tStop - this.t);
		this.t = this.speedupFactor * (this.t - tStop) + tStop;
	}
	var dt = Math.max(this.dt, (tStop - this.t) / 10);
	var posPrev = this.pos;
	while (!this.suspended && this.t < tStop) {
		// step (t, min(t+dt,tStop)]
		dt = Math.min(dt, tStop - this.t);
		// move
		var dLeft = this["get"]("motor.left") * 100 * dt;
		var dRight = this["get"]("motor.right") * 100 * dt;
		if (dLeft !== 0 || dRight != 0) {
			if (Math.abs(dLeft - dRight) < 1e-6 ||
				Math.abs(dLeft - dRight) < 1e-4 * (Math.abs(dLeft) + Math.abs(dRight))) {
				// straight
				this.pos = [
					this.pos[0] + (dLeft + dRight) * 0.5 * Math.cos(this.theta),
					this.pos[1] + (dLeft + dRight) * 0.5 * Math.sin(this.theta)
				];
				this["enforcePositionLimits"]();
			} else {
				// arc
				var R = (dLeft + dRight) * this.r / (dLeft - dRight);	// (R+r)*phi = left, (R-r)*phi = right
				var dTheta = (dRight - dLeft) / (2 * this.r);
				this.pos = [
					this.pos[0] + R * (Math.sin(this.theta) - Math.sin(this.theta + dTheta)),
					this.pos[1] - R * (Math.cos(this.theta) - Math.cos(this.theta + dTheta))
				];
				this.theta += dTheta;
				this["enforcePositionLimits"]();
			}
			this.onMove && this.onMove.call(this);
		}
		// advance time
		this.t += dt;
		// call prox event
		this["sendEvent"]("prox", null);
		// call elapsed timer events
		for (var i = 0; i < this.timers.length; i++) {
			if (this.timers[i] > 0 && this.t >= this.t0 + this.timers[i]) {
				this.timers[i] = -1;
				this["sendEvent"]("timer" + i.toString(10), null);
			}
		}
	}
	traceFun && traceFun(A3a.vpl.Robot.TraceShape.line,
		posPrev.concat(this.pos));
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["suspend"] = function () {
	this.suspended = true;
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymio.prototype["resume"] = function (t) {
	if (this.suspended) {
		this.t0 += t - this.t;
		this.t = t;
		this.suspended = false;
	}
};
