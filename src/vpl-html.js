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

Additional methods for classes A3a.vpl.Block, A3a.vpl.Canvas, and
A3a.vpl.Application to export a VPL program to an HTML file.

*/

/** Export to data URL
	@param {CSSParser.VPL} css
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@return {string}
*/
A3a.vpl.Block.prototype.toDataURL = function (css, dims, scale) {
	var self = this;

	var box;
	switch (this.blockTemplate.type) {
	case A3a.vpl.blockType.event:
		box = css.getBox({tag: "block", clas: ["event", "html"]});
		break;
	case A3a.vpl.blockType.action:
		box = css.getBox({tag: "block", clas: ["action", "html"]});
		break;
	case A3a.vpl.blockType.state:
		box = css.getBox({tag: "block", clas: ["state", "html"]});
		break;
	case A3a.vpl.blockType.comment:
		box = css.getBox({tag: "block", clas: ["comment", "html"]});
		break;
	default:
		throw "internal";	// hidden or undef, shouldn't be exported
	}
	var scx = dims.blockSize / box.width;
	var scy = dims.blockSize / box.height;
	box.width = dims.blockSize;
	box.height = dims.blockSize;
	function scaleBorderRadius(r) {
		if (r) {
			r[0] *= scx;
			r[1] *= scy;
		}
	}
	scaleBorderRadius(box.borderBottomLeftRadius);
	scaleBorderRadius(box.borderBottomRightRadius);
	scaleBorderRadius(box.borderTopLeftRadius);
	scaleBorderRadius(box.borderTopRightRadius);

	var item = new A3a.vpl.CanvasItem(this,
		box.totalWidth(),
		box.totalHeight(),
		0, 0,
		// draw
		function (canvas, item, dx, dy, isZoomed) {
			var x = item.x + box.offsetLeft() + dx;
 			var y = item.y + box.offsetTop() + dy;
			box.drawAt(canvas.ctx, x, y);
			self.blockTemplate.renderToCanvas(canvas,
				/** @type {A3a.vpl.Block} */(item.data),
				box,
				x, y,
				isZoomed);
		});
	return item.toDataURL(dims, scale || 1);
};

/** Export block to an img HTML element
	@param {CSSParser.VPL} css
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@param {string=} downloadFilename
	@return {string}
*/
A3a.vpl.Block.prototype.toImgElement = function (css, dims, scale, downloadFilename) {
	var dataURL = this.toDataURL(css, dims, scale);
	var img = "<img width='" + dims.blockSize.toString(10) +
		"' height='" + dims.blockSize.toString(10) +
 		"' src='" + dataURL + "'>";
	return downloadFilename
		? "<a href='" + dataURL + "' download='" + downloadFilename + "'>" +
			img + "</a>"
		: img;
};

/** Export widget to data URL
	@param {string} id
	@param {CSSParser.VPL} css
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@return {{url: string, width: number, height: number}}
*/
A3a.vpl.Canvas.prototype.widgetToDataURL = function (id, css, dims, scale) {
	var box = css.getBox({tag: "widget", id: "widget-" + id.replace(/^.*:/g, "")});
	var width = box.totalWidth();
	var height = box.totalHeight();
	var self = this;
	var item = new A3a.vpl.CanvasItem(null,
		width, height,
		0, 0,
		// draw
		function (canvas, item, dx, dy) {
			canvas.widgets = self.widgets;
			canvas.drawWidget(id, width / 2 + dx, height / 2 + dy, box);
		});
	return {
		url: item.toDataURL(dims, scale || 1),
		width: width,
		height: height
	};
};

/** Export widget to an img HTML element
	@param {string} id
	@param {CSSParser.VPL} css
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@param {string=} downloadFilename
	@return {string}
*/
A3a.vpl.Canvas.prototype.widgetToImgElement = function (id, css, dims, scale, downloadFilename) {
	var data = this.widgetToDataURL(id, css, dims, scale);
	var img = "<img width='" + data.width.toString(10) +
		"' height='" + data.height.toString(10) +
		"' src='" + data.url + "'>";
	return downloadFilename
		? "<a href='" + data.url + "' download='" + downloadFilename + "'>" +
			img + "</a>"
		: img;
};

/** Export control to data URL
	@param {A3a.vpl.Canvas.controlDraw} draw
	@param {number} width
	@param {number} height
	@param {CSSParser.VPL.Box} itemBox
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@return {{url: string, width: number, height: number}}
*/
A3a.vpl.Canvas.controlToDataURL = function (draw, width, height, itemBox, dims, scale) {
	var item = new A3a.vpl.CanvasItem(null,
		width, height,
		0, 0,
		// draw
		function (canvas, item, dx, dy) {
			draw(canvas.ctx, itemBox, false);
		});
	return {
		url: item.toDataURL(dims, scale || 1),
		width: width,
		height: height
	};
};

