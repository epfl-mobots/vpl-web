/*
	Copyright 2019-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Drawing of CSS boxes and lines.

*/

CSSParser.VPL.debug = false;

/** Set line style
	@param {CanvasRenderingContext2D} ctx
	@param {?number} lineWidth
	@param {?string} color
	@param {?string} style
	@return {void}
*/
CSSParser.VPL.Box.setLineStyle = function (ctx, lineWidth, color, style) {
	ctx.strokeStyle = color || "black";
	switch (style) {
	case "dotted":
		ctx.setLineDash([2 * lineWidth, 3 * lineWidth]);
		ctx.lineDashOffset = 0;
		break;
	case "dashed":
		ctx.setLineDash([3 * lineWidth, 3 * lineWidth]);
		ctx.lineDashOffset = 0;
		break;
	}
	ctx.lineWidth = lineWidth || 0;
}

/** Draw css box at the specified position
	@param {CanvasRenderingContext2D} ctx
	@param {number} x
	@param {number} y
	@param {boolean=} includePadding true if x,y include padding
	@return {void}
*/
CSSParser.VPL.Box.prototype.drawAt = function (ctx, x, y, includePadding) {
	// add padding
	if (!includePadding) {
		x -= this.paddingLeft;
		y -= this.paddingTop;
	}

	var self = this;
	var w = this.width + this.paddingLeft + this.paddingRight;
	var h = this.height + this.paddingTop + this.paddingBottom;

	if (CSSParser.VPL.debug) {
		ctx.save();
		ctx.strokeStyle = "black";
		ctx.lineWidth = 1;
		// with padding
		ctx.strokeRect(x, y, w, h);
		// just content, without padding
		ctx.strokeRect(x + this.paddingLeft,
			y + this.paddingTop,
			this.width,
			this.height);
		// with padding and margin
		ctx.strokeRect(x - this.marginLeft,
			y - this.marginTop,
			w + this.marginLeft + this.marginRight,
			h + this.marginTop + this.marginBottom);
		ctx.restore();
	}

	/** Add a rounded rect to the path
		@return {void}
	*/
	function rrect() {
		var rx = Math.min(self.borderTopLeftRadius[0], w / 2);
		var ry = Math.min(self.borderTopLeftRadius[1], h / 2);
		ctx.moveTo(x, y + ry);
		if (self.borderTopLeftCut) {
			ctx.lineTo(x + rx, y);
		} else {
			ctx.bezierCurveTo(x, y + ry / 2, x + rx / 2, y, x + rx, y);
		}
		rx = Math.min(self.borderTopRightRadius[0], w / 2);
		ry = Math.min(self.borderTopRightRadius[1], h / 2);
		ctx.lineTo(x + w - rx, y);
		if (self.borderTopRightCut) {
			ctx.lineTo(x + w, y + ry);
		} else {
			ctx.bezierCurveTo(x + w - rx / 2, y, x + w, y + ry / 2, x + w, y + ry);
		}
		rx = Math.min(self.borderBottomRightRadius[0], w / 2);
		ry = Math.min(self.borderBottomRightRadius[1], h / 2);
		ctx.lineTo(x + w, y + h - ry);
		if (self.borderBottomRightCut) {
			ctx.lineTo(x + w - rx, y + h);
		} else {
			ctx.bezierCurveTo(x + w, y + h - ry / 2, x + w - rx / 2, y + h, x + w - rx, y + h);
		}
		rx = Math.min(self.borderBottomLeftRadius[0], w / 2);
		ry = Math.min(self.borderBottomLeftRadius[1], h / 2);
		ctx.lineTo(x + rx, y + h);
		if (self.borderBottomLeftCut) {
			ctx.lineTo(x, y + h - ry);
		} else {
			ctx.bezierCurveTo(x + rx / 2, y + h, x, y + h - ry / 2, x, y + h - ry);
		}
		ctx.closePath();
	}

	ctx.save();

	if (this.borderCornerLength > 0) {
		// clip to 4 squares of half-side borderCornerLength around corners
		ctx.beginPath();
		ctx.rect(x - this.borderCornerLength, y - this.borderCornerLength,
			2 * this.borderCornerLength, 2 * this.borderCornerLength);
		ctx.rect(x + w - this.borderCornerLength, y - this.borderCornerLength,
			2 * this.borderCornerLength, 2 * this.borderCornerLength);
		ctx.rect(x - this.borderCornerLength, y + h - this.borderCornerLength,
			2 * this.borderCornerLength, 2 * this.borderCornerLength);
		ctx.rect(x + w - this.borderCornerLength, y + h - this.borderCornerLength,
			2 * this.borderCornerLength, 2 * this.borderCornerLength);
		ctx.clip();
	}

	if (this.backdropColor !== "transparent") {
		// display filled rectangle behind box
		ctx.fillStyle = this.backdropColor;
		ctx.fillRect(x, y, w, h);
	}

	ctx.beginPath();
	if (this.roundedCorners) {
		ctx.beginPath();
		rrect();
	} else {
		ctx.rect(x, y, w, h);
	}

	ctx.save();
	if (this.shadowOffset) {
		ctx.shadowOffsetX = this.shadowOffset[0];
		ctx.shadowOffsetY = this.shadowOffset[1];
		ctx.shadowColor = this.shadowColor;
		ctx.shadowBlur = this.shadowBlurRadius;
	}
	if (this.backgroundColor) {
		ctx.fillStyle = this.backgroundColor;
	} else if (this.shadowOffset) {
		ctx.fillStyle = "transparent";
	}
	ctx.fill();
	ctx.restore();

	if (this.sameBorder) {
		if (this.borderLeftWidth > 0 && this.borderLeftColor &&
			this.borderLeftStyle !== "none" && this.borderLeftStyle !== "hidden") {
			CSSParser.VPL.Box.setLineStyle(ctx, this.borderLeftWidth, this.borderLeftColor, this.borderLeftStyle);
			if (this.borderLeftStyle === "double") {
				ctx.save();
				ctx.translate(x + w / 2, y + h / 2);
				ctx.scale((w - 3 * this.borderLeftWidth) / w, (h - 3 * this.borderLeftWidth) / h);
				ctx.translate(-x - w / 2, -y - h / 2);
				rrect();
				ctx.restore();
			}
			ctx.stroke();
		}
	} else {
		if (this.borderLeftWidth > 0 && this.borderLeftColor &&
			this.borderLeftStyle !== "none" && this.borderLeftStyle !== "hidden") {
			CSSParser.VPL.Box.setLineStyle(ctx, this.borderLeftWidth, this.borderLeftColor, this.borderLeftStyle);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y + h);
			ctx.stroke();
		}
		if (this.borderRightWidth > 0 && this.borderRightColor &&
			this.borderRightStyle !== "none" && this.borderRightStyle !== "hidden") {
			CSSParser.VPL.Box.setLineStyle(ctx, this.borderRightWidth, this.borderRightColor, this.borderRightStyle);
			ctx.beginPath();
			ctx.moveTo(x + w, y);
			ctx.lineTo(x + w, y + h);
			ctx.stroke();
		}
		if (this.borderTopWidth > 0 && this.borderTopColor &&
			this.borderTopStyle !== "none" && this.borderTopStyle !== "hidden") {
			CSSParser.VPL.Box.setLineStyle(ctx, this.borderTopWidth, this.borderTopColor, this.borderTopStyle);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + w, y);
			ctx.stroke();
		}
		if (this.borderBottomWidth > 0 && this.borderBottomColor &&
			this.borderBottomStyle !== "none" && this.borderBottomStyle !== "hidden") {
			CSSParser.VPL.Box.setLineStyle(ctx, this.borderBottomWidth, this.borderBottomColor, this.borderBottomStyle);
			ctx.beginPath();
			ctx.moveTo(x, y + h);
			ctx.lineTo(x + w, y + h);
			ctx.stroke();
		}
	}

	ctx.restore();

	// -vpl-debug
	if (CSSParser.VPL.debug && this.otherProperties["-vpl-debug"]) {
		ctx.save();
		ctx.font = "9px sans-serif";
		ctx.textAlign = "start";
		ctx.textBaseline = "top";
		ctx.fillStyle = "black";
		ctx.fillText(this.otherProperties["-vpl-debug"], x, y);
		ctx.restore();
	}
};

CSSParser.VPL.Box.prototype.draw = function (ctx) {
	this.drawAt(ctx, this.x, this.y);
};

/** Stroke css line for the current path (ignore style "double")
	@param {CanvasRenderingContext2D} ctx
	@return {void}
*/
CSSParser.VPL.Line.prototype.stroke = function (ctx) {
	ctx.save();
	if (this.shadowOffset) {
		ctx.shadowOffsetX = this.shadowOffset[0];
		ctx.shadowOffsetY = this.shadowOffset[1];
		ctx.shadowColor = this.shadowColor;
		ctx.shadowBlur = this.shadowBlurRadius;
	}
	if (this.width > 0 && this.color &&
		this.style !== "none" && this.style !== "hidden") {
		CSSParser.VPL.Box.setLineStyle(ctx, this.width, this.color, this.style);
		ctx.lineCap = this.cap;
		ctx.stroke();
	}
	ctx.restore();
};
