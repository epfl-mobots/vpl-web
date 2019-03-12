/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** CSS parser with support for boxes with margin, padding, and style
	@constructor
	@extends {CSSParser}
*/
CSSParser.Box = function () {
	CSSParser.call(this);

	/** @type {Array.<string>} */
	this.elements = [];

	this.rules = [];

	/** @type {Array.<string>} */
	this.borderStyles = [
		"none",
		"hidden",
		"dotted",
		"dashed",
		"solid",
		"double"
	];

	this.defaultBox = CSSParser.Box.Rect.defaultBox();
};
CSSParser.Box.prototype = Object.create(CSSParser.prototype);
CSSParser.Box.prototype.constructor = CSSParser.Box;

/** Add the tag of a supported element
	@param {string} tag
	@return {void}
*/
CSSParser.Box.prototype.addElement = function (tag) {
	this.elements.push(tag);
};

/** Convert generic css properties in rawRules to box-specific properties
	@return {void}
*/
CSSParser.Box.prototype.defineBoxProperties = function () {
	for (var i = 0; i < this.rawRules.length; i++) {
		var rect = new CSSParser.Box.Rect();
		rect.setProperties(this.rawRules[i].properties);
		this.rules.push({
			selector: this.rawRules[i].selector,
			rect: rect
		});
	}
};

/**
	@inheritDoc
*/
CSSParser.Box.prototype.processValue = function (key, val) {
	var self = this;

	/** Check if valid length
		@param {string} val
		@return {boolean}
	*/
	function isLength(val) {
		try {
			self.convertLength(val);
		} catch (e) {
			return false;
		}
		return true;
	}

	/** Check if valid color
		@param {string} val
		@return {boolean}
	*/
	function isColor(val) {
		return CSSParser.colorDict.hasOwnProperty(val) ||
			/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val);
	}

	/** Check if valid style
		@param {string} val
		@return {boolean}
	*/
	function isStyle(val) {
		return self.borderStyles.indexOf(val) >= 0;
	}

	switch (key) {
	case "margin-left":
	case "margin-right":
	case "margin-top":
	case "margin-bottom":
	case "padding-left":
	case "padding-right":
	case "padding-top":
	case "padding-bottom":
	case "border-left-width":
	case "border-right-width":
	case "border-top-width":
	case "border-bottom-width":
	case "width":
	case "height":
		// one length value
		return this.convertLength(val);
	case "margin":
	case "padding":
	case "border-width":
		// convert to [top, right, bottom, left]
		var lengths = val
			.replace(/ +/g, " ")
			.split(" ")
			.map(function (val1) { return self.convertLength(val1); });
		switch (lengths.length) {
		case 1:	// all sides
			return [lengths[0], lengths[0], lengths[0], lengths[0]];
		case 2:	// top/bottom, left/right
			return [lengths[0], lengths[1], lengths[0], lengths[1]];
		case 3:	// top, left/right, bottom
			return [lengths[0], lengths[1], lengths[2], lengths[1]];
		case 4:
			return lengths;
		default:
			throw "Wrong number of lengths";
		}
	case "border-left-style":
	case "border-right-style":
	case "border-top-style":
	case "border-bottom-style":
		if (!isStyle(val)) {
			throw "Unknown border style";
		}
		return val;
	case "border-left-color":
	case "border-right-color":
	case "border-top-color":
	case "border-bottom-color":
	case "background-color":
	case "background":	// only color is supported
		if (!isColor(val)) {
			throw "Unknown border color";
		}
		return val;
	case "border-left":
	case "border-right":
	case "border-top":
	case "border-bottom":
	case "border":
		// find what is what
		/** @type {?string} */
		var color = null;
		/** @type {?string} */
		var style = null;
		/** @type {?number} */
		var width = null;
		val
			.replace(/ +/g, " ")
			.split(" ")
			.forEach(function (val1) {
				if (isColor(val1)) {
					color = val1;
				} else if (isStyle(val1)) {
					style = val1;
				} else if (isLength(val1)) {
					width = self.convertLength(val1);
				} else {
					throw "Illegal border property";
				}
			});
		return {
			color: color,
			style: style === null && (color || width) ? "solid" : style,
			width: width === null && (color || style) ? 1 : width
		};
	case "border-top-left-radius":
	case "border-top-right-radius":
	case "border-bottom-right-radius":
	case "border-bottom-left-radius":
		// convert to [rx, ry]
		var r = val
			.replace(/ +/g, " ")
			.split(" ")
			.map(function (val1) { return self.convertLength(val1); });
		switch (r.length) {
		case 1:	// circle
			return [r[0], r[0]];
		case 2:	// ellipse
			return r;
		default:
			throw "Wrong number of radii";
		}
	case "border-radius":
		// convert to 8 radii:
		// 0-3=rx for top-left, top-right, bottom-right and bottom-left
		// 4-7=ry for top-left, top-right, bottom-right and bottom-left
		var rr = val
			.split("/")
			.map(function (part) {
				var r = part
					.replace(/ +/g, " ")
					.split(" ")
					.map(function (val1) { return val1 === "/" ? "/" : self.convertLength(val1); });
				switch (r.length) {
				case 1:	// same for 4 corners
					return [r[0], r[0], r[0], r[0]];
				case 2:	// top-left-and-bottom-right, top-right-and-bottom-left
					return [r[0], r[1], r[0], r[1]];
				case 3:	// top-left, top-right-and-bottom-left, bottom-right
					return [r[0], r[1], r[2], r[1]];
				case 4:
					return r;
				default:
					throw "Wrong number of radii";
				}
			});
		switch (rr.length) {
		case 1:	// rx
			return rr[0].concat(rr[0]);
		case 2:	// rx, ry
			return rr[0].concat(rr[1]);
		default:
			throw "Wrong number of radius dimensions";
		}
	default:
		return val;
	}
};

