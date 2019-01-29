/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** @const */
A3a.vpl.BlockTemplate.initStatesDecl8 =
	"var state[8]\n";

/** @const */
A3a.vpl.BlockTemplate.initStatesInit8 =
	"state = [0, 0, 0, 0, 0, 0, 0, 0]\n";

A3a.vpl.BlockTemplate.svgDict = {};

/** Decode URI with filename and id
	@param {string} uri
	@return {{f:string,id:string}}
*/
A3a.vpl.Canvas.decodeURI = function (uri) {
	var a = uri.split("#");
	return {
		f: a[0],
		id: a[1]
	};
}

/** Draw svg
	@param {SVG} svg
	@param {SVG.Options=} options
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawSVG = function (svg, options) {
	this.ctx.save();
	options.globalTransform = function (ctx, viewBox) {
		this.clientData.blockViewBox = viewBox;
		ctx.translate(-viewBox[0], -viewBox[1]);
		ctx.scale(this.dims.blockSize / (viewBox[2] - viewBox[0]),
			this.dims.blockSize / (viewBox[3] - viewBox[1]));
	}.bind(this);
	svg.draw(this.ctx, options);
	this.ctx.restore();
};

/** Convert x or y coordinate from event (pixel), relative to top left
	corner, to svg
	@param {number} clickX
	@param {number} clickY
	@param {number} width
	@param {number} height
	@return {{x:number,y:number}}
*/
A3a.vpl.Canvas.prototype.canvasToSVGCoord = function (clickX, clickY, width, height) {
	return {
		x: (this.clientData.blockViewBox[2] - this.clientData.blockViewBox[0]) /
			width * (clickX + this.clientData.blockViewBox[0]),
		y: (this.clientData.blockViewBox[3] - this.clientData.blockViewBox[1]) /
			height * (clickY + this.clientData.blockViewBox[1])
	};
};

/** Handle mousedown in SVG block for buttons
	@param {A3a.vpl.Block} block
	@param {number} width
	@param {number} height
	@param {number} left
	@param {number} top
	@param {A3a.vpl.CanvasItem.mouseEvent} ev
	@param {SVG} svg
	@param {Array} buttons
	@return {?number}
*/
A3a.vpl.Canvas.prototype.mousedownSVGButtons = function (block, width, height, left, top, ev,
	svg, buttons) {
	var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
	for (var i = 0; i < buttons.length; i++) {
		var id = buttons[i].id;
		if (svg.isInside(id, pt.x, pt.y)) {
			var ix = buttons[i]["val"].indexOf(block.param[i]);
			if (ix >= 0) {
				block.prepareChange();
				block.param[i] = buttons[i]["val"][(ix + 1) % buttons[i]["val"].length];
			}
			return i;
		}
	}
	return null;
};

A3a.vpl.Canvas.prototype.mousedownSVGRadioButtons = function (block, width, height, left, top, ev,
	svg, buttons, nButtons) {
	var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
	for (var i = 0; i < buttons.length; i++) {
		var id = buttons[i].id;
		if (svg.isInside(id, pt.x, pt.y)) {
			block.prepareChange();
			block.param[nButtons] = buttons[i]["val"];
			return 0;
		}
	}
	return null;
};