/** Export toolbar button to data URL
	@param {string} id
	@param {CSSParser.VPL.Box} itemBox
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@return {?{url: string, width: number, height: number}}
*/
A3a.vpl.ControlBar.prototype.toolbarButtonToDataURL = function (id, itemBox, dims, scale) {
	for (var i = 0; i < this.controls.length; i++) {
		var control = this.controls[i];
		if (control.id === id) {
			var draw = function (ctx, box, isPressed) {
				control.draw(ctx, box, isPressed);
			};
			var width = control.bounds.xmax - control.bounds.xmin;
			var height = control.bounds.ymax - control.bounds.ymin;
			return A3a.vpl.Canvas.controlToDataURL(draw, width, height, itemBox, dims, scale);
		}
	}
	return null;
};

/** Export toolbar button to an img HTML element
	@param {A3a.vpl.ControlBar} controlbar
	@param {string} id
	@param {CSSParser.VPL.Box} itemBox
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@param {string=} downloadFilename
	@return {string}
*/
A3a.vpl.Canvas.prototype.toolbarButtonToImgElement = function (controlbar, id, itemBox, dims, scale, downloadFilename) {
	var data = controlbar.toolbarButtonToDataURL(id, itemBox, dims, scale);
	var img = "<img width='" + data.width.toString(10) +
		"' height='" + data.height.toString(10) +
		"' src='" + data.url + "'>";
	return downloadFilename
		? "<a href='" + data.url + "' download='" + downloadFilename + "'>" +
			img + "</a>"
		: img;
};

/** Export program to HTML
	@param {CSSParser.VPL} css
	@return {string}
*/
A3a.vpl.Application.prototype.toHTMLDocument = function (css) {
	var dims = A3a.vpl.Canvas.calcDims(100, 100);
	var scale = 5;
	var thenWidgetImg = this.vplCanvas.widgetToImgElement("vpl:then", css, dims, scale);
	return "<!DOCTYPE html>\n" +
		"<html>\n" +
		(this.cssForHTMLDocument
			? "<head>\n<style>\n" + this.cssForHTMLDocument + "</style>\n</head>\n"
			: "") +
		"<body>\n" +
		"<table class='program'>\n" +
		this.program.program.map(function (rule) {
			return rule instanceof A3a.vpl.RuleComment
				? "<tr class='rule-comment'>\n" +
					"<td class='comment'>\n" +
					rule.comment + "\n" +
					"</td>\n" +
					"</tr>\n"
				: rule.isEmpty()
					? ""
					: "<tr class='rule'>\n" +
						"<td class='events'>\n" +
						"<table class='events'>\n" +
						"<tr class='events'>\n" +
						rule.events.map(function (event, i) {
							var classes = "block";
							switch (event.blockTemplate.type) {
							case A3a.vpl.blockType.event:
								classes += " event";
								classes += i === 0 ? " event-main" : " event-aux";
								break;
							case A3a.vpl.blockType.state:
								classes += " state";
								break;
							case A3a.vpl.blockType.comment:
								classes += " comment";
								break;
							}
							return "<td class='" + classes + "'>" + event.toImgElement(css, dims, scale) + "</td>\n";
						}).join("") +
						"</tr>\n" +
						"</table>\n" +
						"</td>\n" +
						"<td class='then'>" + thenWidgetImg + "</td>\n" +
						"<td class='actions'>\n" +
						"<table class='actions'>\n" +
						"<tr class='actions'>\n" +
						rule.actions.map(function (action) {
							var classes = "block";
							switch (action.blockTemplate.type) {
							case A3a.vpl.blockType.action:
								classes += " action";
								break;
							case A3a.vpl.blockType.comment:
								classes += " comment";
								break;
							}
							return "<td class='" + classes + "'>" + action.toImgElement(css, dims, scale) + "</td>\n";
						}).join("") +
						"</tr>\n" +
						"</table>\n" +
						"</td>\n" +
						"</tr>\n";
		}).join("") +
		"</table>\n" +
		"</body>\n" +
		"</html>\n";
};

