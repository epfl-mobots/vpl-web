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

Implementation of class SVG.Preparsed, a subclass and extension of SVG
which accelerates the repeated rendering of SVG elements while still supporting
element styling.

*/

/** SVG top Object
	@constructor
	@extends {SVG}
	@param {string} src
*/
SVG.Preparsed = function (src) {
	SVG.call(this, src);

	this.doc = {};
	this.idCache = {};
	this.cssDict = {};
	this.parse();
};
SVG.Preparsed.prototype = Object.create(SVG.prototype);
SVG.Preparsed.prototype.constructor = SVG.Preparsed;

/** Parse SVG and convert it to this.doc
	@return {void}
*/
SVG.Preparsed.prototype.parse = function () {
	var self = this;

	var css = "";

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
		@return {Object}
	*/
	function parseCSS() {
		var cssDict = {};
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
		return cssDict;
	}

	/** Decode transform parameters
		@param {string} tr value of attribute "transform"
		@return {Array.<{cmd:string,args:Array.<number>}>}
	*/
	function parseTransform(tr) {
		if (tr) {
			tr = tr
				.replace(/\s*\(\s*/g, "(")
				.replace(/\s*\)\s*/g, ")")
				.replace(/ +,/g, ",")
				.replace(/, +/g, ",")
				.replace(/ +/g, ",");
			var tra = tr.split(")");
			return tra.slice(0, -1).map(function (t) {
				var c = t.split("(")[0];
				var args = t.split("(")[1].split(",")
					.map(function (s) { return parseFloat(s); });
				switch (c) {
				case "translate":
					return {cmd: c, args: [args[0] || 0, args[1] || 0]};
				case "rotate":
					var a = (args[0] || 0) * Math.PI / 180;
					var x0 = args[1] || 0;
					var y0 = args[2] || 0;
					return {cmd: c, args: [a, x0, y0]};
				case "scale":
					var scx = args[0] || 1;
					var scy = args[1] || scx;
					return {cmd: c, args: [scx, scy]};
				case "matrix":
					return {cmd: c, args: args};
				default:
					throw "transform not implemented: " + c;
				}
			});
		}
		return null;
	}

	/** Parse an element recursively
		@param {Element} el
		@param {Object} parent
		@return {Object}
	*/
	function parseEl(el, parent) {

		/** Parse all children
			@param {Object} parent
			@return {Array.<Object>}
		*/
		function parseChildren(parent) {
			var children = [];
			for (var i = 0; i < el.childElementCount; i++) {
				var obj = parseEl(el.children[i], parent);
				if (obj) {
					children.push(obj);
				}
			}
			return children;
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

		/** Get style of element el using its style and class
			attributes, if they exist
			@return {Object}
		*/
		function getStyle() {
			var styleStr = el.getAttribute("style") || "";
			var classAttr = el.getAttribute("class");
			if (classAttr && self.cssDict.hasOwnProperty(classAttr)) {
				styleStr = self.cssDict[classAttr] + ";" + styleStr;
			}
			var styleDict = {};
			SVG.parseStyle(styleDict, styleStr);

			var styleAttr;
			styleAttr = el.getAttribute("fill");
			if (styleAttr) {
				styleDict["fill"] = styleAttr;
			}
			styleAttr = el.getAttribute("stroke");
			if (styleAttr) {
				styleDict["stroke"] = styleAttr;
			}
			styleAttr = el.getAttribute("stroke-width");
			if (styleAttr) {
				styleDict["stroke-width"] = styleAttr;
			}
			styleAttr = el.getAttribute("stroke-dasharray");
			if (styleAttr) {
				styleDict["stroke-dasharray"] = styleAttr.split(",");
			}
			styleAttr = el.getAttribute("stroke-dashoffset");
			if (styleAttr) {
				styleDict["stroke-dashoffset"] = styleAttr;
			}
			var idAttr = el.getAttribute("id");
			if (idAttr) {
				styleDict["id"] = idAttr;
			}
			return styleDict;
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
			var r = /^\s*(-?[0-9.]+)\s*([a-z%]*)\s*$/i.exec(length);
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

		/** Parse the "d" attribute of a path element and convert it to an array of commands
			@param {string} d
			@return {Array.<{cmd:string,args:Array.<number>}>}
		*/
		function path(d) {
			d = d
				.replace(/\.([0-9]+)(?=\.)/g,".$1 ")	// split e.g. 12.34.56 as 12.34 .56
				.replace(/([.0-9])-/g, "$1 -")
				.replace(/\s*([a-z])\s*/gi, ";$1")
				.replace(/\s*,\s*/g, ",")
				.replace(/\s+/g, ",");

			/** @type {Array.<{cmd:string,args:Array.<number>}>} */
			var cmds = [];

			var x = 0;	// last point
			var y = 0;
			var xc1 = 0;	// implicit control point for S and s
			var yc1 = 0;
			var xSubPath0 = 0;	// initial point of current subpath
			var ySubPath0 = 0;

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
							xSubPath0 = x;
							ySubPath0 = y;
							cmds.push({cmd: "M", args: [x, y]});

							for (var i = 2; i + 1 < args.length; i += 2) {
								x = args[i];
								y = args[i + 1];
								cmds.push({cmd: "L", args: [x, y]});
							}
							xc1 = x;
							yc1 = y;
						}
						break;
					case "m":	// relative moveTo, then lineTo
						if (args.length >= 2) {
							x += args[0];
							y += args[1];
							xSubPath0 = x;
							ySubPath0 = y;
							cmds.push({cmd: "M", args: [x, y]});

							for (var i = 2; i + 1 < args.length; i += 2) {
								x += args[i];
								y += args[i + 1]
								cmds.push({cmd: "L", args: [x, y]});
							}
						}
						xc1 = x;
						yc1 = y;
						break;
					case "L":	// absolute lineTo
						for (var i = 0; i + 1 < args.length; i += 2) {
							x = args[i];
							y = args[i + 1];
							cmds.push({cmd: "L", args: [x, y]});
						}
						xc1 = x;
						yc1 = y;
						break;
					case "l":	// relative lineTo
						for (var i = 0; i + 1 < args.length; i += 2) {
							x += args[i];
							y += args[i + 1];
							cmds.push({cmd: "L", args: [x, y]});
						}
						xc1 = x;
						yc1 = y;
						break;
					case "H":	// absolute horizontal lineTo
						for (var i = 0; i < args.length; i++) {
							x = args[i];
							cmds.push({cmd: "L", args: [x, y]});
						}
						xc1 = x;
						yc1 = y;
						break;
					case "h":	// relative horizontal lineTo
						for (var i = 0; i < args.length; i++) {
							x += args[i];
							cmds.push({cmd: "L", args: [x, y]});
						}
						xc1 = x;
						yc1 = y;
						break;
					case "V":	// absolute vertical lineTo
						for (var i = 0; i < args.length; i++) {
							y = args[i];
							cmds.push({cmd: "L", args: [x, y]});
						}
						xc1 = x;
						yc1 = y;
						break;
					case "v":	// relative vertical lineTo
						for (var i = 0; i < args.length; i++) {
							y += args[i];
							cmds.push({cmd: "L", args: [x, y]});
						}
						xc1 = x;
						yc1 = y;
						break;
					case "A":	// elliptical arc curve, absolute coordinates
						for (var i = 0; i + 6 < args.length; i += 7) {
							var x1 = args[i + 5];
							var y1 = args[i + 6];
							cmds.push({
								cmd: "A",
								args: [
									args[i], args[i + 1],
									args[i + 2] * Math.PI / 180,
									args[i + 3] != 0 ? 1 : 0, args[i + 4] == 0 ? 1 : 0,
									x, y, x1, y1
								]
							});
							x = x1;
							y = y1;
						}
						xc1 = x;
						yc1 = y;
						break;
					case "a":	// elliptical arc curve, relative coordinates
						for (var i = 0; i + 6 < args.length; i += 7) {
							var x1 = x + args[i + 5];
							var y1 = y + args[i + 6];
							cmds.push({
								cmd: "A",
								args: [
									args[i], args[i + 1],
									args[i + 2] * Math.PI / 180,
									args[i + 3] != 0, args[i + 4] == 0,
									x, y, x1, y1
								]
							});
							x = x1;
							y = y1;
						}
						xc1 = x;
						yc1 = y;
						break;
					case "C":
						for (var i = 0; i + 5 < args.length; i += 6) {
							cmds.push({cmd: "C", args: args.slice(i, i + 6)});
							x = args[i + 4];
							y = args[i + 5];
							xc1 = 2 * x - args[i + 2];
							yc1 = 2 * y - args[i + 3];
						}
						break;
					case "c":
						for (var i = 0; i + 5 < args.length; i += 6) {
							cmds.push({
								cmd: "C",
								args: [
									x + args[i], y + args[i + 1],
									x + args[i + 2], y + args[i + 3],
									x + args[i + 4], y + args[i + 5]
								]
							});
							xc1 = x + 2 * args[i + 4] - args[i + 2];
							yc1 = y + 2 * args[i + 5] - args[i + 3];
							x += args[i + 4];
							y += args[i + 5];
						}
						break;
					case "S":
						for (var i = 0; i + 3 < args.length; i += 4) {
							cmds.push({
								cmd: "S",
								args: [
									xc1, yc1,
									args[i], args[i + 1],
									args[i + 2], args[i + 3]
								]
							});
							x = args[i + 2];
							y = args[i + 3];
							xc1 = 2 * x - args[i];
							yc1 = 2 * y - args[i + 1];
						}
						break;
					case "s":
						for (var i = 0; i + 3 < args.length; i += 4) {
							cmds.push({
								cmd: "S",
								args: [
									xc1, yc1,
									x + args[i], y + args[i + 1],
									x + args[i + 2], y + args[i + 3]
								]
							});
							xc1 = x - args[i];
							yc1 = y - args[i + 1];
							x += args[i + 2];
							y += args[i + 3];
						}
						break;
					case "Q":
						for (var i = 0; i + 3 < args.length; i += 4) {
							cmds.push({
								cmd: "Q",
								args: [
									args[i], args[i + 1],
									args[i + 2], args[i + 3]
								]
							});
							x = args[i + 2];
							y = args[i + 3];
							xc1 = 2 * x - args[i];
							yc1 = 2 * y - args[i + 1];
						}
						break;
					case "q":
						for (var i = 0; i + 3 < args.length; i += 4) {
							cmds.push({
								cmd: "Q",
								args: [
									x + args[i], y + args[i + 1],
									x + args[i + 2], y + args[i + 3]
								]
							});
							xc1 = x + 2 * args[i + 2] - args[i];
							yc1 = y + 2 * args[i + 3] - args[i + 1];
							x += args[i + 2];
							y += args[i + 3];
						}
						break;
					case "T":
						for (var i = 0; i + 1 < args.length; i += 2) {
							cmds.push({
								cmd: "Q",
								args: [
									xc1, yc1,
									args[i], args[i + 1]
								]
							});
							x = args[i];
							y = args[i + 1];
							xc1 = 2 * x - xc1;
							yc1 = 2 * y - yc1;
						}
						break;
					case "t":
						for (var i = 0; i + 1 < args.length; i += 2) {
							cmds.push({
								cmd: "Q",
								args: [
									xc1, yc1,
									x + args[i], y + args[i + 1]
								]
							});
							x += args[i];
							y += args[i + 1];
							xc1 = 2 * x - xc1;
							yc1 = 2 * y - yc1;
						}
						break;
					case "Z":
					case "z":
						x = xSubPath0;
						y = ySubPath0;
						cmds.push({cmd: "Z", args: []});
						break;
					default:
						throw "unimplemented path command: " + cmd;
					}
				});

			return cmds;
		}

		var idAttr = el.getAttribute("id");
		var style = getStyle();

		var obj = {
			name: el.tagName,
			id: idAttr,
			style: style,
			parent: parent
		};

		switch (el.tagName) {
		case "svg":
			obj.children = parseChildren(obj);
			break;
		case "g":
			obj.children = parseChildren(obj);
			obj.transform = parseTransform(el.getAttribute("transform"));
			break;
		case "path":
			obj.path = path(el.getAttribute("d") || "");
			obj.transform = parseTransform(el.getAttribute("transform"));
			break;
		case "line":
			obj.x1 = getArg("x1");
			obj.y1 = getArg("y1");
			obj.x2 = getArg("x2");
			obj.y2 = getArg("y2");
			obj.transform = parseTransform(el.getAttribute("transform"));
			break;
		case "polygon":
		case "polyline":
			obj.points = el.getAttribute("points")
				.trim()
				.replace(/\s+/g, " ")
				.split(" ")
				.map(function (s) { return parseFloat(s); });
			obj.transform = parseTransform(el.getAttribute("transform"));
			break;
		case "circle":
			obj.x = getArg("cx");
			obj.y = getArg("cy");
			obj.r = getArg("r");
			obj.transform = parseTransform(el.getAttribute("transform"));
			break;
		case "rect":
			obj.x = getArg("x");
			obj.y = getArg("y");
			obj.width = getArg("width");
			obj.height = getArg("height");
			var rx = getArg("rx");
			var ry = getArg("ry", rx);
			rx = getArg("rx", ry);
			obj.rx = rx;
			obj.ry = ry;
			obj.transform = parseTransform(el.getAttribute("transform"));
			break;
		case "text":
			obj.x = getArg("x");
			obj.y = getArg("y");
			obj.text = el.textContent;
			obj.transform = parseTransform(el.getAttribute("transform"));
			break;
		default:
			return null;
		}

		return obj;
	}

	findCSS(this.root);
	this.cssDict = parseCSS();

	if (this.root) {
		this.doc = parseEl(this.root, null);
	}
};

