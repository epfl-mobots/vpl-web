/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
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
				x, y);
		});
	return item.toDataURL(dims, scale || 1);
};

/** Export block to an img HTML element
	@param {CSSParser.VPL} css
	@param {A3a.vpl.Canvas.dims} dims
	@param {number=} scale
	@return {string}
*/
A3a.vpl.Block.prototype.toImgElement = function (css, dims, scale) {
	return "<img width='" + dims.blockSize.toString(10) +
		"' height='" + dims.blockSize.toString(10) +
 		"' src='" + this.toDataURL(css, dims, scale) + "'>";
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
	@return {string}
*/
A3a.vpl.Canvas.prototype.widgetToImgElement = function (id, css, dims, scale) {
	var data = this.widgetToDataURL(id, css, dims, scale);
	return "<img width='" + data.width.toString(10) +
		"' height='" + data.height.toString(10) +
		"' src='" + data.url + "'>";
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
		"<body>\n" +
		"<table>\n" +
		this.program.program.map(function (rule) {
			return rule.isEmpty()
				? ""
				: "<tr>\n" +
					"<td class='events'>\n" +
					"<table class='events'>\n" +
					"<tr class='events'>\n" +
					rule.events.map(function (event) {
						return "<td class='block'>" + event.toImgElement(css, dims, scale) + "</td>\n";
					}).join("") +
					"</tr>\n" +
					"</table>\n" +
					"</td>\n" +
					"<td class='then'>" + thenWidgetImg + "</td>\n" +
					"<td class='actions'>\n" +
					"<table class='actions'>\n" +
					"<tr class='actions'>\n" +
					rule.actions.map(function (action) {
						return "<td class='block'>" + action.toImgElement(css, dims, scale) + "</td>\n";
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