/** Get box by tag name, or default box
	@param {CSSParser.Selector.Options} opt
	@return {!CSSParser.Box.Rect}
*/
CSSParser.Box.prototype.getBox = function (opt) {
	/** @type {CSSParser.Box.Rect} */
	var box = null;
	for (var i = 0; i < this.rules.length; i++) {
		if (this.rules[i].selector.match(opt)) {
			box = box ? box.merge(this.rules[i].rect) : this.rules[i].rect.copy();
		}
	}
	return box ? this.defaultBox.merge(box) : this.defaultBox.copy();
};

/**
	@constructor
	@param {number=} width content width (default: 0)
	@param {number=} height content height (default: 0)
	@param {number=} x content left position (default: 0)
	@param {number=} y content top position (default: 0)
*/
CSSParser.Box.Rect = function (width, height, x, y) {
	this.width = width || 0;
	this.height = height || 0;
	this.x = x || 0;
	this.y = y || 0;

	this.marginLeft = null;
	this.marginRight = null;
	this.marginTop = null;
	this.marginBottom = null;

	this.sameBorder = true;
	this.roundedCorners = false;

	this.borderLeftWidth = null;
	this.borderRightWidth = null;
	this.borderTopWidth = null;
	this.borderBottomWidth = null;

	this.borderLeftStyle = null;
	this.borderRightStyle = null;
	this.borderTopStyle = null;
	this.borderBottomStyle = null;

	this.borderLeftColor = null;
	this.borderRightColor = null;
	this.borderTopColor = null;
	this.borderBottomColor = null;

	this.borderTopLeftRadii = null;
	this.borderTopRightRadii = null;
	this.borderBottomRightRadii = null;
	this.borderBottomLeftRadii = null;

	this.paddingLeft = null;
	this.paddingRight = null;
	this.paddingTop = null;
	this.paddingBottom = null;

	this.backgroundColor = null;
};