/** Make style object for drawSVG with buttons, radiobuttons, style
	@param {Object} aux description of the block containing buttons, as defined in the json
	@param {A3a.vpl.Block} block
	@return {Object}
*/
A3a.vpl.Canvas.prototype.getStyles = function (aux, block) {
	var styles = {};
	var nButtons = aux["buttons"] ? aux["buttons"].length : 0;
	var nRadioButtons = aux["radiobuttons"] ? aux["radiobuttons"].length : 0;
	var nStyles = aux["styles"] ? aux["styles"].length : 0;
	for (var i = 0; i < nButtons; i++) {
		var val = aux["buttons"][i]["val"];
		var st =  aux["buttons"][i]["st"];
		var ix = val.indexOf(block.param[i]);
		if (ix >= 0) {
			styles[aux["buttons"][i]["id"]] = st[ix];
		}
	}
	for (var i = 0; i < nRadioButtons; i++) {
		var val = aux["radiobuttons"][i]["val"];
		var st =  aux["radiobuttons"][i]["st"];
		styles[aux["radiobuttons"][i]["id"]] = st[block.param[nButtons] === val ? 1 : 0];
	}
	for (var i = 0; i < nStyles; i++) {
		styles[aux["styles"][i]["id"]] = A3a.vpl.BlockTemplate.substInline(aux["styles"][i]["st"], block);
	}
	return styles;
};

/** Make displacement object for drawSVG with sliders and/or rotating elements
	@param {Object} aux description of the block containing sliders, as defined in the json
	@param {SVG} svg
	@param {Array} param block parameters
	@return {Object}
*/
A3a.vpl.Canvas.prototype.getDisplacements = function (aux, svg, param) {
	var displacements = {};

	if (aux["sliders"] != undefined) {
		for (var i = 0; i < aux["sliders"].length; i++) {
			var sliderAux = aux["sliders"][i];
			var bnds = svg.getElementBounds(sliderAux["id"]);
			var bndsThumb = svg.getElementBounds(sliderAux["thumbId"]);
			var x0Thumb = (bndsThumb.xmin + bndsThumb.xmax) / 2;
			var y0Thumb = (bndsThumb.ymin + bndsThumb.ymax) / 2;
			// reduce bounds to vertical or horizontal line
			if (bnds.xmax - bnds.xmin < bnds.ymax - bnds.ymin) {
				bnds.xmin = bnds.xmax = (bnds.xmin + bnds.xmax) / 2;
				x0Thumb = bnds.xmin;	// no thumb adjustment along x axis
			} else {
				bnds.ymin = bnds.ymax = (bnds.ymin + bnds.ymax) / 2;
				y0Thumb = bnds.ymin;	// no thumb adjustment along y axis
			}
			// calc thumb position between 0 and 1
			var f = (param[i] - sliderAux["min"]) / (sliderAux["max"] - sliderAux["min"]);
			// translate thumb
			displacements[sliderAux["thumbId"]] = {
				dx: f * (bnds.xmax - bnds.xmin) - (x0Thumb - bnds.xmin),
				dy: f * (bnds.ymin - bnds.ymax) - (y0Thumb - bnds.ymax)
			};
		}
	}

	if (aux["rotating"] != undefined) {
		for (var i = 0; i < aux["rotating"].length; i++) {
			var rotatingAux = aux["rotating"][i];
			var f = rotatingAux["numSteps"] ? 2 * Math.PI / parseInt(rotatingAux["numSteps"], 10) : 1;
			var bndsCenter = svg.getElementBounds(rotatingAux["centerId"]);
			// rotate element
			displacements[rotatingAux["id"]] = {
				phi: param[i] * f,
				x0: (bndsCenter.xmin + bndsCenter.xmax) / 2,
				y0: (bndsCenter.ymin + bndsCenter.ymax) / 2
			};
		}
	}

	return displacements;
};

