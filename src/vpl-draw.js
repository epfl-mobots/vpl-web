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

Methods for basic drawing in a A3a.vpl.Canvas object related to VPL.

*/

/** Clear block background
	@param {CSSParser.VPL.Box} box
	@return {void}
*/
A3a.vpl.Canvas.prototype.clearBlockBackground = function (box) {
	this.ctx.save();
	this.ctx.fillStyle = "#ddd";
	this.ctx.fillRect(this.dims.blockLineWidth,
		this.dims.blockLineWidth,
		box.width - 2 * this.dims.blockLineWidth,
		box.height - 2 * this.dims.blockLineWidth);
	this.ctx.restore();
};

/** Draw overlay rectangle for an item specified by bounding box
	@param {number} top
	@param {number} left
	@param {number} width
	@param {number} height
	@param {Array.<string>=} overlayRectClasses css classes for overlay rectangle
	@return {void}
*/
A3a.vpl.Canvas.prototype.overlayRect = function (left, top, width, height, overlayRectClasses) {
	var overlayRect = this.css.getBox({
		tag: "overlay-rectangle",
		clas: overlayRectClasses || []
	});
	overlayRect.x = left;
	overlayRect.y = top;
	overlayRect.width = width;
	overlayRect.height = height;
	overlayRect.draw(this.ctx);
};

/** Draw disabled mark for an item specified by bounding box (block or event handler)
	@param {number} top
	@param {number} left
	@param {number} width
	@param {number} height
	@param {Array.<string>=} overlayRectClasses css classes for overlay rectangle
	@param {Array.<string>=} crossoutLineClasses css classes for crossout-line
	@param {boolean=} noCrossoutLine true just for disabled style, false also for crossout line (default)
	@return {void}
*/
A3a.vpl.Canvas.prototype.disabledMark = function (left, top, width, height,
	overlayRectClasses, crossoutLineClasses, noCrossoutLine) {
	this.overlayRect(left, top, width, height, (overlayRectClasses || []).concat("disabled"));
	if (!noCrossoutLine) {
		this.ctx.save();
		var crossoutLine = this.css.getLine({
			tag: "crossout-line",
			clas: crossoutLineClasses || []
		});
		this.ctx.beginPath();
		var angle = this.css.convertAngle(crossoutLine.otherProperties["line-angle"] || "0");
		var overflow = this.css.convertLength(crossoutLine.otherProperties["line-overflow"] || "0").toValue(this.css.lengthBase);
		var dx = 0, dy = 0;
		if (Math.abs(angle % Math.PI) < Math.PI * 0.25 || Math.abs((Math.PI - angle) % Math.PI) < Math.PI * 0.25) {
			// more wide than tall
			dx = (width / 2 + overflow) * Math.sign(Math.cos(angle));
			dy = height / 2 * Math.sin(angle) * Math.sqrt(2);
		} else {
			// more tall than wide
			dy = (height / 2 + overflow) * Math.sign(Math.sin(angle));
			dx = width / 2 * Math.cos(angle) * Math.sqrt(2);
		}
		this.ctx.moveTo(left + width / 2 - dx, top + height / 2 - dy);
		this.ctx.lineTo(left + width / 2 + dx, top + height / 2 + dy);
		crossoutLine.stroke(this.ctx);
		this.ctx.restore();
	}
};

/** Draw lock for an item specified by bounding box (block or event handler)
	@param {CanvasRenderingContext2D} ctx
	@param {number} x
	@param {number} y
	@param {number} r
	@param {string} color
	@param {boolean=} unlocked
	@return {void}
*/
A3a.vpl.Canvas.lock = function (ctx, x, y, r, color, unlocked) {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = r;
	ctx.fillRect(x - 2.5 * r, y - r, 5 * r, 4 * r);
	ctx.beginPath();
	ctx.moveTo(x - 1.7 * r, y);
	ctx.lineTo(x - 1.7 * r, y);
	if (unlocked) {
		ctx.arc(x - 3.4 * r, y - 2 * r, 1.7 * r, 0, Math.PI, true);
		ctx.lineTo(x - 5.1 * r, y);
	} else {
		ctx.arc(x, y - 2 * r, 1.7 * r, -Math.PI, 0);
		ctx.lineTo(x + 1.7 * r, y);
	}
	ctx.stroke();
	ctx.restore();
};

/** Draw locked mark (lock) for an item specified by bounding box (block or event handler)
	@param {number} top
	@param {number} left
	@param {number} width
	@param {number} height
	@param {boolean} inside
	@param {string=} color
	@return {void}
*/
A3a.vpl.Canvas.prototype.lockedMark = function (left, top, width, height, inside, color) {
	var r = 0.03 * this.dims.blockSize;
	var x = left + width + (inside ? -5 : 5) * r;
	var y = top + 0.15 * height;

	A3a.vpl.Canvas.lock(this.ctx, x, y, r, color || "#333");
};

/** Draw an arc ending with an arrow
	@param {CanvasRenderingContext2D} ctx
	@param {number} x
	@param {number} y
	@param {number} r
	@param {number} a1
	@param {number} a2
	@param {{
		arrowAtStart: (boolean | undefined),
		style: (string | undefined),
		lineWidth: (number | undefined),
		arrowSize: (number | undefined),
		alpha: (number | undefined)
	}} opt
*/
A3a.vpl.Canvas.drawArcArrow = function (ctx, x, y, r, a1, a2, opt) {
	ctx.save();
	if (opt) {
		if (opt.style) {
			ctx.strokeStyle = opt.style;
			ctx.fillStyle = opt.style;
		}
		if (opt.lineWidth !== undefined) {
			ctx.lineWidth = opt.lineWidth;
		}
		if (opt.alpha !== undefined) {
			ctx.globalAlpha = opt.alpha;
		}
	}
	var s = opt && opt.arrowSize !== undefined ? opt.arrowSize : 5 * ctx.lineWidth;
	ctx.beginPath();
	var a1b = a1 + (opt && opt.arrowAtStart ? s / r : 0);
	var a2b = a2 - (opt && opt.arrowAtStart ? 0 : s / r);
	ctx.arc(x, y, r, a1b, a2b);
	ctx.stroke();
	if (opt && opt.arrowAtStart) {
		ctx.translate(x + r * Math.cos(a1), y + r * Math.sin(a1));
		ctx.rotate((a1 + a1b) / 2 + Math.PI);
	} else {
		ctx.translate(x + r * Math.cos(a2), y + r * Math.sin(a2));
		ctx.rotate((a2 + a2b) / 2);
	}
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(s / 2, -s * 1.2);
	ctx.lineTo(-s / 2, -s * 1.2);
	ctx.fill();
	ctx.restore();
};

