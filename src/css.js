/*
	Copyright 2019-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/**
	@fileoverview CSS simple parser

	Class CSS implements a simple, partial CSS parser. Selectors are limited to
	plain tags.
*/

/** CSS top Object
	@constructor
*/
var CSSParser = function () {
	this.src = {};
	/** @type {Array.<{selector:CSSParser.Selector,properties:Object}>} */
	this.rawRules = [];

	/** @type {Object.<string,number>} */
	this.lengthUnits = {
		"px": 1,
		"cm": 96 / 2.54,
		"mm": 96 / 25.4,
		"in": 96,
		"pc": 96 / 6,
		"pt": 96 / 72
	};

	/** @type {Object.<string,number>} */
	this.angleUnits = {
		"rad": 1,
		"deg": Math.PI / 180,
		"grad": Math.PI / 200,
		"turn": 2 * Math.PI
	};

	/** @type {?CSSParser.LengthBase} */
	this.lengthBase = null;
};

/** Reset all rules
	@return {void}
*/
CSSParser.prototype.reset = function () {
	this.src = {};
	this.rawRules = [];
};

/** Parse another css file
	@param {string} filename
	@param {string} src
	@return {void}
*/
CSSParser.prototype.parse = function (filename, src) {
	this.src[filename] = src;

	var i = 0;
	var line = 1;
	var col = 1;

	/** Current location in source code as a string
		@return {string}
	*/
	function location() {
		return filename + " line " + line + " col " + col;
	}

	/** Skip blanks
		@return {void}
	*/
	function skipBlanks() {
		while (i < src.length) {
			if (src[i] === " " || src[i] === "\t") {
				i++;
				col++;
			} else if (src[i] === "\n") {
				i++;
				col = 1;
				line++;
			} else if (src[i] === "\r") {
				i++;
			} else if (src.slice(i, i + 2) === "/*") {
				for (i += 2, col += 2; i < src.length; ) {
					if (src.slice(i, i + 2) === "*/") {
						i += 2;
						col += 2;
						break;
					} else {
						i++;
						col++;
					}
				}
			} else {
				break;
			}
		}
	}

	function skipCharacter() {
		if (src[i] === "\n") {
			col = 1;
			line++;
		} else if (src[i] !== "\r") {
			col++;
		}
		i++;
	}

	/** Parse tag
		@return {string}
	*/
	function parseTag() {
		var len = 0;
		while (i + len < src.length && /[-_a-z0-9]/i.test(src[i + len])) {
			len++;
		}
		i += len;
		col += len;
		return src.slice(i - len, i);
	}

	/** Parse selector ([type][.class][:pseudoClass], #id[:pseudoClass], *)
		@return {CSSParser.Selector}
	*/
	function parseSelector() {
		var sel = new CSSParser.Selector();

		if (!/[a-z_.#*:]/i.test(src[i])) {
			throw "Syntax error " + location();
		}

		if (/[a-z_]/i.test(src[i])) {
			sel.tag = parseTag();
		} else if (src[i] === "*") {
			skipCharacter();
		}

		while (true) {
			if (src[i] === "#") {
				if (sel.id) {
					throw "Multiple ids in selector " + location();
				}
				skipCharacter();
				sel.id = parseTag();
			} else if (src[i] === ".") {
				skipCharacter();
				sel.clas.push(parseTag());
			} else if (src[i] === ":") {
				skipCharacter();
				sel.pseudoClass.push(parseTag());
			} else {
				break;
			}
		}

		return sel;
	}

	/** Parse value
		@return {string}
	*/
	function parseValue() {
		var j = 0;
		var quoted = false;
		while (i + j < src.length && (quoted || (src[i + j] !== ";" && src[i + j] !== "}"))) {
			if (src[i] === "\n") {
				line++;
				col = 1;
			} else if (src[i] !== "\r") {
				col++;
			} else if (src[i] === '"') {
				quoted = !quoted;
			}
			j++;
		}
		i += j;
		return src.slice(i - j, i).trim();
	}

	while (i < src.length) {
		skipBlanks();
		if (i >= src.length) {
			break;
		}

		// selectors (comma-separated ("*"|tag)("#"id|"."class|":"pseudoClass)*)
		/** @type {Array.<CSSParser.Selector>} */
		var selectors = [];
		while (true) {
			selectors.push(parseSelector());
			skipBlanks();
			if (src[i] !== ",") {
				break;
			}
			i++;
			col++;
			skipBlanks();
		}

		// declaration block
		if (src[i] !== "{") {
			throw "Syntax error " + location();
		}
		i++;
		col++;
		var props = {};
		while (true) {
			while (true) {
				skipBlanks();
				if (src[i] !== ";") {
					break;
				}
				i++;
			}
			if (i >= src.length) {
				throw "Unclosed block " + location();
			} else if (src[i] === "}") {
				i++;
				col++;
				break;
			} else if (!/[-a-z_]/i.test(src[i])) {
				throw "Syntax error " + location();
			}

			// property
			var key = parseTag();

			// colon
			skipBlanks();
			if (src[i] !== ":") {
				throw "Missing colon " + location();
			}
			i++;
			col++;

			// value
			var val = parseValue();

			props[key] = this.processValue(key, val);
		}

		// add to rules
		for (var j = 0; j < selectors.length; j++) {
			this.rawRules.push({selector: selectors[j], properties: props});
		}
	}
};

/** Convert a value before storing it into a rule (overridden by subclasses)
	@param {string} key
	@param {string} val
	@return {*}
*/
CSSParser.prototype.processValue = function (key, val) {
	return val;
};

/** Convert a length (number+unit) to an absolute or relative length in px (CSSParser.Length)
	@param {string} length
	@return {CSSParser.Length}
*/
CSSParser.prototype.convertLength = function (length) {
	// handle min and max
	if (/^(max|min)\(.*\)$/.test(length)) {
		var args = length.slice(4, -1).split(",").map(function (arg) { return this.convertLength(arg); }, this);
		return new CSSParser.Length.MultipleValues(length.slice(0, 3), args);
	}

	var re = /^(-?([0-9]+\.?|[0-9]*\.[0-9]+))([a-z]*|%)$/.exec(length);
	var sc = 1;
	var type = CSSParser.Length.type.absolute;
	if (re == null) {
		throw "Illegal length";
	} else if (re[3] === "%") {
		type = CSSParser.Length.type.percentage;
	} else if (this.lengthUnits.hasOwnProperty(re[3])) {
		sc = this.lengthUnits[re[3]];
	} else if (re[3] === "vw") {
		type = CSSParser.Length.type.vw;
	} else if (re[3] === "vh") {
		type = CSSParser.Length.type.vh;
	} else if (re[3] === "vmin") {
		type = CSSParser.Length.type.vmin;
	} else if (re[3] === "vmax") {
		type = CSSParser.Length.type.vmax;
	} else if (re[3] === "ww") {
		type = CSSParser.Length.type.ww;
	} else if (re[3] === "wh") {
		type = CSSParser.Length.type.wh;
	} else if (re[3] === "wmin") {
		type = CSSParser.Length.type.wmin;
	} else if (re[3] === "wmax") {
		type = CSSParser.Length.type.wmax;
	} else if (parseFloat(re[1]) == 0) {
		// unit ignored if length is 0 (can be missing)
		sc = 0;
	} else {
		throw "Unknown length unit";
	}
	return new CSSParser.Length(parseFloat(re[1]) * sc, type);
};

/** Convert an angle (number+unit) to an angle in radians
	@param {string} angle
	@return {number}
*/
CSSParser.prototype.convertAngle = function (angle) {
	var re = /^(-?([0-9]+\.?|[0-9]*\.[0-9]+))([a-z]*)$/.exec(angle);
	var sc = 1;
	if (re == null) {
		throw "Illegal angle";
	} else if (this.angleUnits.hasOwnProperty(re[3])) {
		sc = this.angleUnits[re[3]];
	} else if (parseFloat(re[1]) == 0) {
		// unit ignored if angle is 0 (can be missing)
		sc = 0;
	} else {
		throw "Unknown angle unit";
	}
	return parseFloat(re[1]) * sc;
};

/** Color dict (obtained from https://www.w3.org/TR/css-color-3/#svg-color with the following
	regexp replacement: s/^(\S+)\s+(#\S{6}).*$/\t"$1": "$2",/g)
	@const
*/
CSSParser.colorDict = {
	"aliceblue": "#F0F8FF",
	"antiquewhite": "#FAEBD7",
	"aqua": "#00FFFF",
	"aquamarine": "#7FFFD4",
	"azure": "#F0FFFF",
	"beige": "#F5F5DC",
	"bisque": "#FFE4C4",
	"black": "#000000",
	"blanchedalmond": "#FFEBCD",
	"blue": "#0000FF",
	"blueviolet": "#8A2BE2",
	"brown": "#A52A2A",
	"burlywood": "#DEB887",
	"cadetblue": "#5F9EA0",
	"chartreuse": "#7FFF00",
	"chocolate": "#D2691E",
	"coral": "#FF7F50",
	"cornflowerblue": "#6495ED",
	"cornsilk": "#FFF8DC",
	"crimson": "#DC143C",
	"cyan": "#00FFFF",
	"darkblue": "#00008B",
	"darkcyan": "#008B8B",
	"darkgoldenrod": "#B8860B",
	"darkgray": "#A9A9A9",
	"darkgreen": "#006400",
	"darkgrey": "#A9A9A9",
	"darkkhaki": "#BDB76B",
	"darkmagenta": "#8B008B",
	"darkolivegreen": "#556B2F",
	"darkorange": "#FF8C00",
	"darkorchid": "#9932CC",
	"darkred": "#8B0000",
	"darksalmon": "#E9967A",
	"darkseagreen": "#8FBC8F",
	"darkslateblue": "#483D8B",
	"darkslategray": "#2F4F4F",
	"darkslategrey": "#2F4F4F",
	"darkturquoise": "#00CED1",
	"darkviolet": "#9400D3",
	"deeppink": "#FF1493",
	"deepskyblue": "#00BFFF",
	"dimgray": "#696969",
	"dimgrey": "#696969",
	"dodgerblue": "#1E90FF",
	"firebrick": "#B22222",
	"floralwhite": "#FFFAF0",
	"forestgreen": "#228B22",
	"fuchsia": "#FF00FF",
	"gainsboro": "#DCDCDC",
	"ghostwhite": "#F8F8FF",
	"gold": "#FFD700",
	"goldenrod": "#DAA520",
	"gray": "#808080",
	"green": "#008000",
	"greenyellow": "#ADFF2F",
	"grey": "#808080",
	"honeydew": "#F0FFF0",
	"hotpink": "#FF69B4",
	"indianred": "#CD5C5C",
	"indigo": "#4B0082",
	"ivory": "#FFFFF0",
	"khaki": "#F0E68C",
	"lavender": "#E6E6FA",
	"lavenderblush": "#FFF0F5",
	"lawngreen": "#7CFC00",
	"lemonchiffon": "#FFFACD",
	"lightblue": "#ADD8E6",
	"lightcoral": "#F08080",
	"lightcyan": "#E0FFFF",
	"lightgoldenrodyellow": "#FAFAD2",
	"lightgray": "#D3D3D3",
	"lightgreen": "#90EE90",
	"lightgrey": "#D3D3D3",
	"lightpink": "#FFB6C1",
	"lightsalmon": "#FFA07A",
	"lightseagreen": "#20B2AA",
	"lightskyblue": "#87CEFA",
	"lightslategray": "#778899",
	"lightslategrey": "#778899",
	"lightsteelblue": "#B0C4DE",
	"lightyellow": "#FFFFE0",
	"lime": "#00FF00",
	"limegreen": "#32CD32",
	"linen": "#FAF0E6",
	"magenta": "#FF00FF",
	"maroon": "#800000",
	"mediumaquamarine": "#66CDAA",
	"mediumblue": "#0000CD",
	"mediumorchid": "#BA55D3",
	"mediumpurple": "#9370DB",
	"mediumseagreen": "#3CB371",
	"mediumslateblue": "#7B68EE",
	"mediumspringgreen": "#00FA9A",
	"mediumturquoise": "#48D1CC",
	"mediumvioletred": "#C71585",
	"midnightblue": "#191970",
	"mintcream": "#F5FFFA",
	"mistyrose": "#FFE4E1",
	"moccasin": "#FFE4B5",
	"navajowhite": "#FFDEAD",
	"navy": "#000080",
	"oldlace": "#FDF5E6",
	"olive": "#808000",
	"olivedrab": "#6B8E23",
	"orange": "#FFA500",
	"orangered": "#FF4500",
	"orchid": "#DA70D6",
	"palegoldenrod": "#EEE8AA",
	"palegreen": "#98FB98",
	"paleturquoise": "#AFEEEE",
	"palevioletred": "#DB7093",
	"papayawhip": "#FFEFD5",
	"peachpuff": "#FFDAB9",
	"peru": "#CD853F",
	"pink": "#FFC0CB",
	"plum": "#DDA0DD",
	"powderblue": "#B0E0E6",
	"purple": "#800080",
	"red": "#FF0000",
	"rosybrown": "#BC8F8F",
	"royalblue": "#4169E1",
	"saddlebrown": "#8B4513",
	"salmon": "#FA8072",
	"sandybrown": "#F4A460",
	"seagreen": "#2E8B57",
	"seashell": "#FFF5EE",
	"sienna": "#A0522D",
	"silver": "#C0C0C0",
	"skyblue": "#87CEEB",
	"slateblue": "#6A5ACD",
	"slategray": "#708090",
	"slategrey": "#708090",
	"snow": "#FFFAFA",
	"springgreen": "#00FF7F",
	"steelblue": "#4682B4",
	"tan": "#D2B48C",
	"teal": "#008080",
	"thistle": "#D8BFD8",
	"tomato": "#FF6347",
	"turquoise": "#40E0D0",
	"violet": "#EE82EE",
	"wheat": "#F5DEB3",
	"white": "#FFFFFF",
	"whitesmoke": "#F5F5F5",
	"yellow": "#FFFF00",
	"yellowgreen": "#9ACD32",

	"transparent": "rgba(0,0,0,0)"
};

/** Length, absolute or relative
	@constructor
	@param {number} val
	@param {CSSParser.Length.type=} type
*/
CSSParser.Length = function (val, type) {
	this.val = val;
	this.type = type
		? /** @type {CSSParser.Length.type} */(type)
		: CSSParser.Length.type.absolute;
};

/** @enum {string}
*/
CSSParser.Length.type = {
	absolute: "abs",
	percentage: "%",
	vw: "vw",	// viewport width / 100 (parent element)
	vh: "vh",
	vmin: "vmin",
	vmax: "vmax",
	ww: "ww",	// window width / 100
	wh: "wh",
	wmin: "wmin",
	wmax: "wmax"
};

/** Set length
	@param {number} val
	@param {CSSParser.Length.type=} type
	@return {void}
*/
CSSParser.Length.prototype.setValue = function (val, type) {
	this.val = val;
	this.type = type
		? /** @type {CSSParser.Length.type} */(type)
		: CSSParser.Length.type.absolute;
};

/** Get numeric value
	@param {CSSParser.LengthBase} lengthBase
	@return {number}
*/
CSSParser.Length.prototype.toValue = function (lengthBase) {
	switch (this.type) {
	case CSSParser.Length.type.absolute:
		return this.val;
	case CSSParser.Length.type.percentage:
		return this.val * (lengthBase ? lengthBase.base / 100 : 1);
	case CSSParser.Length.type.vw:
		return this.val * (lengthBase ? lengthBase.vw : 1);
	case CSSParser.Length.type.vh:
		return this.val * (lengthBase ? lengthBase.vh : 1);
	case CSSParser.Length.type.vmin:
		return this.val * (lengthBase ? Math.min(lengthBase.vw, lengthBase.vh) : 1);
	case CSSParser.Length.type.vmax:
		return this.val * (lengthBase ? Math.max(lengthBase.vw, lengthBase.vh) : 1);
	case CSSParser.Length.type.ww:
		return this.val * (lengthBase ? lengthBase.ww : 1);
	case CSSParser.Length.type.wh:
		return this.val * (lengthBase ? lengthBase.wh : 1);
	case CSSParser.Length.type.wmin:
		return this.val * (lengthBase ? Math.min(lengthBase.ww, lengthBase.wh) : 1);
	case CSSParser.Length.type.wmax:
		return this.val * (lengthBase ? Math.max(lengthBase.ww, lengthBase.wh) : 1);
	default:
		throw "internal";
	}
};

/** Length with multiple values (max or min)
	@constructor
	@extends {CSSParser.Length}
	@param {string} fun "max" or "min"
	@param {Array.<CSSParser.Length>} values
*/
CSSParser.Length.MultipleValues = function (fun, values) {
	CSSParser.Length.call(this, 0);
	this.fun = fun;
	this.values = values;
};
CSSParser.Length.MultipleValues.prototype = Object.create(CSSParser.Length.prototype);
CSSParser.Length.MultipleValues.prototype.constructor = CSSParser.Length.MultipleValues;

/** @inheritDoc
*/
CSSParser.Length.MultipleValues.prototype.toValue = function (lengthBase) {
	switch (this.fun) {
	case "max":
		return this.values.reduce(function (acc, val) {
			return Math.max(acc, val.toValue(lengthBase));
		}, -Infinity);
	case "min":
		return this.values.reduce(function (acc, val) {
			return Math.min(acc, val.toValue(lengthBase));
		}, Infinity);
	default:
		throw "internal";
	}
};

/** Length, absolute or relative
	@constructor
	@param {number} base
	@param {number} vw
	@param {number} vh
	@param {number} ww
	@param {number} wh
*/
CSSParser.LengthBase = function (base, vw, vh, ww, wh) {
	this.base = base;
	this.vw = vw;
	this.vh = vh;
	this.ww = ww;
	this.wh = wh;
};

/** Selector
	@constructor
	@param {CSSParser.Selector.Options=} opt
*/
CSSParser.Selector = function (opt) {
	/** @type {?string} */
	this.tag = opt && opt.tag || null;
	/** @type {?string} */
	this.id = opt && opt.id || null;
	/** @type {Array.<string>} */
	this.clas = opt && opt.clas || [];
	/** @type {Array.<string>} */
	this.pseudoClass = opt && opt.pseudoClass || [];
};

/** @typedef {{
		tag: (?string | undefined),
		id: (?string | undefined),
		clas: (Array.<string> | undefined),
		pseudoClass: (Array.<string> | undefined)
	}}
*/
CSSParser.Selector.Options;

/** Calculate selector specificity (higher specificity is picked when merging properties)
	@return {number}
*/
CSSParser.Selector.prototype.specificity = function () {
	return (this.id != null ? 100 : 0) +
		10 * (this.clas.length + this.pseudoClass.length) +
		(this.tag != null ? 1 : 0);
};

/** Convert selector description to a string which can be used as a key in a cache
	@param {CSSParser.Selector.Options} opt
	@param {CSSParser.LengthBase} lengthBase
	@return {string}
*/
CSSParser.Selector.stringifyOptions = function (opt, lengthBase) {
	var str = (opt.id ? "#" + opt.id :opt.tag || "") +
		(opt.clas && opt.clas.length > 0 ? "." + opt.clas.join(".") : "") +
		(opt.pseudoClass && opt.pseudoClass.length > 0 ? ":" + opt.pseudoClass.join(".") : "") || "*";
	if (lengthBase) {
		str += "/" + (Math.round(lengthBase.base).toString(10)) +
			"," + (Math.round(lengthBase.vw).toString(10)) +
			"," + (Math.round(lengthBase.vh).toString(10)) +
			"," + (Math.round(lengthBase.ww).toString(10)) +
			"," + (Math.round(lengthBase.wh).toString(10));
	}
	return str;
};

/** Check if options match a selector
	@param {CSSParser.Selector.Options} opt
	@return {boolean}
*/
CSSParser.Selector.prototype.match = function (opt) {
	if (opt.tag && this.tag && opt.tag !== this.tag) {
		// tags defined in selector and request but don't match
		return false;
	}
	if (this.id && this.id !== opt.id) {
		// id defined in selector but doesn't match
		return false;
	}
	for (var i = 0; i < this.clas.length; i++) {
		if (opt.clas == undefined || opt.clas.indexOf(this.clas[i]) < 0) {
			// class defined in selector but not in request
			return false;
		}
	}
	for (var i = 0; i < this.pseudoClass.length; i++) {
		if (opt.pseudoClass == undefined || opt.pseudoClass.indexOf(this.pseudoClass[i]) < 0) {
			// pseudo-class defined in selector but not in request
			return false;
		}
	}
	return true;
};