/** Find object by id
	@param {string} id
	@return {?Object}
*/
SVG.Preparsed.prototype.findById = function (id) {
	/** Find in element by id
	*/
	function findById(el, id) {
		if (el.id === id) {
			return el;
		} else if (el.children) {
			for (var i = 0; i < el.children.length; i++) {
				var r = findById(el.children[i], id);
				if (r) {
					return r;
				}
			}
		}
		return null;
	}

	if (this.idCache[id]) {
		return this.idCache[id];
	}

	var obj = findById(this.doc, id);
	if (obj) {
		this.idCache[id] = obj;
	}
	return obj;
};

/** Decode transform parameters and apply them using callbacks
	@param {Array.<{cmd:string,args:Array.<number>}>} tr parsed attribute "transform"
	@param {function(number,number):void} doTranslate
	@param {function(number):void} doRotate
	@param {function(number,number):void} doScale
	@param {function(number,number,number,number,number,number):void} doApplyMatrix
	@return {void}
*/
SVG.Preparsed.applyTransform = function (tr, doTranslate, doRotate, doScale, doApplyMatrix) {
	if (tr) {
		tr.forEach(function (t) {
			switch (t.cmd) {
			case "translate":
				doTranslate(t.args[0], t.args[1]);
				break;
			case "rotate":
				if (t.args[1] !== 0 || t.args[2] !== 0) {
					doTranslate(-t.args[1], -t.args[2]);
					doRotate(t.args[0]);
					doTranslate(t.args[1], t.args[2]);
				} else {
					doRotate(t.args[0]);
				}
				break;
			case "scale":
				doScale(t.args[0], t.args[1]);
				break;
			case "matrix":
				doApplyMatrix(t.args[0], t.args[1], t.args[2], t.args[3], t.args[4], t.args[5]);
				break;
			}
		});
	}
};

