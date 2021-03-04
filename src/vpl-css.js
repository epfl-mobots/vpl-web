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

Support for CSS boxes and lines for the user interface of the VPL3 web app.
Definition of all the properties and functions to obtain them with an
object selector, taking care of cascades.

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

	/** @type {Object.<string,!CSSParser.VPL.Box>} */
	this.boxCache = {};
	/** @type {Object.<string,!CSSParser.VPL.Line>} */
	this.lineCache = {};

	/** @type {Array.<string>} */
	this.borderStyles = [
		"none",
		"hidden",
		"dotted",
		"dashed",
		"solid",
		"double"
	];

	/** @type {Array.<string>} */
	this.fontStyles = [
		"normal",
		"italic",
		"oblique"
	];

	/** @type {Array.<string>} */
	this.fontWeights = [
		"normal",
		"bold"
	];
};
CSSParser.VPL.prototype = Object.create(CSSParser.prototype);
CSSParser.VPL.prototype.constructor = CSSParser.VPL;

/**
	@inheritDoc
*/
CSSParser.VPL.prototype.reset = function () {
	CSSParser.prototype.reset.call(this);
	this.boxCache = {};
	this.lineCache = {};
};

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
		props.setProperties(this.rawRules[i].properties, this.rawRules[i].selector.specificity());
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
			/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val) ||
			/^rgba\([^()]*\)$/.test(val);
	}

	/** Check if valid style
		@param {string} val
		@return {boolean}
	*/
	function isStyle(val) {
		return self.borderStyles.indexOf(val) >= 0;
	}

	/** Check if valid line cap
		@param {string} val
		@return {boolean}
	*/
	function isLineCap(val) {
		return ["butt", "round", "square"].indexOf(val) >= 0;
	}

	// remove spaces inside single balanced parentheses to be able to split values
	val = val.replace(/\s+(?=[^()]*\))/g, "");

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
	case "border-corner-length":
	case "line-width":
	case "width":
	case "height":
	case "min-width":
	case "min-height":
	case "max-width":
	case "max-height":
	case "font-size":
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
	case "border-style":
	case "border-left-style":
	case "border-right-style":
	case "border-top-style":
	case "border-bottom-style":
	case "line-style":
		if (!isStyle(val)) {
			throw "Unknown border style";
		}
		return val;
	case "line-cap":
		if (!isLineCap(val)) {
			throw "Unknown line cap";
		}
		return val;
	case "border-color":
	case "border-left-color":
	case "border-right-color":
	case "border-top-color":
	case "border-bottom-color":
	case "color":
	case "background-color":
	case "background":	// only color is supported
	case "border-cut-background":
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
	case "border-top-left-cut":
	case "border-top-right-cut":
	case "border-bottom-left-cut":
	case "border-bottom-right-cut":
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
	case "border-cut":
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
	case "font":
		// (font-style | font-weight)* font-size font-family
		var fontStyle = "";
		var fontWeight = "";
		/** @type {CSSParser.Length} */
		var fontSize = null;
		var fontFamily = "";
		val.replace(/ +/g, " ")
			.split(" ")
			.forEach(function (val1) {
				if (fontSize === null) {
					if (isLength(val1)) {
						fontSize = self.convertLength(val1);
					} else {
						// font-style or font-weight
						if (self.fontStyles.indexOf(val1) >= 0) {
							fontStyle = val1;
						} else if (self.fontWeights.indexOf(val1) >= 0) {
							fontWeight = val1;
						} else {
							throw "Unknown font style " + val1;
						}
					}
				} else if (fontFamily !== "") {
					throw "Unexpected font style after font-family";
				} else {
					fontFamily = val1;
				}
			});
		return {
			fontFamily: fontFamily,
			fontSize: fontSize,
			fontStyle: fontStyle,
			fontWeight: fontWeight
		};
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
	case "overflow":
		if (["wrap", "scroll"].indexOf(val) < 0) {
			throw "Unknown overflow mode";
		}
		return val;
	case "vertical-align":
		return ["top", "middle", "bottom"].indexOf(val) >= 0
			? val
			: this.convertLength(val);
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
	var key = CSSParser.Selector.stringifyOptions(opt, this.lengthBase);
	if (this.boxCache[key]) {
		return this.boxCache[key];
	}
	var props = this.getProperties(opt);
	var box = new CSSParser.VPL.Box(props, this.lengthBase);
	this.boxCache[key] = box;
	return box;
};

