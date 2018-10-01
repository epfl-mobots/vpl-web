/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Draw block background
	@param {A3a.vpl.blockType} blockType
	@param {boolean} doesZoomOnLongPress true to display hint that a long
	press is needed to zoom the block before control widgets can be manipulated
	@return {void}
*/
A3a.vpl.Canvas.prototype.blockBackground = function (blockType, doesZoomOnLongPress) {
	this.ctx.save();
	if (doesZoomOnLongPress) {
		// rounded corner clip
		var f = 0.2;
		this.ctx.beginPath();
		this.ctx.moveTo(0, this.dims.blockSize * f);
		this.ctx.lineTo(0, this.dims.blockSize * (1 - f));
		this.ctx.arc(this.dims.blockSize * f, this.dims.blockSize * (1 - f),
			this.dims.blockSize * f,
			Math.PI * 1, Math.PI * 0.5, true);
		this.ctx.lineTo(this.dims.blockSize * (1 - f), this.dims.blockSize);
		this.ctx.arc(this.dims.blockSize * (1 - f), this.dims.blockSize * (1 - f),
			this.dims.blockSize * f,
			Math.PI * 0.5, Math.PI * 0, true);
		this.ctx.lineTo(this.dims.blockSize, this.dims.blockSize * f);
		this.ctx.arc(this.dims.blockSize * (1 - f), this.dims.blockSize * f,
			this.dims.blockSize * f,
			Math.PI * 0, Math.PI * 1.5, true);
		this.ctx.lineTo(this.dims.blockSize * f, 0);
		this.ctx.arc(this.dims.blockSize * f, this.dims.blockSize * f,
			this.dims.blockSize * f,
			Math.PI * 1.5, Math.PI * 1, true);
		this.ctx.clip();
	}
	this.ctx.fillStyle = {
		"e": this.dims.eventStyle,
		"a": this.dims.actionStyle,
		"s": this.dims.stateStyle,
		"c": this.dims.commentStyle
	}[blockType];
	this.ctx.fillRect(0, 0, this.dims.blockSize, this.dims.blockSize);
	this.ctx.restore();
};

/** Clear block background
	@return {void}
*/
A3a.vpl.Canvas.prototype.clearBlockBackground = function () {
	this.ctx.save();
	this.ctx.fillStyle = "#ddd";
	this.ctx.fillRect(this.dims.blockLineWidth,
		this.dims.blockLineWidth,
		this.dims.blockSize - 2 * this.dims.blockLineWidth,
		this.dims.blockSize - 2 * this.dims.blockLineWidth);
	this.ctx.restore();
};

/** Draw disabled mark for an item specified by bounding box (block or event handler)
	@param {number} top
	@param {number} left
	@param {number} width
	@param {number} height
	@return {void}
*/
A3a.vpl.Canvas.prototype.disabledMark = function (left, top, width, height) {
	this.ctx.save();
	this.ctx.fillStyle = "#fff";
	this.ctx.globalAlpha = 0.5;
	this.ctx.fillRect(left, top, width, height);
	this.ctx.restore();
	this.ctx.save();
	this.ctx.strokeStyle = "#777";
	this.ctx.lineWidth = 5 * this.dims.blockLineWidth;
	this.ctx.globalAlpha = 0.5;
	this.ctx.beginPath();
	this.ctx.moveTo(left - this.dims.blockSize * 0.1, top + height * 0.7);
	this.ctx.lineTo(left + width + this.dims.blockSize * 0.1, top + height * 0.3);
	this.ctx.stroke();
	this.ctx.restore();
};