CSSParser.Box.Rect.defaultBox = function () {
	var box = new CSSParser.Box.Rect();
	box.x = 0;
	box.y = 0;
	box.width = 0;
	box.height = 0;

	box.marginLeft = 0;
	box.marginRight = 0;
	box.marginTop = 0;
	box.marginBottom = 0;

	box.borderLeftWidth = 0;
	box.borderRightWidth = 0;
	box.borderTopWidth = 0;
	box.borderBottomWidth = 0;

	box.borderLeftStyle = "none";
	box.borderRightStyle = "none";
	box.borderTopStyle = "none";
	box.borderBottomStyle = "none";

	box.borderLeftColor = "black";
	box.borderRightColor = "black";
	box.borderTopColor = "black";
	box.borderBottomColor = "black";

	box.borderTopLeftRadii = [0, 0];
	box.borderTopRightRadii = [0, 0];
	box.borderBottomRightRadii = [0, 0];
	box.borderBottomLeftRadii = [0, 0];

	box.paddingLeft = 0;
	box.paddingRight = 0;
	box.paddingTop = 0;
	box.paddingBottom = 0;

	box.backgroundColor = "transparent";

	return box;
};

/** Set the position of the top-left corner of the total box including margins
	@param {number} left
	@param {number} top
	@return {void}
*/
CSSParser.Box.Rect.prototype.setPosition = function (left, top) {
	this.x = left + this.offsetLeft();
	this.y = top + this.offsetTop();
};

/** Get the total width of the box, including margin and padding
	@return {number}
*/
CSSParser.Box.Rect.prototype.totalWidth = function () {
	return this.width + this.nonContentWidth();
};

/** Get the total height of the box, including margin and padding
	@return {number}
*/
CSSParser.Box.Rect.prototype.totalHeight = function () {
	return this.height + this.nonContentHeight();
};

/** Set the total width of the box, including margin and padding
	@param {number} totalWidth
	@return {void}
*/
CSSParser.Box.Rect.prototype.setTotalWidth = function (totalWidth) {
	this.width = totalWidth -
		(this.marginLeft + this.paddingLeft +
			this.paddingRight + this.marginRight);
};

/** Set the total height of the box, including margin and padding
	@param {number} totalHeight
	@return {void}
*/
CSSParser.Box.Rect.prototype.setTotalHeight = function (totalHeight) {
	this.height = totalHeight -
		(this.marginTop + this.paddingTop +
			this.paddingBottom + this.marginBottom);
};

