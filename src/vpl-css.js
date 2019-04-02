/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** CSS parser with support for VPL properties (boxes, lines, text)
	@constructor
	@extends {CSSParser}
*/
CSSParser.VPL = function () {
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
};
CSSParser.VPL.prototype = Object.create(CSSParser.prototype);
CSSParser.VPL.prototype.constructor = CSSParser.VPL;

/** Add the tag of a supported element
	@param {string} tag
	@return {void}
*/
CSSParser.VPL.prototype.addElement = function (tag) {
	this.elements.push(tag);
};

/** Convert generic css properties in rawRules to vpl-specific properties
	for box, line, etc.
	@return {void}
*/
CSSParser.VPL.prototype.defineProperties = function () {
	for (var i = 0; i < this.rawRules.length; i++) {
		var props = new CSSParser.VPL.Properties();
		props.setProperties(this.rawRules[i].properties);
		this.rules.push({
			selector: this.rawRules[i].selector,
			props: props
		});
	}
};

/**
	@inheritDoc
*/
CSSParser.VPL.prototype.processValue = function (key, val) {
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
	case "line-width":
	case "width":
	case "height":
	case "min-width":
	case "min-height":
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
	case "line-style":
		if (!isStyle(val)) {
			throw "Unknown border style";
		}
		return val;
	case "border-left-color":
	case "border-right-color":
	case "border-top-color":
	case "border-bottom-color":
	case "color":
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
	case "line":
		// find what is what
		/** @type {?string} */
		var color = null;
		/** @type {?string} */
		var style = null;
		/** @type {?CSSParser.Length} */
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
			width: width === null && (color || style) ? new CSSParser.Length(1) : width
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
	case "box-shadow":
	case "line-shadow":
		val = val.split(",")[0];	// use first shadow only; inset not supported
		var valArr = val.replace(/ +/g, " ")
			.split(" ");
		if (valArr[0] === "inset") {
			valArr = valArr.slice(1);
		}
		if (valArr.length >= 3 && valArr.length <= 5) {
			return {
				offset: [
					this.convertLength(valArr[0]),
					this.convertLength(valArr[1])
				],
				color: valArr[valArr.length - 1],
				blurRadius: valArr.length >= 4 ? this.convertLength(valArr[2]) : null,
				spreadRadius: valArr.length >= 5 ? this.convertLength(valArr[3]) : null
			}
		}
		return {};
	default:
		return val;
	}
};

/** Get properties specified by selector
	@param {CSSParser.Selector.Options} opt
*/
CSSParser.VPL.prototype.getProperties = function (opt) {
	/** @type {CSSParser.VPL.Properties} */
	var props = null;
	for (var i = 0; i < this.rules.length; i++) {
		if (this.rules[i].selector.match(opt)) {
			props = props ? props.merge(this.rules[i].props) : this.rules[i].props.copy();
		}
	}

	// Convert CSSParser.Length properties to numeric values
	for (var key in props) {
		if (props.hasOwnProperty(key) && props[key] instanceof CSSParser.Length) {
			props[key] = props[key].toValue(this.lengthBase);
		}
	}

	return props;
};

/** Get box specified by selector
	@param {CSSParser.Selector.Options} opt
	@return {!CSSParser.VPL.Box}
*/
CSSParser.VPL.prototype.getBox = function (opt) {
	var props = this.getProperties(opt);
	return new CSSParser.VPL.Box(props, this.lengthBase);
};

/** Get line specified by selector
	@param {CSSParser.Selector.Options} opt
	@return {!CSSParser.VPL.Line}
*/
CSSParser.VPL.prototype.getLine = function (opt) {
	var props = this.getProperties(opt);
	return new CSSParser.VPL.Line(props, this.lengthBase);
};

/**
	@constructor
*/
CSSParser.VPL.Properties = function () {
	this.properties = {};
};

/** Set the properties from those obtained from css
	@param {Object} props css properties
	@return {void}
*/
CSSParser.VPL.Properties.prototype.setProperties = function (props) {
	for (var key in props) {
		if (props.hasOwnProperty(key)) {
			this.properties[key] = props[key];
		}
	}
};

/** Create copy
	@return {CSSParser.VPL.Properties}
*/
CSSParser.VPL.Properties.prototype.copy = function () {
	var props = new CSSParser.VPL.Properties();
	props.setProperties(this.properties);
	return props;
};

/** Create copy where some properties are overridden
	@param {CSSParser.VPL.Properties} overridingProps
	@return {CSSParser.VPL.Properties}
*/
CSSParser.VPL.Properties.prototype.merge = function (overridingProps) {
	var props = this.copy();
	for (var key in overridingProps.properties) {
		if (overridingProps.properties.hasOwnProperty(key)) {
			props.properties[key] = overridingProps.properties[key];
		}
	}
	return props;
};