/** Draw lock for an item specified by bounding box (block or event handler)
	@param {CanvasRenderingContext2D} ctx
	@param {number} x
	@param {number} y
	@param {number} r
	@param {string} color
	@return {void}
*/
A3a.vpl.Canvas.lock = function (ctx, x, y, r, color) {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = r;
	ctx.fillRect(x - 2.5 * r, y - r, 5 * r, 4 * r);
	ctx.beginPath();
	ctx.moveTo(x - 1.7 * r, y);
	ctx.lineTo(x - 1.7 * r, y);
	ctx.arc(x, y - 2 * r, 1.7 * r, -Math.PI, 0);
	ctx.lineTo(x + 1.7 * r, y);
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
	@param {?boolean=} withWheels true to display wheels
	@param {?number=} scale scale factor (<1 to shrink)
	@param {?number=} rot robot rotation around its center
	@param {?Array.<number>=} trans translation [xLeft,yUp]
	@param {?Array.<number>=} rgb
	@return {void}
*/
A3a.vpl.Canvas.prototype.robotTop = function (withWheels, scale, rot, trans, rgb) {
	var ctx = this.ctx;
	var dims = this.dims;
	ctx.save();

	// clip to make sure that the translated, rotated robot doesn't overflow
	ctx.beginPath();
	ctx.rect(0, 0, this.dims.blockSize, this.dims.blockSize);
	ctx.clip();

	if (scale || rot) {
		if (trans) {
			ctx.translate(-trans[0], -trans[1]);
		}
		ctx.translate(0.5 * dims.blockSize,
			0.5 * dims.blockSize);
		if (scale) {
			ctx.scale(scale, scale);
		}
		if (rot) {
			ctx.rotate(-rot);
		}
		ctx.translate(-0.5 * dims.blockSize,
			-0.5 * dims.blockSize);
	}
	ctx.beginPath();
	ctx.moveTo(dims.blockLineWidth,
		dims.blockSize - dims.blockLineWidth);
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
	ctx.bezierCurveTo(dims.blockSize * 0.48,
		dims.blockLineWidth,
		dims.blockSize * 0.2,
		dims.blockLineWidth,
		dims.blockLineWidth,
		dims.blockSize * 0.25);
	ctx.closePath();
	if (rgb) {
		rgb = [
			rgb[0],
			Math.max(0.2 + 0.8 * rgb[1], rgb[2] / 2),
			rgb[2]
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
	if (rgb) {
		ctx.strokeStyle = "white";
		ctx.lineWidth = dims.blockLineWidth;
		ctx.stroke();
	}
	if (withWheels) {
		ctx.fillStyle = "black";
		ctx.fillRect(0, dims.blockSize * 0.6,
			dims.blockSize * 0.1, dims.blockSize * 0.35);
		ctx.fillRect(dims.blockSize * 0.9, dims.blockSize * 0.6,
			dims.blockSize * 0.1, dims.blockSize * 0.35);
	}
	ctx.restore();
};

/**	Calculate trajectory from wheel advances
	@param {number} dleft
	@param {number} dright
	@param {number} r half-distance between wheels
	@return {{phi:number,R:number,x:number,y:number}}
*/
A3a.vpl.draw.diffWheels = function (dleft, dright, r) {
	var phi = (dright - dleft) / (2 * r);
	var R = dright === dleft ? Infinity : (dright + dleft) / (2 * phi);
	return {
		phi: phi,
		R: R,
		x: Math.abs(R) > 1e3 * Math.abs(dleft + dright) ? 0 : R * (phi < 1e-2 ? phi * phi / 2 : 1 - Math.cos(phi)),
		y: Math.abs(R) > 1e3 * Math.abs(dleft + dright) ? (dleft + dright) / 2 : R * Math.sin(phi)
	};
};

/**	Draw wheel traces from center to
	@param {number} dleft distance of left wheel, relative to block size
	@param {number} dright distance of right wheel, relative to block size
	@param {number} r half-distance between wheels, relative to block size
	@return {{phi:number,R:number,x:number,y:number}}
*/
A3a.vpl.Canvas.prototype.traces = function (dleft, dright, r) {
	var ctx = this.ctx;
	var dims = this.dims;
	dleft *= dims.blockSize;
	dright *= dims.blockSize;
	r *= dims.blockSize;

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

	var tr = A3a.vpl.draw.diffWheels(dleft, dright, r);
	ctx.save();
	ctx.translate(0.5 * dims.blockSize,
		0.5 * dims.blockSize);
	ctx.strokeStyle = "black";
	ctx.lineWidth = dims.blockLineWidth;
	ctx.beginPath();
	if (Math.abs(tr.R) > 20 * r) {
		ctx.moveTo(-r, 0);
		ctx.lineTo(tr.x - r, -tr.y);
		ctx.moveTo(r, 0);
		ctx.lineTo(tr.x + r, -tr.y);
		ctx.moveTo(0, 0);
		ctx.lineTo(tr.x, -tr.y);
	} else {
		arc(-tr.R, 0, tr.R - r, tr.phi);
		ctx.stroke();
		ctx.beginPath();
		arc(-tr.R, 0, tr.R + r, tr.phi);
		ctx.stroke();
		ctx.beginPath();
		arc(-tr.R, 0, tr.R, tr.phi);
	}
	ctx.stroke();
	ctx.restore();
	return tr;
};

/** Check if point is over robot seen from above
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {number} dleft distance of left wheel, relative to block size
	@param {number} dright distance of right wheel, relative to block size
	@param {number} r half-distance between wheels, relative to block size
	@param {Event} ev mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.robotTopCheck = function (width, height, left, top, dleft, dright, r, ev) {
	var dims = this.dims;
	dleft *= dims.blockSize;
	dright *= dims.blockSize;
	r *= dims.blockSize;
	var x = ev.clientX - left - width / 2;
	var y = top + width / 2 - ev.clientY;
	var tr = A3a.vpl.draw.diffWheels(dleft, dright, r);
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
	ctx.strokeStyle = "width";
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

/**	Draw an array of buttons
	@param {Array.<A3a.vpl.Canvas.buttonShape>} shapes
	@param {Array.<boolean|number>} state false or 0: gray border,
	true or 1: red, -1: black, -2: black border
	@param {{cross:(boolean|undefined)}=} opt
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
			: state && state[i] === true ? "red"
			: state && state[i] === 1 ? "#f66"
			: state && state[i] === -1 ? "#333"
			: "white";
		ctx.strokeStyle = shape.strokeStyle ? shape.strokeStyle
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
		if (state && state[i] === -1 && opt && opt.cross) {
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
	ctx.strokeStyle = "black";
	for (var i = 0; i < 6; i++) {
		if (notes[2 * i + 1] > 0) {
			ctx.fillStyle = notes[2 * i + 1] === 2 ? "white" : "black";
			ctx.beginPath();
			ctx.arc(dims.blockSize * (0.1 + 0.8 / 6 * (i + 0.5)),
				dims.blockSize * (0.82 - 0.16 * notes[2 * i]),
				dims.blockSize * 0.07, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
		}
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
	ctx.strokeStype = "white";
	ctx.lineWidth = 0.13 * dims.blockSize;
	ctx.stroke();
	ctx.lineWidth = 1.5 * dims.blockLineWidth;
	ctx.translate(dims.blockSize * 0.3, dims.blockSize * 0.3);
	for (var i = 0; i < 8; i++) {
		ctx.beginPath();
		ctx.moveTo(0.07 * dims.blockSize, 0);
		ctx.lineTo(0.14 * dims.blockSize, 0);
		ctx.moveTo(0.17 * dims.blockSize, 0);
		ctx.lineTo(0.22 * dims.blockSize, 0);
		ctx.stroke();
		ctx.rotate(Math.PI / 4);
	}
	ctx.restore();
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
	ctx.beginPath();
	ctx.arc(0, 0,
		dims.blockSize * 0.4,
		0, Math.PI, true)
	ctx.fillStyle = "#666";
	ctx.fill();
	ctx.rotate(phi);
	ctx.beginPath();
	ctx.moveTo(0.02 * dims.blockSize, 0);
	ctx.lineTo(0.05 * dims.blockSize,
		-0.45 * dims.blockSize);
	ctx.lineTo(-0.05 * dims.blockSize,
		-0.45 * dims.blockSize);
	ctx.lineTo(-0.02 * dims.blockSize, 0);
	ctx.closePath();
	ctx.fillStyle = "white";
	ctx.fill();
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

/** Check if mouse is over accelerometer
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {Event} ev mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.accelerometerCheck = function (width, height, left, top, ev) {
	var r = 0.45 * width;
	var x = ev.clientX - left - width / 2;
	var y = top + width / 2 - ev.clientY;
	return y >= 0 && x * x + y * y <= r * r;
};

/** Drag an accelerometer handle
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {Event} ev mouse event
	@param {boolean=} tp true for -12..11, false for -6..6
	@return {number} new value of the angle, between -6 and 6
*/
A3a.vpl.Canvas.prototype.accelerometerDrag = function (width, height, left, top, ev, tp) {
	var x = ev.clientX - left - width / 2;
	var y = top + width / 2 - ev.clientY;
	var a = Math.round(Math.atan2(x, y) * 12 / Math.PI);
	return tp ? a : Math.max(-6, Math.min(6, a));
};

/** Draw red arc for timer, thicker and thicker clockwise from noon
	(inner border is a spiral with 4 centers)
	@param {number} x0 center of exterior circle along x axis
	@param {number} y0 center of exterior circle along y axis
	@param {number} rExt exterior radius (constant)
	@param {number} rIntMax maximum interior radius (start at noon)
	@param {number} rIntMin minimum interior radius (end at noon, 12 hours later)
	@param {number} angle angle in rad of end of arc
	@param {string} fillStyle
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawTimerLogArc = function (x0, y0, rExt, rIntMax, rIntMin, angle, fillStyle) {
	var ctx = this.ctx;
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

/** Draw timer
	@param {number} time time between 0.1 and 10
	@param {boolean} isEvent
	@param {boolean} isLog true for logarithmic time scale between 0.1 and 10,
	false for linear time scale between 0 and 4
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawTimer = function (time, isEvent, isLog) {
	var time2 = isLog
		? time === 0 ? 0 : Math.log(time * 10) / Math.log(100)	// [0.1,10] -> [0,1]
		: time / 4;	// [0, 4] -> [0, 1]
	var ctx = this.ctx;
	var dims = this.dims;
	var r = 0.4 * dims.blockSize;
	var dy = isEvent ? 0.09 * dims.blockSize : 0;
	var x0 = dims.blockSize / 2;
	var y0 = dims.blockSize / 2 + dy;
	ctx.save();
	ctx.beginPath();
	ctx.arc(x0, y0,
		r,
		0, 2 * Math.PI);
	ctx.fillStyle = "white";
	ctx.fill();
	if (!isEvent) {
		ctx.textAlign = "start";
		ctx.textBaseline = "top";
		ctx.fillText(time.toFixed(time < 1 ? 2 : 1), dims.blockSize / 20, dy);
	}
	this.drawTimerLogArc(x0, y0,
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
	ctx.lineWidth = dims.blockLineWidth;
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x0 - 0.1 * r * Math.sin(2 * time2 * Math.PI),
		y0 + 0.1 * r * Math.cos(2 * time2 * Math.PI));
	ctx.lineTo(x0 + 0.9 * r * Math.sin(2 * time2 * Math.PI),
		y0 - 0.9 * r * Math.cos(2 * time2 * Math.PI));
	ctx.lineWidth = 2 * dims.blockLineWidth;
	ctx.stroke();
	if (isEvent) {
		ctx.strokeStyle = "white";
		ctx.lineWidth = dims.blockLineWidth * 0.9;
		ctx.fillStyle = "white";
		ctx.beginPath();
		ctx.arc(x0, y0,
			r * 1.3,
			-Math.PI * 0.45,
			-Math.PI * 0.3);
		ctx.stroke();
		var triSize = r * 0.4;
		ctx.beginPath();
		ctx.moveTo(x0, y0 - r * 1.25);
		ctx.lineTo(x0 + triSize * Math.sqrt(3) / 2, y0 - r * 1.25 + triSize / 2);
		ctx.lineTo(x0 + triSize * Math.sqrt(3) / 2, y0 - r * 1.25 - triSize / 2);
		ctx.fill();
	}
	ctx.restore();
};

/** Draw state
	@param {Array.<number>} state array of 4 states, with 0=unspecified, 1=set, 2=clear
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawState = function (state) {
	var ctx = this.ctx;
	var dims = this.dims;

	/** Draw a state
		@param {number} a1 angle 1 (counterclockwise starting at right)
		@param {number} a2 angle 2 (larger than angle 1)
		@param {number} val 1=set, -1=reset, 0=nop
		@return {void}
	*/
	function drawArc(a1, a2, val) {
		var x0 = dims.blockSize / 2;
		var y0 = dims.blockSize / 2;
		var rInner = dims.blockSize * 0.3;
		var rOuter = dims.blockSize * 0.45;
		var rMid = (rInner + rOuter) / 2;
		var rEnd = (rOuter - rInner) / 2;
		ctx.save();
		ctx.beginPath();
		ctx.arc(x0, y0, rInner, -a2, -a1);
		ctx.arc(x0 + rMid * Math.cos(a1), y0 - rMid * Math.sin(a1), rEnd, -a1 - Math.PI, -a1, true);
		ctx.arc(x0, y0, rOuter, -a1, -a2, true);
		ctx.arc(x0 + rMid * Math.cos(a2), y0 - rMid * Math.sin(a2), rEnd, -a2, -a2 + Math.PI, true);
		ctx.fillStyle = val < 0 ? "white" : val > 0 ? "#f70" : "#ddd";
		ctx.strokeStyle = val === 0 ? "#bbb" : "black";
		ctx.lineWidth = dims.blockLineWidth;
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	ctx.save();
	drawArc(Math.PI * 0.6, Math.PI * 0.9, state[0]);
	drawArc(Math.PI * 0.1, Math.PI * 0.4, state[1]);
	drawArc(Math.PI * 1.1, Math.PI * 1.4, state[2]);
	drawArc(Math.PI * 1.6, Math.PI * 1.9, state[3]);
	ctx.restore();
};

/**	Check if a mouse event is inside a shape
	@param {Array.<A3a.vpl.Canvas.buttonShape>} shapes
	@param {number} width block width
	@param {number} height block width
	@param {number} left block left position
	@param {number} top bock top position
	@param {Event} ev mouse event
	@return {?number} shape index, or null
*/
A3a.vpl.Canvas.prototype.buttonClick = function (shapes, width, height, left, top, ev) {
	var x = (ev.clientX - left) / width - 0.5;
	var y = 0.5 - (ev.clientY - top) / height;
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
	ctx.strokeStyle = "#aaa";
	sliderPath(0, 1);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = thumbColor;
	ctx.strokeStyle = "#666";
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
	@param {Event} ev mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.sliderCheck = function (pos, vert, width, height, left, top, ev) {
	var x = (ev.clientX - left) / width - 0.5;
	var y = 0.5 - (ev.clientY - top) / height;
	return Math.abs((vert ? x : y) - pos) < 0.1;
};

/** Drag a slider slider
	@param {boolean} vert true if slider is vertical, false if horizontal
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {Event} ev mouse event
	@return {number} new value of the slider, between 0 and 1
*/
A3a.vpl.Canvas.prototype.sliderDrag = function (vert, width, height, left, top, ev) {
	var x = (ev.clientX - left) / width - 0.5;
	var y = 0.5 - (ev.clientY - top) / height;
	return 0.5 + (vert ? y : x) / 0.8;
};

/**	Check if a mouse event is inside a note
	@param {Array.<number>} notes
	@param {number} width block width
	@param {number} height block width
	@param {number} left block left position
	@param {number} top bock top position
	@param {Event} ev mouse event
	@return {?{index:number,tone:number}}} note, or null
*/
A3a.vpl.Canvas.prototype.noteClick = function (notes, width, height, left, top, ev) {
	var x = Math.floor(((ev.clientX - left) / width - 0.1) / (0.8 / 6));
	var y = Math.floor((0.9 - (ev.clientY - top) / height) / 0.16);
	return x >= 0 && x < 6 && y >= 0 && y < 5
		? {
			index: x,
			tone: y
		} : null;
}

/** Check if mouse is over timer
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {Event} ev mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.timerCheck = function (width, height, left, top, ev) {
	var r = 0.4 * width;
	var x = ev.clientX - left - width / 2;
	var y = top + height / 2 - ev.clientY;
	return x * x + y * y <= r * r;
};

/** Drag a timer handle
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {boolean} isLog true for logarithmic time scale between 0.1 and 10,
	false for linear time scale between 0 and 4
	@param {Event} ev mouse event
	@return {number} new value of the time, between 0 and 4
*/
A3a.vpl.Canvas.prototype.timerDrag = function (width, height, left, top, isLog, ev) {
	var x = ev.clientX - left - width / 2;
	var y = top + height / 2 - ev.clientY;
	var time2 = (Math.PI - Math.atan2(x, -y)) / (2 * Math.PI);
	return isLog
		? Math.exp(time2 * Math.log(100)) / 10	// [0,1] -> [0.1,10]
		: 4 * time2;	// [0,1] -> [0,4]
}

/**	Check if a mouse event is inside a state
	@param {number} left block left position
	@param {number} top bock top position
	@param {Event} ev mouse event
	@return {?number} state index, or null
*/
A3a.vpl.Canvas.prototype.stateClick = function (width, height, left, top, ev) {
	var x0 = width / 2;
	var y0 = height / 2;
	var r = width * 0.375;
	var thickness2 = width * 0.15;
	var x = ev.clientX - left - x0;
	var y = y0 - (ev.clientY - top);
	if (Math.abs(Math.sqrt(x * x + y * y) - r) <= thickness2) {
		return y >= 0 ? x < 0 ? 0 : 1 : x < 0 ? 2 : 3;
	} else {
		return null;
	}
};
