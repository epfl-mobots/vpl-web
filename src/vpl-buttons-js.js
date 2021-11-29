/*
	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Drawing of buttons defined in JavaScript.

*/

/** Draw a button
	@param {A3a.vpl.Application} app
	@param {string} id
	@param {CanvasRenderingContext2D} ctx canvas 2d context
	@param {A3a.vpl.Canvas.dims} dims
	@param {CSSParser.VPL} css
	@param {Array.<string>} cssClasses
	@param {CSSParser.VPL.Box} box
	@param {A3a.vpl.Translation} i18n
	@param {boolean} isEnabled
	@param {boolean} isSelected
	@param {boolean} isPressed
	@param {*=} state state for multi-value buttons
	@return {boolean}
*/
A3a.vpl.Commands.drawButtonJS = function (app, id, ctx, dims, css, cssClasses, box, i18n, isEnabled, isSelected, isPressed, state) {

	// 2018 colors (white on navy)
	var col = {
		bg: "navy",
		bgPr: "#37f",
		bgOn: "#06f",
		fg: "white",
		fgDis: "#777",
		fgOff: "#44a",
		fgDimOn: "#ddf",
 		fgDim: "#99a",
		bgTeacher: "#a00",
		bgTeacherOn: "#d10",
		bgTeacherPr: "#d00",
		bgTeacherPrOn: "#f50",
		fgTeacherDis: "#c66",
		fgTeacherOff: "#800"
	};
	// alternative colors (gray on white)
	col = {
		bg: "white",
		bgPr: "#ddd",
		bgOn: "white",
		fg: "#333",
		fgDis: "#999",
		fgOff: "#ddd",
		fgDimOn: "#555",
 		fgDim: "#666",
		bgTeacher: "#fcc",
		bgTeacherOn: "#fcc",
		bgTeacherPr: "#faa",
		bgTeacherPrOn: "#faa",
		fgTeacherDis: "#866",
		fgTeacherOff: "#faa"
	};

	/** Draw control for undo (back arrow) or redo (flipped)
		@param {number} x
		@param {number} y
		@param {boolean} flipped
		@return {void}
	*/
	function drawUndo(x, y, flipped) {
		ctx.save();
		if (flipped) {
			ctx.scale(-1, 1);
			ctx.translate(-2 * x - dims.controlSize, 0);
		}
		ctx.fillStyle = isPressed && isEnabled
			? col.bgPr
			: col.bg;
		ctx.fillRect(x, y,
			dims.controlSize, dims.controlSize);
		ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
		ctx.beginPath();
		ctx.moveTo(x + dims.controlSize * 0.1,
			y + dims.controlSize * 0.6);
		ctx.lineTo(x + dims.controlSize * 0.4,
			y + dims.controlSize * 0.6);
		ctx.lineTo(x + dims.controlSize * 0.25,
			y + dims.controlSize * 0.34);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x + dims.controlSize * 0.5,
			y + dims.controlSize * 0.83,
			dims.controlSize * 0.4,
			4.2, 5.6);
		ctx.strokeStyle = ctx.fillStyle;
		ctx.lineWidth = dims.controlSize * 0.08;
		ctx.stroke();
		ctx.restore();
	}

	/** Draw control for right/forward/left/down button for rot=0/1/2/3
		@param {number} x
		@param {number} y
		@param {number} rot
		@return {void}
	*/
	function drawButtonTri(x, y, rot) {
		var s = dims.controlSize;
		ctx.save();
		ctx.fillStyle = isPressed
			? col.bgPr
			: col.bg;
		ctx.fillRect(x, y, s, s);
		ctx.translate(x + s / 2, y + s / 2);
		ctx.rotate(-rot * Math.PI / 2);
		ctx.translate(-x - s / 2, -y - s / 2);
		ctx.beginPath();
		ctx.moveTo(x + s * 0.3557, y + s * 0.25);
		ctx.lineTo(x + s * 0.3557, y + s * 0.75);
		ctx.lineTo(x + s * 0.7887, y + s * 0.5);
		ctx.closePath();
		ctx.strokeStyle = col.fg;
		ctx.lineWidth = 2 * dims.controlLineWidth;
		ctx.stroke();
		ctx.restore();
	}

	function drawRobot() {
		ctx.beginPath();
		// middle rear
		ctx.moveTo(0, 0.5 * dims.controlSize);
		// right side
		ctx.lineTo(0.5 * dims.controlSize, 0.5 * dims.controlSize);
		ctx.lineTo(0.5 * dims.controlSize, -0.25 * dims.controlSize);
		ctx.bezierCurveTo(0.3 * dims.controlSize, -0.5 * dims.controlSize,
			dims.controlSize * 0.02, -0.5 * dims.controlSize,
			0, -0.5 * dims.controlSize);
		// left side
		ctx.lineTo(0, -0.5 * dims.controlSize);
		ctx.bezierCurveTo(-0.02 * dims.controlSize, -0.5 * dims.controlSize,
			-0.3 * dims.controlSize, -0.5 * dims.controlSize,
			-0.5 * dims.controlSize, -0.25 * dims.controlSize);
		ctx.lineTo(-0.5 * dims.controlSize, 0.5 * dims.controlSize);
		ctx.closePath();
		ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
		ctx.fill();
	}

	var draw = {
		// vpl
		"vpl:close": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize * 0.5, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.1, dims.controlSize * 0.1);
			ctx.lineTo(dims.controlSize * 0.4, dims.controlSize * 0.4);
			ctx.moveTo(dims.controlSize * 0.1, dims.controlSize * 0.4);
			ctx.lineTo(dims.controlSize * 0.4, dims.controlSize * 0.1);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
		},
		"vpl:about": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold " + Math.round(dims.controlSize * 0.7).toString(10) + "px times";
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillText("i", dims.controlSize * 0.5, dims.controlSize * 0.5);
		},
		"vpl:help": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold " + Math.round(dims.controlSize * 0.7).toString(10) + "px times";
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillText("?", dims.controlSize * 0.5, dims.controlSize * 0.5);
		},
		"vpl:statement": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.strokeRect(dims.controlSize * 0.25,
				dims.controlSize * 0.2,
				dims.controlSize * 0.5,
				dims.controlSize * 0.6);
			ctx.beginPath();
			ctx.arc(dims.controlSize * 0.33,
				dims.controlSize * 0.4,
				dims.controlSize * 0.03,
				0, 2 * Math.PI);
			ctx.arc(dims.controlSize * 0.33,
				dims.controlSize * 0.6,
				dims.controlSize * 0.03,
				0, 2 * Math.PI);
			ctx.fill();
			for (var i = 0; i < 5; i++) {
				ctx.beginPath();
				ctx.moveTo(dims.controlSize * 0.4, dims.controlSize * (0.32 + 0.1 * i));
				ctx.lineTo(dims.controlSize * 0.7, dims.controlSize * (0.32 + 0.1 * i));
				ctx.stroke();
				ctx.lineWidth = dims.controlSize * 0.01;
				ctx.setLineDash([dims.controlSize * 0.02, dims.controlSize * 0.02]);
			}
		},
		"vpl:readonly": function () {
			var s = dims.controlSize;
			var th = 0.1;
			var ln = 0.22;
			var ln1 = 0.15;
			var lN = 0.4;
			ctx.save();
			ctx.fillStyle = col.fgDim;
			ctx.strokeStyle = col.fgDim;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.translate(s * 0.5, s * 0.7);
			ctx.save();
			ctx.rotate(0.6);
			ctx.beginPath();
			ctx.moveTo(-th * ln1 / ln * s, (ln - ln1) * s);
			ctx.lineTo(0, ln * s);
			ctx.lineTo(th * ln1 / ln * s, (ln - ln1) * s);
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(-th * s, -lN * s);
			ctx.lineTo(-th * s, 0);
			ctx.lineTo(0, ln * s);
			ctx.lineTo(th * s, 0);
			ctx.lineTo(th * s, -lN * s);
			ctx.restore();
			ctx.moveTo(-0.2 * s, -0.4 * s);
			ctx.lineTo(0.4 * s, 0.2 * s);
			ctx.stroke();
			ctx.restore();
		},
		"vpl:new": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.65,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.65,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.65,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.3);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
		},
		"vpl:save": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.6,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.27);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.lineWidth = 1.5 * dims.controlLineWidth;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.8,
				dims.controlSize * 0.5);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.8);
			ctx.moveTo(dims.controlSize * 0.7,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.9,
				dims.controlSize * 0.7);
			ctx.stroke();
		},
		"vpl:exportToHTML": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = 1.5 * dims.controlLineWidth;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.8,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.5);
			ctx.moveTo(dims.controlSize * 0.7,
				dims.controlSize * 0.4);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.5);
			ctx.lineTo(dims.controlSize * 0.9,
				dims.controlSize * 0.4);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold " + Math.round(dims.controlSize * 0.3).toString(10) + "px sans-serif";
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillText("HTML", dims.controlSize * 0.5, dims.controlSize * 0.7);
			ctx.stroke();
		},
		"vpl:load": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.6,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.27);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.lineWidth = 1.5 * dims.controlLineWidth;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.8,
				dims.controlSize * 0.55);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.85);
			ctx.moveTo(dims.controlSize * 0.7,
				dims.controlSize * 0.65);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.55);
			ctx.lineTo(dims.controlSize * 0.9,
				dims.controlSize * 0.65);
			ctx.stroke();
		},
		"vpl:upload": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			// sheet with folded corner
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.25);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.75);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.75);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.32);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.25);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.6,
				dims.controlSize * 0.25);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.32);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.32);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			// uploaded dummy
			var top = 0.15;
			if (state === "uploaded" || state === "canUploadAgain") {
				ctx.beginPath();
				ctx.moveTo(dims.controlSize * 0.7,
					dims.controlSize * 0.1);
				ctx.lineTo(dims.controlSize * 0.7,
					dims.controlSize * 0.35);
				ctx.lineTo(dims.controlSize * 0.9,
					dims.controlSize * 0.35);
				ctx.lineTo(dims.controlSize * 0.9,
					dims.controlSize * 0.16);
				ctx.lineTo(dims.controlSize * 0.84,
					dims.controlSize * 0.1);
				ctx.closePath();
				ctx.fillStyle = col.fgDim;
				ctx.fill();
				top = 0.4;	// lower arrow
			}
			// arrow
			ctx.lineWidth = 1.5 * dims.controlLineWidth;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.8,
				dims.controlSize * (top / 1.5 + 0.35));
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * top);
			ctx.moveTo(dims.controlSize * 0.7,
				dims.controlSize * (top + 0.1));
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * top);
			ctx.lineTo(dims.controlSize * 0.9,
				dims.controlSize * (top + 0.1));
			ctx.stroke();
			ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},
		"vpl:nextProgram": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.strokeRect(dims.controlSize * 0.25,
				dims.controlSize * 0.2,
				dims.controlSize * 0.5,
				dims.controlSize * 0.6);
			ctx.beginPath();
			ctx.arc(dims.controlSize * 0.33,
				dims.controlSize * 0.4,
				dims.controlSize * 0.03,
				0, 2 * Math.PI);
			ctx.arc(dims.controlSize * 0.33,
				dims.controlSize * 0.6,
				dims.controlSize * 0.03,
				0, 2 * Math.PI);
			ctx.fill();
			for (var i = 0; i < 5; i++) {
				ctx.beginPath();
				ctx.moveTo(dims.controlSize * 0.4, dims.controlSize * (0.32 + 0.1 * i));
				ctx.lineTo(dims.controlSize * 0.7, dims.controlSize * (0.32 + 0.1 * i));
				ctx.stroke();
				ctx.lineWidth = dims.controlSize * 0.01;
				ctx.setLineDash([dims.controlSize * 0.02, dims.controlSize * 0.02]);
			}
			ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.6);
		},
		"vpl:text": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.65,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.65,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.65,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.3);
			for (var y = 0.2; y < 0.6; y += 0.1) {
				ctx.moveTo(dims.controlSize * 0.3,
					dims.controlSize * (0.2 + y));
				ctx.lineTo(dims.controlSize * 0.7,
					dims.controlSize * (0.2 + y));
			}
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
		},
		"vpl:text-toggle": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.28,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.28,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.70,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.70,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.63,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.63,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.63,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.70,
				dims.controlSize * 0.27);
			for (var y = 0.1; y < 0.5; y += 0.1) {
				ctx.moveTo(dims.controlSize * 0.33,
					dims.controlSize * (0.2 + y));
				ctx.lineTo(dims.controlSize * 0.63,
					dims.controlSize * (0.2 + y));
			}
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},
		"vpl:advanced": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: isSelected
					? col.bgOn
					: col.bg;
            ctx.fillRect(0, 0,
                dims.controlSize, dims.controlSize);
            ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
            for (var i = 0; i < 4; i++) {
                for (var j = 0; j < 5; j++) {
                    ctx.fillRect(dims.controlSize * 0.1 * (1 + i) +
                            (i < 2 ? 0 : dims.controlSize * 0.43),
                        dims.controlSize * 0.1 * (2 + j),
                        dims.controlSize * 0.07,
                        dims.controlSize * 0.07);
                }
            }
            ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
            ctx.fillRect(dims.controlSize * 0.1,
                dims.controlSize * 0.8,
                dims.controlSize * 0.8,
                dims.controlSize * 0.1);
        },
		"vpl:undo": function () {
			drawUndo(0, 0, false);
		},
		"vpl:redo": function () {
			drawUndo(0, 0, true);
		},
		"vpl:add-comment": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			// line
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.2, dims.controlSize * 0.6);
			ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.6);
			// +
			ctx.moveTo(dims.controlSize * 0.7, dims.controlSize * 0.35);
			ctx.lineTo(dims.controlSize * 0.9, dims.controlSize * 0.35);
			ctx.moveTo(dims.controlSize * 0.8, dims.controlSize * 0.25);
			ctx.lineTo(dims.controlSize * 0.8, dims.controlSize * 0.45);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.strokeRect(dims.controlSize * 0.1, dims.controlSize * 0.5,
				dims.controlSize * 0.8, dims.controlSize * 0.2);
		},
		"vpl:run": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.3,
				dims.controlSize * 0.25);
			ctx.lineTo(dims.controlSize * 0.3,
				dims.controlSize * 0.75);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.5);
			ctx.closePath();
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fill();
			ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},
		"vpl:stop": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillRect(dims.controlSize * 0.28,
				dims.controlSize * 0.28,
				dims.controlSize * 0.44, dims.controlSize * 0.44);
		},
		// "vpl:slowdown": "sim:speedup"
		"vpl:debug": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.save();
			ctx.translate(0.5 * dims.controlSize, 0.42 * dims.controlSize);
			ctx.scale(0.0085 * dims.controlSize, 0.012 * dims.controlSize);
			ctx.beginPath();
			ctx.arc(0, 0, 20, 0, 2 * Math.PI);	// body
			ctx.moveTo(-13, -10);	// neck
			ctx.bezierCurveTo(0, -5, 0, -5, 13, -10);
			ctx.moveTo(0, -5);	// wing separation
			ctx.lineTo(0, 20);
			ctx.moveTo(-18, -5);	// front left leg
			ctx.lineTo(-30, -10);
			ctx.moveTo(-18, 2);	// middle left leg
			ctx.lineTo(-32, 6);
			ctx.moveTo(-15, 10);	// rear left leg
			ctx.lineTo(-26, 18);
			ctx.moveTo(18, -5);	// front right leg
			ctx.lineTo(30, -10);
			ctx.moveTo(18, 2);	// middle right leg
			ctx.lineTo(32, 6);
			ctx.moveTo(15, 10);	// rear right leg
			ctx.lineTo(26, 18);
			ctx.restore();
			ctx.stroke();
			ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},
		"vpl:flash": function () {
			var s = dims.controlSize;
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0, s, s);
			ctx.save();
			ctx.translate(s * 0.6, s * 0.4);
			ctx.scale(0.4, 0.4);
			drawRobot();
			ctx.restore();
			ctx.save();
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.translate(s * 0.25, s * 0.4);
			ctx.rotate(-Math.PI / 2);
			ctx.font = "bold " + Math.round(s / 4).toString(10) + "px sans-serif";
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillText("flash", 0, 0);
			ctx.restore();
			ctx.fillStyle = isEnabled ? isSelected || isPressed ? col.fg : col.fgOff : col.fgDis;
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},
		"vpl:connected": function () {
			isEnabled = false;	// force disabled appearance
			ctx.translate(0, 0.1 * dims.controlSize);
			ctx.save();
			ctx.translate(dims.controlSize * 0.8, dims.controlSize * 0.2);
			ctx.scale(0.35, 0.35);
			drawRobot();
			ctx.restore();
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = 1.5 * dims.controlLineWidth;
			if (state) {
				ctx.strokeRect(0, 0.05 * dims.controlSize,
					0.3 * dims.controlSize, 0.3 * dims.controlSize);
			}
			ctx.strokeRect(0.3 * dims.controlSize, 0.55 * dims.controlSize,
				0.4 * dims.controlSize, 0.3 * dims.controlSize);
			ctx.lineWidth = dims.controlLineWidth;
			ctx.beginPath();
			ctx.moveTo(0.7 * dims.controlSize, 0.7 * dims.controlSize);
			ctx.bezierCurveTo(0.9 * dims.controlSize, 0.7 * dims.controlSize,
				0.9 * dims.controlSize, 0.7 * dims.controlSize,
				0.85 * dims.controlSize, 0.35 * dims.controlSize);
			if (state) {
				ctx.moveTo(0.3 * dims.controlSize, 0.7 * dims.controlSize);
				ctx.bezierCurveTo(0.1 * dims.controlSize, 0.7 * dims.controlSize,
					0.1 * dims.controlSize, 0.7 * dims.controlSize,
					0.15 * dims.controlSize, 0.35 * dims.controlSize);
			}
			ctx.stroke();
			function cross(x, y) {
				var s = 0.08 * dims.controlSize;
				ctx.save();
				ctx.fillStyle = isEnabled
					? col.bgPr
					: col.bg;
				ctx.fillRect(x - s, y - s, 2 * s, 2 * s);
				ctx.beginPath();
				ctx.moveTo(x - s, y - s);
				ctx.lineTo(x + s, y + s);
				ctx.moveTo(x + s, y - s);
				ctx.lineTo(x - s, y + s);
				ctx.stroke();
				ctx.restore();
			}
			if (!isSelected) {
				cross(0.86 * dims.controlSize, 0.55 * dims.controlSize);
			}
			if (state === "nonmonitored") {
				cross(0.14 * dims.controlSize, 0.55 * dims.controlSize);
			}
		},
		"vpl:robot": function () {
			ctx.fillStyle = isPressed
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			switch (state) {
			case "thymio":
				ctx.save();
				ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
				ctx.scale(0.3, 0.3);
				ctx.rotate(0.2);
				drawRobot();
				ctx.restore();
				break;
			case "thymio-tdm":
				ctx.save();
				ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
				ctx.scale(0.3, 0.3);
				ctx.rotate(0.2);
				drawRobot();
				ctx.restore();
				ctx.fillStyle = col.fg;
				ctx.fillRect(dims.controlSize * 0.4, dims.controlSize * 0.65,
					dims.controlSize * 0.2, dims.controlSize * 0.2);
				break;
			case "sim":
				ctx.save();
				ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
				ctx.scale(0.3, 0.3);
				ctx.rotate(0.2);
				drawRobot();
				ctx.beginPath();
				ctx.strokeStyle = col.fg;
				ctx.lineWidth = dims.controlLineWidth / 0.3;
				ctx.strokeRect(-dims.controlSize, -0.8 * dims.controlSize,
					2 * dims.controlSize, 1.6 * dims.controlSize);
				ctx.restore();
				break;
			}
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.2, dims.controlSize * 0.75);
			ctx.lineTo(dims.controlSize * 0.5, dims.controlSize * 0.75);
			ctx.lineTo(dims.controlSize * 0.5, dims.controlSize * (state === "sim" ? 0.6 : 0.3));
			ctx.strokeStyle = col.fg;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
		},
		"vpl:sim": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.save();
			ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
			ctx.scale(0.4, 0.4);
			ctx.rotate(0.2);
			drawRobot();
			ctx.beginPath();
			ctx.arc(dims.controlSize, 0.5 * dims.controlSize, 1.4 * dims.controlSize,
				-3.2, -3.8, true);
			ctx.strokeStyle = isPressed && isEnabled ? col.fgDimOn : col.fgDim;
			ctx.lineWidth = 0.2 * dims.controlSize;
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(dims.controlSize, 0.5 * dims.controlSize, 0.6 * dims.controlSize,
				-3.3, -3.8, true);
			ctx.stroke();

			ctx.restore();
		},
		"vpl:message-empty": function () {
		},
		"vpl:message-error": function () {
			if (state) {
				ctx.fillStyle = box.color;
				ctx.font = box.cssFontString();
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				var msg = i18n.translate(/** @type {string} */(state));
				ctx.fillText(msg, box.width / 2, box.height / 2);
			}
		},
		// "vpl:message-warning": "vpl:message-error"
		"vpl:filename": function () {
			if (app.program.fixedFilename) {
				if (state) {
					ctx.beginPath();
					var w = 3 * dims.controlSize;
					ctx.rect(0, 0, w, dims.controlSize);
					ctx.clip();
					ctx.fillStyle = box.color;
					ctx.font = box.cssFontString();
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					var str = /** @type {string} */(state).trim();
					// up to two lines, trimmed to fit
					var strArray = str
						.split("\n")
						.slice(0, 2)
						.map(function (s) {
							s = s.slice(0, 80);
							if (s.length > 1 && ctx.measureText(s).width > w) {
								while (s.length > 1 && ctx.measureText(s + "\u2026").width > w) {
									s = s.slice(0, -1);
								}
								s += "\u2026";
							}
							return s;
						});
					if (strArray.length > 1) {
						ctx.fillText(strArray[0], box.width / 2, box.height * 0.25);
						ctx.fillText(strArray[1], box.width / 2, box.height * 0.75);
					} else {
						ctx.fillText(strArray[0], box.width / 2, box.height / 2);
					}
				}
			} else {
				ctx.beginPath();
				var w = 3 * dims.controlSize;
				var str = /** @type {string} */(state);
				ctx.rect(0, 0, box.width, box.height);
				ctx.clip();
				ctx.fillStyle = box.color;
				ctx.font = box.cssFontString();
				ctx.textBaseline = "middle";

				if (app.textField != null && app.textField.ref === app.program) {
					// being edited
					var strLeftSize = ctx.measureText(app.textField.str.slice(0, app.textField.selBegin));
					var ascent = strLeftSize["fontBoundingBoxAscent"] || 0;
					var descent = strLeftSize["fontBoundingBoxDescent"] || 0;
					if (ascent === 0 || descent === 0) {
						// vertical metrics missing in TextMetrics: use css
						ascent = box.fontSize / 2;
						descent = ascent;
					}
					var textFieldFrame = {
						top: box.height / 2 - ascent,
						bottom: box.height / 2 + descent,
						left: 2,
						right: 2 + ctx.measureText(app.textField.str).width
					};
					var rightPos = app.textField.str.split("").map(function (c, i) {
						return ctx.measureText(app.textField.str.slice(0, i + 1)).width;
					});
					app.textField.setRenderingPos(textFieldFrame, rightPos);
					var chWidth = ctx.measureText("0").width;
					var xShift = Math.min(0, box.width - chWidth / 4 - textFieldFrame.right);	// text shift to display end of string
					if (app.textField.selEnd === app.textField.selBegin) {
						// plain cursor
						ctx.strokeStyle = "black";
						ctx.beginPath();
						ctx.moveTo(xShift + textFieldFrame.left + strLeftSize.width, textFieldFrame.top);
						ctx.lineTo(xShift + textFieldFrame.left + strLeftSize.width, textFieldFrame.bottom);
						ctx.stroke();
					} else {
						// selection
						xShift = 0;
						var strSelSize = ctx.measureText(app.textField.str.slice(app.textField.selBegin, app.textField.selEnd));
						ctx.save();
						ctx.fillStyle = "silver";
						ctx.fillRect(textFieldFrame.left + strLeftSize.width - 1, textFieldFrame.top,
							strSelSize.width, ascent + descent);
						ctx.restore();
					}

					ctx.textAlign = "left";
					ctx.fillText(app.textField.str, xShift, box.height / 2);
				} else {
					ctx.textAlign = "center";
					ctx.fillText(str, box.width / 2, box.height / 2);
				}
			}
		},
		"vpl:duplicate": function () {
            ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
            ctx.fillRect(0, 0,
                dims.controlSize, dims.controlSize);
            ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
            ctx.lineWidth = dims.controlLineWidth;
            ctx.strokeRect(dims.controlSize * 0.3,
                dims.controlSize * 0.3,
                dims.controlSize * 0.4, dims.controlSize * 0.15);
            ctx.strokeRect(dims.controlSize * 0.3,
                dims.controlSize * 0.55,
                dims.controlSize * 0.4, dims.controlSize * 0.15);
        },
		"vpl:disable": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.strokeRect(dims.controlSize * 0.3,
				dims.controlSize * 0.3,
				dims.controlSize * 0.4, dims.controlSize * 0.4);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.2,
				dims.controlSize * 0.6);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.4);
			ctx.stroke();
		},
		"vpl:lock": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.strokeRect(dims.controlSize * 0.3,
				dims.controlSize * 0.3,
				dims.controlSize * 0.4, dims.controlSize * 0.4);
			A3a.vpl.Canvas.lock(ctx,
				dims.controlSize * 0.5,
				dims.controlSize * 0.52,
				dims.controlSize * 0.04,
				col.fg);
		},
		"vpl:trashcan": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.32,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.68,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
		},
		"vpl:teacher-reset": function () {
			ctx.fillStyle = isPressed && isEnabled ? col.bgTeacherPr : col.bgTeacher;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.65,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.65,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.65,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.3);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgTeacherDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.fillStyle = isEnabled ? col.fg : col.fgTeacherDis;
			A3a.vpl.Canvas.drawHexagonalNut(ctx,
				dims.controlSize * 0.63,
				dims.controlSize * 0.7,
				dims.controlSize * 0.2);
		},
		"vpl:teacher-save": function () {
			ctx.fillStyle = isPressed && isEnabled ? col.bgTeacherPr : col.bgTeacher;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgTeacherDis;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.6,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.27);
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.lineWidth = 1.5 * dims.controlLineWidth;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.8,
				dims.controlSize * 0.5);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.8);
			ctx.moveTo(dims.controlSize * 0.7,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.9,
				dims.controlSize * 0.7);
			ctx.stroke();
			ctx.fillStyle = isEnabled ? col.fg : col.fgTeacherDis;
			A3a.vpl.Canvas.drawHexagonalNut(ctx,
				dims.controlSize * 0.46,
				dims.controlSize * 0.45,
				dims.controlSize * 0.2);
		},
		"vpl:teacher-setasnew": function () {
			ctx.fillStyle = isPressed && isEnabled
				? isSelected ? col.bgTeacherPrOn : col.bgTeacherPr
				: isSelected && isEnabled ? col.bgTeacherOn : col.bgTeacher;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgTeacherDis;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.7);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.6,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.27);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.27);
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.lineWidth = 1.5 * dims.controlLineWidth;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.8,
				dims.controlSize * 0.5);
			ctx.lineTo(dims.controlSize * 0.5,
				dims.controlSize * 0.5);
			ctx.moveTo(dims.controlSize * 0.6,
				dims.controlSize * 0.4);
			ctx.lineTo(dims.controlSize * 0.5,
				dims.controlSize * 0.5);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.6);
			ctx.stroke();
            ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgTeacherOff;
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},
		"vpl:teacher": function () {
			ctx.fillStyle = isPressed && isEnabled
				? isSelected ? col.bgTeacherPrOn : col.bgTeacherPr
				: isSelected && isEnabled ? col.bgTeacherOn : col.bgTeacher;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isEnabled ? col.fg : col.fgTeacherDis;
			A3a.vpl.Canvas.drawHexagonalNut(ctx,
				dims.controlSize * 0.5,
				dims.controlSize * 0.4,
				dims.controlSize * 0.27);
            ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgTeacherOff;
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},

		// source code editor
		// "src:close": "vpl:close"
		// "src:new": "vpl:new"
		// "src:save": "vpl:save"
		"src:vpl": function () {
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.65,
				dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.65,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.65,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.75,
				dims.controlSize * 0.3);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.fillStyle = isPressed && isEnabled ? col.fg : col.fgDim;
			for (var y = 0.15; y < 0.6; y += 0.15) {
				ctx.fillRect(dims.controlSize * 0.3,
					dims.controlSize * (0.2 + y),
					dims.controlSize * 0.4,
					dims.controlSize * 0.10);
			}
			ctx.restore();
		},
		"src:locked": function () {
			ctx.save();
			ctx.fillStyle = !isEnabled
				? col.bg
				: isPressed
					? col.bgPr
					: isSelected
						? col.bgOn
						: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.fillStyle = !isEnabled ? col.fgDis : isSelected ? col.fgDimOn : col.fgDim;
			for (var y = 0.15; y < 0.6; y += 0.15) {
				ctx.fillRect(dims.controlSize * 0.15,
					dims.controlSize * (0 + y),
					dims.controlSize * 0.4,
					dims.controlSize * 0.10);
			}
			A3a.vpl.Canvas.lock(ctx,
				dims.controlSize * 0.77,
				dims.controlSize * 0.36,
				dims.controlSize * 0.06,
				isEnabled ? col.fg : col.fgDis,
				!isSelected);
            ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
            ctx.fillRect(dims.controlSize * 0.1,
                dims.controlSize * 0.8,
                dims.controlSize * 0.8,
                dims.controlSize * 0.1);
			ctx.restore();
		},
		"src:language": function () {
			/** @const */
			var languageAbbr = {"aseba": "Aa", "l2": "l2", "asm": "asm", "js": "js", "python": "Py"};
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = !isEnabled
				? col.bg
				: isPressed
					? col.bgPr
					: col.bg;
			ctx.fillRect(0, 0, s, s);
			ctx.beginPath();
			for (var i = 0; i < 3; i++) {
				ctx.moveTo(s * 0.2, s * (0.2 + 0.1 * i));
				ctx.lineTo(s * 0.5, s * (0.2 + 0.1 * i));
			}
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			for (var i = 0; i < 3; i++) {
				var phi = 2 * (i + 0.25) / 3 * Math.PI;
				A3a.vpl.Canvas.drawArcArrow(ctx, 0.75 * s, 0.3 * s, 0.15 * s,
					phi - Math.PI * 0.3,
					phi + Math.PI * 0.3,
					{
						arrowAtStart: false,
						arrowSize: 3 * dims.controlLineWidth,
						style: isEnabled ? col.fg : col.fgDis
					});
			}
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold " + Math.round(s / 3).toString(10) + "px sans-serif";
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillText(languageAbbr[state], s * 0.5, s * 0.7);
			ctx.restore();
		},
		"src:disass": function () {
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isEnabled && isPressed
				? col.bgPr
				: isSelected
					? col.bgOn
					: col.bg;
			ctx.fillRect(0, 0, s, s);
			ctx.beginPath();
			ctx.moveTo(s * 0.2, s * 0.2);
			ctx.lineTo(s * 0.3, s * 0.2);
			for (var i = 0; i < 5; i++) {
				ctx.moveTo(s * 0.4, s * (0.2 + 0.1 * i));
				ctx.lineTo(s * 0.45, s * (0.2 + 0.1 * i));
				ctx.moveTo(s * 0.55, s * (0.2 + 0.1 * i));
				ctx.lineTo(s * 0.65, s * (0.2 + 0.1 * i));
			}
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.fillStyle = isEnabled && (isSelected || isPressed) ? col.fg : col.fgOff;
            ctx.fillRect(dims.controlSize * 0.1,
                dims.controlSize * 0.8,
                dims.controlSize * 0.8,
                dims.controlSize * 0.1);
			ctx.restore();
		},
		"src:run": function () {
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.3,
				dims.controlSize * 0.25);
			ctx.lineTo(dims.controlSize * 0.3,
				dims.controlSize * 0.75);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.5);
			ctx.closePath();
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fill();
		},
		// "src:stop": "vpl:stop"
		// "src:sim": "vpl:sim"
		// "src:teacher": "vpl:teacher"
		// "src:teacher-reset": "vpl:teacher-reset"

		// simulator
		// "sim:close": "vpl:close"
		"sim:restart": function () {
			ctx.save();
			ctx.fillStyle = isPressed
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0, box.width, box.height);
			var s = dims.controlSize;
			ctx.lineWidth = 0.05 * s;
			A3a.vpl.Canvas.drawArcArrow(ctx, 0.5 * s, 0.5 * s, 0.25 * s,
				1.56,
				0,
				{
					arrowAtStart: false,
					arrowSize: 0.2 * s,
					style: col.fg
				});
			ctx.restore();
		},
		"sim:pause": function () {
			ctx.save();
			ctx.fillStyle = isPressed
				? col.bgPr
				: isSelected
					? col.bgOn
					: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillRect(dims.controlSize * 0.28,
				dims.controlSize * 0.28,
				dims.controlSize * 0.15, dims.controlSize * 0.44);
			if (isSelected) {
				ctx.beginPath();
				ctx.moveTo(dims.controlSize * 0.54,
					dims.controlSize * 0.28);
				ctx.lineTo(dims.controlSize * 0.62,
					dims.controlSize * 0.28);
				ctx.lineTo(dims.controlSize * 0.75,
					dims.controlSize * 0.5);
				ctx.lineTo(dims.controlSize * 0.62,
					dims.controlSize * 0.72);
				ctx.lineTo(dims.controlSize * 0.54,
					dims.controlSize * 0.72);
				ctx.fill();
			} else {
				ctx.fillRect(dims.controlSize * 0.57,
					dims.controlSize * 0.28,
					dims.controlSize * 0.15, dims.controlSize * 0.44);
			}
			ctx.restore();
		},
		"sim:speedup": function () {
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: isSelected
					? col.bgOn
					: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.beginPath();
			for (var i = 0; i < 2; i++) {
				ctx.moveTo(dims.controlSize * (0.3 + 0.22 * i),
					dims.controlSize * 0.25 / 2);
				ctx.lineTo(dims.controlSize * (0.3 + 0.22 * i),
					dims.controlSize * 0.75 / 2);
				ctx.lineTo(dims.controlSize * (0.3 + 0.2 + 0.22 * i),
					dims.controlSize * 0.5 / 2);
				ctx.closePath();
			}
			ctx.fill();
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold " + Math.round(dims.controlSize / 3).toString(10) + "px sans-serif";
			ctx.fillText(/** @type {number} */(state) >= 1
				? "\u00d7" + /** @type {number} */(state).toString(10)
				: "\u00f7" + Math.round(1 / /** @type {number} */(state)).toString(10),
				dims.controlSize * 0.5, dims.controlSize * 0.7);
			ctx.restore();
		},
		"sim:noise": function () {
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: isSelected
					? col.bgOn
					: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			/**
				@const
				fprintf('%.2f, ', sin(linspace(1,8,20))+0.5*randn(1,20))
			*/
			var noise = [
				0.58, 1.48, 0.96, 0.39, 1.36, 0.09, -0.75, -1.58, -0.32, -1.36,
				-1.39, -0.94, -1.10, -1.04, -0.10, 0.93, 1.22, 0.60, 0.89, 0.61
			];
			ctx.moveTo(0.1 * dims.controlSize,
				(0.4 + 0.1 * noise[0]) * dims.controlSize);
			for (var i = 1; i < noise.length; i++) {
				ctx.lineTo((0.1 + 0.8 / (noise.length - 1) * i) * dims.controlSize,
					(0.4 + 0.1 * noise[i]) * dims.controlSize);
			}
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
            ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
 				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
			ctx.restore();
		},
		"sim:pen": function () {
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: isSelected
					? col.bgOn
					: col.bg;
			ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
			ctx.fillRect(s * 0.1, s * 0.8, s * 0.8, s * 0.1);
			ctx.translate(s * 0.5, s * (0.4 + (isSelected ? 0.13 : 0)));
			var th = 0.1;
			var ln = 0.22;
			var ln1 = 0.15;
			ctx.beginPath();
			ctx.moveTo(-th * ln1 / ln * s, (ln - ln1) * s);
			ctx.lineTo(0, ln * s);
			ctx.lineTo(th * ln1 / ln * s, (ln - ln1) * s);
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(-th * s, -ln * s);
			ctx.lineTo(-th * s, 0);
			ctx.lineTo(0, ln * s);
			ctx.lineTo(th * s, 0);
			ctx.lineTo(th * s, -ln * s);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.stroke();
			ctx.restore();
		},
		"sim:clear": function () {
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0, s, s);
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.lineWidth = dims.controlLineWidth;
			ctx.strokeRect(0.15 * s, 0.25 * s, 0.7 * s, 0.5 * s);
			ctx.translate(0.5 * s, 0.4 * s);
			ctx.rotate(0.4);
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillRect(0, 0, 0.3 * s, 0.2 * s);
			ctx.restore();
		},
		"sim:map-kind": function () {
			var s = dims.controlSize;
			var lineWidth = dims.controlLineWidth;
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.lineWidth = lineWidth;
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.fillStyle = isEnabled ? col.fg : col.fgDis;
			var i0 = ["ground", "height", "obstacles"].indexOf(state);
			for (var i = 0; i < 3; i++) {
				var phi = 2 * (i + 0.25) / 3 * Math.PI;
				if (i === i0) {
					ctx.fillRect(
						s * (0.5 - 0.15 + 0.25 * Math.cos(phi)), s * (0.5 - 0.11 + 0.25 * Math.sin(phi)),
						0.3 * s, 0.22 * s);
				} else {
					 ctx.strokeRect(
						s * (0.5 - 0.15 + 0.25 * Math.cos(phi)), s * (0.5 - 0.11 + 0.25 * Math.sin(phi)),
						0.3 * s, 0.22 * s);
				}
				A3a.vpl.Canvas.drawArcArrow(ctx, 0.5 * s, 0.5 * s, 0.36 * s,
					phi - Math.PI * 0.42,
					phi - Math.PI * 0.22,
					{
						arrowAtStart: false,
						arrowSize: 3 * lineWidth,
						style: col.fg
					});
			}
			ctx.restore();
		},
		"sim:map": function () {
			/** Calculate the height for the specified coordinates
				@param {number} x
				@param {number} y
				@return {number}
			*/
			function calcHeight(x, y) {
				return 0.2 * Math.cos(5 * x + 2 * y - 3) - (y - 0.9) * (y - 0.9) / 3;
			}

			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? col.bgPr
				: isSelected
					? col.bgOn
					: col.bg;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
            ctx.fillStyle = !isEnabled ? col.fgDis : isSelected || isPressed ? col.fg : col.fgOff;
			ctx.fillRect(s * 0.1, s * 0.8, s * 0.8, s * 0.1);
			ctx.lineWidth = dims.controlLineWidth;
			ctx.strokeStyle = isEnabled ? col.fg : col.fgDis;
			ctx.strokeRect(0.15 * s, 0.15 * s, 0.7 * s, 0.5 * s);
			switch (state) {
			case "ground":
				ctx.lineWidth = s * 0.08;
				ctx.beginPath();
				ctx.arc(0.6 * s, 0.4 * s, 0.15 * s, -0.5 * Math.PI, 0.5 * Math.PI);
				ctx.lineTo(0.4 * s, 0.55 * s);
				ctx.arc(0.4 * s, 0.4 * s, 0.15 * s, 0.5 * Math.PI, 1.5 * Math.PI);
				ctx.closePath();
				ctx.stroke();
				break;
			case "height":
				ctx.beginPath();
				for (var y = 0; y <= 0.75; y += 0.25) {
					for (var x = 0; x <= 1; x += 0.1) {
						var z = calcHeight(x, y);
						var xd = s * (0.2 + 0.5 * x + 0.15 * y);
						var yd = s * (0.5 - 0.3 * y - 0.2 * z);
						if (x === 0) {
							ctx.moveTo(xd, yd);
						} else {
							ctx.lineTo(xd, yd);
						}
					}
				}
				ctx.stroke();
				break;
			case "obstacles":
				ctx.strokeRect(0.2 * s, 0.2 * s, 0.6 * s, 0.4 * s);
				ctx.beginPath();
				ctx.moveTo(0.4 * s, 0.2 * s);
				ctx.lineTo(0.4 * s, 0.43 * s);
				ctx.moveTo(0.6 * s, 0.6 * s);
				ctx.lineTo(0.6 * s, 0.37 * s);
				ctx.stroke();
				break;
			}
			ctx.restore();
		},
		"sim:map-ground": function () {
			state = "ground";
			draw["sim:map"]();
		},
		"sim:map-height": function () {
			state = "height";
			draw["sim:map"]();
		},
		"sim:map-obstacles": function () {
			state = "obstacles";
			draw["sim:map"]();
		},
		// "sim:vpl": "src:vpl"
		// "sim:text": "vpl:text"
		"sim-event:forward": function () {
			drawButtonTri(0, 0, 1);
		},
		"sim-event:backward": function () {
			drawButtonTri(0, 0, 3);
		},
		"sim-event:left": function () {
			drawButtonTri(0, 0, 2);
		},
		"sim-event:right": function () {
			drawButtonTri(0, 0, 0);
		},
		"sim-event:center": function () {
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isPressed
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0, s, s);
			ctx.beginPath();
			ctx.arc(0.5 * s, 0.5 * s, 0.25 * s, 0, 2 * Math.PI);
			ctx.strokeStyle = col.fg;
			ctx.lineWidth = 2 * dims.controlLineWidth;
			ctx.stroke();
			ctx.restore();
		},
		"sim-event:clap": function () {
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isPressed
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0, s, s);
			ctx.beginPath();

			ctx.strokeStyle = col.fg;
			ctx.lineWidth = 2 * dims.controlLineWidth;
			ctx.translate(0.5 * s, 0.5 * s);
			ctx.rotate(0.1);
			for (var i = 0; i < 9; i++) {
				ctx.beginPath();
				ctx.moveTo(0.12 * s, 0);
				ctx.lineTo(0.24 * s, 0);
				ctx.moveTo(0.28 * s, 0);
				ctx.lineTo(0.36 * s, 0);
				ctx.stroke();
				ctx.rotate(Math.PI / 4.5);
			}
			ctx.restore();
		},
		"sim-event:tap": function () {
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isPressed
				? col.bgPr
				: col.bg;
			ctx.fillRect(0, 0, s, s);
			ctx.beginPath();

			ctx.strokeStyle = col.fg;
			ctx.lineWidth = 2 * dims.controlLineWidth;
			ctx.translate(0.6 * s, 0.6 * s);
			for (var i = 1; i <= 3; i++) {
				ctx.beginPath();
				ctx.arc(0, 0,
					0.15 * s * i,
					Math.PI * 0.9, Math.PI * 1.7);
				ctx.stroke();
			}
			ctx.moveTo(0.3 * s, 0);
			ctx.lineTo(0, 0);
			ctx.lineTo(0, 0.3 * s);
			ctx.stroke();
			ctx.restore();
		}
	};
	draw["vpl:message-warning"] = draw["vpl:message-error"];
	draw["vpl:slowdown"] = draw["sim:speedup"];
	draw["src:close"] = draw["vpl:close"];
	draw["src:new"] = draw["vpl:new"];
	draw["src:save"] = draw["vpl:save"];
	draw["src:load"] = draw["vpl:load"];
	draw["src:stop"] = draw["vpl:stop"];
	draw["src:connected"] = draw["vpl:connected"];
	draw["src:sim"] = draw["vpl:sim"];
	draw["src:teacher"] = draw["vpl:teacher"];
	draw["src:teacher-reset"] = draw["vpl:teacher-reset"];
	draw["sim:close"] = draw["vpl:close"];
	draw["sim:vpl"] = draw["src:vpl"];
	draw["sim:text"] = draw["vpl:text"];
	draw["sim:teacher"] = draw["vpl:teacher"];
	draw["sim:teacher-reset"] = draw["vpl:teacher-reset"];

	var dr = draw[id];
	if (dr) {
		dr();
	}

	return false;	// no disable mark (can be set by caller)
};

/** Get button bounds
	@param {string} id
	@param {A3a.vpl.Canvas.dims} dims
	@return {A3a.vpl.ControlBar.Bounds}
*/
A3a.vpl.Commands.getButtonBoundsJS = function (id, dims) {
	// special cases
	switch (id) {
	case "vpl:close":
	case "src:close":
	case "sim:close":
		return {
			xmin: 0,
			xmax: dims.controlSize / 2,
			ymin: 0,
			ymax: dims.controlSize
		};
	case "vpl:message-error":
	case "vpl:message-warning":
	case "vpl:message-empty":
		return {
			xmin: 0,
			xmax: 5 * dims.controlSize,
			ymin: 0,
			ymax: dims.controlSize
		};
	case "vpl:filename":
		return {
			xmin: 0,
			xmax: 3 * dims.controlSize,
			ymin: 0,
			ymax: dims.controlSize
		};
	}

	// fixed size
	return {
		xmin: 0,
		xmax: dims.controlSize,
		ymin: 0,
		ymax: dims.controlSize
	};
};
