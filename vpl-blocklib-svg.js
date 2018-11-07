/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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

/** Make sure the SVG object for SVG source is loaded
	@param {string} svgFilename
	@param {string} svgSrc
	@return {void}
*/
A3a.vpl.Canvas.prototype.loadSVG = function (svgFilename, svgSrc) {
	if (this.clientData.svg == undefined) {
		this.clientData.svg = {};
	}
	if (!this.clientData.svg[svgFilename]) {
		this.clientData.svg[svgFilename] = new SVG(svgSrc);
	}
};

/** Draw svg
	@param {string} svgFilename
	@param {string} svgSrc
	@param {SVG.Options=} options
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawSVG = function (svgFilename, svgSrc, options) {
	this.loadSVG(svgFilename, svgSrc);
	this.ctx.save();
	options.globalTransform = function (ctx, viewBox) {
		this.clientData.blockViewBox = viewBox;
		ctx.translate(-viewBox[0], -viewBox[1]);
		ctx.scale(this.dims.blockSize / (viewBox[2] - viewBox[0]),
			this.dims.blockSize / (viewBox[3] - viewBox[1]));
	}.bind(this);
	this.clientData.svg[svgFilename].draw(this.ctx, options);
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

A3a.vpl.Canvas.prototype.mousedownSVGButtons = function (block, width, height, left, top, ev,
	svgFilename, buttons) {
	var pt = this.canvasToSVGCoord(ev.clientX - left, ev.clientY - top, width, height);
	for (var i = 0; i < buttons.length; i++) {
		var id = buttons[i].id;
		if (this.clientData.svg[svgFilename].isInside(id, pt.x, pt.y)) {
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
	svgFilename, buttons, nButtons) {
	var pt = this.canvasToSVGCoord(ev.clientX - left, ev.clientY - top, width, height);
	for (var i = 0; i < buttons.length; i++) {
		var id = buttons[i].id;
		if (this.clientData.svg[svgFilename].isInside(id, pt.x, pt.y)) {
			block.prepareChange();
			block.param[nButtons] = buttons[i]["val"];
			return 0;
		}
	}
	return null;
};

/** Make style object for drawSVG with buttons and/or radiobuttons
	@param {Object} aux description of the block containing buttons, as defined in the json
	@param {Array} param block parameters
	@return {Object}
*/
A3a.vpl.Canvas.prototype.getStyles = function (aux, param) {
	var styles = {};
	var nButtons = aux["buttons"] ? aux["buttons"].length : 0;
	var nRadioButtons = aux["radiobuttons"] ? aux["radiobuttons"].length : 0;
	for (var i = 0; i < nButtons; i++) {
		var val = aux["buttons"][i]["val"];
		var st =  aux["buttons"][i]["st"];
		var ix = val.indexOf(param[i]);
		if (ix >= 0) {
			styles[aux["buttons"][i]["id"]] = st[ix];
		}
	}
	for (var i = 0; i < nRadioButtons; i++) {
		var val = aux["radiobuttons"][i]["val"];
		var st =  aux["radiobuttons"][i]["st"];
		styles[aux["radiobuttons"][i]["id"]] = st[param[nButtons] === val ? 1 : 0];
	}
	return styles;
};

