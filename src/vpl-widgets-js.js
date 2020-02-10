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

Drawing of widgets defined in JavaScript.

*/

/** @const
	@type {Object.<string,A3a.vpl.Canvas.drawWidget>}
*/
A3a.vpl.widgetsJS = {
	"vpl:then": /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims, box) {
		var s = Math.min(box.width, box.height);
		ctx.strokeStyle = dims.ruleMarks;
		ctx.lineWidth = 0.2 * s;
		ctx.beginPath();
		ctx.moveTo(-0.25 * s, -0.5 * s);
		ctx.lineTo(0.25 * s, 0);
		ctx.lineTo(-0.25 * s, 0.5 * s);
		ctx.stroke();
	}),
	"vpl:error": /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims, box) {
		// pink circled question mark
		var s = Math.min(box.width, box.height);
		ctx.fillStyle = "white";
		ctx.strokeStyle = dims.errorColor;
		ctx.lineWidth = s * 0.07;
		ctx.beginPath();
		ctx.arc(0, 0, s * 0.5, 0, 2 * Math.PI);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = dims.errorColor;
		ctx.font = "bold " + Math.round(s * 0.75).toString() + "px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("?", 0, s * 0.05);
	}),
	"vpl:warning": /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims, box) {
			// pink circled exclamation mark
		var s = Math.min(box.width, box.height);
		ctx.fillStyle = "white";
		ctx.strokeStyle = dims.warningColor;
		ctx.lineWidth = s * 0.07;
		ctx.beginPath();
		ctx.arc(0, 0, s * 0.5, 0, 2 * Math.PI);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = dims.warningColor;
		ctx.font = "bold " + Math.round(s * 0.75).toString() + "px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("!", 0, s * 0.05);
	}),
	"vpl:moreHigh": /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims, box) {
		// upward chevron
		var s = Math.min(box.width, box.height);
		ctx.beginPath();
		ctx.moveTo(-0.2 * s, 0.1 * s);
		ctx.lineTo(0, -0.1 * s);
		ctx.lineTo(0.2 * s, 0.1 * s);
		ctx.lineWidth = s * 0.1;
		ctx.strokeStyle = "black";
		ctx.shadowColor = "white";
		ctx.shadowBlur = s * 0.2;
		ctx.stroke();
	}),
	"vpl:moreLow": /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims, box) {
		// downward chevron
		var s = Math.min(box.width, box.height);
		ctx.beginPath();
		ctx.moveTo(-0.2 * s, -0.1 * s);
		ctx.lineTo(0, 0.1 * s);
		ctx.lineTo(0.2 * s, -0.1 * s);
		ctx.lineWidth = s * 0.1;
		ctx.strokeStyle = "black";
		ctx.shadowColor = "white";
		ctx.shadowBlur = s * 0.2;
		ctx.stroke();
	}),
	"vpl:customize": /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims, box) {
		var r = Math.min(box.width, box.height) / 2;	// radius of circumscribed circle of the nut
		ctx.fillStyle = dims.ruleMarks;
		A3a.vpl.Canvas.drawHexagonalNut(ctx, 0, 0, r);
	})
};