/**
	@constructor
	@param {CSSParser.VPL.Properties=} props
	@param {CSSParser.LengthBase=} lengthBase
*/
CSSParser.VPL.Box = function (props, lengthBase) {
	this.width = 0;
	this.height = 0;
	this.x = 0;
	this.y = 0;

	this.marginLeft = 0;
	this.marginRight = 0;
	this.marginTop = 0;
	this.marginBottom = 0;

	this.sameBorder = true;
	this.roundedCorners = false;

	this.borderLeftWidth = 0;
	this.borderRightWidth = 0;
	this.borderTopWidth = 0;
	this.borderBottomWidth = 0;

	this.borderLeftStyle = "none";
	this.borderRightStyle = "none";
	this.borderTopStyle = "none";
	this.borderBottomStyle = "none";

	this.borderLeftColor = "black";
	this.borderRightColor = "black";
	this.borderTopColor = "black";
	this.borderBottomColor = "black";

	this.borderTopLeftRadius = [0, 0];
	this.borderTopRightRadius = [0, 0];
	this.borderBottomRightRadius = [0, 0];
	this.borderBottomLeftRadius = [0, 0];

	this.paddingLeft = 0;
	this.paddingRight = 0;
	this.paddingTop = 0;
	this.paddingBottom = 0;

	this.backgroundColor = "transparent";
	this.color = "black";

	this.font = "10px sans-serif";

	this.shadowOffset = null;
	this.shadowBlurRadius = 0;
	this.shadowSpreadRadius = 0;
	this.shadowColor = null;

	if (props) {
		this.setProperties(props.properties, /** @type {CSSParser.LengthBase} */(lengthBase));
	}
};
CSSParser.VPL.Box.prototype = Object.create(CSSParser.VPL.Properties.prototype);
CSSParser.VPL.Box.prototype.constructor = CSSParser.VPL.Box;

/** Set the properties from those obtained from css
	@param {Object} props css properties
	@param {CSSParser.LengthBase} lengthBase
	@return {void}
*/
CSSParser.VPL.Box.prototype.setProperties = function (props, lengthBase) {
	var width = -1;
	var height = -1;
	for (var key in props) {
		switch (key) {
		case "margin-left":
			this.marginLeft = props[key].toValue(lengthBase);
			break;
		case "margin-right":
			this.marginRight = props[key].toValue(lengthBase);
			break;
		case "margin-top":
			this.marginTop = props[key].toValue(lengthBase);
			break;
		case "margin-bottom":
			this.marginBottom = props[key].toValue(lengthBase);
			break;
		case "border-left-width":
			this.borderLeftWidth = props[key].toValue(lengthBase);
			this.sameBorder = false;
			break;
		case "border-right-width":
			this.borderRightWidth = props[key].toValue(lengthBase);
			this.sameBorder = false;
			break;
		case "border-top-width":
			this.borderTopWidth = props[key].toValue(lengthBase);
			this.sameBorder = false;
			break;
		case "border-bottom-width":
			this.borderBottomWidth = props[key].toValue(lengthBase);
			this.sameBorder = false;
			break;
		case "padding-left":
			this.paddingLeft = props[key].toValue(lengthBase);
			break;
		case "padding-right":
			this.paddingRight = props[key].toValue(lengthBase);
			break;
		case "padding-top":
			this.paddingTop = props[key].toValue(lengthBase);
			break;
		case "padding-bottom":
			this.paddingBottom = props[key].toValue(lengthBase);
			break;
		case "margin":
			this.marginTop = props[key][0].toValue(lengthBase);
			this.marginRight = props[key][1].toValue(lengthBase);
			this.marginBottom = props[key][2].toValue(lengthBase);
			this.marginLeft = props[key][3].toValue(lengthBase);
			break;
		case "border-width":
			this.borderTopWidth = props[key][0].toValue(lengthBase);
			this.borderRightWidth = props[key][1].toValue(lengthBase);
			this.borderBottomWidth = props[key][2].toValue(lengthBase);
			this.borderLeftWidth = props[key][3].toValue(lengthBase);
			break;
		case "padding":
			this.paddingTop = props[key][0].toValue(lengthBase);
			this.paddingRight = props[key][1].toValue(lengthBase);
			this.paddingBottom = props[key][2].toValue(lengthBase);
			this.paddingLeft = props[key][3].toValue(lengthBase);
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
				this.borderLeftWidth = /** @type {number} */(props[key].width.toValue(lengthBase));
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
				this.borderRightWidth = /** @type {number} */(props[key].width.toValue(lengthBase));
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
				this.borderTopWidth = /** @type {number} */(props[key].width.toValue(lengthBase));
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
				this.borderBottomWidth = /** @type {number} */(props[key].width.toValue(lengthBase));
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
					/** @type {number} */(props[key].width.toValue(lengthBase));
			}
			this.sameBorder = true;
			break;
		case "border-top-left-radius":
			this.borderTopLeftRadius = props[key].map(function (l) { return l.toValue(lengthBase); });
			this.roundedCorners = true;
			break;
		case "border-top-right-radius":
			this.borderTopRightRadius = props[key].map(function (l) { return l.toValue(lengthBase); });
			this.roundedCorners = true;
			break;
		case "border-bottom-right-radius":
			this.borderBottomRightRadius = props[key].map(function (l) { return l.toValue(lengthBase); });
			this.roundedCorners = true;
			break;
		case "border-bottom-left-radius":
			this.borderBottomLeftRadius = props[key].map(function (l) { return l.toValue(lengthBase); });
			this.roundedCorners = true;
			break;
		case "border-radius":
			this.borderTopLeftRadius = [props[key][0].toValue(lengthBase), props[key][4].toValue(lengthBase)];
			this.borderTopRightRadius = [props[key][1].toValue(lengthBase), props[key][5].toValue(lengthBase)];
			this.borderBottomRightRadius = [props[key][2].toValue(lengthBase), props[key][6].toValue(lengthBase)];
			this.borderBottomLeftRadius = [props[key][3].toValue(lengthBase), props[key][7].toValue(lengthBase)];
			this.roundedCorners = true;
			break;
		case "background-color":
		case "background":	// color is the only supported property
			this.backgroundColor = props[key];
			break;
		case "color":
			this.color = props[key];
			break;
		case "font":
			this.font = props[key];
			break;
		case "box-shadow":
			if (props[key].shadowOffset !== null) {
				this.shadowOffset = props[key].offset.map(function (l) { return l ? l.toValue(lengthBase) : 0; });
				this.shadowBlurRadius = props[key].blurRadius ? props[key].blurRadius.toValue(lengthBase) : 0;
				this.shadowSpreadRadius = props[key].spreadRadius ? props[key].spreadRadius.toValue(lengthBase) : 0;
				this.shadowColor = props[key].color;
			}
			break;
		case "width":
		case "min-width":
			width = Math.max(props[key].toValue(lengthBase), width);
			break;
		case "height":
		case "min-height":
			height = Math.max(props[key].toValue(lengthBase), height);
			break;
		}
	}

	if (width >= 0) {
		this.width = width;
	}
	if (height >= 0) {
		this.height = height;
	}
};