/** Set the properties from those obtained from css
	@param {Object} props css properties
	@return {void}
*/
CSSParser.Box.Rect.prototype.setProperties = function (props) {
	for (var key in props) {
		switch (key) {
		case "margin-left":
			this.marginLeft = props[key];
			break;
		case "margin-right":
			this.marginRight = props[key];
			break;
		case "margin-top":
			this.marginTop = props[key];
			break;
		case "margin-bottom":
			this.marginBottom = props[key];
			break;
		case "border-left-width":
			this.borderLeftWidth = props[key];
			this.sameBorder = false;
			break;
		case "border-right-width":
			this.borderRightWidth = props[key];
			this.sameBorder = false;
			break;
		case "border-top-width":
			this.borderTopWidth = props[key];
			this.sameBorder = false;
			break;
		case "border-bottom-width":
			this.borderBottomWidth = props[key];
			this.sameBorder = false;
			break;
		case "padding-left":
			this.paddingLeft = props[key];
			break;
		case "padding-right":
			this.paddingRight = props[key];
			break;
		case "padding-top":
			this.paddingTop = props[key];
			break;
		case "padding-bottom":
			this.paddingBottom = props[key];
			break;
		case "margin":
			this.marginTop = props[key][0];
			this.marginRight = props[key][1];
			this.marginBottom = props[key][2];
			this.marginLeft = props[key][3];
			break;
		case "border-width":
			this.borderTopWidth = props[key][0];
			this.borderRightWidth = props[key][1];
			this.borderBottomWidth = props[key][2];
			this.borderLeftWidth = props[key][3];
			break;
		case "padding":
			this.paddingTop = props[key][0];
			this.paddingRight = props[key][1];
			this.paddingBottom = props[key][2];
			this.paddingLeft = props[key][3];
			break;
		case "border-left-style":
			this.borderLeftStyle = props[key];
			this.sameBorder = false;
			break;
		case "border-right-style":
			this.borderRightStyle = props[key];
			this.sameBorder = false;
			break;
		case "border-top-style":
			this.borderTopStyle = props[key];
			this.sameBorder = false;
			break;
		case "border-bottom-style":
			this.borderBottomStyle = props[key];
			this.sameBorder = false;
			break;
		case "border-left-color":
			this.borderLeftColor = props[key];
			this.sameBorder = false;
			break;
		case "border-right-color":
			this.borderRightColor = props[key];
			this.sameBorder = false;
			break;
		case "border-top-color":
			this.borderTopColor = props[key];
			this.sameBorder = false;
			break;
		case "border-bottom-color":
			this.borderBottomColor = props[key];
			this.sameBorder = false;
			break;
		case "border-left":
			if (props[key].color !== null) {
				this.borderLeftColor = /** @type {string} */(props[key].color);
			}
			if (props[key].style !== null) {
				this.borderLeftStyle = /** @type {string} */(props[key].style);
			}
			if (props[key].width !== null) {
				this.borderLeftWidth = /** @type {number} */(props[key].width);
			}
			this.sameBorder = false;
			break;
		case "border-right":
			if (props[key].color !== null) {
				this.borderRightColor = /** @type {string} */(props[key].color);
			}
			if (props[key].style !== null) {
				this.borderRightStyle = /** @type {string} */(props[key].style);
			}
			if (props[key].width !== null) {
				this.borderRightWidth = /** @type {number} */(props[key].width);
			}
			this.sameBorder = false;
			break;
		case "border-top":
			if (props[key].color !== null) {
				this.borderTopColor = /** @type {string} */(props[key].color);
			}
			if (props[key].style !== null) {
				this.borderTopStyle = /** @type {string} */(props[key].style);
			}
			if (props[key].width !== null) {
				this.borderTopWidth = /** @type {number} */(props[key].width);
			}
			this.sameBorder = false;
			break;
		case "border-bottom":
			if (props[key].color !== null) {
				this.borderBottomColor = /** @type {string} */(props[key].color);
			}
			if (props[key].style !== null) {
				this.borderBottomStyle = /** @type {string} */(props[key].style);
			}
			if (props[key].width !== null) {
				this.borderBottomWidth = /** @type {number} */(props[key].width);
			}
			this.sameBorder = false;
			break;
		case "border":
			if (props[key].color !== null) {
				this.borderLeftColor =
					this.borderRightColor =
					this.borderTopColor =
					this.borderBottomColor =
					/** @type {string} */(props[key].color);
			}
			if (props[key].style !== null) {
				this.borderLeftStyle =
					this.borderRightStyle =
					this.borderTopStyle =
					this.borderBottomStyle =
					/** @type {string} */(props[key].style);
			}
			if (props[key].width !== null) {
				this.borderLeftWidth =
					this.borderRightWidth =
					this.borderTopWidth =
					this.borderBottomWidth =
					/** @type {number} */(props[key].width);
			}
			this.sameBorder = true;
			break;
		case "border-top-left-radius":
			this.borderTopLeftRadii = props[key];
			if (this.borderTopLeftRadii[0] > 0 || this.borderTopLeftRadii[1] > 0) {
				this.roundedCorners = true;
			}
			break;
		case "border-top-right-radius":
			this.borderTopRightRadii = props[key];
			if (this.borderTopLeftRadii[0] > 0 || this.borderTopLeftRadii[1] > 0) {
				this.roundedCorners = true;
			}
			break;
		case "border-bottom-right-radius":
			this.borderBottomRightRadii = props[key];
			if (this.borderTopLeftRadii[0] > 0 || this.borderTopLeftRadii[1] > 0) {
				this.roundedCorners = true;
			}
			break;
		case "border-bottom-left-radius":
			this.borderBottomLeftRadii = props[key];
			if (this.borderTopLeftRadii[0] > 0 || this.borderTopLeftRadii[1] > 0) {
				this.roundedCorners = true;
			}
			break;
		case "border-radius":
			this.borderTopLeftRadii = [props[key][0], props[key][4]];
			this.borderTopRightRadii = [props[key][1], props[key][5]];
			this.borderBottomRightRadii = [props[key][2], props[key][6]];
			this.borderBottomLeftRadii = [props[key][3], props[key][7]];
			for (var i = 0; i < props[key].length; i++) {
				if (props[key][i] > 0) {
					this.roundedCorners = true;
				}
			}
			break;
		case "background-color":
		case "background":	// color is the only supported property
			this.backgroundColor = props[key];
			break;
		case "width":
			this.width = props[key];
			break;
		case "height":
			this.height = props[key];
			break;
		}
	}
};