/** Draw centered text
	@param {string} str text
	@param {{
		x: (number|undefined),
		y: (number|undefined),
		rot: (number|undefined),
		fillStyle: (string|undefined)
	}=} opt
	@return {void}
*/
A3a.vpl.Canvas.prototype.text = function (str, opt) {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();
	ctx.fillStyle = opt && opt.fillStyle || "white";
	ctx.font = dims.blockFont;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.translate(0.5 * dims.blockSize + (opt && opt.x || 0),
		0.5 * dims.blockSize - (opt && opt.y || 0));
	opt && opt.rot && ctx.rotate(-opt.rot);
	ctx.translate(-0.5 * dims.blockSize,
		-0.5 * dims.blockSize);
	ctx.fillText(str,
		0.5 * dims.blockSize,
		0.5 * dims.blockSize);
	ctx.restore();
};

/** Draw the robot seen from above
	@param {{
		withWheels: (boolean|undefined),
		scale: (number|undefined),
		rotation: (number|undefined),
		translation: (Array.<number>|undefined),
		rgb: (Array.<number>|undefined),
		side: (string|undefined)
	}=} options
	@return {void}
*/
A3a.vpl.Canvas.prototype.robotTop = function (options) {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();

	// clip to make sure that the translated, rotated robot doesn't overflow
	ctx.beginPath();
	ctx.rect(0, 0, this.dims.blockSize, this.dims.blockSize);
	ctx.clip();

	if (options && (options.scale || options.rotation)) {
		if (options.translation) {
			ctx.translate(-options.translation[0], -options.translation[1]);
		}
		ctx.translate(0.5 * dims.blockSize,
			0.5 * dims.blockSize);
		if (options.scale) {
			ctx.scale(options.scale, options.scale);
		}
		if (options.rotation) {
			ctx.rotate(-options.rotation);
		}
		ctx.translate(-0.5 * dims.blockSize,
			-0.5 * dims.blockSize);
	}
	ctx.beginPath();
	// middle rear
	ctx.moveTo(dims.blockSize * 0.5,
		dims.blockSize - dims.blockLineWidth);
	if (!options || options.side !== "left") {
		// right side
		ctx.lineTo(dims.blockSize - dims.blockLineWidth,
			dims.blockSize - dims.blockLineWidth);
		ctx.lineTo(dims.blockSize - dims.blockLineWidth,
			dims.blockSize * 0.25);
		ctx.bezierCurveTo(dims.blockSize * 0.8,
			dims.blockLineWidth,
			dims.blockSize * 0.52,
			dims.blockLineWidth,
			dims.blockSize * 0.5,
			dims.blockLineWidth);
	}
	if (!options || options.side !== "right") {
		// left side
		ctx.lineTo(dims.blockSize * 0.5,
			dims.blockLineWidth);
		ctx.bezierCurveTo(dims.blockSize * 0.48,
			dims.blockLineWidth,
			dims.blockSize * 0.2,
			dims.blockLineWidth,
			dims.blockLineWidth,
			dims.blockSize * 0.25);
		ctx.lineTo(dims.blockLineWidth,
			dims.blockSize - dims.blockLineWidth);
	}
	ctx.closePath();
	if (options && options.rgb) {
		var rgb = [
			options.rgb[0],
			Math.max(0.2 + 0.8 * options.rgb[1], options.rgb[2] / 2),
			options.rgb[2]
		];
		var max = Math.max(rgb[0], Math.max(rgb[1], rgb[2]));
		ctx.fillStyle = "rgb(" +
			rgb.map(function (x) {
					return Math.round(225 * (1 - max) + (30 + 225 * max) * x);
				}).join(",") +
			")";
	} else {
		ctx.fillStyle = "white";
	}
	ctx.fill();
	if (options && options.rgb) {
		ctx.strokeStyle = "white";
		ctx.lineWidth = dims.blockLineWidth;
		ctx.stroke();
	}
	if (options && options.withWheels) {
		ctx.fillStyle = "black";
		ctx.fillRect(0, dims.blockSize * 0.6,
			dims.blockSize * 0.1, dims.blockSize * 0.35);
		ctx.fillRect(dims.blockSize * 0.9, dims.blockSize * 0.6,
			dims.blockSize * 0.1, dims.blockSize * 0.35);
	}
	ctx.restore();
};

/**	Calculate trajectory from wheel advances
	@param {number} dleft distance of the left wheel divided by the distance of the wheel
	wrt the center of the differential wheel axis
	@param {number} dright distance of the right wheel divided by the distance of the wheel
	wrt the center of the differential wheel axis
	@return {{phi:number,R:number,x:number,y:number}}
*/
A3a.vpl.draw.diffWheels = function (dleft, dright) {
	var phi = (dright - dleft) / 2;
	var R = dright === dleft ? Infinity : (dright + dleft) / (2 * phi);
	return {
		phi: phi,
		R: R,
		x: Math.abs(R) > 1e3 * Math.abs(dleft + dright) ? 0 : R * (phi < 1e-2 ? phi * phi / 2 : 1 - Math.cos(phi)),
		y: Math.abs(R) > 1e3 * Math.abs(dleft + dright) ? (dleft + dright) / 2 : R * Math.sin(phi)
	};
};

