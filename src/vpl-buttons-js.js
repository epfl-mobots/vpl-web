/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** Draw a button
	@param {string} id
	@param {CanvasRenderingContext2D} ctx canvas 2d context
	@param {A3a.vpl.Canvas.dims} dims
	@param {CSSParser.VPL} css
	@param {Array.<string>} cssClasses
	@param {boolean} isEnabled
	@param {boolean} isSelected
	@param {boolean} isPressed
	@param {*=} state state for multi-value buttons
	@return {void}
*/
A3a.vpl.Commands.drawButtonJS = function (id, ctx, dims, css, cssClasses, isEnabled, isSelected, isPressed, state) {

	var box = css.getBox({tag: "button", clas: cssClasses, id: id.replace(/:/g, "-")});

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
			? dims.controlDownColor
			: dims.controlColor;
		ctx.fillRect(x, y,
			dims.controlSize, dims.controlSize);
		ctx.fillStyle = isEnabled ? "white" : "#777";
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
		ctx.save();
		ctx.fillStyle = isPressed
			? dims.controlDownColor
			: dims.controlColor;
		ctx.fillRect(x, y, box.width, box.height);
		ctx.translate(x + box.width / 2, y + box.width / 2);
		ctx.rotate(-rot * Math.PI / 2);
		ctx.translate(-x - box.width / 2, -y - box.width / 2);
		ctx.beginPath();
		ctx.moveTo(x + box.width * 0.3557, y + box.width * 0.25);
		ctx.lineTo(x + box.width * 0.3557, y + box.width * 0.75);
		ctx.lineTo(x + box.width * 0.7887, y + box.width * 0.5);
		ctx.closePath();
		ctx.strokeStyle = "white";
		ctx.lineWidth = dims.blockLineWidth;
		ctx.stroke();
		ctx.restore();
	}

	var draw = {
		// vpl
		"vpl:close": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize * 0.5, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.1, dims.controlSize * 0.1);
			ctx.lineTo(dims.controlSize * 0.4, dims.controlSize * 0.4);
			ctx.moveTo(dims.controlSize * 0.1, dims.controlSize * 0.4);
			ctx.lineTo(dims.controlSize * 0.4, dims.controlSize * 0.1);
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
		},
		"vpl:about": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold " + Math.round(dims.controlSize * 0.7).toString(10) + "px sans-serif";
			ctx.fillStyle = isEnabled ? "white" : "#777";
			ctx.fillText("?", dims.controlSize * 0.5, dims.controlSize * 0.5);
		},
		"vpl:new": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
		},
		"vpl:save": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.lineWidth = 2 * dims.blockLineWidth;
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
		"vpl:load": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.lineWidth = 2 * dims.blockLineWidth;
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
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.25,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.25,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.8);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.37);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.3);
			ctx.closePath();
			ctx.moveTo(dims.controlSize * 0.6,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.6,
				dims.controlSize * 0.37);
			ctx.lineTo(dims.controlSize * 0.67,
				dims.controlSize * 0.37);
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.lineWidth = 2 * dims.blockLineWidth;
			ctx.beginPath();
			ctx.moveTo(dims.controlSize * 0.8,
				dims.controlSize * 0.5);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.2);
			ctx.moveTo(dims.controlSize * 0.7,
				dims.controlSize * 0.3);
			ctx.lineTo(dims.controlSize * 0.8,
				dims.controlSize * 0.2);
			ctx.lineTo(dims.controlSize * 0.9,
				dims.controlSize * 0.3);
			ctx.stroke();
		},
		"vpl:text": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
		},
		"vpl:text-toggle": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.fillStyle = isEnabled ? isSelected || isPressed ? "white" : "#44a" : "#777";
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},
		"vpl:advanced": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: isSelected
					? dims.controlActiveColor
					: dims.controlColor;
            ctx.fillRect(0, 0,
                dims.controlSize, dims.controlSize);
            ctx.fillStyle = isEnabled ? "white" : "#777";
            for (var i = 0; i < 4; i++) {
                for (var j = 0; j < 5; j++) {
                    ctx.fillRect(dims.controlSize * 0.1 * (1 + i) +
                            (i < 2 ? 0 : dims.controlSize * 0.43),
                        dims.controlSize * 0.1 * (2 + j),
                        dims.controlSize * 0.07,
                        dims.controlSize * 0.07);
                }
            }
            ctx.fillStyle = !isEnabled ? "#777" : isSelected || isPressed ? "white" : "#44a";
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
		"vpl:run": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
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
			ctx.fillStyle = isEnabled ? "white" : "#777";
			ctx.fill();
			ctx.fillStyle = isEnabled ? isSelected || isPressed ? "white" : "#44a" : "#777";
			ctx.fillRect(dims.controlSize * 0.1,
				dims.controlSize * 0.8,
				dims.controlSize * 0.8,
				dims.controlSize * 0.1);
		},
		"vpl:stop": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isEnabled ? "white" : "#777";
			ctx.fillRect(dims.controlSize * 0.28,
				dims.controlSize * 0.28,
				dims.controlSize * 0.44, dims.controlSize * 0.44);
			ctx.fill();
		},
		"vpl:sim": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.save();
			ctx.translate(dims.controlSize / 2, dims.controlSize * 0.35);
			ctx.scale(0.4, 0.4);
			ctx.rotate(0.2);
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
			ctx.fillStyle = isEnabled ? "white" : "#777";
			ctx.fill();
			ctx.beginPath();
			ctx.arc(dims.controlSize, 0.5 * dims.controlSize, 1.4 * dims.controlSize,
				-3.2, -3.8, true);
			ctx.strokeStyle = isPressed && isEnabled ? "white" : "#999";
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
		"vpl:message-error": function (app) {
			if (state) {
				ctx.fillStyle = box.color;
				ctx.font = box.cssFontString();
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(/** @type {string} */(state), box.width / 2, box.height / 2);
			}
		},
		// "vpl:message-warning": "vpl:message-error"
		"vpl:duplicate": function () {
            ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
            ctx.fillRect(0, 0,
                dims.controlSize, dims.controlSize);
            ctx.strokeStyle = isEnabled ? "white" : "#777";
            ctx.lineWidth = dims.blockLineWidth;
            ctx.strokeRect(dims.controlSize * 0.3,
                dims.controlSize * 0.3,
                dims.controlSize * 0.4, dims.controlSize * 0.15);
            ctx.strokeRect(dims.controlSize * 0.3,
                dims.controlSize * 0.55,
                dims.controlSize * 0.4, dims.controlSize * 0.15);
        },
		"vpl:disable": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
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
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.fillStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.strokeRect(dims.controlSize * 0.3,
				dims.controlSize * 0.3,
				dims.controlSize * 0.4, dims.controlSize * 0.4);
			A3a.vpl.Canvas.lock(ctx,
				dims.controlSize * 0.5,
				dims.controlSize * 0.52,
				dims.controlSize * 0.04,
				"white");
		},
		"vpl:trashcan": function () {
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
		},
		"vpl:teacher-reset": function () {
			ctx.fillStyle = isPressed && isEnabled ? "#d00" : "#a00";
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
			ctx.strokeStyle = isEnabled ? "white" : "#c66";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.fillStyle = isEnabled ? "white" : "#c66";
			A3a.vpl.Canvas.drawHexagonalNut(ctx,
				dims.controlSize * 0.63,
				dims.controlSize * 0.7,
				dims.controlSize * 0.2);
		},
		"vpl:teacher-save": function () {
			ctx.fillStyle = isPressed && isEnabled ? "#d00" : "#a00";
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? "white" : "#c66";
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
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.lineWidth = 2 * dims.blockLineWidth;
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
			ctx.fillStyle = isEnabled ? "white" : "#c66";
			A3a.vpl.Canvas.drawHexagonalNut(ctx,
				dims.controlSize * 0.46,
				dims.controlSize * 0.45,
				dims.controlSize * 0.2);
		},
		"vpl:teacher": function () {
			ctx.fillStyle = isPressed && isEnabled
				? isSelected ? "#f50" : "#d00"
				: isSelected && isEnabled ? "#d10" : "#a00";
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isEnabled ? "white" : "#c66";
			A3a.vpl.Canvas.drawHexagonalNut(ctx,
				dims.controlSize * 0.5,
				dims.controlSize * 0.4,
				dims.controlSize * 0.27);
			ctx.fillStyle = (isSelected || isPressed) && isEnabled ? "white" : "#c66";
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
				? dims.controlDownColor
				: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.fillStyle = isPressed && isEnabled ? "white" : "#99a";
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
				? dims.controlColor
				: isPressed
					? dims.controlDownColor
					: isSelected
						? dims.controlActiveColor
						: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.fillStyle = !isEnabled ? "#777" : isSelected ? "#ddf" : "#99a";
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
				isEnabled ? "white" : "#777",
				!isSelected);
            ctx.fillStyle = !isEnabled ? "#777" : isSelected || isPressed ? "white" : "#44a";
            ctx.fillRect(dims.controlSize * 0.1,
                dims.controlSize * 0.8,
                dims.controlSize * 0.8,
                dims.controlSize * 0.1);
			ctx.restore();
		},
		"src:language": function () {
			/** @const */
			var languageAbbr = {"aseba": "Aa", "l2": "l2", "js": "js", "python": "py"};
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = !isEnabled
				? dims.controlColor
				: isPressed
					? dims.controlDownColor
					: dims.controlColor;
			ctx.fillRect(0, 0, s, s);
			ctx.beginPath();
			for (var i = 0; i < 3; i++) {
				ctx.moveTo(s * 0.2, s * (0.2 + 0.1 * i));
				ctx.lineTo(s * 0.5, s * (0.2 + 0.1 * i));
			}
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			for (var i = 0; i < 3; i++) {
				var phi = 2 * (i + 0.25) / 3 * Math.PI;
				A3a.vpl.Canvas.drawArcArrow(ctx, 0.75 * s, 0.3 * s, 0.15 * s,
					phi - Math.PI * 0.3,
					phi + Math.PI * 0.3,
					{
						arrowAtStart: false,
						arrowSize: 3 * dims.blockLineWidth,
						style: isEnabled ? "white" : "#777"
					});
			}
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold " + Math.round(s / 3).toString(10) + "px sans-serif";
			ctx.fillStyle = isEnabled ? "white" : "#777";
			ctx.fillText(languageAbbr[state], s * 0.5, s * 0.7);
			ctx.restore();
		},
		"src:disass": function () {
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isEnabled && isPressed
				? dims.controlDownColor
				: isSelected
					? dims.controlActiveColor
					: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";;
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.fillStyle = isEnabled && (isSelected || isPressed) ? "white" : "#44a";
            ctx.fillRect(dims.controlSize * 0.1,
                dims.controlSize * 0.8,
                dims.controlSize * 0.8,
                dims.controlSize * 0.1);
			ctx.restore();
		},
		// "src:run": "vpl:run"
		// "src:stop": "vpl:stop"
		// "src:sim": "vpl:sim"
		// "src:teacher": "vpl:teacher"
		// "src:teacher-reset": "vpl:teacher-reset"

		// simulator
		// "sim:close": "vpl:close"
		"sim:restart": function () {
			ctx.save();
			ctx.fillStyle = isPressed
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0, box.width, box.height);
			var s = dims.controlSize;
			ctx.lineWidth = 0.08 * s;
			A3a.vpl.Canvas.drawArcArrow(ctx, 0.5 * s, 0.5 * s, 0.28 * s,
				0.1,
				-0.1,
				{
					arrowAtStart: false,
					arrowSize: 0.2 * s,
					style: "white"
				});
			ctx.restore();
		},
		"sim:pause": function () {
			ctx.save();
			ctx.fillStyle = isPressed
				? dims.controlDownColor
				: isSelected
					? dims.controlActiveColor
					: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isEnabled ? "white" : "#777";
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
				? dims.controlDownColor
				: isSelected
					? dims.controlActiveColor
					: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isEnabled ? "white" : "#777";
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
				? dims.controlDownColor
				: isSelected
					? dims.controlActiveColor
					: dims.controlColor;
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
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.fillStyle = isSelected || isPressed ? "white" : "#777";
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
				? dims.controlDownColor
				: isSelected
					? dims.controlActiveColor
					: dims.controlColor;
			ctx.fillRect(0, 0, s, s);
			ctx.fillStyle = isSelected || isPressed && isEnabled ? "white" : "#777";
			ctx.fillRect(s * 0.1, s * 0.8, s * 0.8, s * 0.1);
			ctx.translate(s * 0.5, s * (0.4 + (isSelected ? 0.13 : 0)));
			var th = 0.1;
			var ln = 0.22;
			var ln1 = 0.15;
			ctx.beginPath();
			ctx.moveTo(-th * ln1 / ln * s, (ln - ln1) * s);
			ctx.lineTo(0, ln * s);
			ctx.lineTo(th * ln1 / ln * s, (ln - ln1) * s);
			ctx.fillStyle = isEnabled ? "white" : "#777";
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(-th * s, -ln * s);
			ctx.lineTo(-th * s, 0);
			ctx.lineTo(0, ln * s);
			ctx.lineTo(th * s, 0);
			ctx.lineTo(th * s, -ln * s);
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.restore();
		},
		"sim:clear": function () {
			var s = dims.controlSize;
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0, s, s);
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.strokeRect(0.15 * s, 0.25 * s, 0.7 * s, 0.5 * s);
			ctx.translate(0.5 * s, 0.4 * s);
			ctx.rotate(0.4);
			ctx.fillStyle = isEnabled ? "white" : "#777";
			ctx.fillRect(0, 0, 0.3 * s, 0.2 * s);
			ctx.restore();
		},
		"sim:map-kind": function () {
			var s = dims.controlSize;
			var lineWidth = dims.blockLineWidth;
			ctx.save();
			ctx.fillStyle = isPressed && isEnabled
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.lineWidth = lineWidth;
			ctx.strokeStyle = isEnabled ? "white" : "#777";
			ctx.fillStyle = isEnabled ? "white" : "#777";
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
						style: "white"
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
				? dims.controlDownColor
				: isSelected
					? dims.controlActiveColor
					: dims.controlColor;
			ctx.fillRect(0, 0,
				dims.controlSize, dims.controlSize);
			ctx.fillStyle = isSelected || isPressed ? "white" : "#777";
			ctx.fillRect(s * 0.1, s * 0.8, s * 0.8, s * 0.1);
			ctx.lineWidth = dims.blockLineWidth;
			ctx.strokeStyle = isEnabled ? "white" : "#777";
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
			ctx.save();
			ctx.fillStyle = isPressed
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0, box.width, box.height);
			ctx.beginPath();
			ctx.arc(0.5 * box.width, 0.5 * box.width, 0.25 * box.width, 0, 2 * Math.PI);
			ctx.strokeStyle = "white";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.stroke();
			ctx.restore();
		},
		"sim-event:clap": function () {
			ctx.save();
			ctx.fillStyle = isPressed
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0, box.width, box.height);
			ctx.beginPath();

			ctx.strokeStyle = "white";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.translate(0.5 * box.width, 0.5 * box.width);
			ctx.rotate(0.1);
			for (var i = 0; i < 9; i++) {
				ctx.beginPath();
				ctx.moveTo(0.12 * box.width, 0);
				ctx.lineTo(0.24 * box.width, 0);
				ctx.moveTo(0.28 * box.width, 0);
				ctx.lineTo(0.36 * box.width, 0);
				ctx.stroke();
				ctx.rotate(Math.PI / 4.5);
			}
			ctx.restore();
		},
		"sim-event:tap": function () {
			ctx.save();
			ctx.fillStyle = isPressed
				? dims.controlDownColor
				: dims.controlColor;
			ctx.fillRect(0, 0, box.width, box.height);
			ctx.beginPath();

			ctx.strokeStyle = "white";
			ctx.lineWidth = dims.blockLineWidth;
			ctx.translate(0.6 * box.width, 0.6 * box.width);
			for (var i = 1; i <= 3; i++) {
				ctx.beginPath();
				ctx.arc(0, 0,
					0.15 * box.width * i,
					Math.PI * 0.9, Math.PI * 1.7);
				ctx.stroke();
			}
			ctx.moveTo(0.3 * box.width, 0);
			ctx.lineTo(0, 0);
			ctx.lineTo(0, 0.3 * box.width);
			ctx.stroke();
			ctx.restore();
		}
	};
	draw["vpl:message-warning"] = draw["vpl:message-error"];
	draw["src:close"] = draw["vpl:close"];
	draw["src:new"] = draw["vpl:new"];
	draw["src:save"] = draw["vpl:save"];
	draw["src:load"] = draw["vpl:load"];
	draw["src:run"] = draw["vpl:run"];
	draw["src:stop"] = draw["vpl:stop"];
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
	case "vpl:message":
		return {
			xmin: 0,
			xmax: 5 * dims.controlSize,
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