/** Make clips object for drawSVG with sliders elements ("lowerPartId")
	@param {Object} aux description of the block containing sliders, as defined in the json
	@param {SVG} svg
	@param {Array} param block parameters
	@return {Object}
*/
A3a.vpl.Canvas.prototype.getClips = function (aux, svg, param) {
	var clips = {};

	if (aux["sliders"] != undefined) {
		for (var i = 0; i < aux["sliders"].length; i++) {
			var sliderAux = aux["sliders"][i];
			var bnds = svg.getElementBounds(sliderAux["id"]);
			var bndsHalf = sliderAux["lowerPartId"] && svg.getElementBounds(sliderAux["lowerPartId"]);
			if (bndsHalf) {
				// calc thumb position between 0 and 1
				var f = (param[i] - sliderAux["min"]) / (sliderAux["max"] - sliderAux["min"]);
				// clip to bndsHalf shifted vertically or horizontally
				var w = bndsHalf.xmax - bndsHalf.xmin;
				var h = bndsHalf.ymax - bndsHalf.ymin;
				if (bnds.xmax - bnds.xmin < bnds.ymax - bnds.ymin) {
					// vertical slider
					clips[sliderAux["lowerPartId"]] = {
						x: bndsHalf.xmin - h,	// conservative margin to avoid clipping along x direction
						y: bndsHalf.ymin,
						w: w + 2 * h,
						h: h * f
					}
				} else {
					// horizontal slider
					clips[sliderAux["lowerPartId"]] = {
						x: bndsHalf.xmin,
						y: bndsHalf.ymin - h,	// conservative margin to avoid clipping along y direction
						w: w * f,
						h: h + 2 * w
					}
				}
			}
		}
	}

	return clips;
};

/** Check if mouse is over slider
	@param {number} pos slider position
	@param {boolean} vert true if slider is vertical, false if horizontal
	@param {number} tol tolerance
	@param {{x:number,y:number}} pt mouse event
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.checkSVGSlider = function (pos, vert, tol, pt) {
	return Math.abs((vert ? pt.x : pt.y) - pos) < tol;
};

/** Convert SVG position to normalized slider value between 0 and 1
	@param {number} min minimum position of slider
	@param {number} max maximum position of slider
	@param {number} pos mouse position in SVG coordinates (vertical or horizontal)
	@return {number}
*/
A3a.vpl.Canvas.prototype.dragSVGSlider = function (min, max, pos) {
	return Math.min(Math.max((pos - min) / (max - min), 0), 1);
};

/** Handle mousedown event in A3a.vpl.BlockTemplate.mousedownFun for a block with sliders
	@param {A3a.vpl.Block} block
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@param {SVG} svg
	@param {Array.<Object>} sliders description of the sliders, as defined in the json
	@return {?number}
*/
A3a.vpl.Canvas.prototype.mousedownSVGSliders = function (block, width, height, left, top, ev,
	svg, sliders) {
	var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
	for (var i = 0; i < sliders.length; i++) {
		this.clientData.sliderAux = sliders[i];
		var bnds = svg.getElementBounds(this.clientData.sliderAux["id"]);
		this.clientData.vert = bnds.xmax - bnds.xmin < bnds.ymax - bnds.ymin;
		this.clientData.min = this.clientData.vert ? bnds.ymax : bnds.xmin;
		this.clientData.max = this.clientData.vert ? bnds.ymin : bnds.xmax;
		var x0 = (bnds.xmin + bnds.xmax) / 2;
		var y0 = (bnds.ymin + bnds.ymax) / 2;
		var thumbBnds = svg.getElementBounds(this.clientData.sliderAux["thumbId"]);
		if (this.checkSVGSlider(this.clientData.vert ? x0 : y0,
			this.clientData.vert,
			this.clientData.vert ? thumbBnds.xmax - thumbBnds.xmin : thumbBnds.ymax - thumbBnds.ymin,
			pt)) {
			block.prepareChange();
			return i;
		}
	}
	return null;
};

