/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** @const */
CSSParser.Box.Rect.debug = false;

/** Draw css box at the specified position
	@param {CanvasRenderingContext2D} ctx
	@param {number} x
	@param {number} y
	@param {boolean=} includePadding true if x,y include padding
	@return {void}
*/
CSSParser.Box.Rect.prototype.drawAt = function (ctx, x, y, includePadding) {
	// add padding
	if (!includePadding) {
		x -= this.paddingLeft;
		y -= this.paddingTop;
	}

	var self = this;
	var w = this.width + this.paddingLeft + this.paddingRight;
	var h = this.height + this.paddingTop + this.paddingBottom;

	if (CSSParser.Box.Rect.debug) {
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
		var rx = Math.min(self.borderTopLeftRadii[0], w / 2);
		var ry = Math.min(self.borderTopLeftRadii[1], h / 2);
		ctx.moveTo(x, y + ry);
		ctx.bezierCurveTo(x, y + ry / 2, x + rx / 2, y, x + rx, y);
		rx = Math.min(self.borderTopRightRadii[0], w / 2);
		ry = Math.min(self.borderTopRightRadii[1], h / 2);
		ctx.lineTo(x + w - rx, y);
		ctx.bezierCurveTo(x + w - rx / 2, y, x + w, y + ry / 2, x + w, y + ry);
		rx = Math.min(self.borderBottomRightRadii[0], w / 2);
		ry = Math.min(self.borderBottomRightRadii[1], h / 2);
		ctx.lineTo(x + w, y + h - ry);
		ctx.bezierCurveTo(x + w, y + h - ry / 2, x + w - rx / 2, y + h, x + w - rx, y + h);
		rx = Math.min(self.borderBottomLeftRadii[0], w / 2);
		ry = Math.min(self.borderBottomLeftRadii[1], h / 2);
		ctx.lineTo(x + rx, y + h);
		ctx.bezierCurveTo(x + rx / 2, y + h, x, y + h - ry / 2, x, y + h - ry);
		ctx.closePath();
	}

	ctx.save();

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

	function setBorderStyle(lineWidth, color, style) {
		ctx.strokeStyle = color;
		switch (style) {
		case "dotted":
			ctx.setLineDash([2, 5]);
			ctx.lineDashOffset = 0;
			break;
		case "dashed":
			ctx.setLineDash([5, 5]);
			ctx.lineDashOffset = 0;
			break;
		}
		ctx.lineWidth = lineWidth;
	}

	if (this.sameBorder) {
		if (this.borderLeftWidth > 0 && this.borderLeftColor &&
			this.borderLeftStyle !== "none" && this.borderLeftStyle !== "hidden") {
			setBorderStyle(this.borderLeftWidth, this.borderLeftColor, this.borderLeftStyle);
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
			setBorderStyle(this.borderLeftWidth, this.borderLeftColor, this.borderLeftStyle);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y + h);
			ctx.stroke();
		}
		if (this.borderRightWidth > 0 && this.borderRightColor &&
			this.borderRightStyle !== "none" && this.borderRightStyle !== "hidden") {
			setBorderStyle(this.borderRightWidth, this.borderRightColor, this.borderRightStyle);
			ctx.beginPath();
			ctx.moveTo(x + w, y);
			ctx.lineTo(x + w, y + h);
			ctx.stroke();
		}
		if (this.borderTopWidth > 0 && this.borderTopColor &&
			this.borderTopStyle !== "none" && this.borderTopStyle !== "hidden") {
			setBorderStyle(this.borderTopWidth, this.borderTopColor, this.borderTopStyle);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + w, y);
			ctx.stroke();
		}
		if (this.borderBottomWidth > 0 && this.borderBottomColor &&
			this.borderBottomStyle !== "none" && this.borderBottomStyle !== "hidden") {
			setBorderStyle(this.borderBottomWidth, this.borderBottomColor, this.borderBottomStyle);
			ctx.beginPath();
			ctx.moveTo(x, y + h);
			ctx.lineTo(x + w, y + h);
			ctx.stroke();
		}
	}

	ctx.restore();
};

CSSParser.Box.Rect.prototype.draw = function (ctx) {
	this.drawAt(ctx, this.x, this.y);
};