/** Set the position of the top-left corner of the total box including margins
	@param {number} left
	@param {number} top
	@return {void}
*/
CSSParser.VPL.Box.prototype.setPosition = function (left, top) {
	this.x = left + this.offsetLeft();
	this.y = top + this.offsetTop();
};

/** Get the total width of the box, including margin and padding
	@return {number}
*/
CSSParser.VPL.Box.prototype.totalWidth = function () {
	return this.width + this.nonContentWidth();
};

/** Get the total height of the box, including margin and padding
	@return {number}
*/
CSSParser.VPL.Box.prototype.totalHeight = function () {
	return this.height + this.nonContentHeight();
};

/** Set the total width of the box, including margin and padding
	@param {number} totalWidth
	@return {void}
*/
CSSParser.VPL.Box.prototype.setTotalWidth = function (totalWidth) {
	this.width = totalWidth -
		(this.marginLeft + this.paddingLeft +
			this.paddingRight + this.marginRight);
};

/** Set the total height of the box, including margin and padding
	@param {number} totalHeight
	@return {void}
*/
CSSParser.VPL.Box.prototype.setTotalHeight = function (totalHeight) {
	this.height = totalHeight -
		(this.marginTop + this.paddingTop +
			this.paddingBottom + this.marginBottom);
};

/** Create copy
	@return {CSSParser.VPL.Box}
*/
CSSParser.VPL.Box.prototype.copy = function () {
	var box = new CSSParser.VPL.Box();

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

	box.borderTopLeftRadius = this.borderTopLeftRadius;
	box.borderTopRightRadius = this.borderTopRightRadius;
	box.borderBottomRightRadius = this.borderBottomRightRadius;
	box.borderBottomLeftRadius = this.borderBottomLeftRadius;

	box.paddingLeft = this.paddingLeft;
	box.paddingRight = this.paddingRight;
	box.paddingTop = this.paddingTop;
	box.paddingBottom = this.paddingBottom;

	box.backgroundColor = this.backgroundColor;
	box.color = this.color;

	box.font = this.font;

	box.shadowOffset = this.shadowOffset;
	box.shadowBlurRadius = this.shadowBlurRadius;
	box.shadowSpreadRadius = this.shadowSpreadRadius;
	box.shadowColor = this.shadowColor;

	return box;
};