/** Handle mousedrag event in A3a.vpl.BlockTemplate.mousedragFun for a block with sliders
	@param {A3a.vpl.Block} block
	@param {number} dragIndex
	@param {Object} aux description of the block containing sliders, as defined in the json
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {void}
*/
A3a.vpl.Canvas.prototype.mousedragSVGSlider = function (block, dragIndex, aux, width, height, left, top, ev) {
	var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
	var val = this.clientData.sliderAux["min"] +
		(this.clientData.sliderAux["max"] - this.clientData.sliderAux["min"]) *
			this.dragSVGSlider(this.clientData.min, this.clientData.max,
				this.clientData.vert ? pt.y : pt.x);
	var min = this.clientData.sliderAux["min"];
	var max = this.clientData.sliderAux["max"];
	var snap = this.clientData.sliderAux["snap"];
	snap && snap.forEach(function (s, i) {
		if (typeof s === "string" && /^`.+`$/.test(s)) {
			s = A3a.vpl.BlockTemplate.substInline(s, block, i);
		}
		if (Math.abs(val - s) < (max - min) / 10) {
			val = s;
		}
	});
	block.param[dragIndex] = Math.max(min, Math.min(max, val));
};

/** Handle mousedown event in A3a.vpl.BlockTemplate.mousedownFun for a block with rotating elements
	@param {A3a.vpl.Block} block
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@param {SVG} svg
	@param {Array.<Object>} rotating description of the rotating elements, as defined in the json
	@param {Array} param
	@return {?number}
*/
A3a.vpl.Canvas.prototype.mousedownSVGRotating = function (block, width, height, left, top, ev,
	svg, rotating, param) {
	var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
	for (var i = 0; i < rotating.length; i++) {
		// center of rotation
		var bnds = svg.getElementBounds(rotating[i]["centerId"]);
		var c = {
			x: (bnds.xmin + bnds.xmax) / 2,
			y: (bnds.ymin + bnds.ymax) / 2
		};
		var f = rotating[i]["numSteps"] ? 2 * Math.PI / parseInt(rotating[i]["numSteps"], 10) : 1;
		var pt0 = {
			x: c.x + (pt.x - c.x) * Math.cos(param[i] * f) + (pt.y - c.y) * Math.sin(param[i] * f),
			y: c.y - (pt.x - c.x) * Math.sin(param[i] * f) + (pt.y - c.y) * Math.cos(param[i] * f)
		};
		if (svg.isInside(rotating[i]["thumbId"], pt0.x, pt0.y)) {
			this.clientData.rotatingAux = rotating[i];
			this.clientData.c = c;
			this.clientData.phi0 = Math.atan2(pt0.y - c.y, pt0.x - c.x);
			block.prepareChange();
			return i;
		}
	}
	return null;
};

/** Handle mousedrag event in A3a.vpl.BlockTemplate.mousedragFun for a block with rotating elements
	@param {A3a.vpl.Block} block
	@param {number} dragIndex index of rotating element
	@param {Object} aux description of the block containing rotating elements, as defined in the json
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {A3a.vpl.CanvasItem.mouseEvent} ev mouse event
	@return {void}
*/
A3a.vpl.Canvas.prototype.mousedragSVGRotating = function (block, dragIndex, aux, width, height, left, top, ev) {
	var pt = this.canvasToSVGCoord(ev.x - left, ev.y - top, width, height);
	var val = Math.atan2(pt.y - this.clientData.c.y, pt.x - this.clientData.c.x) - this.clientData.phi0;
	var f = aux["rotating"][dragIndex]["numSteps"] ? 2 * Math.PI / parseInt(aux["rotating"][dragIndex]["numSteps"], 10) : 1;
	block.param[dragIndex] = Math.round(val / f);
};

