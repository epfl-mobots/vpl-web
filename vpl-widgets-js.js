/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** @const
	@type {Object.<string,A3a.vpl.Canvas.Widget>}
*/
A3a.vpl.widgetsJS = {
	"vpl:then": {
		draw: /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims) {
			ctx.fillStyle = dims.ruleMarks;
			ctx.beginPath();
			ctx.arc(0, -0.2 * dims.blockSize,
				0.08 * dims.blockSize,
				0, 2 * Math.PI);
			ctx.arc(0, 0.2 * dims.blockSize,
				0.08 * dims.blockSize,
				0, 2 * Math.PI);
			ctx.fill();
		}),
		bounds: /** @type {A3a.vpl.Canvas.getWidgetBounds} */(function (id, dims) {
			return {
				xmin: -0.1 * dims.blockSize,
				xmax: 0.1 * dims.blockSize,
				ymin: -0.5 * dims.blockSize,
				ymax: 0.5 * dims.blockSize
			}
		})
	},
	"vpl:error": {
		draw: /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims) {
			// pink circled question mark
			ctx.fillStyle = "white";
			ctx.strokeStyle = dims.errorColor;
			ctx.lineWidth = dims.blockSize * 0.05;
			ctx.beginPath();
			ctx.arc(0, 0,
				dims.blockSize * 0.2,
				0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = dims.errorColor;
			ctx.font = "bold " + Math.round(dims.blockSize * 0.3).toString() + "px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("?", 0, dims.blockSize * 0.02);
		}),
		bounds: /** @type {A3a.vpl.Canvas.getWidgetBounds} */(function (id, dims) {
			return {
				xmin: -0.3 * dims.blockSize,
				xmax: 0.3 * dims.blockSize,
				ymin: -0.2 * dims.blockSize,
				ymax: 0.2 * dims.blockSize
			}
		})
	},
	"vpl:warning": {
		draw: /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims) {
			// pink circled exclamation mark
			ctx.fillStyle = "white";
			ctx.strokeStyle = dims.warningColor;
			ctx.lineWidth = dims.blockSize * 0.05;
			ctx.beginPath();
			ctx.arc(0, 0,
				dims.blockSize * 0.2,
				0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = dims.warningColor;
			ctx.font = "bold " + Math.round(dims.blockSize * 0.3).toString() + "px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("!", 0, dims.blockSize * 0.02);
		}),
		bounds: /** @type {A3a.vpl.Canvas.getWidgetBounds} */(function (id, dims) {
			return {
				xmin: -0.3 * dims.blockSize,
				xmax: 0.3 * dims.blockSize,
				ymin: -0.2 * dims.blockSize,
				ymax: 0.2 * dims.blockSize
			}
		})
	},
	"vpl:moreHigh": {
		draw: /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims) {
			// upward chevron
			ctx.beginPath();
			ctx.moveTo(-0.2 * dims.blockSize, 0.1 * dims.blockSize);
			ctx.lineTo(0, -0.1 * dims.blockSize);
			ctx.lineTo(0.2 * dims.blockSize, 0.1 * dims.blockSize);
			ctx.lineWidth = dims.blockSize * 0.1;
			ctx.strokeStyle = "black";
			ctx.shadowColor = "white";
			ctx.shadowBlur = dims.blockSize * 0.2;
			ctx.stroke();
		}),
		bounds: /** @type {A3a.vpl.Canvas.getWidgetBounds} */(function (id, dims) {
			return {
				xmin: -0.3 * dims.blockSize,
				xmax: 0.3 * dims.blockSize,
				ymin: -0.2 * dims.blockSize,
				ymax: 0.2 * dims.blockSize
			}
		})
	},
	"vpl:moreLow": {
		draw: /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims) {
			// downward chevron
			ctx.beginPath();
			ctx.moveTo(-0.2 * dims.blockSize, -0.1 * dims.blockSize);
			ctx.lineTo(0, 0.1 * dims.blockSize);
			ctx.lineTo(0.2 * dims.blockSize, -0.1 * dims.blockSize);
			ctx.lineWidth = dims.blockSize * 0.1;
			ctx.strokeStyle = "black";
			ctx.shadowColor = "white";
			ctx.shadowBlur = dims.blockSize * 0.2;
			ctx.stroke();
		}),
		bounds: /** @type {A3a.vpl.Canvas.getWidgetBounds} */(function (id, dims) {
			return {
				xmin: -0.3 * dims.blockSize,
				xmax: 0.3 * dims.blockSize,
				ymin: -0.2 * dims.blockSize,
				ymax: 0.2 * dims.blockSize
			}
		})
	}
};