/** Create copy where some properties are overridden
	@return {CSSParser.Box.Rect}
*/
CSSParser.Box.Rect.prototype.copy = function () {
	var box = new CSSParser.Box.Rect();

	box.width = this.width;
	box.height = this.height;
	box.x = this.x;
	box.y = this.y;

	box.marginLeft = this.marginLeft;
	box.marginRight = this.marginRight;
	box.marginTop = this.marginTop;
	box.marginBottom = this.marginBottom;

	box.sameBorder = this.sameBorder;
	box.roundedCorners = this.roundedCorners;

	box.borderLeftWidth = this.borderLeftWidth;
	box.borderRightWidth = this.borderRightWidth;
	box.borderTopWidth = this.borderTopWidth;
	box.borderBottomWidth = this.borderBottomWidth;

	box.borderLeftStyle = this.borderLeftStyle;
	box.borderRightStyle = this.borderRightStyle;
	box.borderTopStyle = this.borderTopStyle;
	box.borderBottomStyle = this.borderBottomStyle;

	box.borderLeftColor = this.borderLeftColor;
	box.borderRightColor = this.borderRightColor;
	box.borderTopColor = this.borderTopColor;
	box.borderBottomColor = this.borderBottomColor;

	box.borderTopLeftRadii = this.borderTopLeftRadii;
	box.borderTopRightRadii = this.borderTopRightRadii;
	box.borderBottomRightRadii = this.borderBottomRightRadii;
	box.borderBottomLeftRadii = this.borderBottomLeftRadii;

	box.paddingLeft = this.paddingLeft;
	box.paddingRight = this.paddingRight;
	box.paddingTop = this.paddingTop;
	box.paddingBottom = this.paddingBottom;

	box.backgroundColor = this.backgroundColor;

	return box;
};