/** Draw a block defined with SVG
	@param {Object} uiConfig
	@param {Object} aux block description in uiConfig
	@param {A3a.vpl.Block} block
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawBlockSVG = function (uiConfig, aux, block) {
	if (aux["svg"].length === 0) {
		// nothing to draw
		return;
	}
	var f = A3a.vpl.Canvas.decodeURI(aux["svg"][0]["uri"]).f;
	var displacements = this.getDisplacements(aux, uiConfig.svg[f], block.param);
	var diffWheelMotion = null;
	if (aux["diffwheelmotion"] && aux["diffwheelmotion"]["id"]) {
		var dw = aux["diffwheelmotion"];
		var robotId = dw["id"];
		var dx = dw["dx"] || 0;
		var dy = dw["dy"] || 0;
		var adjSc = dw["adjscale"] || 1;
		var color = dw["color"] || "black";
		var linewidth = dw["linewidth"] === undefined ? 1 : dw["linewidth"];
		var bnds = uiConfig.svg[f].getElementBounds(robotId);
		var r = (0.5 + dx) * (bnds.xmax - bnds.xmin) * adjSc;
		var ixSlider = (aux["buttons"] ? aux["buttons"].length : 0) +
			(aux["radiobuttons"] ? 1 : 0);
		var dleft = 2.4 * block.param[ixSlider];
		var dright = 2.4 * block.param[ixSlider + 1];
		var s = this.dims.blockSize;
		var rw = r / s;	// ?
		var tr = this.traces(dleft, dright, rw, {color: color, linewidth: linewidth});
		displacements[robotId] = {
			dx: -(tr.x * rw * s + dy * s * Math.sin(tr.phi)),
			dy: -(tr.y * rw * s + dy * s * Math.cos(tr.phi)),
			phi: -tr.phi
		};
		diffWheelMotion = {
			dleft: dleft,
			dright: dright,
			rw: rw,
			color: color,
			linewidth: linewidth
		};
	}
	aux["svg"].forEach(function (el) {
		var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
		this.drawSVG(uiConfig.svg[d.f],
			{
				elementId: d.id,
				style: this.getStyles(aux, block),
				displacement: displacements,
				clips: this.getClips(aux, uiConfig.svg[f], block.param),
				drawBoundingBox: false // true
			});
	}, this);
	if (diffWheelMotion) {
		this.traces(diffWheelMotion.dleft, diffWheelMotion.dright,
			diffWheelMotion.rw,
			{
				color: diffWheelMotion.color,
				linewidth: diffWheelMotion.linewidth
			});
	}
};

/** Handle a mousedown event in a block defined with SVG
	@param {Object} uiConfig
	@param {Object} aux
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Block} block
	@param {number} width
	@param {number} height
	@param {number} left
	@param {number} top
	@param {A3a.vpl.CanvasItem.mouseEvent} ev
	@return {?number}
*/
A3a.vpl.Canvas.mousedownBlockSVG = function (uiConfig, aux, canvas, block, width, height, left, top, ev) {
	var filename = A3a.vpl.Canvas.decodeURI(aux["svg"][0]["uri"]).f;
	var ix0 = 0;
	var buttons = aux["buttons"];
	if (buttons) {
		var ix = canvas.mousedownSVGButtons(block, width, height, left, top, ev, uiConfig.svg[filename],
			buttons);
		if (ix !== null) {
			return ix0 + ix;
		}
		ix0 += buttons.length;
	}
	var radiobuttons = aux["radiobuttons"];
	if (radiobuttons) {
		var ix = canvas.mousedownSVGRadioButtons(block, width, height, left, top, ev, uiConfig.svg[filename],
			radiobuttons, buttons || 0);
		if (ix !== null) {
			return ix0 + ix;
		}
		ix0++;
	}
	var sliders = aux["sliders"];
	if (sliders) {
		ix = canvas.mousedownSVGSliders(block, width, height, left, top, ev, uiConfig.svg[filename],
			sliders);
		if (ix !== null) {
			return ix0 + ix;
		}
		ix0 += sliders.length;
	}
	var rotating = aux["rotating"];
	if (rotating) {
		ix = canvas.mousedownSVGRotating(block, width, height, left, top, ev, uiConfig.svg[filename],
			rotating, block.param.slice(ix0, ix0 + rotating.length));
		if (ix !== null) {
			return ix0 + ix;
		}
		ix0 += rotating.length;
	}
	return null;
};