/** Export all blocks and widgets to HTML
	@param {CSSParser.VPL} css
	@param {boolean} blocksOnly true for simple event/action blocks (default: false)
	@return {string}
*/
A3a.vpl.Application.prototype.uiToHTMLDocument = function (css, blocksOnly) {

	function controlToHTML(id, data) {
		var img = "<img width='" + data.width.toString(10) +
			"' height='" + data.height.toString(10) +
			"' src='" + data.url + "'>";
		var downloadFilename = id.replace(/ /g, "_") + ".png";
		var a = "<a href='" + data.url + "' download='" + downloadFilename + "'>" + img + "</a>";
		return "<tr><td>" + a + "</td><td>" + id + "</td></tr>\n";
	}

	function toolbarButtonsToHTML(app, controlBar) {
		return controlBar.controls.map(function (control) {
			var possibleStates = app.commands.find(control.id).possibleStates || [{}];
			return possibleStates.map(function (possibleState) {
				app.forcedCommandState.isSelected = possibleState.selected === true;
				app.forcedCommandState.state = possibleState.state || null;
				var stateStr = possibleState.selected === true ? "selected" : possibleState.selected === false ? "unselected" : "";
				if (possibleState.state) {
					stateStr += (stateStr.length > 0 ? " " : "") + "=" + possibleState.state;
				}
				var buttonImg = app.vplCanvas.toolbarButtonToImgElement(controlBar, control.id, toolbarItemBoxes[control.id],
					dims, scale, control.id + (stateStr ? "-" + stateStr.replace(/\s+/g, "-").replace("=", "") : "") + ".png");
				return "<tr><td>" + buttonImg + "</td><td>" + control.id + "</td><td>" + stateStr + "</td></tr>\n";
			}).join("");
		}).join("");
	}

	var dims = A3a.vpl.Canvas.calcDims(100, 100);
	var scale = 5;
	var cssBoxes = this.getCSSBoxes(css);
	this.forcedCommandState = {
		disabled: false,
		isAvailable: true,
		isPressed: false,
		isEnabled: true,
		isSelected: false,
		state: null
	};
	var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbarConfig, ["vpl", "top"]);
	var controlBar = this.createVPLToolbar(this.vplToolbarConfig, ["vpl", "top"],
		cssBoxes.toolbarBox, cssBoxes.toolbarSeparatorBox, toolbarItemBoxes);
	toolbarItemBoxes = Object.assign(/** @type {!Object} */(toolbarItemBoxes), A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbar2Config, ["vpl", "bottom"]));
	var controlBar2 = this.createVPLToolbar(this.vplToolbar2Config, ["vpl", "bottom"],
			cssBoxes.toolbar2Box, cssBoxes.toolbarSeparator2Box, toolbarItemBoxes);
	this.srcToolbarConfig.forEach(function (id) {
		toolbarItemBoxes[id] = css.getBox({tag: "button", id: id.replace(/:/g, "-"), clas: ["src", "top"]});
	}, this);
	var controlBarSourceEditor = null;
	if (this.editor != null) {
		controlBarSourceEditor = this.createSourceEditorToolbar(this.srcToolbarConfig,
			css.getBox({tag: "toolbar", clas: ["src", "top"]}),
			css.getBox({tag: "separator", clas: ["src", "top"]}),
			toolbarItemBoxes);
	}
	this.simToolbarConfig.forEach(function (id) {
		toolbarItemBoxes[id] = css.getBox({tag: "button", id: id.replace(/:/g, "-"), clas: ["sim", "top"]});
	}, this);

	// simulator
	var sim2d = this.sim2d;
	var controlBarSimulator = null;
	var eventButtons = [];
	var eventButtonsSimulator = null;
	if (sim2d != null) {
		controlBarSimulator = this.createSim2dToolbar(this.simToolbarConfig,
				css.getBox({tag: "toolbar", clas: ["sim", "top"]}),
				css.getBox({tag: "separator", clas: ["sim", "top"]}),
				toolbarItemBoxes);
		eventButtons = [
			"sim-event:forward",
			"sim-event:backward",
			"sim-event:left",
			"sim-event:right",
			"sim-event:center",
			"sim-event:clap",
			"sim-event:tap"
		];
		var eventButtonBox = css.getBox({tag: "button", clas: ["sim", "event"]});
		eventButtonsSimulator = eventButtons.map(function (id) {
			var draw = function (ctx, box, isPressed) {
				(sim2d.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS)(id,
					ctx, dims, css, ["sim", "event"], null,
					true, false, isPressed);
			};
			var dataURL = A3a.vpl.Canvas.controlToDataURL(draw,
				eventButtonBox.width, eventButtonBox.height, eventButtonBox,
				dims, scale);
			return dataURL;
		});
	}

	var program = this.program;

	var html = blocksOnly
		? "<!DOCTYPE html>\n" +
			"<html>\n" +
			(this.cssForHTMLDocument
				? "<head>\n<style>\n" + this.cssForHTMLDocument + "</style>\n</head>\n"
				: "") +
			"<body>\n" +
			"<table>\n" +
			(function () {
				var ixEv = 0;
				var ixAc = 0;
				var html1 = "";
				while (true) {
					// event or state block
					while (ixEv < A3a.vpl.BlockTemplate.lib.length &&
						(A3a.vpl.BlockTemplate.lib[ixEv].type !== A3a.vpl.blockType.event && A3a.vpl.BlockTemplate.lib[ixEv].type !== A3a.vpl.blockType.state ||
							(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(A3a.vpl.BlockTemplate.lib[ixEv].name) < 0)) {
						ixEv++;
					}
					var htmlEv = "";
					if (ixEv < A3a.vpl.BlockTemplate.lib.length) {
						var block = new A3a.vpl.Block(A3a.vpl.BlockTemplate.lib[ixEv], null, null);
						if (A3a.vpl.BlockTemplate.lib[ixEv].typicalParam) {
							block.param = A3a.vpl.BlockTemplate.lib[ixEv].typicalParam();
						}
						htmlEv = block.toImgElement(css, dims, scale, A3a.vpl.BlockTemplate.lib[ixEv].name.replace(/ /g, "_") + ".png");
						ixEv++;
					}
					// action or comment block
					while (ixAc < A3a.vpl.BlockTemplate.lib.length &&
						(A3a.vpl.BlockTemplate.lib[ixAc].type !== A3a.vpl.blockType.action && A3a.vpl.BlockTemplate.lib[ixAc].type !== A3a.vpl.blockType.comment ||
							(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced).indexOf(A3a.vpl.BlockTemplate.lib[ixAc].name) < 0)) {
						ixAc++;
					}
					var htmlAc = "";
					if (ixAc < A3a.vpl.BlockTemplate.lib.length) {
						var block = new A3a.vpl.Block(A3a.vpl.BlockTemplate.lib[ixAc], null, null);
						if (A3a.vpl.BlockTemplate.lib[ixAc].typicalParam) {
							block.param = A3a.vpl.BlockTemplate.lib[ixAc].typicalParam();
						}
						htmlAc = block.toImgElement(css, dims, scale, A3a.vpl.BlockTemplate.lib[ixAc].name.replace(/ /g, "_") + ".png");
						ixAc++;
					}
					if (htmlEv || htmlAc) {
						html1 += "<tr>\n<td>" + htmlEv + "</td>\n<td>" + htmlAc + "</td>\n</tr>\n";
					} else {
						break;
					}
				}
				return html1;
			})() +
			"</table>" +
			"</html>"
		: "<!DOCTYPE html>\n" +
			"<html>\n" +
			(this.cssForHTMLDocument
				? "<head>\n<style>\n" + this.cssForHTMLDocument + "</style>\n</head>\n"
				: "") +
			"<body>\n" +
			"<table>\n" +
			A3a.vpl.BlockTemplate.lib.map(function (blockTemplate, i) {
				var cl = null;
				switch (blockTemplate.type) {
				case A3a.vpl.blockType.event:
					cl = "event";
					break;
				case A3a.vpl.blockType.state:
					cl = "state";
					break;
				case A3a.vpl.blockType.action:
					cl = "action";
					break;
				case A3a.vpl.blockType.comment:
					cl = "comment";
					break;
				default:
					return "";
				}
				var block = new A3a.vpl.Block(blockTemplate, null, null);
				var html = "<tr class='" + cl + "'>\n" +
					"<td>\n";
				if (blockTemplate.typicalParamSet) {
					blockTemplate.typicalParamSet.forEach(function (param, i) {
						block.param = param;
						html += block.toImgElement(css, dims, scale, blockTemplate.name.replace(/ /g, "_") + "-" + i.toString(10) + ".png");
					});
				} else {
					block.param = blockTemplate.typicalParam ? blockTemplate.typicalParam() : block.param;
					html += block.toImgElement(css, dims, scale, blockTemplate.name.replace(/ /g, "_") + ".png");
				}
				html += "</td>\n" +
					"<td>" + blockTemplate.name + "</td>\n" +
					"</tr>\n";
				return html;
			}).join("") +
			"</table>\n" +
			"<table>\n" +
			Object.keys(/** @type {!Object} */(this.vplCanvas.widgets)).map(function (widgetId) {
				var widgetImg = this.vplCanvas.widgetToImgElement(widgetId, css, dims, scale, widgetId + ".png");
				return "<tr><td>" + widgetImg + "</td><td>" + widgetId + "</td></tr>\n";
			}, this).join("") +
			"</table>\n" +
			"<table>\n" +
			toolbarButtonsToHTML(this, controlBar) +
			toolbarButtonsToHTML(this, controlBar2) +
			(this.editor != null ? toolbarButtonsToHTML(this, controlBarSourceEditor) : "") +
			(sim2d != null
				? toolbarButtonsToHTML(this, controlBarSimulator) +
					eventButtonsSimulator.map(function (data, i) {
						return controlToHTML(eventButtons[i], data);
			 		})
				: "") +
			"</table>\n" +
			"</body>\n" +
			"</html>\n";
	this.forcedCommandState = null;
	return html;
};