/** Make displacement object for drawSVG with sliders and/or rotating elements
	@param {Object} aux description of the block containing sliders, as defined in the json
	@param {string} svgFilename
	@param {Array} param block parameters
	@return {Object}
*/
A3a.vpl.Canvas.prototype.getDisplacements = function (aux, svgFilename, param) {
	var displacements = {};

	if (aux["sliders"] != undefined) {
		for (var i = 0; i < aux["sliders"].length; i++) {
			var sliderAux = aux["sliders"][i];
			var bnds = this.clientData.svg[svgFilename].getElementBounds(sliderAux["id"]);
			// reduce bounds to vertical or horizontal line
			if (bnds.xmax - bnds.xmin < bnds.ymax - bnds.ymin) {
				bnds.xmin = bnds.xmax = (bnds.xmin + bnds.xmax) / 2;
			} else {
				bnds.ymin = bnds.ymax = (bnds.ymin + bnds.ymax) / 2;
			}
			// calc thumb position
			var f = (param[i] - sliderAux["min"]) / (sliderAux["max"] - sliderAux["min"]);
			// translate thumb
			displacements[sliderAux["thumbId"]] = {
				dx: bnds.xmax * (f - 0.5) + bnds.xmin * (0.5 - f),
				dy: bnds.ymin * (f - 0.5) + bnds.ymax * (0.5 - f)
			};
		}
	}

	if (aux["rotating"] != undefined) {
		for (var i = 0; i < aux["rotating"].length; i++) {
			var rotatingAux = aux["rotating"][i];
			// rotate element
			displacements[rotatingAux["id"]] = {
				phi: param[i]
			};
		}
	}

	return displacements;
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
	@param {Event} ev mouse event
	@param {string} svgFilename
	@param {Array.<Object>} sliders description of the sliders, as defined in the json
	@return {?number}
*/
A3a.vpl.Canvas.prototype.mousedownSVGSliders = function (block, width, height, left, top, ev,
	svgFilename, sliders) {
	var pt = this.canvasToSVGCoord(ev.clientX - left, ev.clientY - top, width, height);
	for (var i = 0; i < sliders.length; i++) {
		this.clientData.sliderAux = sliders[i];
		var bnds = this.clientData.svg[svgFilename].getElementBounds(this.clientData.sliderAux["id"]);
		this.clientData.vert = bnds.xmax - bnds.xmin < bnds.ymax - bnds.ymin;
		this.clientData.min = this.clientData.vert ? bnds.ymax : bnds.xmin;
		this.clientData.max = this.clientData.vert ? bnds.ymin : bnds.xmax;
		var x0 = (bnds.xmin + bnds.xmax) / 2;
		var y0 = (bnds.ymin + bnds.ymax) / 2;
		if (this.checkSVGSlider(this.clientData.vert ? x0 : y0, this.clientData.vert, width / 10, pt)) {
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
	@param {Event} ev mouse event
	@return {void}
*/
A3a.vpl.Canvas.prototype.mousedragSVGSlider = function (block, dragIndex, aux, width, height, left, top, ev) {
	var pt = this.canvasToSVGCoord(ev.clientX - left, ev.clientY - top, width, height);
	var val = this.clientData.sliderAux["min"] +
		(this.clientData.sliderAux["max"] - this.clientData.sliderAux["min"]) *
			this.dragSVGSlider(this.clientData.min, this.clientData.max,
				this.clientData.vert ? pt.y : pt.x);
	block.param[dragIndex] = Math.max(this.clientData.sliderAux["min"],
		Math.min(this.clientData.sliderAux["max"], val));
};

/** Handle mousedown event in A3a.vpl.BlockTemplate.mousedownFun for a block with rotating elements
	@param {A3a.vpl.Block} block
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {Event} ev mouse event
	@param {string} svgFilename
	@param {Array.<Object>} rotating description of the rotating elements, as defined in the json
	@param {Array} param
	@return {?number}
*/
A3a.vpl.Canvas.prototype.mousedownSVGRotating = function (block, width, height, left, top, ev,
	svgFilename, rotating, param) {
	var pt = this.canvasToSVGCoord(ev.clientX - left, ev.clientY - top, width, height);
	for (var i = 0; i < rotating.length; i++) {
		// center of rotation
		var bnds = this.clientData.svg[svgFilename].getElementBounds(rotating[i]["centerId"]);
		var c = {
			x: (bnds.xmin + bnds.xmax) / 2,
			y: (bnds.ymin + bnds.ymax) / 2
		};
		var pt0 = {
			x: c.x + (pt.x - c.x) * Math.cos(param[i]) + (pt.y - c.y) * Math.sin(param[i]),
			y: c.y - (pt.x - c.x) * Math.sin(param[i]) + (pt.y - c.y) * Math.cos(param[i])
		};
		if (this.clientData.svg[svgFilename].isInside(rotating[i]["thumbId"], pt0.x, pt0.y)) {
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
	@param {number} dragIndex
	@param {Object} aux description of the block containing rotating elements, as defined in the json
	@param {number} width block width
	@param {number} height block width
	@param {number} left left position of the block
	@param {number} top top position of the block
	@param {Event} ev mouse event
	@return {void}
*/
A3a.vpl.Canvas.prototype.mousedragSVGRotating = function (block, dragIndex, aux, width, height, left, top, ev) {
	var pt = this.canvasToSVGCoord(ev.clientX - left, ev.clientY - top, width, height);
	var val = Math.atan2(pt.y - this.clientData.c.y, pt.x - this.clientData.c.x) - this.clientData.phi0;
	block.param[dragIndex] = val;
};

A3a.vpl.Canvas.prototype.drawBlockSVG = function (uiConfig, aux, block) {
	var f = A3a.vpl.Canvas.decodeURI(aux["svg"][0]["uri"]).f;
	var displacements = this.getDisplacements(aux, f, block.param);
	if (aux["diffwheelmotion"]) {
		var robotId = aux["diffwheelmotion"];
		this.loadSVG(f, uiConfig.svg[f]);
		var bnds = this.clientData.svg[f].getElementBounds(robotId);
		var ixSlider = (aux["buttons"] ? aux["buttons"].length : 0) +
			(aux["radiobuttons"] ? 1 : 0);
		var dleft = 4 * block.param[ixSlider];
		var dright = 4 * block.param[ixSlider + 1];
		var r = 0.4 * (bnds.xmax - bnds.xmin);
		// var tr = A3a.vpl.draw.diffWheels(dleft * r, dright * r, r);
		var s = this.dims.blockSize;
		var tr = this.traces(dleft * r / s, dright * r / s, r / s);
		displacements[robotId] = {
			dx: -tr.x,
			dy: -tr.y,
			phi: -tr.phi
		};
	}
	aux["svg"].forEach(function (el) {
		var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
		this.drawSVG(d.f, uiConfig.svg[d.f],
			{
				elementId: d.id,
				style: this.getStyles(aux, block.param),
				displacement: displacements
			});
	}, this);
};

A3a.vpl.Canvas.mousedownBlockSVG = function (uiConfig, aux, canvas, block, width, height, left, top, ev) {
	var f = A3a.vpl.Canvas.decodeURI(aux["svg"][0]["uri"]).f;
	var ix0 = 0;
	var buttons = aux["buttons"];
	if (buttons) {
		var ix = canvas.mousedownSVGButtons(block, width, height, left, top, ev, f,
			buttons);
		if (ix !== null) {
			return ix0 + ix;
		}
		ix0 += buttons.length;
	}
	var radiobuttons = aux["radiobuttons"];
	if (radiobuttons) {
		var ix = canvas.mousedownSVGRadioButtons(block, width, height, left, top, ev, f,
			radiobuttons, buttons || 0);
		if (ix !== null) {
			return ix0 + ix;
		}
		ix0++;
	}
	var sliders = aux["sliders"];
	if (sliders) {
		ix = canvas.mousedownSVGSliders(block, width, height, left, top, ev, f,
			sliders);
		if (ix !== null) {
			return ix0 + ix;
		}
		ix0 += sliders.length;
	}
	var rotating = aux["rotating"];
	if (rotating) {
		ix = canvas.mousedownSVGRotating(block, width, height, left, top, ev, f,
			rotating, block.param.slice(ix0, ix0 + rotating.length));
		if (ix !== null) {
			return ix0 + ix;
		}
		ix0 += rotating.length;
	}
	return null;
};

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

/** Replace hard-coded blocks with blocks defined in uiConfig
	@param {Object} uiConfig
	@return {void}
*/
A3a.vpl.patchSVG = function (uiConfig) {
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
			margin: Math.min(Math.round(blockSize / 4), 20),
			interRowSpace: Math.round(blockSize / 2),
			interEventActionSpace: blockSize / 2,
			interBlockSpace: Math.round(blockSize / 6),
			controlSize: controlSize,
			controlFont: "bold 15px sans-serif",
			topControlSpace: 2 * controlSize,
			stripHorMargin: Math.min(Math.max(blockSize / 15, 2), 6),
			stripVertMargin: Math.min(Math.max(blockSize / 15, 2), 6),
			eventStyle: uiConfig["styles"]["event"],
			stateStyle: uiConfig["styles"]["state"],
			actionStyle: uiConfig["styles"]["action"],
			commentStyle: uiConfig["styles"]["comment"]
		};
	};

	/** Substitute inline expressions {expr} in input string, where expr is a
		JavaScript expression; variable $ contains the block parameters
		@param {string} fmt
		@param {A3a.vpl.Block} block
		@param {number=} i parameter index in clauseAnd fragments
		@return {string}
	*/
	function substInline(fmt, block, i) {
		while (true) {
			var leftIx = fmt.indexOf("{");
			if (leftIx < 0) {
				break;
			}
			var depth = 1;
			var rightIx = fmt.indexOf("}", leftIx + 1);
			for (var i = leftIx + 1; rightIx >= 0 && i < fmt.length; ) {
				var nextLeftIx = fmt.indexOf("{", i);
				if (nextLeftIx >= 0 && nextLeftIx < rightIx) {
					depth++;
					i = nextLeftIx + 1;
				} else {
					depth--;
					if (depth === 0) {
						break;
					}
					i = rightIx + 1;
					rightIx = fmt.indexOf("}", i);
				}
			}
			if (depth > 0) {
				break;
			}
			var result = new Function("$", "i", "return " + fmt.slice(leftIx + 1, rightIx) + ";")(block.param, i);
			fmt = fmt.slice(0, leftIx) + result + fmt.slice(rightIx + 1);
		}
		return fmt;
	}

	// build array of block templates from definitions in uiConfig.blocks and svg in uiConfig.svg
	/** @type {Array.<A3a.vpl.BlockTemplate>} */
	var lib = [];
	uiConfig["blocks"].forEach(function (b) {
		var type = A3a.vpl.blockType.undef;
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
		default:
			throw "Unknown block type " + b["type"];
		}

		/** @type {Array.<A3a.vpl.mode>} */
		var modes = [];
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

		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		var draw = function (canvas, block) {
			canvas.drawBlockSVG(uiConfig, b, block);
		};

		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		var mousedown = function (canvas, block, width, height, left, top, ev) {
			return A3a.vpl.Canvas.mousedownBlockSVG(uiConfig, b,
				canvas, block, width, height, left, top, ev);
		};

		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		var mousedrag = function (canvas, block, dragIndex, width, height, left, top, ev) {
			A3a.vpl.Canvas.mousedragBlockSVG(uiConfig, b,
				canvas, block, dragIndex, width, height, left, top, ev);
		};

		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		var genCode = function (block) {
			var c = {};
			b["aseba"] && b["aseba"]["initVarDecl"] && (c.initVarDecl = substInline(b["aseba"]["initVarDecl"], block));
			b["aseba"] && b["aseba"]["initCodeDecl"] && (c.initCodeDecl = substInline(b["aseba"]["initCodeDecl"], block));
			b["aseba"] && b["aseba"]["initCodeExec"] && (c.initCodeExec = substInline(b["aseba"]["initCodeExec"], block));
			b["aseba"] && b["aseba"]["sectionBegin"] && (c.sectionBegin = substInline(b["aseba"]["sectionBegin"], block));
			b["aseba"] && b["aseba"]["sectionEnd"] && (c.sectionEnd = substInline(b["aseba"]["sectionEnd"], block));
			c.sectionPriority = /** @type {boolean} */(b["aseba"] && b["aseba"]["sectionPriority"]) || 1;
			b["aseba"] && b["aseba"]["clauseInit"] && (c.clauseInit = substInline(b["aseba"]["clauseInit"], block));
			if (b["aseba"] && b["aseba"]["clauseAnd"]) {
				var clause = "";
				block.param.forEach(function (p, i) {
					var cl = substInline(b["aseba"]["clauseAnd"], block, i);
					if (cl) {
						clause += (clause.length > 0 ? " and " : "") + cl;
					}
				});
				c.clause = /** @type {string} */(clause || "1 == 1");
			} else if (b["aseba"] && b["aseba"]["clause"]) {
 				c.clause = substInline(b["aseba"]["clause"], block);
			}
			c.clauseOptional = /** @type {boolean} */(b["aseba"] && b["aseba"]["clauseOptional"]) || false;
			b["aseba"] && b["aseba"]["statement"] && (c.statement = substInline(b["aseba"]["statement"], block));
			b["aseba"] && b["aseba"]["error"] && (c.clause = substInline(b["error"]["error"], block));
			return c;
		};

		/** @type {A3a.vpl.BlockTemplate.params} */
		var p = {
			name: b["name"],
			type: type,
			modes: modes,
			defaultParam: function () { return b["defaultParameters"]; },
			draw: draw,
			mousedown: mousedown,
			mousedrag: mousedrag,
			genCode: genCode
		};
		lib.push(new A3a.vpl.BlockTemplate(p));
	});

	A3a.vpl.BlockTemplate.lib = lib;
};