/** Handle a mousedrag event in a block defined with SVG
	@param {Object} uiConfig
	@param {Object} aux
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Block} block
	@param {number} dragIndex
	@param {number} width
	@param {number} height
	@param {number} left
	@param {number} top
	@param {A3a.vpl.CanvasItem.mouseEvent} ev
	@return {void}
*/
A3a.vpl.Canvas.mousedragBlockSVG = function (uiConfig, aux,
	canvas, block, dragIndex, width, height, left, top, ev) {
	var ix0 = (aux["buttons"] ? aux["buttons"].length : 0) +
		(aux["radiobuttons"] ? 1 : 0);
	var n = aux["sliders"] ? aux["sliders"].length : 0;
	if (dragIndex >= ix0 && dragIndex < ix0 + n) {
		canvas.mousedragSVGSlider(block, dragIndex - ix0, aux, width, height, left, top, ev);
		return;
	}
	ix0 += n;
	n = aux["rotating"] ? aux["rotating"].length : 0;
	if (dragIndex >= ix0 && dragIndex < ix0 + n) {
		canvas.mousedragSVGRotating(block, dragIndex - ix0, aux, width, height, left, top, ev);
		return;
	}
	ix0 += n;
};

/** Load blocks from uiConfig["blocks"] json description,
	overriding existing information in lib
	(don't override draw, mousedown and mousedrag; override code fragments as whole
	sets for a language)
	@param {Object} uiConfig
	@param {Array.<Object>} blocks
	@param {Array.<A3a.vpl.BlockTemplate>} lib
	@return {void}
*/
A3a.vpl.loadBlockOverlay = function (uiConfig, blocks, lib) {
	/** Find block specified by name in lib
		@param {string} name
		@return {number} index in lib, or -1 if not found
	*/
	function findBlock(name) {
		for (var i = 0; i < lib.length; i++) {
			if (lib[i].name === name) {
				return i;
			}
		}
		return -1;
	}

	/** Validate block definition
		@param {Object} b block definition
		@return {boolean} true for success, false for failure
	*/
	function validateBlockDefinition(b) {
		var name = b["name"];
		if (name[0] === "!") {
			// special block
			return true;
		}
		if (!/^\w/.test(name)) {
			window["console"] && window["console"]["info"](
				"Block definition error: bad name \"" + name + "\"");
			return false;
		}

		var defParam = b["defaultParameters"];
		var buttons = b["buttons"];
		var radiobuttons = b["radiobuttons"];
		var sliders = b["sliders"];
		var rotating = b["rotating"];
		if ((buttons || radiobuttons || sliders || rotating) && !defParam) {
			window["console"] && window["console"]["info"](
				"Block definition error: missing defaultParameters");
			return false;
		}

		if (defParam) {
			var nParams = 0;
			if (buttons) {
				nParams += buttons.length;
			}
			if (radiobuttons) {
				nParams += 1;
			}
			if (sliders) {
				nParams += sliders.length;
			}
			if (rotating) {
				nParams += rotating.length;
			}
			if (nParams !== defParam.length) {
				window["console"] && window["console"]["info"](
					"Block definition error: defaultParameters.length=" + defParam.length +
						", needs " + nParams + " parameters");
				return false;
			}
		}

		return true;
	}

	/** Substitute inline expressions {expr} in strings of input array, where expr is a
		JavaScript expression; variable $ contains the block parameters
		@param {Array.<string>} fmtArray
		@param {A3a.vpl.Block} block
		@return {Array.<string>}
	*/
	function substInlineA(fmtArray, block) {
		return fmtArray.map(function (fmt) {
			return A3a.vpl.BlockTemplate.substInline(fmt, block);
		});
	}

	blocks.forEach(function (b) {
		var name = /** @type {string} */(b["name"]);
		if (!name) {
			throw "Missing block name";
		}
		var blockIndex = findBlock(name);
		var blockTemplate0 = blockIndex >= 0 ? lib[blockIndex] : null;

		var type = blockTemplate0 ? blockTemplate0.type : A3a.vpl.blockType.undef;
		if (b["type"] || !blockTemplate0) {
			switch (b["type"]) {
			case "event":
				type = A3a.vpl.blockType.event;
				break;
			case "action":
				type = A3a.vpl.blockType.action;
				break;
			case "state":
				type = A3a.vpl.blockType.state;
				break;
			case "comment":
				type = A3a.vpl.blockType.comment;
				break;
			case "hidden":
				type = A3a.vpl.blockType.hidden;
				break;
			default:
				throw "Unknown block type " + b["type"];
			}
		}

		/** @type {Array.<A3a.vpl.mode>} */
		var modes = blockTemplate0 ? blockTemplate0.modes : [];
		if (b["modes"] && !blockTemplate0) {
			b["modes"].forEach(function (m) {
				switch (m) {
				case "basic":
					modes.push(A3a.vpl.mode.basic);
					break;
				case "advanced":
					modes.push(A3a.vpl.mode.advanced);
					break;
				default:
					throw "Unknown block mode " + m;
				}
			});
		}

		// validation
		if (!validateBlockDefinition(b)) {
			window["console"] && window["console"]["info"]("Bad block definition for " + name);
		}

		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		var draw = blockTemplate0
			? blockTemplate0.draw
			: function (canvas, block) {
				canvas.drawBlockSVG(uiConfig, b, block);
			};

		/** @type {?A3a.vpl.BlockTemplate.mousedownFun} */
		var mousedown = blockTemplate0
			? blockTemplate0.mousedown
			: function (canvas, block, width, height, left, top, ev) {
				return A3a.vpl.Canvas.mousedownBlockSVG(uiConfig, b,
					canvas, block, width, height, left, top, ev);
			};

		/** @type {?A3a.vpl.BlockTemplate.mousedragFun} */
		var mousedrag = blockTemplate0
			? blockTemplate0.mousedrag
			: function (canvas, block, dragIndex, width, height, left, top, ev) {
				A3a.vpl.Canvas.mousedragBlockSVG(uiConfig, b,
					canvas, block, dragIndex, width, height, left, top, ev);
			};

		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		var genCode = blockTemplate0 ? blockTemplate0.genCode : {};
		["aseba", "l2", "js"].forEach(function (lang) {
			if (b[lang]) {
				genCode[lang] = function (block) {
					var c = {};
					b[lang]["initVarDecl"] && (c.initVarDecl = substInlineA(b[lang]["initVarDecl"], block));
					b[lang]["initCodeDecl"] && (c.initCodeDecl = substInlineA(b[lang]["initCodeDecl"], block));
					b[lang]["initCodeExec"] && (c.initCodeExec = substInlineA(b[lang]["initCodeExec"], block));
					b[lang]["sectionBegin"] && (c.sectionBegin = A3a.vpl.BlockTemplate.substInline(b[lang]["sectionBegin"], block));
					b[lang]["sectionEnd"] && (c.sectionEnd = A3a.vpl.BlockTemplate.substInline(b[lang]["sectionEnd"], block));
					c.sectionPriority = /** @type {number} */(b[lang]["sectionPriority"]) || 1;
					b[lang]["clauseInit"] && (c.clauseInit = A3a.vpl.BlockTemplate.substInline(b[lang]["clauseInit"], block));
					if (b[lang]["clauseAnd"]) {
						var clause = "";
						block.param.forEach(function (p, i) {
							var cl = A3a.vpl.BlockTemplate.substInline(b[lang]["clauseAnd"], block, i);
							if (cl) {
								clause += (clause.length > 0 ? " " + A3a.vpl.Program.codeGenerator[lang].andOperator + " " : "") + cl;
							}
						});
						c.clause = /** @type {string} */(clause || "1 == 1");
					} else if (b[lang]["clause"]) {
		 				c.clause = A3a.vpl.BlockTemplate.substInline(b[lang]["clause"], block);
					}
					c.clauseOptional = /** @type {boolean} */(b[lang]["clauseOptional"]) || false;
					b[lang]["statement"] && (c.statement = A3a.vpl.BlockTemplate.substInline(b[lang]["statement"], block));
					b[lang]["error"] && (c.clause = A3a.vpl.BlockTemplate.substInline(b["error"]["error"], block));
					return c;
				};
			}
		});

		/** @type {A3a.vpl.BlockTemplate.params} */
		var p = {
			name: name,
			type: type,
			modes: modes,
			defaultParam: blockTemplate0
				? blockTemplate0.defaultParam
				: function () { return b["defaultParameters"]; },
			draw: draw,
			mousedown: mousedown,
			mousedrag: mousedrag,
			genCode: genCode
		};
		if (blockIndex >= 0) {
			// replace previous blockTemplate
			lib[blockIndex] = new A3a.vpl.BlockTemplate(p);
		} else {
			lib.push(new A3a.vpl.BlockTemplate(p));
		}
	});
};