/** Calculate sum of left margin, border and padding
	@return {number}
*/
CSSParser.VPL.Box.prototype.offsetLeft = function () {
	return this.marginLeft + this.borderLeftWidth + this.paddingLeft;
};

/** Calculate additional width (left and right margin, border and padding)
	@return {number}
*/
CSSParser.VPL.Box.prototype.nonContentWidth = function () {
	return this.marginLeft + this.borderLeftWidth + this.paddingLeft +
		this.paddingRight + this.borderRightWidth + this.marginRight;
};

/** Calculate sum of top, border and padding
	@return {number}
*/
CSSParser.VPL.Box.prototype.offsetTop = function () {
	return this.marginTop + this.borderTopWidth + this.paddingTop;
};

/** Calculate additional height (top and bottom margin, border and padding)
	@return {number}
*/
CSSParser.VPL.Box.prototype.nonContentHeight = function () {
	return this.marginTop + this.borderTopWidth + this.paddingTop +
		this.paddingBottom + this.borderBottomWidth + this.marginBottom;
};

/** Calculate padding width (left and right padding)
	@return {number}
*/
CSSParser.VPL.Box.prototype.paddingWidth = function () {
	return this.paddingLeft + this.paddingRight;
};

/** Calculate padded width (width plus left and right padding)
	@return {number}
*/
CSSParser.VPL.Box.prototype.paddedWidth = function () {
	return this.width + this.paddingLeft + this.paddingRight;
};

/** Calculate padding height (top and bottom padding)
	@return {number}
*/
CSSParser.VPL.Box.prototype.paddingHeight = function () {
	return this.paddingTop + this.paddingBottom;
};

/** Calculate padded height (height plus top and bottom padding)
	@return {number}
*/
CSSParser.VPL.Box.prototype.paddedHeight = function () {
	return this.height + this.paddingTop + this.paddingBottom;
};

/**
	@constructor
	@param {CSSParser.VPL.Properties=} props
	@param {CSSParser.LengthBase=} lengthBase
*/
CSSParser.VPL.Line = function (props, lengthBase) {
	this.margin = 0;
	this.lineWidth = 0;
	this.lineStyle = "none";
	this.color = "black";

	this.shadowOffset = null;
	this.shadowBlurRadius = 0;
	this.shadowSpreadRadius = 0;
	this.shadowColor = null;

	if (props) {
		this.setProperties(props.properties, /** @type {CSSParser.LengthBase} */(lengthBase));
	}
};
CSSParser.VPL.Line.prototype = Object.create(CSSParser.VPL.Properties.prototype);
CSSParser.VPL.Line.prototype.constructor = CSSParser.VPL.Line;

/** Set the properties from those obtained from css
	@param {Object} props css properties
	@param {CSSParser.LengthBase} lengthBase
	@return {void}
*/
CSSParser.VPL.Line.prototype.setProperties = function (props, lengthBase) {
	for (var key in props) {
		switch (key) {
		case "margin":
			this.margin = props[key].toValue(lengthBase);
			break;
		case "line-width":
			this.lineWidth = props[key].toValue(lengthBase);
			break;
		case "line-style":
			this.lineStyle = props[key];
			break;
		case "color":
			this.color = props[key];
			break;
		case "line":
			if (props[key].color !== null) {
				this.color = /** @type {string} */(props[key].color);
			}
			if (props[key].style !== null) {
				this.lineStyle = /** @type {string} */(props[key].style);
			}
			if (props[key].width !== null) {
				this.lineWidth = /** @type {number} */(props[key].width.toValue(lengthBase));
			}
			break;
		case "line-shadow":
			if (props[key].shadowOffset !== null) {
				this.shadowOffset = props[key].offset.map(function (l) { return l ? l.toValue(lengthBase) : 0; });
				this.shadowBlurRadius = props[key].blurRadius ? props[key].blurRadius.toValue(lengthBase) : 0;
				this.shadowSpreadRadius = props[key].spreadRadius ? props[key].spreadRadius.toValue(lengthBase) : 0;
				this.shadowColor = props[key].color;
			}
			break;
		}
	}
};

/** Create copy
	@return {CSSParser.VPL.Line}
*/
CSSParser.VPL.Line.prototype.copy = function () {
	var line = new CSSParser.VPL.Line();

	line.margin = this.margin;
	line.width = this.width;
	line.style = this.style;
	line.color = this.color;

	line.shadowOffset = this.shadowOffset;
	line.shadowBlurRadius = this.shadowBlurRadius;
	line.shadowSpreadRadius = this.shadowSpreadRadius;
	line.shadowColor = this.shadowColor;

	return line;
};