/** @inheritDoc
*/
SVG.Preparsed.prototype.draw = function (ctx, options) {
	var self = this;

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
			ctx && ctx.lineTo(x2, y2);
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

	/** Apply displacement to context (not to transform)
		@param {Object} el
		@param {SVG.Displacement} displacement
		@return {void}
	*/
	function applyDisplacement(el, displacement) {
		if (displacement.phi && displacement.phi != 0) {
			var x0 = displacement.x0;
			var y0 = displacement.y0;
			if (x0 == undefined || y0 == undefined) {
				var p = self.draw(null, {obj: el});
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

	/** Apply clip
		@param {SVG.ClipRect} clip
		@return {void}
	*/
	function applyClip(clip) {
		ctx.beginPath();
		ctx.rect(clip.x, clip.y, clip.w, clip.h);
		ctx.clip();
	}

	/** Decode transform parameters and apply them to canvas context ctx
		@param {Array.<{cmd:string,args:Array.<number>}>} tr parsed attribute "transform"
		@return {void}
	*/
	function applyTransform(tr) {
		SVG.Preparsed.applyTransform(tr,
			function (dx, dy) {
				ctx && ctx.translate(dx, dy);
				transform.translate(dx, dy);
			},
			function (a) {
				ctx && ctx.rotate(a);
				transform.rotate(a);
			},
			function (scx, scy) {
				ctx && ctx.scale(scx, scy);
				transform.scale(scx, scy);
			},
			function (a, b, c, d, e, f) {
				ctx && ctx.transform(a, b, c, d, e, f);
				transform.matrix(a, b, c, d, e, f);
			});
	}

	/** Draw an element recursively
		@param {Object} el
		@param {Object} baseStyleDict base style, which can be overridden by style defined in SVG children
		@param {Object} overriddenStyleDict style with higher priority than SVG's
		@return {void}
	*/
	var drawEl = function (el, baseStyleDict, overriddenStyleDict) {
		/** Draw all children
			@return {void}
		*/
		function drawChildren() {
			for (var i = 0; i < el.children.length; i++) {
				drawEl(el.children[i], baseStyleDict, overriddenStyleDict);
			}
		}

		/** Add a pair of points to xa and ya, taking current transform into account
			@return {void}
		*/
		function addPoint(x, y) {
			var pt = transform.apply(new SVG.Transform.Point(x, y));
			xa.push(pt.x);
			ya.push(pt.y);
		}

		/** Change baseStyleDict and overriddenStyleDict for element el using its style and class
			attributes, if they exist
			@return {void}
		*/
		function getStyle() {
			if (el.style) {
				SVG.mergeStyle(baseStyleDict, el.style);
			}
			if (options && options.elementStyle) {
				SVG.parseStyle(baseStyleDict, options.elementStyle);
			}

			if (el.id && options && options.style && options.style.hasOwnProperty(el.id)) {
				SVG.parseStyle(overriddenStyleDict, options.style[el.id]);
			}
			// style[!otherId]? Try to find !otherId
			for (var notOtherId in options.style) {
				if (options.style.hasOwnProperty(notOtherId) &&
					notOtherId[0] === "!" && notOtherId.slice(1) !== el.id) {
					// !otherId with otherId != id: add style
					SVG.parseStyle(overriddenStyleDict, options.style[notOtherId]);
				}
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
			var r = /^\s*(-?[0-9.]+)\s*([a-z%]*)\s*$/i.exec(length);
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

		/** Use the parsed "d" attribute of a path element and define a new path in
			context ctx
			@param {Array.<{cmd:string,args:Array.<number>}>} d
			@return {void}
		*/
		function path(d) {
			var x = 0;	// last point
			var y = 0;
			var xc1 = 0;	// implicit control point for S and s
			var yc1 = 0;

			// collection of points for polyline or polygon
			/** @type {Array.<number>} */
			var polyX = [];
			/** @type {Array.<number>} */
			var polyY = [];
			var polyDoCollect = true;

			ctx && ctx.beginPath();
			d.forEach(function (c) {
					switch (c.cmd) {
					case "M":	// absolute moveTo, then lineTo
						if (c.args.length >= 2) {
							x = c.args[0];
							y = c.args[1];
							ctx && ctx.moveTo(x, y);
							addPoint(x, y);

							if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
								// cb for previous polyline
								options.cb.line(polyX, polyY, false);
							}
							polyDoCollect = true;
							polyX = xa.slice(-1);
							polyY = ya.slice(-1);
							xc1 = x;
							yc1 = y;
						}
						break;
					case "L":	// absolute lineTo
						x = c.args[0];
						y = c.args[1];
						ctx && ctx.lineTo(x, y);
						addPoint(x, y);
						polyX.push(xa[xa.length - 1]);
						polyY.push(ya[ya.length - 1]);
						xc1 = x;
						yc1 = y;
						break;
					case "A":	// elliptical arc curve, absolute coordinates
						var x1 = c.args[5];
						var y1 = c.args[6];
						var p = ellipticalArc(c.args[0], c.args[1],
							c.args[2],
							c.args[3] != 0, c.args[4] != 0,
							c.args[5], c.args[6], c.args[7], c.args[8]);
						x = x1;
						y = y1;
						addPoint(p.x, p.y);
						addPoint(x, y);
						polyDoCollect = false;
						xc1 = x;
						yc1 = y;
						break;
					case "C":
						ctx && ctx.bezierCurveTo(c.args[0], c.args[1],
							c.args[2], c.args[3],
							c.args[4], c.args[5]);
						x = c.args[4];
						y = c.args[5];
						xc1 = 2 * x - c.args[2];
						yc1 = 2 * y - c.args[3];
						addPoint(x, y);
						polyDoCollect = false;
						break;
					case "S":
						ctx && ctx.bezierCurveTo(c.args[0], c.args[1],
							c.args[2], c.args[3],
							c.args[4], c.args[5]);
						x = c.args[4];
						y = c.args[5];
						xc1 = 2 * x - c.args[0];
						yc1 = 2 * y - c.args[1];
						addPoint(x, y);
						polyDoCollect = false;
						break;
					case "Q":
						ctx && ctx.quadraticCurveTo(c.args[0], c.args[1],
							c.args[2], c.args[3]);
						x = c.args[2];
						y = c.args[3];
						xc1 = 2 * x - c.args[0];
						yc1 = 2 * y - c.args[1];
						addPoint(x, y);
						polyDoCollect = false;
						break;
					case "Z":
						ctx && ctx.closePath();
						if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
							// cb for previous polygon
							options.cb.line(polyX, polyY, true);
						}
						polyDoCollect = true;
						polyX = [];
						polyY = [];
						break;
					}
				});

				if (polyDoCollect && polyX.length > 1 && options && options.cb && options.cb.line) {
					// cb for last polyline
					options.cb.line(polyX, polyY, false);
				}
		}

		/** Convert fill style to something compatible with fillStyle 2d context property
			@param {string} fill
			@return {(string|CanvasGradient)}
		*/
		function decodeFillStyle(fill) {
			/** Decode stops array
				@param {NodeList<!Element>} stopEl
				@return {void}
			*/
			function fillStopArray(stops, stopEl) {
				if (stopEl.length > 0) {
					stops.splice(0, stops.length);
					for (var i = 0; i < stopEl.length && (!SVG.noGradient || i < 1); i++) {
						var str = (stopEl[i].getAttribute("offset") || "0").trim();
						var offset = /%$/.test(str) ? parseFloat(str.slice(0, -1)) / 100 : parseFloat(str);
						var style = stopEl[i].getAttribute("style");
						var styleDict = {};
						if (style) {
							SVG.parseStyle(styleDict, style);
						}
						if (!isNaN(offset)) {
							var color = stopEl[i].getAttribute("stop-color") || styleDict["stop-color"] || "#000";
							if (SVG.colorDict.hasOwnProperty(color)) {
								color = SVG.colorDict[color];
							}
							str = (stopEl[i].getAttribute("stop-opacity") || styleDict["stop-opacity"] || "1").trim();
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
							stops.push({
								offset: offset,
								color: color
							});
						}
					}
				}
			}

			/** Fill linearGradient prop object with element attributes
				@param {Element} el
				@param {Object} props
				@return {Object}
			*/
			function fillLinearGradientProps(el, props) {
				// follow link
				if (el.attributes["xlink:href"]) {
					var href = el.getAttribute("xlink:href");
					if (href[0] === "#") {
						var targetEl = self.dom.getElementById(href.slice(1));
						if (targetEl) {
							props = fillLinearGradientProps(targetEl, props);
						}
					}
				}

				// local attributes
				props.x1 = el.attributes["x1"] ? parseFloat(el.getAttribute("x1")) : props.x1 || 0;
				props.y1 = el.attributes["y1"] ? parseFloat(el.getAttribute("y1")) : props.y1 || 0;
				props.x2 = el.attributes["x2"] ? parseFloat(el.getAttribute("x2")) : props.x2 || 0;
				props.y2 = el.attributes["y2"] ? parseFloat(el.getAttribute("y2")) : props.y2 || 0;
				props.gradientUnits = el.attributes["gradientUnits"]
					? el.getAttribute("gradientUnits")
					: props.gradientUnits || "objectBoundingBox";
				props.gradientTransform = el.attributes["gradientTransform"]
					? el.getAttribute("gradientTransform")
					: props.gradientTransform || "";

				// local children
				props.stops = props.stops || [];
				var stopEl = el.getElementsByTagName("stop");
				fillStopArray(props.stops, stopEl);

				return props;
			}

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
				props.gradientUnits = el.attributes["gradientUnits"]
					? el.getAttribute("gradientUnits")
					: props.gradientUnits || "objectBoundingBox";
				props.gradientTransform = el.attributes["gradientTransform"]
					? el.getAttribute("gradientTransform")
					: props.gradientTransform || "";

				// local children
				props.stops = props.stops || [];
				var stopEl = el.getElementsByTagName("stop");
				fillStopArray(props.stops, stopEl);

				return props;
			}

			// "url(#id)"
			var id = /^url\(#(.+)\)$/.exec(fill);
			if (id && id[1]) {
				var targetEl = self.dom.getElementById(id[1]);
				if (targetEl) {
					switch (targetEl.tagName) {
					case "linearGradient":
						var lg = fillLinearGradientProps(targetEl, {});
						if (lg.gradientUnits === "objectBoundingBox") {
							throw "objectBoundingBox not supported";
						}
						if (lg.gradientTransform) {
							var gradientTransform = new SVG.Transform();
							SVG.applyTransformTo(lg.gradientTransform, gradientTransform);
							throw "gradientTransform not supported";
						}
						var linearGradient = ctx.createLinearGradient(lg.x1, lg.y1, lg.x2, lg.y2);
						for (var i = 0; i < lg.stops.length; i++) {
							linearGradient.addColorStop(lg.stops[i].offset, lg.stops[i].color);
						}
						return linearGradient;
					case "radialGradient":
						var rg = fillRadialGradientProps(targetEl, {});
						if (rg.gradientUnits === "objectBoundingBox") {
							throw "objectBoundingBox not supported";
						}
						if (rg.gradientTransform) {
							var gradientTransform = new SVG.Transform();
							SVG.applyTransformTo(rg.gradientTransform, gradientTransform);
							var centerTr = gradientTransform.applyInverse(/** @type {SVG.Transform.Point} */({x: rg.cx, y: rg.cy}));
							var radiusTr = rg.r / gradientTransform.getScale();
							rg.cx = centerTr.x;
							rg.cy = centerTr.y;
							rg.r = radiusTr;
						}
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

		/** Paint the current path in context ctx using the style defined by baseStyleDict and overriddenStyleDict
			@return {void}
		*/
		function paint() {
			if (ctx) {
				var style = {};
				if (baseStyleDict) {
					SVG.mergeStyle(style, baseStyleDict);
				}
				if (overriddenStyleDict) {
					SVG.mergeStyle(style, overriddenStyleDict);
				}
				if (style["visibility"] !== "hidden") {
					if (style["opacity"]) {
						ctx.globalAlpha *= parseFloat(style["opacity"]);
					}
					if (!style["fill"] || style["fill"] !== "none") {
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
						ctx.lineCap = style["stroke-linecap"] || "butt";
						if (style["stroke-dasharray"]) {
							ctx.setLineDash(style["stroke-dasharray"].split(" ").map(function (s) { return parseFloat(s); }));
							ctx.lineDashOffset = style["stroke-dashoffset"] ? parseFloat(style["stroke-dashoffset"]) : 0;
						}
						ctx.stroke();
					}
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
				var style = {};
				if (baseStyleDict) {
					SVG.mergeStyle(style, baseStyleDict);
				}
				if (overriddenStyleDict) {
					SVG.mergeStyle(style, overriddenStyleDict);
				}
				if (style["visibility"] !== "hidden") {
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

		/** @type {SVG.Displacement} */
		var displacement = el.id && options && options.displacement && options.displacement[el.id];
		var clip = el.id && options && options.clips && options.clips[el.id];
		ctx && ctx.save();
		transform.save();
		if (displacement && ctx) {
			applyDisplacement(el, displacement);
		}
		if (clip && ctx) {
			applyClip(clip);
		}

		// get style without modifying original values passed by reference
		baseStyleDict = SVG.copyStyle(baseStyleDict);
		overriddenStyleDict = SVG.copyStyle(overriddenStyleDict);
		getStyle();

		var ptLen0 = xa.length;

		switch (el.name) {
		case "svg":
			transform.save();
			applyTransform(el.transform);
			drawChildren();
			transform.restore();
			break;
		case "g":
			transform.save();
			applyTransform(el.transform);
			drawChildren();
			transform.restore();
			break;
		case "path":
			ctx && ctx.save();
			transform.save();
			applyTransform(el.transform);
			path(el.path);
			paint();
			ctx && ctx.restore();
			transform.restore();
			break;
		case "line":
			ctx && ctx.save();
			transform.save();
			applyTransform(el.transform);
			ctx && ctx.beginPath();
			ctx && ctx.moveTo(el.x1, el.y1);
			ctx && ctx.lineTo(el.x2, el.y2);
			paint();
			addPoint(el.x1, el.y1);
			addPoint(el.x2, el.y2);
			if (options && options.cb && options.cb.line) {
				options.cb.line([el.x1, el.x2], [el.y1, el.y2], false);
			}
			ctx && ctx.restore();
			transform.restore();
			break;
		case "polygon":
		case "polyline":
			if (el.points.length >= 4) {
				ctx && ctx.save();
				transform.save();
				applyTransform(el.transform);
				ctx && ctx.beginPath();
				ctx && ctx.moveTo(el.points[0], el.points[1]);
				addPoint(el.points[0], el.points[1]);
				for (var i = 2; i + 1 < el.points.length; i += 2) {
					ctx && ctx.lineTo(el.points[i], el.points[i + 1]);
					addPoint(el.points[i], el.points[i + 1]);
				}
				if (el.name === "polygon") {
					ctx && ctx.closePath();
				}
				paint();
				if (options && options.cb && options.cb.line) {
					options.cb.line(xa.slice(-el.points.length / 2), ya.slice(-el.points.length / 2),
						el.name === "polygon");
				}
				ctx && ctx.restore();
				transform.restore();
			}
			break;
		case "circle":
			ctx && ctx.save();
			transform.save();
			applyTransform(el.transform);
			ctx && ctx.beginPath();
			ctx && ctx.arc(el.x, el.y, el.r, 0, 2 * Math.PI);
			paint();
			addPoint(el.x - el.r, el.y - el.r);
			addPoint(el.x - el.r, el.y + el.r);
			addPoint(el.x + el.r, el.y - el.r);
			addPoint(el.x + el.r, el.y + el.r);
			if (options && options.cb && options.cb.circle) {
				// check that last 4 points in xa,ya make a square (parallelogram is guarranteed)
				var x4 = xa.slice(-4);
				var y4 = ya.slice(-4);
				var diag12 = (x4[3] - x4[0]) * (x4[3] - x4[0]) + (y4[3] - y4[0]) * (y4[3] - y4[0]);
				var diag22 = (x4[2] - x4[1]) * (x4[2] - x4[1]) + (y4[2] - y4[1]) * (y4[2] - y4[1]);
				// diagonals have same length and are perpendicular
				if (Math.abs(diag12 - diag22) / (diag12 + diag22) < 1e-3 &&
					((x4[3] - x4[0]) * (x4[2] - x4[1]) + (y4[3] - y4[0]) * (y4[2] - y4[1])) / diag12 < 1e-3) {
					options.cb.circle((x4[0] + x4[2]) / 2, (y4[0] + y4[2]) / 2, Math.sqrt(diag12 / 8));
				}
			}
			ctx && ctx.restore();
			transform.restore();
			break;
		case "rect":
			ctx && ctx.save();
			transform.save();
			applyTransform(el.transform);
			if (ctx) {
				ctx.beginPath();
				if (el.rx > 0 || el.ry > 0) {
					roundedRect(el.x, el.y, el.width, el.height, el.rx, el.ry);
				} else {
					ctx.rect(el.x, el.y, el.width, el.height);
				}
			}
			paint();
			addPoint(el.x, el.y);
			addPoint(el.x, el.y + el.height);
			addPoint(el.x + el.width, el.y);
			addPoint(el.x + el.width, el.y + el.height);
			ctx && ctx.restore();
			transform.restore();
			break;
		case "text":
			ctx && ctx.save();
			transform.save();
			applyTransform(el.transform);
			paintText(el.text, el.x, el.y);
			addPoint(el.x, el.y);
			ctx && ctx.restore();
			transform.restore();
			break;
		}

		ctx && ctx.restore();
		transform.restore();

		ctx && options && options.drawBoundingBox && drawBoundingBox(xa.slice(ptLen0), ya.slice(ptLen0));
	}

	var element = this.doc;
	if (options && options.elementId) {
		element = this.findById(options.elementId);
	} else if (options && options.obj) {
		element = options.obj;
	}
	if (element) {
		if (options && options.globalTransform) {
			options.globalTransform(ctx, this.viewBox);
		}

		// collect ancestors
		if (ctx) {
			/** @type {Array.<Object>} */
			var ancestors = [];
			for (var ancestor = element.parentElement;
				ancestor != null;
				ancestor = ancestor.parentElement) {
				ancestors.push(ancestor);
			}
			// apply ancestor transforms from root
			for (var i = ancestors.length - 1; i >= 0; i--) {
				var idAttr = ancestors[i].id;
				/** @type {SVG.Displacement} */
				var displacement = idAttr && options && options.displacement && options.displacement[idAttr];
				if (displacement) {
					applyDisplacement(ancestors[i], displacement);
				}
				var tr = ancestors[i].transform;
				applyTransform(tr);
			}
		}

		drawEl(element, {}, {});
	}
	return {x: xa, y: ya}
};

/** Find a descendent specified by id
	@param {Object} root
	@param {string} elementId
	@return {Object}
*/
SVG.Preparsed.findDescendentElement = function (root, elementId) {
	if (root.id === elementId) {
		return root;
	}
	if (root.children) {
		for (var i = 0; i < root.children.length; i++) {
			var el = SVG.Preparsed.findDescendentElement(root.children[i], elementId);
			if (el) {
				return el;
			}
		}
	}
	return null;
};

/** @inheritDoc
*/
SVG.Preparsed.prototype.hasElement = function (elementId) {
	return SVG.Preparsed.findDescendentElement(this.doc, elementId) != null;
};

/** @inheritDoc
*/
SVG.Preparsed.prototype.hasAncestor = function (elementId, ancestorId) {
	var ancestor = SVG.Preparsed.findDescendentElement(this.doc, ancestorId);
	if (ancestor == null) {
		throw "Undefined SVG element id " + ancestorId;
	}
	return SVG.Preparsed.findDescendentElement(ancestor, elementId) != null;
}
