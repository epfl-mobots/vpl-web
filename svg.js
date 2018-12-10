/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** SVG top Object
	@constructor
	@param {string} src
*/
var SVG = function (src) {
	this.src = src;
	this.domParser = new DOMParser();
	this.dom = this.domParser.parseFromString(src, "text/xml");
	this.root = this.dom["rootElement"];
	this.viewBox = (this.root.getAttribute("viewBox") || "0 0 1 1")
		.split(" ")
		.map(function (s) { return parseFloat(s); });
};

/** @typedef {{
		globalTransform: (function(CanvasRenderingContext2D,Array.<number>):void | undefined),
		elementStyle: (string | undefined),
		style: (Object | undefined),
		transform: (Object | undefined),
		elementId: (string | undefined),
		element: (Element | undefined),
		showBoundingBox: (boolean | undefined)
	}}
*/
SVG.Options;

/** Color dict (obtained from https://www.w3.org/TR/css-color-3/#svg-color with the following
	regexp replacement: s/^(\S+)\s+(#\S{6}).*$/\t"$1": "$2",/g)
	@const
*/
SVG.colorDict = {
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
	"yellowgreen": "#9ACD32"
};

/** @typedef {{
		dx: (number | undefined),
		dy: (number | undefined),
		phi: (number | undefined),
		x0: (number | undefined),
		y0: (number | undefined)
	}}
	Displacement of a shape (first by (dx,dy), then rotation by phi around
	(x0,y0) (default: shape center))
*/
SVG.Displacement;