/** Create copy where some properties are overridden
	@param {CSSParser.Box.Rect} overridingBox
	@return {CSSParser.Box.Rect}
*/
CSSParser.Box.Rect.prototype.merge = function (overridingBox) {
	var box = this.copy();

	if (overridingBox.width !== null) {
		box.width = overridingBox.width;
	}
	if (overridingBox.height !== null) {
		box.height = overridingBox.height;
	}
	if (overridingBox.x !== null) {
		box.x = overridingBox.x;
	}
	if (overridingBox.y !== null) {
		box.y = overridingBox.y;
	}

	if (overridingBox.marginLeft !== null) {
		box.marginLeft = overridingBox.marginLeft;
	}
	if (overridingBox.marginRight !== null) {
		box.marginRight = overridingBox.marginRight;
	}
	if (overridingBox.marginTop !== null) {
		box.marginTop = overridingBox.marginTop;
	}
	if (overridingBox.marginBottom !== null) {
		box.marginBottom = overridingBox.marginBottom;
	}

	box.sameBorder = box.sameBorder && overridingBox.sameBorder;
	box.roundedCorners = box.roundedCorners || overridingBox.roundedCorners;

	if (overridingBox.borderLeftWidth !== null) {
		box.borderLeftWidth = overridingBox.borderLeftWidth;
	}
	if (overridingBox.borderRightWidth !== null) {
		box.borderRightWidth = overridingBox.borderRightWidth;
	}
	if (overridingBox.borderTopWidth !== null) {
		box.borderTopWidth = overridingBox.borderTopWidth;
	}
	if (overridingBox.borderBottomWidth !== null) {
		box.borderBottomWidth = overridingBox.borderBottomWidth;
	}

	if (overridingBox.borderLeftStyle !== null) {
		box.borderLeftStyle = overridingBox.borderLeftStyle;
	}
	if (overridingBox.borderRightStyle !== null) {
		box.borderRightStyle = overridingBox.borderRightStyle;
	}
	if (overridingBox.borderTopStyle !== null) {
		box.borderTopStyle = overridingBox.borderTopStyle;
	}
	if (overridingBox.borderBottomStyle !== null) {
		box.borderBottomStyle = overridingBox.borderBottomStyle;
	}

	if (overridingBox.borderLeftColor !== null) {
		box.borderLeftColor = overridingBox.borderLeftColor;
	}
	if (overridingBox.borderRightColor !== null) {
		box.borderRightColor = overridingBox.borderRightColor;
	}
	if (overridingBox.borderTopColor !== null) {
		box.borderTopColor = overridingBox.borderTopColor;
	}
	if (overridingBox.borderBottomColor !== null) {
		box.borderBottomColor = overridingBox.borderBottomColor;
	}

	if (overridingBox.borderTopLeftRadii !== null) {
		box.borderTopLeftRadii = overridingBox.borderTopLeftRadii;
	}
	if (overridingBox.borderTopRightRadii !== null) {
		box.borderTopRightRadii = overridingBox.borderTopRightRadii;
	}
	if (overridingBox.borderBottomRightRadii !== null) {
		box.borderBottomRightRadii = overridingBox.borderBottomRightRadii;
	}
	if (overridingBox.borderBottomLeftRadii !== null) {
		box.borderBottomLeftRadii = overridingBox.borderBottomLeftRadii;
	}

	if (overridingBox.paddingLeft !== null) {
		box.paddingLeft = overridingBox.paddingLeft;
	}
	if (overridingBox.paddingRight !== null) {
		box.paddingRight = overridingBox.paddingRight;
	}
	if (overridingBox.paddingTop !== null) {
		box.paddingTop = overridingBox.paddingTop;
	}
	if (overridingBox.paddingBottom !== null) {
		box.paddingBottom = overridingBox.paddingBottom;
	}

	if (overridingBox.backgroundColor !== null) {
		box.backgroundColor = overridingBox.backgroundColor;
	}

	return box;
}

/** Calculate sum of left margin, border and padding
	@return {number}
*/
CSSParser.Box.Rect.prototype.offsetLeft = function () {
	return this.marginLeft + this.borderLeftWidth + this.paddingLeft;
};

/** Calculate additional width (left and right margin, border and padding)
	@return {number}
*/
CSSParser.Box.Rect.prototype.nonContentWidth = function () {
	return this.marginLeft + this.borderLeftWidth + this.paddingLeft +
		this.paddingRight + this.borderRightWidth + this.marginRight;
};

/** Calculate sum of top, border and padding
	@return {number}
*/
CSSParser.Box.Rect.prototype.offsetTop = function () {
	return this.marginTop + this.borderTopWidth + this.paddingTop;
};

/** Calculate additional height (top and bottom margin, border and padding)
	@return {number}
*/
CSSParser.Box.Rect.prototype.nonContentHeight = function () {
	return this.marginTop + this.borderTopWidth + this.paddingTop +
		this.paddingBottom + this.borderBottomWidth + this.marginBottom;
};

/** Calculate padding width (left and right padding)
	@return {number}
*/
CSSParser.Box.Rect.prototype.paddingWidth = function () {
	return this.paddingLeft + this.paddingRight;
};

/** Calculate padded width (width plus left and right padding)
	@return {number}
*/
CSSParser.Box.Rect.prototype.paddedWidth = function () {
	return this.width + this.paddingLeft + this.paddingRight;
};

/** Calculate padding height (top and bottom padding)
	@return {number}
*/
CSSParser.Box.Rect.prototype.paddingHeight = function () {
	return this.paddingTop + this.paddingBottom;
};

/** Calculate padded height (height plus top and bottom padding)
	@return {number}
*/
CSSParser.Box.Rect.prototype.paddedHeight = function () {
	return this.height + this.paddingTop + this.paddingBottom;
};