/** Replace hard-coded blocks with blocks defined in uiConfig
	@param {Object} uiConfig
	@return {void}
*/
A3a.vpl.patchBlocksSVG = function (uiConfig) {
	A3a.vpl.BlockTemplate.uiConfig = uiConfig;

	// general ui parameters
	A3a.vpl.Canvas.calcDims = function (blockSize, controlSize) {
		return {
			blockSize: blockSize,
			blockLineWidth: Math.max(1, Math.min(3, blockSize / 40)),
			thinLineWidth: 1,
			blockFont: Math.round(blockSize / 4).toString(10) + "px sans-serif",
			blockLargeFont: Math.round(blockSize / 3).toString(10) + "px sans-serif",
			templateScale: Math.max(0.666, 32 / blockSize),
			scrollingBlockLib: uiConfig["styles"]["scrollingBlockLib"],
			margin: Math.min(Math.round(blockSize / 4), 20),
			interRowSpace: Math.round(blockSize / 2),
			interEventActionSpace: blockSize / 2,
			controlColor: uiConfig["styles"]["controlColor"] || "navy",
			controlDownColor: uiConfig["styles"]["controlDownColor"] || "#37f",
			controlActiveColor: uiConfig["styles"]["controlActiveColor"] || "#06f",
			interBlockSpace: Math.round(blockSize / 6),
			controlSize: controlSize,
			controlFont: "bold 15px sans-serif",
			topControlSpace: 2 * controlSize,
			stripHorMargin: Math.min(Math.max(blockSize / 15, 2), 6),
			stripVertMargin: Math.min(Math.max(blockSize / 15, 2), 6),
			eventStyle: uiConfig["styles"]["event"] || "#f70",
			stateStyle: uiConfig["styles"]["state"] || "#0c0",
			actionStyle: uiConfig["styles"]["action"] || "#38f",
			commentStyle: uiConfig["styles"]["comment"] || "#aaa",
			background: uiConfig["styles"]["background"] || "white",
			ruleBackground: uiConfig["styles"]["ruleBackground"] || "#ddd",
			ruleMarks: uiConfig["styles"]["ruleMarks"] || "#bbb",
			scrollbarThumbColor: uiConfig["styles"]["scrollbarThumbColor"] || "navy",
			scrollbarBackgroundColor: uiConfig["styles"]["scrollbarBackgroundColor"] || "#ccc",
			scrollbarWidth: uiConfig["styles"]["scrollbarWidth"] || 5
		};
	};

	// build array of block templates from definitions in uiConfig.blocks and svg in uiConfig.rsrc
	/** @type {Array.<A3a.vpl.BlockTemplate>} */
	var lib = [];
	A3a.vpl.loadBlockOverlay(uiConfig, uiConfig["blocks"], lib);

	A3a.vpl.BlockTemplate.lib = lib;
};