/** Draw SVG from source code
	@param {CanvasRenderingContext2D} ctx
	@param {SVG.Options=} options
	@return {{x:Array.<number>,y:Array.<number>}} list of all points
*/
SVG.prototype.draw = function (ctx, options) {
	var self = this;

	var css = "";
	var cssDict = {};

	var transform = new SVG.Transform.Stack();

	/** @type {Array.<number>} */
	var xa = [];
	/** @type {Array.<number>} */
	var ya = [];

	/** Add to path an elliptical arc defined by ellipse rotated by angle a,
		with half-axes rx and ry, from point (x1,y1) to (x2,y2). Among the
		four solutions, selects the one with the largest arc (>=pi) if largeArcFlag
		is true or the smallest arc (<pi) if false, and go counterclockwise if
		sweepFlag is true or clockwise if false.
		@param {number} rx radius along x axis (before rotation by a)
		@param {number} ry radius along y axis (before rotation by a
		@param {number} a ellipse rotation
		@param {boolean} largeArcFlag true to pick largest (>= pi), false to pick smallest arc (<pi)
		@param {boolean} sweepFlag true for clockwise arc, false for counterclockwise arc
		@param {number} x1 start point along x axis
		@param {number} y1 start point along y axis
		@param {number} x2 end point along x axis
		@param {number} y2 end point along y axis
		@return {SVG.Transform.Point} middle-point of the arc
	*/
	function ellipticalArc(rx, ry, a, largeArcFlag, sweepFlag, x1, y1, x2, y2) {
		// avoid singularities
		if (rx === 0 || ry === 0) {
			ctx.lineTo(x2, y2);
			return new SVG.Transform.Point(x2, y2);	// degenerated, don't care
		}
		// rotate and scale to have a unit circle
		var ca = Math.cos(a);
		var sa = Math.sin(a);
		var x1p = (ca * x1 + sa * y1) / rx;
		var y1p = (-sa * x1 + ca * y1) / ry;
		var x2p = (ca * x2 + sa * y2) / rx;
		var y2p = (-sa * x2 + ca * y2) / ry;
		// find center of unit circle containing (x1p,y1p) and (x2p,y2p)
		// mid-point
		var xm = (x1p + x2p) / 2;
		var ym = (y1p + y2p) / 2;
		// vector from (x1p,y1p) to mid-point
		var xd = (x2p - x1p) / 2;
		var yd = (y2p - y1p) / 2;
		// ratio of catheti
		var a2 = xd * xd + yd * yd;
		var f = Math.sqrt((1 - a2) / a2);
		if (isNaN(f)) {
			// radius too small for a solution (possibly because of numerical inacc)
			f = 0;
		} else if (largeArcFlag === sweepFlag) {
			// two solutions; pick the correct one
			f = -f;
		}
		var xc = xm + f * yd;
		var yc = ym - f * xd;
		var th1 = Math.atan2((y1p - yc) / rx, (x1p - xc) / ry);
		var th2 = Math.atan2((y2p - yc) / rx, (x2p - xc) / ry);
		if (ctx) {
			ctx.rotate(a);
			ctx.scale(rx, ry);
			if (!sweepFlag) {
				ctx.arc(xc, yc, 1, th1, th2);
			} else {
				ctx.arc(xc, yc, 1, th1, th2, true);
			}
			ctx.scale(1 / rx, 1 / ry);
			ctx.rotate(-a);
		}

		var tr = new SVG.Transform();
		tr.rotate(a);
		tr.scale(rx, ry);
		var aMid = sweepFlag
			? th1 < th2 ? (th1 + th2) / 2 + Math.PI : (th1 + th2) / 2
			: th1 < th2 ? (th1 + th2) / 2 : (th1 + th2) / 2 + Math.PI;
		var pMid = tr.apply(new SVG.Transform.Point(xc + Math.cos(aMid), yc + Math.sin(aMid)));
		return pMid;
	}

	/** Recursively collect all css fragments in an element and its children,
		and append them to css
		@param {Element} el
		@return {void}
	*/
	function findCSS(el) {
		switch (el.tagName) {
		case "svg":
		case "defs":
			for (var i = 0; i < el.childElementCount; i++) {
				findCSS(el.children[i]);
			}
			break;
		case "style":
			css += el.textContent;
			break;
		}
	}

	/** Convert css text to dict of styles for element classes in cssDict
		@return {void}
	*/
	function parseCSS() {
		css.split("}").forEach(function (s) {
			var s2 = s.split("{");
			s2[0].split(",").forEach(function (cls) {
				cls = cls.trim();
				if (/^\.[-a-z0-9]+/i.test(cls)) {
					cls = cls.slice(1);
					cssDict[cls] = cssDict[cls] ? cssDict[cls] + ";" + s2[1] : s2[1];
				}
			});
		});
	}

	/** Convert a style string to an object
		@return {Object}
	*/
	function parseStyle(style) {
		var dict = {};
		style.split(";").forEach(function (st) {
			st = st.trim().split(":").map(function (s) { return s.trim(); });
			if (st.length === 2) {
				var val = st[1];
				dict[st[0]] = val;
			}
		});
		return dict;
	}

	/** Apply displacement to context (not to transform)
		@param {Element} el
		@param {SVG.Displacement} displacement
		@return {void}
	*/
	function applyDisplacement(el, displacement) {
		if (displacement.phi && displacement.phi != 0) {
			var x0 = displacement.x0;
			var y0 = displacement.y0;
			if (x0 == undefined || y0 == undefined) {
				var p = self.draw(null, {element: el});
				var bnds = SVG.calcBounds(p);
				x0 = (bnds.xmin + bnds.xmax) / 2;
				y0 = (bnds.ymin + bnds.ymax) / 2;
			}
			ctx.translate(x0 + (displacement.dx || 0), y0 + (displacement.dy || 0));
			ctx.rotate(displacement.phi);
			ctx.translate(-x0, -y0);
		} else if (displacement.dx || displacement.dy) {
			ctx.translate(/** @type {number} */(displacement.dx),
				/** @type {number} */(displacement.dy));
		}
	}

	/** Decode transform parameters and apply them to canvas context ctx
		@param {string} tr value of attribute "transform"
		@return {void}
	*/
	function applyTransform(tr) {
		if (tr) {
			tr = tr
				.replace(/\s*\(\s*/g, "(")
				.replace(/\s*\)\s*/g, ")")
				.replace(/\s+/g, ",");
			var tra = tr.split(")");
			tra.slice(0, -1).forEach(function (t) {
				var c = t.split("(")[0];
				var args = t.split("(")[1].split(",")
					.map(function (s) { return parseFloat(s); });
				switch (c) {
				case "translate":
					ctx && ctx.translate(args[0] || 0, args[1] || 0);
					transform.translate(args[0] || 0, args[1] || 0);
					break;
				case "rotate":
					var a = (args[0] || 0) * Math.PI / 180;
					var x0 = args[1] || 0;
					var y0 = args[2] || 0;
					if (x0 !== 0 || y0 !== 0) {
						if (ctx) {
							ctx.translate(-x0, -y0);
							ctx.rotate(a);
							ctx.translate(x0, y0);
							transform.translate(-x0, -y0);
							transform.rotate(a);
							transform.translate(x0, y0);
						}
					} else {
						ctx && ctx.rotate(a);
						transform.rotate(a);
					}
					break;
				default:
					throw "transform not implemented: " + c;
				}
			});
		}
	}

	/** Draw an element recursively
		@param {Element} el
		@param {string=} baseStyle base style, which can be overridden by style defined in SVG children
		@param {string=} overriddenStyle style with higher priority than SVG's
		@return {void}
	*/
	var drawEl = function (el, baseStyle, overriddenStyle) {
		/** Draw all children
			@return {void}
		*/
		function drawChildren() {
			for (var i = 0; i < el.childElementCount; i++) {
				drawEl(el.children[i], baseStyle, overriddenStyle);
			}
		}

		/** Get a numerical SVG element parameter (attribute)
			@param {string} name
			@param {number=} def default value
			@return {number}
		*/
		function getArg(name, def) {
			var val = el.getAttribute(name);
			return val === null ? def || 0 : parseFloat(val);
		}

		/** Add a pair of points to xa and ya, taking current transform into account
			@return {void}
		*/
		function addPoint(x, y) {
			var pt = transform.apply(new SVG.Transform.Point(x, y));
			xa.push(pt.x);
			ya.push(pt.y);
		}

		/** Change baseStyle and overriddenStyle for element el using its style and class
			attributes, if they exist
			@return {void}
		*/
		function getStyle() {
			var style = (options && options.elementStyle || "") + ";" + (el.getAttribute("style") || "");
			var classAttr = el.getAttribute("class");
			if (classAttr && cssDict.hasOwnProperty(classAttr)) {
				style = cssDict[classAttr] + ";" + style;
			}
			baseStyle = (baseStyle || "") + ";" + style;

			var dashArrayAttr = el.getAttribute("stroke-dasharray");
			if (dashArrayAttr) {
				baseStyle += ";stroke-dasharray:" + dashArrayAttr.split(",").join(" ");
			}
			var dashOffsetAttr = el.getAttribute("stroke-dashoffset");
			if (dashOffsetAttr) {
				baseStyle += ";stroke-dashoffset:" + dashOffsetAttr;
			}

			var idAttr = el.getAttribute("id");
			if (idAttr && options && options.style && options.style.hasOwnProperty(idAttr)) {
				overriddenStyle = (overriddenStyle || "") + ";" + options.style[idAttr];
			}
		}

		/** Convert a length string with unit suffix to a number
			@param {string} length
			@param {number} def default value
			@param {number} size reference size use for percentage
			@return {number}
		*/
		function lengthToNum(length, def, size) {
			if (length == null || length == "") {
				return def;
			}
			var r = /^\s*(-?[0-9.]+)\s*([a-z%]+)\s*$/i.exec(length);
			var x = parseFloat(r[1]);
			var mm = 3;	// mm/px
			switch (r[2] || "px") {
			case "pt":
				return x * 25.4 / 72 * mm;
			case "pc":
				return x * 25.4 / 6 * mm;
			case "in":
				return x * 25.4 * mm;
			case "mm":
				return x * mm;
			case "cm":
				return x * 10 * mm;
			case "em":
				return x * 6 * mm;	// not implemented yet
			case "ex":
				return x * 3 * mm;	// not implemented yet
			case "%":
				return x * size / 100;
			default:
				return x;
			}
		}

		/** Parse the "d" attribute of a path element and define a new path in
			context ctx
			@param {string} d
			@param {boolean=} noDraw
			@return {void}
		*/
		function path(d, noDraw) {
			d = d
				.replace(/\.([0-9]+)(?=\.)/g,".$1 ")	// split e.g. 12.34.56 as 12.34 .56
				.replace(/([.0-9])-/g, "$1 -")
				.replace(/\s*([a-z])\s*/gi, ";$1")
				.replace(/\s*,\s*/g, ",")
				.replace(/\s+/g, ",");

			var x = 0;	// last point
			var y = 0;
			var xc1 = 0;	// implicit control point for S and s
			var yc1 = 0;

			ctx && ctx.beginPath();
			d.slice(1).split(";")
				.forEach(function (c) {
					var cmd = c[0];
					var args = c.length > 1
						? c.slice(1).split(",")
							.map(function (s) { return parseFloat(s); })
						: [];
					switch (cmd) {
					case "M":	// absolute moveTo, then lineTo
						if (args.length >= 2) {
							x = args[0];
							y = args[1];
							ctx && ctx.moveTo(x, y);
							for (var i = 2; i + 1 < args.length; i += 2) {
								x = args[i];
								y = args[i + 1];
								ctx && ctx.lineTo(x, y);
								addPoint(x, y);
							}
							xc1 = x;
							yc1 = y;
						}
						break;
					case "m":	// relative moveTo, then lineTo
						if (args.length >= 2) {
							x += args[0];
							y += args[1];
							ctx && ctx.moveTo(x, y);
							addPoint(x, y);
							for (var i = 2; i + 1 < args.length; i += 2) {
								x += args[i];
								y += args[i + 1]
								ctx && ctx.lineTo(x, y);
								addPoint(x, y);
							}
						}
						xc1 = x;
						yc1 = y;
						break;
					case "L":	// absolute lineTo
						for (var i = 0; i + 1 < args.length; i += 2) {
							x = args[i];
							y = args[i + 1];
							ctx && ctx.lineTo(x, y);
							addPoint(x, y);
						}
						xc1 = x;
						yc1 = y;
						break;
					case "l":	// relative lineTo
						for (var i = 0; i + 1 < args.length; i += 2) {
							x += args[i];
							y += args[i + 1];
							ctx && ctx.lineTo(x, y);
							addPoint(x, y);
						}
						xc1 = x;
						yc1 = y;
						break;
					case "H":	// absolute horizontal lineTo
						for (var i = 0; i < args.length; i++) {
							x = args[i];
							ctx && ctx.lineTo(x, y);
							addPoint(x, y);
						}
						xc1 = x;
						yc1 = y;
						break;
					case "h":	// relative horizontal lineTo
						for (var i = 0; i < args.length; i++) {
							x += args[i];
							ctx && ctx.lineTo(x, y);
							addPoint(x, y);
						}
						xc1 = x;
						yc1 = y;
						break;
					case "V":	// absolute vertical lineTo
						for (var i = 0; i < args.length; i++) {
							y = args[i];
							ctx && ctx.lineTo(x, y);
							addPoint(x, y);
						}
						xc1 = x;
						yc1 = y;
						break;
					case "v":	// relative vertical lineTo
						for (var i = 0; i < args.length; i++) {
							y += args[i];
							ctx && ctx.lineTo(x, y);
							addPoint(x, y);
						}
						xc1 = x;
						yc1 = y;
						break;
					case "A":	// elliptical arc curve, absolute coordinates
						for (var i = 0; i + 6 < args.length; i += 7) {
							var x1 = args[i + 5];
							var y1 = args[i + 6];
							var p = ellipticalArc(args[i], args[i + 1],
								args[i + 2] * Math.PI / 180,
								args[i + 3] != 0, args[i + 4] == 0,
								x, y, x1, y1);
							x = x1;
							y = y1;
							addPoint(p.x, p.y);
							addPoint(x, y);
						}
						xc1 = x;
						yc1 = y;
						break;
					case "a":	// elliptical arc curve, relative coordinates
						for (var i = 0; i + 6 < args.length; i += 7) {
							var x1 = x + args[i + 5];
							var y1 = y + args[i + 6];
							var p = ellipticalArc(args[i], args[i + 1],
								args[i + 2] * Math.PI / 180,
								args[i + 3] != 0, args[i + 4] == 0,
								x, y, x1, y1);
							x = x1;
							y = y1;
							addPoint(p.x, p.y);
							addPoint(x, y);
						}
						xc1 = x;
						yc1 = y;
						break;
					case "C":
						for (var i = 0; i + 5 < args.length; i += 6) {
							ctx && ctx.bezierCurveTo(args[i], args[i + 1],
								args[i + 2], args[i + 3],
								args[i + 4], args[i + 5]);
							x = args[i + 4];
							y = args[i + 5];
							xc1 = 2 * x - args[i + 2];
							yc1 = 2 * y - args[i + 3];
							addPoint(x, y);
						}
						break;
					case "c":
						for (var i = 0; i + 5 < args.length; i += 6) {
							ctx && ctx.bezierCurveTo(x + args[i], y + args[i + 1],
								x + args[i + 2], y + args[i + 3],
								x + args[i + 4], y + args[i + 5]);
							xc1 = x + 2 * args[i + 4] - args[i + 2];
							yc1 = y + 2 * args[i + 5] - args[i + 3];
							x += args[i + 4];
							y += args[i + 5];
							addPoint(x, y);
						}
						break;
					case "S":
						for (var i = 0; i + 3 < args.length; i += 4) {
							ctx && ctx.bezierCurveTo(xc1, yc1,
								args[i], args[i + 1],
								args[i + 2], args[i + 3]);
							x = args[i + 2];
							y = args[i + 3];
							xc1 = 2 * x - args[i];
							yc1 = 2 * y - args[i + 1];
							addPoint(x, y);
						}
						break;
					case "s":
						for (var i = 0; i + 3 < args.length; i += 4) {
							ctx && ctx.bezierCurveTo(xc1, yc1,
								x + args[i], y + args[i + 1],
								x + args[i + 2], y + args[i + 3]);
							xc1 = x - args[i];
							yc1 = y - args[i + 1];
							x += args[i + 2];
							y += args[i + 3];
							addPoint(x, y);
						}
						break;
					case "Q":
						for (var i = 0; i + 3 < args.length; i += 4) {
							ctx && ctx.quadraticCurveTo(args[i], args[i + 1],
								args[i + 2], args[i + 3]);
							x = args[i + 2];
							y = args[i + 3];
							xc1 = 2 * x - args[i];
							yc1 = 2 * y - args[i + 1];
							addPoint(x, y);
						}
						break;
					case "q":
						for (var i = 0; i + 3 < args.length; i += 4) {
							ctx && ctx.quadraticCurveTo(x + args[i], y + args[i + 1],
								x + args[i + 2], y + args[i + 3]);
							xc1 = x + 2 * args[i + 2] - args[i];
							yc1 = y + 2 * args[i + 3] - args[i + 1];
							x += args[i + 2];
							y += args[i + 3];
							addPoint(x, y);
						}
						break;
					case "Z":
					case "z":
						ctx && ctx.closePath();
						break;
					default:
						throw "unimplemented path command: " + cmd;
					}
				});
		}

		/** Convert fill style to something compatible with fillStyle 2d context property
			@param {string} fill
			@return {(string|CanvasGradient)}
		*/
		function decodeFillStyle(fill) {
			/** Fill radialGradient prop object with element attributes
				@param {Element} el
				@param {Object} props
				@return {Object}
			*/
			function fillRadialGradientProps(el, props) {
				// follow link
				if (el.attributes["xlink:href"]) {
					var href = el.getAttribute("xlink:href");
					if (href[0] === "#") {
						var targetEl = self.dom.getElementById(href.slice(1));
						if (targetEl) {
							props = fillRadialGradientProps(targetEl, props);
						}
					}
				}

				// local attributes
				props.cx = el.attributes["cx"] ? parseFloat(el.getAttribute("cx")) : props.cx || 0;
				props.cy = el.attributes["cy"] ? parseFloat(el.getAttribute("cy")) : props.cy || 0;
				props.r = el.attributes["r"] ? parseFloat(el.getAttribute("r")) : props.r || 0;

				// local children
				props.stops = props.stops || [];
				var stopEl = el.getElementsByTagName("stop");
				if (stopEl.length > 0) {
					props.stops = [];
					for (var i = 0; i < stopEl.length; i++) {
						var str = (stopEl[i].getAttribute("offset") || "0").trim();
						var offset = /%$/.test(str) ? parseFloat(str.slice(0, -1)) / 100 : parseFloat(str);
						if (!isNaN(offset) && stopEl[i].attributes["stop-color"]) {
							var color = stopEl[i].getAttribute("stop-color") || "#000";
							if (SVG.colorDict.hasOwnProperty(color)) {
								color = SVG.colorDict[color];
							}
							str = (stopEl[i].getAttribute("stop-opacity") || "1").trim();
							var opacity = /%$/.test(str) ? parseFloat(str.slice(0, -1)) / 100 : parseFloat(str);
							if (opacity !== 1) {
								// convert color and opacity to a single css rgba(...) or hsla(...) spec
								if (/^#[0-9a-f]{3}$/i.test(color)) {
									// #RGB
									color = "rgba(" +
										color
											.slice(1)
											.split("")
											.map(function (s) { return parseInt(s, 16) * 17; })
											.map(function (x) { return x.toString(10); })
											.join(",") +
										"," + opacity.toFixed(2) + ")";
								} else if (/^#[0-9a-f]{6}$/i.test(color)) {
									// #RGB
									color = "rgba(" +
										[color.slice(1, 3), color.slice(3, 5), color.slice(5)]
											.map(function (s) { return parseInt(s, 16); })
											.map(function (x) { return x.toString(10); })
											.join(",") +
										"," + opacity.toFixed(2) + ")";
								} else if (/^rgb(\d+%?(,|\s+)\d+%?(,|\s+)\d+%?)$/i.test(color)) {
									// rgb(r,g,b) or rgb(r g b)
									color = color.slice(0, -1).replace(/\s+/g, ",") +
										"," + opacity.toFixed(2) + ")";
								} else if (/^hsl(\d+%?(,|\s+)\d+%?(,|\s+)\d+%?)$/i.test(color)) {
									// hsl(h,s,l) with h in degrees and s,l as percentages
									color = color.slice(0, -1).replace(/\s+/g, ",") +
										"," + opacity.toFixed(2) + ")";
								}
							}
							props.stops.push({
								offset: offset,
								color: color
							});
						}
					}
				}

				return props;
			}

			// "url(#id)"
			var id = /^url\(#(.+)\)$/.exec(fill);
			if (id && id[1]) {
				var targetEl = self.dom.getElementById(id[1]);
				if (targetEl) {
					switch (targetEl.tagName) {
					case "radialGradient":
						var rg = fillRadialGradientProps(targetEl, {});
						var radialGradient = ctx.createRadialGradient(rg.cx, rg.cy, 0, rg.cx, rg.cy, rg.r);
						for (var i = 0; i < rg.stops.length; i++) {
							radialGradient.addColorStop(rg.stops[i].offset, rg.stops[i].color);
						}
						return radialGradient;
					}
				}
			}
			return fill;
		}

		/** Rounded rect path with circle arcs
			@param {number} x top-left corner
			@param {number} y top-left corner
			@param {number} w
			@param {number} h
			@param {number} rx
			@param {number} ry
			@return {void}
		*/
		function roundedRect(x, y, w, h, rx, ry) {
			if (rx <= 0 || ry <= 0) {
				ctx.rect(x, y, w, h);
			} else {
				var r = Math.min((rx + ry) / 2, Math.min(w, h) / 2);
				// clockwise path from top-right arc
				ctx.moveTo(x + w - r, y);
				ctx.arc(x + w - r, y + r, r, 1.5 * Math.PI, 2 * Math.PI);
				ctx.lineTo(x + w, y + h - r);
				ctx.arc(x + w - r, y + h - r, r, 0, 0.5 * Math.PI);
				ctx.lineTo(x + r, y + h);
				ctx.arc(x + r, y + h - r, r, 0.5 * Math.PI, Math.PI);
				ctx.lineTo(x, y + r);
				ctx.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
				ctx.closePath();
			}
		}

		/** Paint the current path in context ctx using the style defined by baseStyle and overriddenStyle
			@return {void}
		*/
		function paint() {
			if (ctx) {
				var styleStr = (baseStyle || "") + ";" + (overriddenStyle || "");
				var style = parseStyle(styleStr);
				if (style["fill"] && style["fill"] !== "none") {
					ctx.fillStyle = style["fill"] === "white" || style["fill"] === "#fff" || style["fill"] === "#ffffff"
						? "white"
						: decodeFillStyle(style["fill"]) || "none";
					ctx.fill();
				}
				if (style["stroke"] && style["stroke"] !== "none") {
					ctx.lineWidth = lengthToNum(style["stroke-width"] || "1px",
						1,
						100);	// size not implemented yet
					ctx.strokeStyle = style["stroke"] || "none";
					ctx.miterLimit = style["stroke-miterlimit"] || 4;
					ctx.lineJoin = style["stroke-linejoin"] || "miter";
					if (style["stroke-dasharray"]) {
						ctx.setLineDash(style["stroke-dasharray"].split(" ").map(function (s) { return parseFloat(s); }));
						ctx.lineDashOffset = style["stroke-dashoffset"] ? parseFloat(style["stroke-dashoffset"]) : 0;
					}
					ctx.stroke();
				}
			}
		}

		/** Paint text at the specified position, using the style defined by baseStyle and overriddenStyle
			@param {string} str
			@param {number} x
			@param {number} y
			@return {void}
		*/
		function paintText(str, x, y) {
			if (ctx) {
				var styleStr = (baseStyle || "") + ";" + (overriddenStyle || "");
				var style = parseStyle(styleStr);
				var fontSize = style["font-size"] || "12px";
				var fontFamily = style["font-family"] || "helvetica";
				ctx.font = fontSize + " " + fontFamily;
				if (style["fill"] && style["fill"] !== "none") {
					ctx.fillStyle = style["fill"] === "white" || style["fill"] === "#fff" || style["fill"] === "#ffffff"
						? "white"
						: options && options.fill || "silver";
					ctx.fillText(str, x, y);
				}
				if (style["stroke"] && style["stroke"] !== "none") {
					ctx.strokeStyle = options && options.stroke || "black";
					ctx.strokeText(str, x, y);
				}
			}
		}

		/** Draw bounding box for specified points
			@param {Array.<number>} xa
			@param {Array.<number>} ya
			@return {void}
		*/
		function drawBoundingBox(xa, ya) {
			var bnds = SVG.calcBounds({x: xa, y: ya});
			ctx.save();
			ctx.strokeStyle = "black";
			ctx.lineWidth = 1;
			ctx.strokeRect(bnds.xmin, bnds.ymin, bnds.xmax - bnds.xmin, bnds.ymax - bnds.ymin);
			ctx.restore();
		}

		var idAttr = el.getAttribute("id");
		/** @type {SVG.Displacement} */
		var displacement = idAttr && options && options.displacement && options.displacement[idAttr];
		ctx && ctx.save();
		transform.save();
		if (displacement && ctx) {
			applyDisplacement(el, displacement);
		}

		getStyle();

		var ptLen0 = xa.length;

		switch (el.tagName) {
		case "svg":
			drawChildren();
			break;
		case "g":
			drawChildren();
			break;
		case "path":
			ctx && ctx.save();
			transform.save();
			applyTransform(el.getAttribute("transform"));
			path(el.getAttribute("d") || "");
			paint();
			ctx && ctx.restore();
			transform.restore();
			break;
		case "line":
			var x = getArg("x1");
			var y = getArg("y1");
			var x2 = getArg("x2");
			var y2 = getArg("y2");
			ctx && ctx.save();
			transform.save();
			applyTransform(el.getAttribute("transform"));
			ctx && ctx.beginPath();
			ctx && ctx.moveTo(x, y);
			ctx && ctx.lineTo(x2, y2);
			paint();
			addPoint(x, y);
			addPoint(x2, y2);
			ctx && ctx.restore();
			transform.restore();
			break;
		case "polygon":
			var points = el.getAttribute("points")
				.trim()
				.replace(/\s+/g, " ")
				.split(" ")
				.map(function (s) { return parseFloat(s); });
			if (points.length >= 4) {
				ctx && ctx.save();
				transform.save();
				applyTransform(el.getAttribute("transform"));
				ctx && ctx.beginPath();
				ctx && ctx.moveTo(points[0], points[1]);
				addPoint(points[0], points[1]);
				for (var i = 2; i + 1 < points.length; i += 2) {
					ctx && ctx.lineTo(points[i], points[i + 1]);
					addPoint(points[i], points[i + 1]);
				}
				paint();
				ctx && ctx.restore();
				transform.restore();
			}
			break;
		case "circle":
			var x = getArg("cx");
			var y = getArg("cy");
			var r = getArg("r");
			ctx && ctx.save();
			transform.save();
			applyTransform(el.getAttribute("transform"));
			ctx && ctx.beginPath();
			ctx && ctx.arc(x, y, r, 0, 2 * Math.PI);
			paint();
			addPoint(x - r, y - r);
			addPoint(x - r, y + r);
			addPoint(x + r, y - r);
			addPoint(x + r, y + r);
			ctx && ctx.restore();
			transform.restore();
			break;
		case "rect":
			var x = getArg("x");
			var y = getArg("y");
			var width = getArg("width");
			var height = getArg("height");
			var rx = getArg("rx");
			var ry = getArg("ry", rx);
			rx = getArg("rx", ry);
			ctx && ctx.save();
			transform.save();
			applyTransform(el.getAttribute("transform"));
			if (ctx) {
				ctx.beginPath();
				if (rx > 0 || ry > 0) {
					roundedRect(x, y, width, height, rx, ry);
				} else {
					ctx.rect(x, y, width, height);
				}
			}
			paint();
			addPoint(x, y);
			addPoint(x, y + height);
			addPoint(x + width, y);
			addPoint(x + width, y + height);
			ctx && ctx.restore();
			transform.restore();
			break;
		case "text":
			var x = getArg("x");
			var y = getArg("y");
			ctx && ctx.save();
			transform.save();
			applyTransform(el.getAttribute("transform"));
			paintText(el.textContent, x, y);
			addPoint(x, y);
			ctx && ctx.restore();
			transform.restore();
			break;
		}

		ctx && ctx.restore();
		transform.restore();

		ctx && options.drawBoundingBox && drawBoundingBox(xa.slice(ptLen0), ya.slice(ptLen0));
	}

	findCSS(this.root);
	parseCSS();
	var element = this.root;
	if (options && options.elementId) {
		element = this.dom.getElementById(options.elementId);
	} else if (options && options.element) {
		element = options.element;
	}
	if (element) {
		if (options.globalTransform) {
			options.globalTransform(ctx, this.viewBox);
		}

		// collect ancestors
		if (ctx) {
			/** @type {Array.<Element>} */
			var ancestors = [];
			for (var ancestor = element.parentElement;
				ancestor != null;
				ancestor = ancestor.parentElement) {
				ancestors.push(ancestor);
			}
			// apply ancestor transforms from root
			for (var i = ancestors.length - 1; i >= 0; i--) {
				var idAttr = ancestors[i].getAttribute("id");
				/** @type {SVG.Displacement} */
				var displacement = idAttr && options && options.displacement && options.displacement[idAttr];
				if (displacement) {
					applyDisplacement(ancestors[i], displacement);
				}
				var tr = ancestors[i].getAttribute("transform");
				applyTransform(tr);
			}
		}

		drawEl(element);
	}
	return {x: xa, y: ya}
};

/** Calculate element bounds from arrays of coordinates
	@param {{x:Array.<number>,y:Array.<number>}} p list of all points
	@return {{xmin:number,xmax:number,ymin:number,ymax:number}}
*/
SVG.calcBounds = function (p) {
	if (p.x.length === 0) {
		return {xmin: 0, xmax: 0, ymin: 0, ymax: 0};
	}

	var xmin = p.x[0];
	var xmax = p.x[0];
	var ymin = p.y[0];
	var ymax = p.y[0];
	for (var i = 1; i < p.x.length; i++) {
		xmin = Math.min(xmin, p.x[i]);
		xmax = Math.max(xmax, p.x[i]);
		ymin = Math.min(ymin, p.y[i]);
		ymax = Math.max(ymax, p.y[i]);
	}

	return {
		xmin: xmin,
		xmax: xmax,
		ymin: ymin,
		ymax: ymax
	};
};

/** Get element bounds
	@param {string} elementId
	@return {{xmin:number,xmax:number,ymin:number,ymax:number}}
*/
SVG.prototype.getElementBounds = function (elementId) {
	var p = this.draw(null, {elementId: elementId});
	return SVG.calcBounds(p);
};

/** Check if a point is roughly inside an element
	@param {string} elementId
	@param {number} x
	@param {number} y
	@return {boolean}
*/
SVG.prototype.isInside = function (elementId, x, y) {
	var bnds = this.getElementBounds(elementId);
	return x >= bnds.xmin && x <= bnds.xmax && y >= bnds.ymin && y <= bnds.ymax;
};

/** Draw SVG to canvas 2d context from uri
	@param {string} uri
	@param {CanvasRenderingContext2D} ctx
	@param {SVG.Options=} options
*/
SVG.drawFromURI = function (uri, ctx, options) {
	var xhr = new XMLHttpRequest();
	xhr.addEventListener("load", function () {
		var svg = new SVG(this.response);
		svg.draw(ctx, options);
	});
	xhr.open("GET", uri);
	xhr.send();
}
