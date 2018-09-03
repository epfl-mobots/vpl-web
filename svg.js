/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** @const */
var SVG = {};

/** @typedef {{
		elementStyle: (string | undefined),
		style: (Object | undefined),
		transform: (Object | undefined),
		elementId: (string | undefined)
	}}
*/
SVG.Options;

/** Draw SVG from source code
	@param {string} src
	@param {CanvasRenderingContext2D} ctx
	@param {SVG.Options=} options
	@return {{x:Array.<number>,y:Array.<number>}} list of all points
*/
SVG.draw = function (src, ctx, options) {
	var css = "";
	var cssDict = {};

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
		@return {void}
	*/
	function ellipticalArc(rx, ry, a, largeArcFlag, sweepFlag, x1, y1, x2, y2) {
		// avoid singularities
		if (rx === 0 || ry === 0) {
			ctx.moveTo(x2, y2);
			return;
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
		// two solutions; pick the correct one
		if (largeArcFlag === sweepFlag) {
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

	/** Draw an element recusrively
		@param {Element} el
		@param {string=} baseStyle base style, which can be overridden by style defined in SVG children
		@param {string=} overriddenStyle style with higher priority than SVG's
		@return {void}
	*/
	function drawEl(el, baseStyle, overriddenStyle) {
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

		/** Decode transform parameters and apply them to canvas context ctx
			@return {void}
		*/
		function applyTransform() {
			var tr = el.getAttribute("transform");
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
							}
						} else {
							ctx && ctx.rotate(a);
						}
						break;
					default:
						throw "transform not implemented: " + c;
					}
				});
			}
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
				.replace(/([.0-9])-/g, "$1 -")
				.replace(/\s*([a-z])\s*/gi, ";$1")
				.replace(/\s*,\s*/g, ",")
				.replace(/\s+/g, ",");
			var x = 0;
			var y = 0;
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
								xa.push(x);
								ya.push(y);
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
							xa.push(x);
							ya.push(y);
							for (var i = 2; i + 1 < args.length; i += 2) {
								x += args[i];
								y += args[i + 1]
								ctx && ctx.lineTo(x, y);
								xa.push(x);
								ya.push(y);
							}
						}
						break;
					case "L":	// absolute lineTo
						for (var i = 0; i + 1 < args.length; i += 2) {
							x = args[i];
							y = args[i + 1];
							ctx && ctx.lineTo(x, y);
							xa.push(x);
							ya.push(y);
						}
						break;
					case "l":	// relative lineTo
						for (var i = 0; i + 1 < args.length; i += 2) {
							x += args[i];
							y += args[i + 1];
							ctx && ctx.lineTo(x, y);
							xa.push(x);
							ya.push(y);
						}
						break;
					case "H":	// absolute horizontal lineTo
						for (var i = 0; i < args.length; i++) {
							x = args[i];
							ctx && ctx.lineTo(x, y);
							xa.push(x);
							ya.push(y);
						}
						break;
					case "h":	// relative horizontal lineTo
						for (var i = 0; i < args.length; i++) {
							x += args[i];
							ctx && ctx.lineTo(x, y);
							xa.push(x);
							ya.push(y);
						}
						break;
					case "V":	// absolute vertical lineTo
						for (var i = 0; i < args.length; i++) {
							y = args[i];
							ctx && ctx.lineTo(x, y);
							xa.push(x);
							ya.push(y);
						}
						break;
					case "v":	// relative vertical lineTo
						for (var i = 0; i < args.length; i++) {
							y += args[i];
							ctx && ctx.lineTo(x, y);
							xa.push(x);
							ya.push(y);
						}
						break;
					case "A":	// elliptical arc curve, absolute coordinates
						for (var i = 0; i + 6 < args.length; i += 7) {
							var x1 = args[i + 5];
								var y1 = args[i + 6];
							ellipticalArc(args[i], args[i + 1],
								args[i + 2] * Math.PI / 180,
								args[i + 3] != 0, args[i + 4] == 0,
								x, y, x1, y1);
							x = x1;
							y = y1;
							xa.push(x);
							ya.push(y);
						}
						break;
					case "a":	// elliptical arc curve, relative coordinates
						for (var i = 0; i + 6 < args.length; i += 7) {
							var x1 = x + args[i + 5];
								var y1 = y + args[i + 6];
							ellipticalArc(args[i], args[i + 1],
								args[i + 2] * Math.PI / 180,
								args[i + 3] != 0, args[i + 4] == 0,
								x, y, x1, y1);
							x = x1;
							y = y1;
							xa.push(x);
							ya.push(y);
						}
						break;
					case "C":
						for (var i = 0; i + 5 < args.length; i += 6) {
							ctx && ctx.bezierCurveTo(args[i], args[i + 1],
								args[i + 2], args[i + 3],
								args[i + 4], args[i + 5]);
							x = args[i + 4];
							y = args[i + 5];
							xa.push(x);
							ya.push(y);	
						}
						break;
					case "c":
						for (var i = 0; i + 5 < args.length; i += 6) {
							ctx && ctx.bezierCurveTo(x + args[i], y + args[i + 1],
								x + args[i + 2], y + args[i + 3],
								x + args[i + 4], y + args[i + 5]);
							x += args[i + 4];
							y += args[i + 5];
							xa.push(x);
							ya.push(y);
						}
						break;
					case "Q":
						for (var i = 0; i + 3 < args.length; i += 4) {
							ctx && ctx.quadraticCurveTo(args[i], args[i + 1],
								args[i + 2], args[i + 3]);
							x = args[i + 2];
							y = args[i + 3];
							xa.push(x);
							ya.push(y);
						}
						break;
					case "q":
						for (var i = 0; i + 3 < args.length; i += 4) {
							ctx && ctx.quadraticCurveTo(x + args[i], y + args[i + 1],
								x + args[i + 2], y + args[i + 3]);
							x += args[i + 2];
							y += args[i + 3];
							xa.push(x);
							ya.push(y);
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
						: style["fill"] || "none";
					ctx.fill();
				}
				if (style["stroke"] && style["stroke"] !== "none") {
					ctx.lineWidth = lengthToNum(style["stroke-width"] || "1px",
					1,
					100);	// size not implemented yet
					ctx.strokeStyle = style["stroke"] || "none";
					ctx.miterLimit = style["stroke-miterlimit"] || 4;
					ctx.lineJoin = style["stroke-linejoin"] || "miter";
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

		var idAttr = el.getAttribute("id");
		var transformFun = idAttr && options && options.transform && options.transform[idAttr];
		if (transformFun && ctx) {
			ctx.save();
			transformFun(ctx);
		}

		getStyle();
//if (idAttr==="Btn2_Center"||idAttr==="Btn2_Forward") { console.info(idAttr);console.info(elStyle);}

		switch (el.tagName) {
		case "svg":
			drawChildren();
			break;
		case "g":
			drawChildren();
			break;
		case "path":
			ctx && ctx.save();
			applyTransform();
			path(el.getAttribute("d") || "");
			paint();
			ctx && ctx.restore();
			break;
		case "circle":
			ctx && ctx.save();
			applyTransform();
			ctx && ctx.beginPath();
			ctx && ctx.arc(getArg("cx"), getArg("cy"), getArg("r"), 0, 2 * Math.PI);
			paint();
			ctx && ctx.restore();
			break;
		case "rect":
			ctx && ctx.save();
			applyTransform();
			ctx && ctx.beginPath();
			ctx && ctx.rect(getArg("x"), getArg("y"), getArg("width"), getArg("height"));
			paint();
			ctx && ctx.restore();
			break;
		case "text":
			ctx && ctx.save();
			applyTransform();
			painText(el.textContent, getArg("x"), getArg("y"));
			ctx && ctx.restore();
			break;
		}

		if (transformFun && ctx) {
			ctx.restore();
		}
	}

	var domParser = new DOMParser();
	var dom = domParser.parseFromString(src, "text/xml");
	var root = dom["rootElement"];
	findCSS(root);
	parseCSS();
	var element = options && options.elementId ? dom.getElementById(options.elementId) : root;
	if (element) {
		drawEl(element);
	}
	return {x: xa, y: ya}
};

/** Check if a point is roughly inside an element
	@param {string} src
	@param {string} elementId
	@param {number} x
	@param {number} y
	@return {boolean}
*/
SVG.isInside = function (src, elementId, x, y) {
	var p = SVG.draw(src, null, {elementId: elementId});
	if (p.x.length === 0) {
		return false;
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

	return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
};

/** Draw SVG to canvas 2d context from uri
	@param {string} uri
	@param {CanvasRenderingContext2D} ctx
	@param {SVG.Options=} options
*/
SVG.drawFromURI = function (uri, ctx, options) {
	var xhr = new XMLHttpRequest();
	xhr.addEventListener("load", function () {
		SVG.draw(this.response, ctx, options);
	});
	xhr.open("GET", uri);
	xhr.send();
}