/**	Draw wheel traces from center to
	@param {number} dleft distance of the left wheel divided by the distance of the wheel
	wrt the center of the differential wheel axis
	@param {number} dright distance of the right wheel divided by the distance of the wheel
	wrt the center of the differential wheel axis
	@param {number} rw half-distance between wheels (fraction of block size)
	@param {{
		color: (string | undefined),
		r: (Array.<number> | undefined),
		linewidth: (number | undefined)
	}=} options options (r: distance from center, relative to block size; color: trace color)
	@return {{phi:number,R:number,x:number,y:number}}
*/
A3a.vpl.Canvas.prototype.traces = function (dleft, dright, rw, options) {
	var ctx = this.ctx;
	var dims = this.dims;
	rw *= dims.blockSize;
	var ra = options && options.r || [-1, 0, 1];
	var color = options && options.color || "black";
	var linewidth = options && options.linewidth !== undefined ? options.linewidth : 1;

	/*	Add an arc to the current path from angle=0
		@param {number} x
		@param {number} y
		@param {number} r signed radius
		@param {number} phi signed
	*/
	function arc(x, y, r, phi) {
		if (r > 0) {
			ctx.arc(x, y, r, 0, -phi, phi > 0);
		} else if (r < 0) {
			ctx.arc(x, y, -r, Math.PI, Math.PI - phi, phi > 0);
		}
	}

	var tr = A3a.vpl.draw.diffWheels(dleft, dright);
	ctx.save();
	ctx.translate(0.5 * dims.blockSize, 0.5 * dims.blockSize);
	ctx.strokeStyle = color;
	ctx.lineWidth = dims.blockLineWidth * linewidth;
	if (Math.abs(tr.R) > 20) {
		ctx.beginPath();
		ra.forEach(function (r) {
			ctx.moveTo(r * rw, 0);
			ctx.lineTo((tr.x + r) * rw, -tr.y * rw);
		});
		ctx.stroke();
	} else {
		ra.forEach(function (r) {
			ctx.beginPath();
			arc(-tr.R * rw, 0, (tr.R + r) * rw, tr.phi);
			ctx.stroke();
		});
	}
	ctx.restore();
	return tr;
};

/** Check if point is over robot seen from above
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {number} dleft distance of the left wheel divided by the distance of the wheel
	wrt the center of the differential wheel axis
	@param {number} dright distance of the right wheel divided by the distance of the wheel
	wrt the center of the differential wheel axis
	@param {number} r half-distance between wheels, relative to block size
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.robotTopCheck = function (width, height, left, top, dleft, dright, r, ev) {
	var dims = this.dims;
	dleft *= dims.blockSize;
	dright *= dims.blockSize;
	r *= dims.blockSize;
	var x = ev.x - left - width / 2;
	var y = top + width / 2 - ev.y;
	var tr = A3a.vpl.draw.diffWheels(dleft, dright);
	return (x - tr.x) * (x - tr.x) + (y - tr.y) * (y - tr.y) < r * r;
};

/** Draw the robot seen from the side
	@param {number=} scale
	@return {void}
*/
A3a.vpl.Canvas.prototype.robotSide = function (scale) {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();
	if (scale) {
		ctx.translate(0.5 * dims.blockSize,
			0.5 * dims.blockSize);
		if (scale) {
			ctx.scale(scale, scale);
		}
		ctx.translate(-0.5 * dims.blockSize,
			-0.5 * dims.blockSize);
	}
	ctx.fillStyle = "white";
	ctx.fillRect(dims.blockLineWidth,
		dims.blockSize * 0.45,
		dims.blockSize - 2 * dims.blockLineWidth,
		dims.blockSize * 0.35);
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.arc(dims.blockSize * 0.27, dims.blockSize * 0.72,
		dims.blockSize * 0.20,
		0, 2 * Math.PI);
	ctx.fill();
	ctx.fillStyle = "white";
	ctx.beginPath();
	ctx.arc(dims.blockSize * 0.27, dims.blockSize * 0.72,
		dims.blockSize * 0.12,
		0, 2 * Math.PI);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(dims.blockSize * 0.8,
		dims.blockSize * 0.8 - dims.blockLineWidth,
		dims.blockSize * 0.1,
		0, 2 * Math.PI);
	ctx.fill();
	ctx.restore();
};

/**	Draw tap waves
	@param {number=} scale
	@return {void}
*/
A3a.vpl.Canvas.prototype.tap = function (scale) {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();
	ctx.lineWidth = dims.blockLineWidth;
	ctx.strokeStyle = "white";
	for (var i = 1; i <= 3; i++) {
		ctx.beginPath();
		ctx.arc((0.5 - 0.45 * (scale || 1)) * dims.blockSize,
			0.48 * dims.blockSize,
			0.05 * dims.blockSize * i,
			Math.PI * 0.9, Math.PI * 1.7);
		ctx.stroke();
	}
	ctx.restore();
};

/** Draw a remote control
	@return {void}
*/
A3a.vpl.Canvas.prototype.remoteControl = function () {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();
	ctx.fillStyle = "#eee";
	ctx.fillRect(0.1 * dims.blockSize, dims.blockLineWidth,
		0.8 * dims.blockSize, dims.blockSize - 2 * dims.blockLineWidth);
	ctx.restore();
};

