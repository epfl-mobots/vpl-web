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
	box.width = dims.blockSize;
	box.height = dims.blockSize;

	var item = new A3a.vpl.CanvasItem(this,
		box.totalWidth(),
		box.totalHeight(),
		0, 0,
		// draw
		function (canvas, item, dx, dy) {
			var x = item.x + box.offsetLeft() + dx;
 			var y = item.y + box.offsetTop() + dy;
			box.drawAt(canvas.ctx, x, y);
			self.blockTemplate.renderToCanvas(canvas,
				/** @type {A3a.vpl.Block} */(item.data),
				box,
				x, y);
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

/** Export toolbar button to data URL
	@param {string} id
	@param {CSSParser.VPL.Box} itemBox
	@param {CSSParser.VPL} css
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@return {{url: string, width: number, height: number}}
*/
A3a.vpl.ControlBar.prototype.toolbarButtonToDataURL = function (id, itemBox, css, dims, scale) {
	for (var i = 0; i < this.controls.length; i++) {
		var control = this.controls[i];
		if (control.id === id) {
			var width = control.bounds.xmax - control.bounds.xmin;
			var height = control.bounds.ymax - control.bounds.ymin;
			var item = new A3a.vpl.CanvasItem(null,
				width, height,
				0, 0,
				// draw
				function (canvas, item, dx, dy) {
					control.draw(canvas.ctx, itemBox, false);
				});
			return {
				url: item.toDataURL(dims, scale || 1),
				width: width,
				height: height
			};
		}
	}
	throw "button id not found";
};

/** Export toolbar button to an img HTML element
	@param {A3a.vpl.ControlBar} controlbar
	@param {string} id
	@param {CSSParser.VPL.Box} itemBox
	@param {CSSParser.VPL} css
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@param {string=} downloadFilename
	@return {string}
*/
A3a.vpl.Canvas.prototype.toolbarButtonToImgElement = function (controlbar, id, itemBox, css, dims, scale, downloadFilename) {
	var data = controlbar.toolbarButtonToDataURL(id, itemBox, css, dims, scale);
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
			return rule.isEmpty()
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
	@return {string}
*/
A3a.vpl.Application.prototype.uiToHTMLDocument = function (css) {
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
	var toolbar2ItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbar2Config, ["vpl", "bottom"]);
	var controlBar2 = this.createVPLToolbar(this.vplToolbar2Config, ["vpl", "bottom"],
			cssBoxes.toolbar2Box, cssBoxes.toolbarSeparator2Box, toolbar2ItemBoxes);
	var html = "<!DOCTYPE html>\n" +
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
		controlBar.controls.map(function (control) {
			var buttonImg = this.vplCanvas.toolbarButtonToImgElement(controlBar, control.id, toolbarItemBoxes[control.id],
				css, dims, scale, control.id + ".png");
			return "<tr><td>" + buttonImg + "</td><td>" + control.id + "</td></tr>\n";
		}, this).join("") +
		controlBar2.controls.map(function (control) {
			var buttonImg = this.vplCanvas.toolbarButtonToImgElement(controlBar2, control.id, toolbar2ItemBoxes[control.id],
				css, dims, scale, control.id + ".png");
			return "<tr><td>" + buttonImg + "</td><td>" + control.id + "</td></tr>\n";
		}, this).join("") +
		"</table>\n" +
		"</body>\n" +
		"</html>\n";
	this.forcedCommandState = null;
	return html;
};