/** Get line specified by selector
	@param {CSSParser.Selector.Options} opt
	@return {!CSSParser.VPL.Line}
*/
CSSParser.VPL.prototype.getLine = function (opt) {
	var key = CSSParser.Selector.stringifyOptions(opt, this.lengthBase);
	if (this.lineCache[key]) {
		return this.lineCache[key];
	}
	var props = this.getProperties(opt);
	var line = new CSSParser.VPL.Line(props, this.lengthBase);
	this.lineCache[key] = line;
	return line;
};

/**
	@constructor
*/
CSSParser.VPL.Properties = function () {
	this.properties = {};
	/** @type {Object.<string,number>} */
	this.propSpecificity = {};
};

/** Set the properties from those obtained from css
	@param {Object} props css properties
	@param {number} specificity default specificity unless specified in propSpecificity
	@param {Object.<string,number>=} propSpecificity
	@return {void}
*/
CSSParser.VPL.Properties.prototype.setProperties = function (props, specificity, propSpecificity) {
	for (var key in props) {
		if (props.hasOwnProperty(key)) {
			this.properties[key] = props[key];
			this.propSpecificity[key] = propSpecificity && propSpecificity[key] || specificity;
		}
	}
};

/** Create copy
	@return {CSSParser.VPL.Properties}
*/
CSSParser.VPL.Properties.prototype.copy = function () {
	var props = new CSSParser.VPL.Properties();
	props.setProperties(this.properties, 0, this.propSpecificity);
	return props;
};

