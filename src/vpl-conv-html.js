/*
	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Utility functions to convert markdown or images to HTML.

*/

/** Convert file content to HTML
	@param {string} content content (text or converted with atob)
	@param {string} suffix file suffix (html, htm, txt, md, gif, jpg, jpeg, png or svg)
	@return {string} html fragment
*/
A3a.vpl.toHTML = function (content, suffix) {

	function centeredImage(mimetype) {
		var img = "<img src='data:" + mimetype + ";base64," + btoa(content) + "' style='max-width:100%;max-height:100%;'>";
		return "<div style='display: table; height: 100%; width: 100%; overflow: hidden;'>" +
			"<div style='display: table-cell; vertical-align: middle; text-align: center;'>" +
			img +
			"</div>" +
			"</div>";
	}

	switch (suffix.toLowerCase()) {
	case "html":
	case "htm":
		return content;
	case "txt":
		return "<pre style='width: 100%; height: 100%; padding: 3em;'>" +
			content
				.replace(/&/g, "&amp;")
			 	.replace(/</g, "&lt;") +
			"</pre>";
		break;
	case "md":
		var dynamicHelp = new A3a.vpl.DynamicHelp();
		return "<div style='width: 100%; height: 100%; padding: 3em;'>" +
			dynamicHelp.convertToHTML(content.split("\n")) +
			"</div>";
		break;
	case "gif":
		return centeredImage("image/gif");
	case "jpg":
	case "jpeg":
		return centeredImage("image/jpeg");
	case "png":
		return centeredImage("image/png");
	case "svg":
		return centeredImage("image/svg+xml");
	default:
		return "";
	}
}

/** Convert data to a "data:" url
	@param {string} mimetype
	@param {string|!Uint8Array} data
	@return {string}
*/
A3a.vpl.toDataURL = function (mimetype, data) {
	if (data instanceof Uint8Array) {
		var s = "";
		for (var i = 0; i < data.byteLength; i++) {
			s += String.fromCharCode(data[i]);
		}
		data = s;
	}
	return "data:" + mimetype + ";base64," + btoa(data);
}