/**	Draw an array of buttons
	@param {Array.<A3a.vpl.Canvas.buttonShape>} shapes
	@param {Array.<boolean|number>} state false or 0: gray border,
	true or 1: red, -1: black, -2: black border (or index in opt.fillColors)
	@param {{cross:(*|undefined)}=} opt (cross: value for cross,
		fillColors: list of fill colors, strokeColors: list of stroke colors)
	@return {void}
*/
A3a.vpl.Canvas.prototype.buttons = function (shapes, state, opt) {
	var ctx = this.ctx;
	var dims = this.dims;
	shapes.forEach(function (shape, i) {
		ctx.save();
		ctx.translate(dims.blockSize * (0.5 + shape.x),
			dims.blockSize * (0.5 - shape.y));
		ctx.rotate(shape.r || 0);
		ctx.fillStyle = shape.fillStyle ? shape.fillStyle
			: opt && opt.fillColors && state ? opt.fillColors[state[i]]
			: state && state[i] === true ? "red"
			: state && state[i] === 1 ? "#f66"
			: state && state[i] === -1  ? "#333"
			: "white";
		ctx.strokeStyle = shape.strokeStyle ? shape.strokeStyle
			: opt && opt.strokeColors && state ? opt.strokeColors[state[i]]
			: state && (state[i] === 1 || state[i] === true) ? "#700"
			: state && state[i] < 0 ? "black"
			: "#aaa";
		ctx.lineWidth = dims.blockLineWidth;
		ctx.lineJoin = "round";
		var sz = shape.size || 1;
		switch (shape.sh) {
		case "r":
			ctx.fillRect(-dims.blockSize * 0.08 * sz,
				-dims.blockSize * 0.08 * sz,
				dims.blockSize * 0.16 * sz,
				dims.blockSize * 0.16 * sz);
			ctx.strokeRect(-dims.blockSize * 0.08 * sz,
				-dims.blockSize * 0.08 * sz,
				dims.blockSize * 0.16 * sz,
				dims.blockSize * 0.16 * sz);
			break;
		case "t":
			ctx.beginPath();
			ctx.moveTo(0, -122e-3 * dims.blockSize * sz);
			ctx.lineTo(106e-3 * dims.blockSize * sz, 62e-3 * dims.blockSize * sz);
			ctx.lineTo(-106e-3 * dims.blockSize * sz, 62e-3 * dims.blockSize * sz);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			break;
		case "c":
			ctx.beginPath();
			ctx.arc(0, 0, dims.blockSize * 0.112 * sz, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
			break;
		}
		if (state && opt && opt.cross !== undefined && opt.cross === state[i]) {
			// white cross
			var s = 0.06;
			ctx.strokeStyle = "white";
			ctx.beginPath();
			ctx.moveTo(-dims.blockSize * s * sz, -dims.blockSize * s * sz);
			ctx.lineTo(dims.blockSize * s * sz, dims.blockSize * s * sz);
			ctx.moveTo(-dims.blockSize * s * sz, dims.blockSize * s * sz);
			ctx.lineTo(dims.blockSize * s * sz, -dims.blockSize * s * sz);
			ctx.stroke();
		}
		ctx.restore();
	});
};

/**
	@typedef {{
		sh: string,
		x: number,
		y: number,
		size: (number | undefined),
		r: (number | undefined),
		str: string,
		fillStyle: (string | undefined),
		strokeStyle: (string | undefined)
	}}
*/
A3a.vpl.Canvas.buttonShape;

/** Draw notes (low-level)
	@param {Array.<number>} notes array of {tone,duration}x6
	(tone between 1 and 5, duration=0/1/2)
	@param {number} left
	@param {number} right
	@param {number} low
	@param {number} high
	@param {number} numHeights
	@param {number} noteSize
	@param {number} linewidth
	@return {void}
*/
A3a.vpl.Canvas.prototype.notesLL = function (notes, left, right, low, high, numHeights, noteSize, linewidth) {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();
	ctx.strokeStyle = "black";
	ctx.lineWidth = dims.blockLineWidth * linewidth;
	var numNotes = notes.length / 2;
	for (var i = 0; i < numNotes; i++) {
		if (notes[2 * i + 1] > 0) {
			ctx.fillStyle = notes[2 * i + 1] === 2 ? "white" : "black";
			ctx.beginPath();
			ctx.arc(dims.blockSize * (left + (right - left) / numNotes * (i + 0.5)),
				dims.blockSize * (low + (high - low) / numHeights * (notes[2 * i] + 0.5)),
				dims.blockSize * noteSize / 2, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
		}
	}
	ctx.restore();
};

/** Draw notes
	@param {Array.<number>} notes array of {tone,duration}x6
	(tone between 1 and 5, duration=0/1/2)
	@return {void}
*/
A3a.vpl.Canvas.prototype.notes = function (notes) {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();
	// score
	ctx.fillStyle = "#eee";
	for (var i = 0; i < 5; i++) {
		ctx.fillRect(dims.blockSize * 0.1,
			dims.blockSize * (0.1 + 0.16 * i),
			dims.blockSize * 0.8,
			dims.blockSize * 0.16 - dims.blockLineWidth);
	}
	// notes
	this.notesLL(notes,
		0.1, 0.9,
		0.9, 0.1,
		5, 0.14, 1);
	ctx.restore();
};

/** Draw sd card with number (for "play" action block)
	@param {?number} fileId fileId (0..99), or null for stop
	@return {void}
*/
A3a.vpl.Canvas.prototype.playSDFile = function (fileId) {
	var ctx = this.ctx;
	var dims = this.dims;
	var dx = fileId === null ? -0.15 * dims.blockSize : 0;
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(dims.blockSize * 0.4 + dx, dims.blockSize * 0.3);
	ctx.lineTo(dims.blockSize * 0.4 + dx, dims.blockSize * 0.7);
	ctx.lineTo(dims.blockSize * 0.7 + dx, dims.blockSize * 0.7);
	ctx.lineTo(dims.blockSize * 0.7 + dx, dims.blockSize * 0.37);
	ctx.lineTo(dims.blockSize * 0.63 + dx, dims.blockSize * 0.3);
	ctx.closePath();
	ctx.lineWidth = dims.blockLineWidth;
	ctx.strokeStyle = "white";
	ctx.lineJoin = "round";
	ctx.stroke();
	for (var r = 0.15; r < 0.31; r += 0.06) {
		ctx.beginPath();
		ctx.arc(dims.blockSize * 0.65 + dx, dims.blockSize * 0.5, dims.blockSize * r, -0.6, 0.6);
		ctx.stroke();
	}
	if (fileId === null) {
		ctx.beginPath();
		ctx.moveTo(dims.blockSize * 0.12, dims.blockSize * 0.6);
		ctx.lineTo(dims.blockSize * 0.88, dims.blockSize * 0.4);
		ctx.lineWidth = dims.blockLineWidth * 1.5;
		ctx.stroke();
	} else {
		this.text(fileId.toString(10), {x: -0.3 * dims.blockSize});
	}
	ctx.restore();
};

/** Draw microphone (for clap event)
	@return {void}
*/
A3a.vpl.Canvas.prototype.microphone = function () {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();
	ctx.beginPath();
	ctx.arc(dims.blockSize * 0.7,
		dims.blockSize * 0.6,
		dims.blockSize * 0.15,
		0, 2 * Math.PI);
	ctx.fillStyle = "white";
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(dims.blockSize * 0.7,
		dims.blockSize * 0.6);
	ctx.lineTo(dims.blockSize * 0.8,
		dims.blockSize * 0.95);
	ctx.strokeStyle = "white";
	ctx.lineWidth = 0.13 * dims.blockSize;
	ctx.stroke();
	ctx.lineWidth = 1.5 * dims.blockLineWidth;
	ctx.translate(dims.blockSize * 0.3, dims.blockSize * 0.3);
	ctx.rotate(0.1);
	for (var i = 0; i < 9; i++) {
		ctx.beginPath();
		ctx.moveTo(0.07 * dims.blockSize, 0);
		ctx.lineTo(0.14 * dims.blockSize, 0);
		ctx.moveTo(0.17 * dims.blockSize, 0);
		ctx.lineTo(0.22 * dims.blockSize, 0);
		ctx.stroke();
		ctx.rotate(Math.PI / 4.5);
	}
	ctx.restore();
};

/** Draw accelerometer handle
	@return {void}
*/
A3a.vpl.Canvas.prototype.accelerometerHandle = function () {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.beginPath();
	ctx.arc(0, 0,
		dims.blockSize * 0.4,
		0, 2 * Math.PI, true)
	ctx.moveTo(0, 0);
	ctx.lineTo(0, -dims.blockSize * 0.4);
	ctx.strokeStyle = "#666";
	ctx.lineWidth = dims.blockLineWidth;
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(0, -dims.blockSize * 0.4, dims.blockSize * 0.1,
		0, 2 * Math.PI);
	ctx.fillStyle = "white";
	ctx.fill();
	ctx.strokeStyle = "black";
	ctx.stroke();
};

/** Draw accelerometer
	@param {boolean} pitch true for pitch, false for roll
	@param {number} angle value from -6 to 6 (0=normal, 6=90 deg)
	@return {void}
*/
A3a.vpl.Canvas.prototype.robotAccelerometer = function (pitch, angle) {
	var ctx = this.ctx;
	var dims = this.dims;
	var phi = angle * Math.PI / 12;
	ctx.save();
	ctx.translate(dims.blockSize * 0.5,
		dims.blockSize * 0.5);
	ctx.rotate(phi);
	this.accelerometerHandle();
	// robot
	ctx.fillRect(-0.28 * dims.blockSize, -0.10 * dims.blockSize,
		0.56 * dims.blockSize,
		0.20 * dims.blockSize);
	ctx.fillStyle = "black";
	if (pitch) {
		ctx.beginPath();
		ctx.arc(-0.15 * dims.blockSize,
			0.03 * dims.blockSize,
			0.11 * dims.blockSize,
			0, 2 * Math.PI);
		ctx.fill();
		ctx.fillStyle = "white";
		ctx.beginPath();
		ctx.arc(-0.15 * dims.blockSize,
			0.03 * dims.blockSize,
			0.07 * dims.blockSize,
			0, 2 * Math.PI);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(0.15 * dims.blockSize,
			0.07 * dims.blockSize,
			0.06 * dims.blockSize,
			0, 2 * Math.PI);
		ctx.fill();
	} else {
		ctx.fillRect(-0.28 * dims.blockSize,
			0.10 * dims.blockSize,
			0.08 * dims.blockSize,
			0.04 * dims.blockSize);
		ctx.fillRect(0.20 * dims.blockSize,
			0.10 * dims.blockSize,
			0.08 * dims.blockSize,
			0.04 * dims.blockSize);
		ctx.fillStyle = "white";
		ctx.beginPath();
		ctx.arc(0, 0.06 * dims.blockSize,
			0.06 * dims.blockSize,
			0, 2 * Math.PI);
		ctx.fill();
	}
	ctx.restore();
};

/** Draw yaw accelerometer
	@param {number} angle value from -6 to 6 (0=normal, 6=90 deg)
	@return {void}
*/
A3a.vpl.Canvas.prototype.robotYaw = function (angle) {
	var ctx = this.ctx;
	var dims = this.dims;
	var phi = angle * Math.PI / 12;
	ctx.save();
	ctx.translate(dims.blockSize * 0.5,
		dims.blockSize * 0.5);
	ctx.rotate(phi);
	this.accelerometerHandle();
	ctx.translate(-dims.blockSize / 2, -dims.blockSize / 2);
	this.robotTop({withWheels: true, scale: 0.45});
	ctx.restore();
};

/** Check if mouse is over accelerometer
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {boolean=} tp true for -12..11, false for -6..6 (default: false)
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.accelerometerCheck = function (width, height, left, top, ev, tp) {
	var x = ev.x - left - width / 2;
	var y = top + width / 2 - ev.y;
	var r2 = (x * x + y * y) / (width * width / 4);
	return r2 < 1 && r2 > 0.4 && (tp || y >= 0);
};

/** Drag an accelerometer handle
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@param {boolean=} tp true for -12..11, false for -6..6 (default: false)
	@return {number} new value of the angle, between -6..6 or -12..11
*/
A3a.vpl.Canvas.prototype.accelerometerDrag = function (width, height, left, top, ev, tp) {
	var x = ev.x - left - width / 2;
	var y = top + width / 2 - ev.y;
	var a = Math.round(Math.atan2(x, y) * 12 / Math.PI);
	return tp
		? a === 12 ? -12 : a	// -12..11
		: Math.max(-6, Math.min(6, a));	// -6..6
};

/** Draw red arc for timer, thicker and thicker clockwise from noon
	(inner border is a spiral with 4 centers)
	@param {CanvasRenderingContext2D} ctx
	@param {number} x0 center of exterior circle along x axis
	@param {number} y0 center of exterior circle along y axis
	@param {number} rExt exterior radius (constant)
	@param {number} rIntMax maximum interior radius (start at noon)
	@param {number} rIntMin minimum interior radius (end at noon, 12 hours later)
	@param {number} angle angle in rad of end of arc
	@param {string} fillStyle
	@return {void}
*/
A3a.vpl.Canvas.drawTimerLogArc = function (ctx, x0, y0, rExt, rIntMax, rIntMin, angle, fillStyle) {
	var d = (rIntMax - rIntMin) / 4;

	ctx.save();

	ctx.beginPath();
	ctx.arc(x0, y0, rExt, -Math.PI / 2, 3 * Math.PI / 2 - 0.05);
	ctx.arc(x0, y0, rIntMax - 4 * d, 3 * Math.PI / 2 - 0.05, Math.PI, true);
	ctx.arc(x0 + d, y0, rIntMax - 3 * d,  Math.PI, Math.PI / 2, true);
	ctx.arc(x0 + d, y0 - d, rIntMax - 2 * d,  Math.PI / 2, 0, true);
	ctx.arc(x0, y0 - d, rIntMax - d,  0, -Math.PI / 2, true);
	ctx.clip();

	ctx.fillStyle = fillStyle;
	ctx.beginPath();
	ctx.arc(x0, y0, rExt, -Math.PI / 2, -Math.PI / 2 + angle);
	ctx.lineTo(x0, y0);
	ctx.fill();

	ctx.restore();
};

/** Draw init
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawInit = function () {
	var ctx = this.ctx;
	var dims = this.dims;
	var r = 0.4 * dims.blockSize;
	ctx.save();
	ctx.fillStyle = "black";
	ctx.strokeStyle = "black";
	ctx.lineWidth = dims.blockLineWidth;
	ctx.beginPath();
	ctx.arc(dims.blockSize * 0.3, dims.blockSize * 0.5,
		dims.blockSize * 0.08,
		0, 2 * Math.PI);
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(dims.blockSize * 0.42, dims.blockSize * 0.5);
	ctx.lineTo(dims.blockSize * 0.7, dims.blockSize * 0.5);
	ctx.stroke();
	var triSize = r * 0.4;
	ctx.beginPath();
	ctx.moveTo(dims.blockSize * 0.8, dims.blockSize * 0.5);
	ctx.lineTo(dims.blockSize * 0.8 - triSize * Math.sqrt(3) / 2, dims.blockSize * 0.5 + triSize / 2);
	ctx.lineTo(dims.blockSize * 0.8 - triSize * Math.sqrt(3) / 2, dims.blockSize * 0.5 - triSize / 2);
	ctx.fill();
	ctx.restore();
};

/** Draw timer (low-level)
	@param {CanvasRenderingContext2D} ctx
	@param {number} x0
	@param {number} y0
	@param {number} r
	@param {number} lineWidth
	@param {?function(number):void} drawText
	@param {number} time time between 0.1 and 10
	@param {boolean} isEvent
	@param {boolean} isLog true for logarithmic time scale between 0.1 and 10,
	false for linear time scale between 0 and 4
	@return {void}
*/
A3a.vpl.Canvas.drawTimer = function (ctx, x0, y0, r, lineWidth, drawText, time, isEvent, isLog) {
	var time2 = isLog
		? time <= 0 ? 0 : Math.max(Math.log(time * 10) / Math.log(100), 0)	// [0.1,10] -> [0,1]
		: time / 4;	// [0, 4] -> [0, 1]
	ctx.save();
	if (!isEvent && drawText) {
		drawText(time);
	}
	ctx.beginPath();
	ctx.arc(x0, y0,
		r,
		0, 2 * Math.PI);
	ctx.fillStyle = "white";
	ctx.fill();
	A3a.vpl.Canvas.drawTimerLogArc(ctx, x0, y0,
		r * 0.9, isLog ? r * 0.8 : r * 0.6, isLog ? r * 0.5 : r * 0.6,
		2 * Math.PI * (isEvent ? 0.2 : time2),
		isEvent ? "#ddd" : "red");
	ctx.beginPath();
	ctx.arc(x0, y0,
		r / 2,
		0, 2 * Math.PI);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(x0, y0,
		r,
		0, 2 * Math.PI);
	ctx.strokeStyle = "black";
	ctx.lineWidth = lineWidth;
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x0 - 0.1 * r * Math.sin(2 * time2 * Math.PI),
		y0 + 0.1 * r * Math.cos(2 * time2 * Math.PI));
	ctx.lineTo(x0 + 0.9 * r * Math.sin(2 * time2 * Math.PI),
		y0 - 0.9 * r * Math.cos(2 * time2 * Math.PI));
	ctx.lineWidth = 2 * lineWidth;
	ctx.stroke();
	if (isEvent) {
		A3a.vpl.Canvas.drawArcArrow(ctx, x0, y0, r * 1.25,
			-Math.PI * 0.5,
			-Math.PI * 0.1,
			{
				arrowAtStart: true,
				arrowSize: 5 * lineWidth,
				style: "black"
			});
	}
	ctx.restore();
};

/** Draw timer
	@param {number} time time between 0.1 and 10
	@param {boolean} isEvent
	@param {boolean} isLog true for logarithmic time scale between 0.1 and 10,
	false for linear time scale between 0 and 4
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawTimer = function (time, isEvent, isLog) {
	var ctx = this.ctx;
	var s = this.dims.blockSize;
	var time2 = isLog
		? time === 0 ? 0 : Math.log(time * 10) / Math.log(100)	// [0.1,10] -> [0,1]
		: time / 4;	// [0, 4] -> [0, 1]
	var r = 0.4 * s;
	var dx = isEvent ? -0.05 * s : 0.05 * s;
	var dy = isEvent ? 0.07 * s : 0.03 * s;
	var x0 = s / 2 + dx;
	var y0 = s / 2 + dy;

	A3a.vpl.Canvas.drawTimer(ctx, x0, y0, r,
		this.dims.blockLineWidth,
		function (t) {
			ctx.textAlign = "start";
			ctx.textBaseline = "top";
			ctx.font = Math.round(s / 6).toString(10) + "px sans-serif";
			ctx.fillStyle = "white";
			ctx.fillText(t.toFixed(t < 1 ? 2 : 1), s / 20, s / 40);
		},
		time, isEvent, isLog);
};

/** Draw a clock signal
	@param {CanvasRenderingContext2D} ctx
	@param {number} xl
	@param {number} xr
	@param {number} y
	@param {number} h
	@param {number} n
	@param {{
		style: (string | undefined),
		lineWidth: (number | undefined),
		alpha: (number | undefined)
	}} opt
*/
A3a.vpl.Canvas.drawClock = function (ctx, xl, xr, y, h, n, opt) {
	ctx.save();
	if (opt) {
		if (opt.style) {
			ctx.strokeStyle = opt.style;
			ctx.fillStyle = opt.style;
		}
		if (opt.lineWidth !== undefined) {
			ctx.lineWidth = opt.lineWidth;
		}
		if (opt.alpha !== undefined) {
			ctx.globalAlpha = opt.alpha;
		}
	}
	ctx.beginPath();
	var d = h / 2;
	ctx.moveTo(xl, y + d);
	for (var i = 0; i < n; i++) {
		var x = xl + (xr - xl) * (0.5 + i) / n;
		ctx.lineTo(x, y + d);
		d = -d;
		ctx.lineTo(x, y + d);
	}
	ctx.lineTo(xr, y + d);
	ctx.stroke();
	ctx.restore();
};

/** Draw a state (low-level)
	@param {CanvasRenderingContext2D} ctx
	@param {number} x0
	@param {number} y0
	@param {number} rInner inner radius
	@param {number} rOuter outer radius
	@param {number} a1 angle 1 (counterclockwise starting at right)
	@param {number} a2 angle 2 (larger than angle 1)
	@param {string} fillStyle
	@param {string} strokeStyle
	@param {number} lineWidth
	@return {void}
*/
A3a.vpl.Canvas.drawArc = function (ctx, x0, y0, rInner, rOuter, a1, a2,
	fillStyle, strokeStyle, lineWidth) {
	var rMid = (rInner + rOuter) / 2;
	var rEnd = (rOuter - rInner) / 2;
	ctx.save();
	ctx.beginPath();
	ctx.arc(x0, y0, rInner, -a2, -a1);
	ctx.arc(x0 + rMid * Math.cos(a1), y0 - rMid * Math.sin(a1), rEnd, -a1 - Math.PI, -a1, true);
	ctx.arc(x0, y0, rOuter, -a1, -a2, true);
	ctx.arc(x0 + rMid * Math.cos(a2), y0 - rMid * Math.sin(a2), rEnd, -a2, -a2 + Math.PI, true);
	ctx.fillStyle = fillStyle;
	ctx.strokeStyle = strokeStyle;
	ctx.lineWidth = lineWidth;
	ctx.fill();
	ctx.stroke();
	ctx.restore();
};

/** Draw a state
	@param {number} a1 angle 1 (counterclockwise starting at right)
	@param {number} a2 angle 2 (larger than angle 1)
	@param {number} val 1=set, -1=reset, 0=nop, 2=toggle
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawArc = function (a1, a2, val) {
	var dims = this.dims;

	var x0 = dims.blockSize / 2;
	var y0 = dims.blockSize / 2;
	var rInner = dims.blockSize * 0.3;
	var rOuter = dims.blockSize * 0.45;
	A3a.vpl.Canvas.drawArc(this.ctx,
		x0, y0, rInner, rOuter, a1, a2,
		val < 0 ? "white" : val === 2 ? "red" : val > 0 ? "#f70" : "#ddd",
		val === 0 ? "#bbb" : "black",
		dims.blockLineWidth);
};

/** Draw state
	@param {Array.<number>} state array of 4 states, with 0=unspecified, 1=set, -1=reset, 2=toggle
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawState = function (state) {
	var ctx = this.ctx;

	ctx.save();
	this.drawArc(Math.PI * 0.65, Math.PI * 0.85, state[0]);
	this.drawArc(Math.PI * 0.15, Math.PI * 0.35, state[1]);
	this.drawArc(Math.PI * 1.15, Math.PI * 1.35, state[2]);
	this.drawArc(Math.PI * 1.65, Math.PI * 1.85, state[3]);
	ctx.restore();
};

/** Draw state
	@param {Array.<number>} state array of 4 states, with false=white, true=red
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawStateToggle = function (state) {
	var ctx = this.ctx;

	ctx.save();
	this.drawArc(Math.PI * 0.6, Math.PI * 0.9, state[0]);
	this.drawArc(Math.PI * 0.1, Math.PI * 0.4, state[1]);
	this.drawArc(Math.PI * 1.1, Math.PI * 1.4, state[2]);
	this.drawArc(Math.PI * 1.6, Math.PI * 1.9, state[3]);
	ctx.restore();
};

/** Draw state 8
	@param {number} state
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawState8 = function (state) {
	var ctx = this.ctx;

	ctx.save();
	for (var i = 0; i < 8; i++) {
		this.drawArc(Math.PI * (0.5 - 0.04 - i * 0.25), Math.PI * (0.5 + 0.04 - i * 0.25),
			i === state ? 1 : -1);
	}
	ctx.restore();
};

/** Draw state 8 change (disabled states)
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawState8Change = function () {
	var ctx = this.ctx;

	ctx.save();
	for (var i = 0; i < 8; i++) {
		this.drawArc(Math.PI * (0.5 - 0.04 - i * 0.25), Math.PI * (0.5 + 0.04 - i * 0.25), 0);
	}
	ctx.restore();
};

/**	Check if a mouse event is inside a shape
	@param {Array.<A3a.vpl.Canvas.buttonShape>} shapes
	@param {number} width block width
	@param {number} height block width
	@param {number} left block left position
	@param {number} top bock top position
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {?number} shape index, or null
*/
A3a.vpl.Canvas.prototype.buttonClick = function (shapes, width, height, left, top, ev) {
	var x = (ev.x - left) / width - 0.5;
	var y = 0.5 - (ev.y - top) / height;
	for (var i = 0; i < shapes.length; i++) {
		var sz = shapes[i].size || 1;
		if (Math.max(Math.abs(x - shapes[i].x), Math.abs(y - shapes[i].y)) < 0.11 * sz) {
			return i;
		}
	}
	return null;
};

/** @enum {number} */
A3a.vpl.draw.levelType = {
	none: 0,
	low: 1,
	high: 2
};

/**	Draw a single slider
	@param {number} val value of the slider, between 0 and 1
	@param {number} pos slider position
	@param {boolean} vert true if slider is vertical, false if horizontal
	@param {string} thumbColor css color of the slider thumb
	@param {A3a.vpl.draw.levelType=} levelType
	@return {void}
*/
A3a.vpl.Canvas.prototype.slider = function (val, pos, vert, thumbColor, levelType) {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();
	if (vert) {
		ctx.translate(0.5 * dims.blockSize,
			0.5 * dims.blockSize);
		ctx.rotate(-Math.PI / 2);
		ctx.scale(1, -1);
		ctx.translate(-0.5 * dims.blockSize,
			-0.5 * dims.blockSize);
	}

	/** slider path with rounded ends
		@param {number} min minimum value (0 for full range)
		@param {number} max maximum value (1 for full range)
		@return {void}
	*/
	function sliderPath(min, max) {
		ctx.beginPath();
		ctx.moveTo(dims.blockSize * (0.1 + 0.8 * min), dims.blockSize * (0.46 - pos));
		ctx.lineTo(dims.blockSize * (0.1 + 0.8 * max), dims.blockSize * (0.46 - pos));
		ctx.arc(dims.blockSize * (0.1 + 0.8 * max), dims.blockSize * (0.5 - pos),
			dims.blockSize * 0.04, -Math.PI / 2, Math.PI / 2);
		ctx.lineTo(dims.blockSize * (0.1 + 0.8 * max), dims.blockSize * (0.54 - pos));
		ctx.lineTo(dims.blockSize * (0.1 + 0.8 * min), dims.blockSize * (0.54 - pos));
		ctx.arc(dims.blockSize * (0.1 + 0.8 * min), dims.blockSize * (0.5 - pos),
			dims.blockSize * 0.04, Math.PI / 2, -Math.PI / 2);
	}

	ctx.lineWidth = dims.blockLineWidth;
	ctx.fillStyle = "white";
	ctx.strokeStyle = "black";
	sliderPath(0, 1);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = thumbColor;
	switch (levelType || A3a.vpl.draw.levelType.none) {
	case A3a.vpl.draw.levelType.low:
		sliderPath(0, val);
		ctx.fill();
		ctx.stroke();
		break;
	case A3a.vpl.draw.levelType.high:
		sliderPath(val, 1);
		ctx.fill();
		ctx.stroke();
		break;
	}
	ctx.fillStyle = thumbColor;
	ctx.strokeStyle = "black";
	ctx.lineWidth = dims.blockLineWidth;
	ctx.beginPath();
	ctx.arc(dims.blockSize * (0.1 + 0.8 * val),
		dims.blockSize * (0.5 - pos),
		dims.blockSize * 0.1, 0, 2 * Math.PI);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
};

/** Check if mouse is over slider
	@param {number} pos slider position
	@param {boolean} vert true if slider is vertical, false if horizontal
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.sliderCheck = function (pos, vert, width, height, left, top, ev) {
	var x = (ev.x - left) / width - 0.5;
	var y = 0.5 - (ev.y - top) / height;
	return Math.abs((vert ? x : y) - pos) < 0.1;
};

/** Drag a slider slider
	@param {boolean} vert true if slider is vertical, false if horizontal
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {number} new value of the slider, between 0 and 1
*/
A3a.vpl.Canvas.prototype.sliderDrag = function (vert, width, height, left, top, ev) {
	var x = (ev.x - left) / width - 0.5;
	var y = 0.5 - (ev.y - top) / height;
	return 0.5 + (vert ? y : x) / 0.8;
};

/**	Check if a mouse event is inside a note (low-level)
	@param {number} scoreLeft score left position, relative to block size (e.g. 0.1)
	@param {number} scoreRight score right position, relative to block size (e.g. 0.9)
	@param {number} scoreBottom score bottom position, relative to block size (e.g. 0.9)
	@param {number} scoreTop score top position, relative to block size (e.g. 0.1)
	@param {number} numNotes number of notes
	@param {number} numHeights number of heights
	@param {number} width block width
	@param {number} height block width
	@param {number} left block left position
	@param {number} top bock top position
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {?{index:number,tone:number}}} note, or null
*/
A3a.vpl.Canvas.prototype.noteClickLL = function (scoreLeft, scoreRight, scoreBottom, scoreTop,
	numNotes, numHeights,
	width, height, left, top, ev) {
	var x = Math.floor(((ev.x - left) / width - scoreLeft) / ((scoreRight - scoreLeft) / numNotes));
	var y = Math.floor((scoreBottom - (ev.y - top) / height) / ((scoreBottom - scoreTop) / numHeights));
	return x >= 0 && x < numNotes && y >= 0 && y < numHeights
		? {
			index: x,
			tone: y
		} : null;
};

/**	Check if a mouse event is inside a note
	@param {number} width block width
	@param {number} height block width
	@param {number} left block left position
	@param {number} top bock top position
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {?{index:number,tone:number}}} note, or null
*/
A3a.vpl.Canvas.prototype.noteClick = function (width, height, left, top, ev) {
	return this.noteClickLL(0.1, 0.9, 0.9, 0.1, 6, 5,
		width, height, left, top, ev);
}

/** Check if mouse is over timer
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.timerCheck = function (width, height, left, top, ev) {
	var r = 0.4 * width;
	var x = ev.x - left - 0.55 * width;
	var y = top + 0.53 * height - ev.y;
	return x * x + y * y <= r * r;
};

/** Drag a timer handle
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {boolean} isLog true for logarithmic time scale between 0.1 and 10,
	false for linear time scale between 0 and 4
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {number} new value of the time, between 0 and 4
*/
A3a.vpl.Canvas.prototype.timerDrag = function (width, height, left, top, isLog, ev) {
	var x = ev.x - left - 0.55 * width;
	var y = top + 0.53 * height - ev.y;
	var time2 = (Math.PI - Math.atan2(x, -y)) / (2 * Math.PI);
	return isLog
		? Math.exp(time2 * Math.log(100)) / 10	// [0,1] -> [0.1,10]
		: 4 * time2;	// [0,1] -> [0,4]
}

/**	Check if a mouse event is inside a state
	@param {number} left block left position
	@param {number} top bock top position
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {?number} state index, or null
*/
A3a.vpl.Canvas.prototype.stateClick = function (width, height, left, top, ev) {
	var x0 = width / 2;
	var y0 = height / 2;
	var r = width * 0.375;
	var thickness2 = width * 0.15;
	var x = ev.x - left - x0;
	var y = y0 - (ev.y - top);
	if (Math.abs(Math.sqrt(x * x + y * y) - r) <= thickness2) {
		return y >= 0 ? x < 0 ? 0 : 1 : x < 0 ? 2 : 3;
	} else {
		return null;
	}
};

/**	Check if a mouse event is inside a state 8
	@param {number} left block left position
	@param {number} top bock top position
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {?number} state, or null
*/
A3a.vpl.Canvas.prototype.state8Click = function (width, height, left, top, ev) {
	var x0 = width / 2;
	var y0 = height / 2;
	var r = width * 0.375;
	var thickness2 = width * 0.15;
	var x = ev.x - left - x0;
	var y = y0 - (ev.y - top);
	if (Math.abs(Math.sqrt(x * x + y * y) - r) <= thickness2) {
		var th = Math.atan2(x, y) + Math.PI / 8;
		return Math.floor((th < 0 ? th + 2 * Math.PI : th) / (Math.PI / 4));
	} else {
		return null;
	}
};

/** Draw hexagonal nut
	@param {CanvasRenderingContext2D} ctx
	@param {number} x0
	@param {number} y0
	@param {number} r
	@return {void}
*/
A3a.vpl.Canvas.drawHexagonalNut = function (ctx, x0, y0, r) {
	if (r > 0) {
		ctx.beginPath();
		ctx.moveTo(x0 + r * Math.cos(0.1), y0 + r * Math.sin(0.2));
		for (var i = 1; i < 6; i++) {
			ctx.lineTo(x0 + r * Math.cos(i * Math.PI / 3 + 0.2), y0 + r * Math.sin(i * Math.PI / 3 + 0.2));
		}
		ctx.closePath();
		ctx.arc(x0, y0, r * 0.5, 0, 2 * Math.PI, true);
		ctx.fill();
	}
}