/** Create copy where some properties are overridden
	@param {CSSParser.VPL.Properties} overridingProps
	@return {CSSParser.VPL.Properties}
*/
CSSParser.VPL.Properties.prototype.merge = function (overridingProps) {
	var props = this.copy();
	for (var key in overridingProps.properties) {
		if (overridingProps.properties.hasOwnProperty(key) &&
			(!props.hasOwnProperty(key) || overridingProps.propSpecificity[key] >= props.propSpecificity[key])) {
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
	this.roundedCorners = false;	// or cut

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

	this.borderTopLeftCut = false;
	this.borderTopRightCut = false;
	this.borderBottomLeftCut = false;
	this.borderBottomRightCut = false;

	this.borderCornerLength = 0;

	this.paddingLeft = 0;
	this.paddingRight = 0;
	this.paddingTop = 0;
	this.paddingBottom = 0;

	this.backdropColor = "transparent";
	this.backgroundColor = "transparent";
	this.color = "black";

	this.fontFamily = "sans-serif";
	this.fontSize = 10;
	this.fontStyle = "";
	this.fontWeight = "";

	this.scroll = false;	// false=overflow:wrap, true=overflow:scroll
	this.verticalAlign = "middle";

	this.shadowOffset = null;
	this.shadowBlurRadius = 0;
	this.shadowSpreadRadius = 0;
	this.shadowColor = null;

	this.otherProperties = {};

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
	var minWidth = -1;
	var minHeight = -1;
	var maxWidth = 1e9;
	var maxHeight = 1e9;
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
		case "border-corner-length":
			this.borderCornerLength = props[key].toValue(lengthBase);
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
			if (this.borderTopStyle === "none" && this.borderTopWidth > 0) {
				this.borderTopStyle = null;
			}
			this.borderRightWidth = props[key][1].toValue(lengthBase);
			if (this.borderRightStyle === "none" && this.borderRightWidth > 0) {
				this.borderRightStyle = null;
			}
			this.borderBottomWidth = props[key][2].toValue(lengthBase);
			if (this.borderBottomStyle === "none" && this.borderBottomWidth > 0) {
				this.borderBottomStyle = null;
			}
			this.borderLeftWidth = props[key][3].toValue(lengthBase);
			if (this.borderLeftStyle === "none" && this.borderLeftWidth > 0) {
				this.borderLeftStyle = null;
			}
			break;
		case "padding":
			this.paddingTop = props[key][0].toValue(lengthBase);
			this.paddingRight = props[key][1].toValue(lengthBase);
			this.paddingBottom = props[key][2].toValue(lengthBase);
			this.paddingLeft = props[key][3].toValue(lengthBase);
			break;
		case "border-style":
			this.borderLeftStyle = props[key];
			this.borderRightStyle = props[key];
			this.borderTopStyle = props[key];
			this.borderBottomStyle = props[key];
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
		case "border-color":
			this.borderLeftColor = props[key];
			this.borderRightColor = props[key];
			this.borderTopColor = props[key];
			this.borderBottomColor = props[key];
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
		case "border-top-left-cut":
			this.borderTopLeftRadius = props[key].map(function (l) { return l.toValue(lengthBase); });
			this.borderTopLeftCut = true;
			this.roundedCorners = true;
			break;
		case "border-top-right-cut":
			this.borderTopRightRadius = props[key].map(function (l) { return l.toValue(lengthBase); });
			this.borderTopRightCut = true;
			this.roundedCorners = true;
			break;
		case "border-bottom-left-cut":
			this.borderBottomLeftCut = props[key].map(function (l) { return l.toValue(lengthBase); });
			this.borderBottomLeftCut = true;
			this.roundedCorners = true;
			break;
		case "border-bottom-right-cut":
			this.borderBottomRightRadius = props[key].map(function (l) { return l.toValue(lengthBase); });
			this.borderBottomRightCut = true;
			this.roundedCorners = true;
			break;
		case "border-cut":
			this.borderTopLeftRadius = [props[key][0].toValue(lengthBase), props[key][4].toValue(lengthBase)];
			this.borderTopRightRadius = [props[key][1].toValue(lengthBase), props[key][5].toValue(lengthBase)];
			this.borderBottomRightRadius = [props[key][2].toValue(lengthBase), props[key][6].toValue(lengthBase)];
			this.borderBottomLeftRadius = [props[key][3].toValue(lengthBase), props[key][7].toValue(lengthBase)];
			this.borderTopLeftCut = true;
			this.borderTopRightCut = true;
			this.borderBottomLeftCut = true;
			this.borderBottomRightCut = true;
			this.roundedCorners = true;
			break;
		case "backdrop-color":
			this.backdropColor = props[key];
			break;
		case "background-color":
		case "background":	// color is the only supported property
			this.backgroundColor = props[key];
			break;
		case "color":
			this.color = props[key];
			break;
		case "font":
			this.fontFamily = props[key].fontFamily;
			this.fontSize = props[key].fontSize.toValue(lengthBase);
			this.fontStyle = props[key].fontStyle;
			this.fontWeight = props[key].fontWeight;
			break;
		case "font-family":
			this.fontFamily = props[key];
			break;
		case "font-size":
			this.fontSize = props[key].toValue(lengthBase);
			break;
		case "font-style":
			this.fontStyle = props[key];
			break;
		case "font-weight":
			this.fontWeight = props[key];
			break;
		case "overflow":
			this.scroll = props[key] === "scroll";
			break;
		case "vertical-align":
			this.verticalAlign = props[key] instanceof CSSParser.Length ? props[key].toValue(lengthBase) : props[key];
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
			width = props[key].toValue(lengthBase);
			break;
		case "min-width":
			minWidth = props[key].toValue(lengthBase);
			break;
		case "max-width":
			maxWidth = props[key].toValue(lengthBase);
			break;
		case "height":
			height = props[key].toValue(lengthBase);
			break;
		case "min-height":
			minHeight = props[key].toValue(lengthBase);
			break;
		case "max-height":
			maxHeight = props[key].toValue(lengthBase);
			break;
		default:
			if (props.hasOwnProperty(key)) {
				this.otherProperties[key] = props[key];
			}
			break;
		}
	}

	width = Math.max(Math.min(width, maxWidth), minWidth);
	height = Math.max(Math.min(height, maxHeight), minHeight);
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
		(this.marginLeft + this.borderLeftWidth + this.paddingLeft +
			this.paddingRight + this.borderRightWidth + this.marginRight);
};

