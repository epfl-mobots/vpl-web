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
	@param {function(string):string=} processImageURL
	@return {string} html fragment
*/
A3a.vpl.toHTML = function (content, suffix, processImageURL) {

	function centeredImage(mimetype) {
		var img = "<img src='data:" + mimetype + ";base64," + btoa(content) + "' style='max-width:100%;max-height:100%;'>";
		return "<div style='display: table; height: 100%; width: 100%; overflow: hidden;'>" +
			"<div style='display: table-cell; vertical-align: middle; text-align: center;'>" +
			img +
			"</div>" +
			"</div>";
	}

	suffix = suffix.toLowerCase();
	switch (suffix) {
	case "html":
	case "htm":
		if (processImageURL) {
			// match img element with src attribute which doesn't begin with method
			var reImg = /<img\s[^>]*src=['"](?!\w+:)([^'"]+)['"]/;
			for (var pos = 0; pos < content.length; ) {
				var r = reImg.exec(content.slice(pos));
				if (r == null) {
					break;
				}
				var imgSrc = r[1];
				var groupIndex = pos + r.index + r[0].indexOf(imgSrc);
				var newImgSrc = processImageURL(imgSrc);
				content = content.slice(0, groupIndex) + newImgSrc + content.slice(groupIndex + imgSrc.length);
				pos = groupIndex + newImgSrc.length;
			}
		}
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
		dynamicHelp.setProcessImageURL(processImageURL || null);
		return "<div style='width: 100%; height: 100%; padding: 3em;'>" +
			dynamicHelp.convertToHTML(content.split("\n")) +
			"</div>";
		break;
	case "gif":
	case "jpg":
	case "jpeg":
	case "png":
	case "svg":
		return centeredImage(A3a.vpl.suffixToMimetype[suffix]);
	default:
		return "";
	}
}

/**
	@const
*/
A3a.vpl.suffixToMimetype = {
	"gif": "image/gif",
	"htm": "text/html",
	"html": "text/html",
	"jpeg": "image/jpeg",
	"jpg": "image/jpeg",
	"md": "text/markdown",
	"png": "image/png",
	"svg": "image/svg+xml",
	"txt": "text/plain"
};

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