/** Set the total height of the box, including margin and padding
	@param {number} totalHeight
	@return {void}
*/
CSSParser.VPL.Box.prototype.setTotalHeight = function (totalHeight) {
	this.height = totalHeight -
		(this.marginTop + this.borderTopWidth + this.paddingTop +
			this.paddingBottom + this.borderBottomWidth + this.marginBottom);
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

	box.borderTopLeftCut = this.borderTopLeftCut;
	box.borderTopRightCut = this.borderTopRightCut;
	box.borderBottomLeftCut = this.borderBottomLeftCut;
	box.borderBottomRightCut = this.borderBottomRightCut;

	box.borderCornerLength = this.borderCornerLength;

	box.paddingLeft = this.paddingLeft;
	box.paddingRight = this.paddingRight;
	box.paddingTop = this.paddingTop;
	box.paddingBottom = this.paddingBottom;

	box.backdropColor = this.backdropColor;
	box.backgroundColor = this.backgroundColor;
	box.color = this.color;

	box.fontFamily = this.fontFamily;
	box.fontSize = this.fontSize;
	box.fontStyle = this.fontStyle;
	box.fontWeight = this.fontWeight;

	box.scroll = this.scroll;
	box.verticalAlign = this.verticalAlign;

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

/** Get font as a CSS string
	@return {string}
*/
CSSParser.VPL.Box.prototype.cssFontString = function () {
	return (this.fontStyle ? this.fontStyle + " " : "") +
		(this.fontWeight ? this.fontWeight + " " : "") +
		this.fontSize.toFixed(1) + "px " +
		this.fontFamily;
};

/**
	@constructor
	@param {CSSParser.VPL.Properties=} props
	@param {CSSParser.LengthBase=} lengthBase
*/
CSSParser.VPL.Line = function (props, lengthBase) {
	this.margin = 0;
	this.width = null;
	this.style = null;
	this.cap = null;
	this.color = "black";

	this.shadowOffset = null;
	this.shadowBlurRadius = 0;
	this.shadowSpreadRadius = 0;
	this.shadowColor = null;

	this.otherProperties = {};

	if (props) {
		this.setProperties(props.properties, /** @type {CSSParser.LengthBase} */(lengthBase));
	}

	if (this.width === null) {
 		this.width = this.style !== null && this.style !== "none" ? 1 : 0;
	}
	if (this.style === null) {
		this.style = this.width > 0 ? "solid" : "none";
	}
	if (this.cap === null) {
		this.cap = "butt";
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
			this.width = props[key].toValue(lengthBase);
			break;
		case "line-style":
			this.style = props[key];
			break;
		case "line-cap":
			this.cap = props[key];
			break;
		case "color":
			this.color = props[key];
			break;
		case "line":
			if (props[key].color !== null) {
				this.color = /** @type {string} */(props[key].color);
			}
			if (props[key].style !== null) {
				this.style = /** @type {string} */(props[key].style);
			}
			if (props[key].width !== null) {
				this.width = /** @type {number} */(props[key].width.toValue(lengthBase));
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
		default:
			if (props.hasOwnProperty(key)) {
				this.otherProperties[key] = props[key];
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
	line.cap = this.cap;
	line.color = this.color;

	line.shadowOffset = this.shadowOffset;
	line.shadowBlurRadius = this.shadowBlurRadius;
	line.shadowSpreadRadius = this.shadowSpreadRadius;
	line.shadowColor = this.shadowColor;

	return line;
};
