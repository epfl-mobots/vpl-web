/*
	Copyright 2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

HTML help built dynamically for the current selection of blocks and language.

*/

/*

Markdown syntax currently implemented:

# title (block or button name etc.)
## subtitle
### subsubtitle
[text](url)
![text](url)
*emphasis* or _emphasis_
**strong** or __strong__

css:
p, h1, h2, h3: class "md"
p with a single img: classes "md parimg"
other elements: strong, em, img, a

*/

/** Dynamic help class
	@constructor
*/
A3a.vpl.DynamicHelp = function () {
	// this.fragments[language][section][id] = array of strings
	// each string a simplified markdown paragraph
	// language: 2-char language code (en, fr, etc.)
	// section: "blocks", "buttons", etc.
	// id: "clap", "vpl:new", etc.
	this.fragments = {};

	// this.images[urlMD] = url
	// mapping from urlMD, as used in ![text](urlMD),
	// to url to be used in generated html, such as "data:image/png;base64,..."
	this.images = {};

	// this.processImageURL(urlMD) = url
	// mapping from urlMD, as used in ![test](urlMD), if not in this.images[],
	// to url to be used in generated html, such as "data:image/png;base64,..."
	this.processImageURL = null;
};

/** Add fragments, merging with current values
	@param {Object} fragments
	@return {void}
*/
A3a.vpl.DynamicHelp.prototype.add = function (fragments) {
	for (var language in fragments) {
		if (fragments.hasOwnProperty(language)) {
			if (!this.fragments[language]) {
				this.fragments[language] = {};
			}
			for (var section in fragments[language]) {
				if (fragments[language].hasOwnProperty(section)) {
					if (!this.fragments[language][section]) {
						this.fragments[language][section] = {};
					}
					for (var id in fragments[language][section]) {
						if (fragments[language][section].hasOwnProperty(id)) {
							this.fragments[language][section][id] = fragments[language][section][id].slice();
						}
					}
				}
			}
		}
	}
};

/** Clear image mapping
	@return {void}
*/
A3a.vpl.DynamicHelp.prototype.clearImageMapping = function () {
	this.images = {};
	this.processImageURL = null;
};

/** Add image mapping
	@param {string} urlMD url used in markdown ![text](urlMD)
	@param {string} url url used in generated html
	@return {void}
*/
A3a.vpl.DynamicHelp.prototype.addImageMapping = function (urlMD, url) {
	this.images[urlMD] = url;
};

/** Set image mapping function
	@param {?function(string):string} processImageURL
	@return {void}
*/
A3a.vpl.DynamicHelp.prototype.setProcessImageURL = function (processImageURL) {
	this.processImageURL = processImageURL;
};

/** Get the array of text fragments corresponding to a language, section and id
	@param {string} language
	@param {string} section
	@param {string} id
	@return {?Array.<string>}
*/
A3a.vpl.DynamicHelp.prototype.get = function (language, section, id) {
	return this.fragments[language] &&
		this.fragments[language][section] &&
		this.fragments[language][section][id]
		? this.fragments[language][section][id]
		: null;
};

/** Convert array of simplified markdown paragraphs to html
	@param {Array.<string>} md
	@return {string}
*/
A3a.vpl.DynamicHelp.prototype.convertToHTML = function (md) {
	var html = "";
	md.forEach(function (line) {
		// isolated ampersands
		line = line.replace(/&\s/g, "&amp; ");

		// titles
		var parEl = "p";
		if (/^###/.test(line)) {
			line = line.slice(2);
			parEl = "h4";
		} else if (/^##/.test(line)) {
			line = line.slice(2);
			parEl = "h3";
		} else if (/^#/.test(line)) {
			line = line.slice(1);
			parEl = "h2";
		}

		// spans
		function handleSpans(re, tag) {
			var sp = line.split(re);
			if (sp.length > 1) {
				line = sp[0];
				for (var i = 1; i < sp.length; i++) {
					line += (i % 2 == 1 ? "<" : "</") + tag + ">" + sp[i];
				}
				if (sp.length % 2 == 0) {
					line += "</" + tag + ">";
				}
			}
		}
		handleSpans(/\*\*|__/, "strong");
		handleSpans(/\*|_/, "em");

		// images
		while (true) {
			var re = /!\[([^\]]*)\]\(([^)]*)\)/.exec(line);
			if (!re) {
				break;
			}
			var url = this.images[re[2]] || (this.processImageURL ? this.processImageURL(re[2]) : re[2]);
			line = line.slice(0, re.index) +
				"<img src=\"" + url + "\" alt=\"" + re[1] + "\">" +
				line.slice(re.index + re[0].length);
		}

		// links
		line = line.replace(/\[([^\]]*)\]\(([^)]*)\)/g, "<a href=\"$2\">$1</a>");

		// add paragraph
		if (parEl === "p" && /^<img /.test(line) && !/^.+<img/.test(line)) {
			// special case for paragraph with one image: class=parimg
			html += '<p class="md parimg">' + line + "</" + parEl + ">\n";
		} else {
			html += "<" + parEl + ' class="md">' + line + "</" + parEl + ">\n";
		}
	}, this);

	return html;
};

/** Generate html
	@param {string} language
	@param {Array.<string>} buttons
	@param {Array.<string>} blocks
	@param {Object=} docTemplates html document templates (key=language), where
	the 1st occurence of string BUTTONS is replaced with the command description and
	the 1st occurence of string BLOCKS is replaced with the block description
	@return {string}
*/
A3a.vpl.DynamicHelp.prototype.generate = function (language, buttons, blocks, docTemplates) {
	var docTemplate = docTemplates && docTemplates[language]
	 	? "<div style='padding: 2em; max-width: 60em; margin-left: auto; margin-right: auto;'>\n" +
			docTemplates[language] +
			"</div>\n"
		: "<html>\n" +
			"<style>\n" +
			"body {font-family: sans-serif;}\n" +
			"img {float: left; margin-right: 10px; margin-bottom: 20px;}\n" +
			"h1, h2, hr {clear: left;}\n" +
			"p {margin-left: 120px}\n" +
			"p.parimg {margin-left: 0}\n" +
			"</style>\n" +
			"<body>\n" +
			"<div style='padding: 2em; max-width: 60em; margin-left: auto; margin-right: auto;'>\n" +
			"BUTTONS" +
			"<hr>\n" +
			"BLOCKS" +
			"</div>\n" +
			"</body>\n" +
			"</html>\n";

	var htmlButtons = "";
	buttons.forEach(function (commandId) {
		var frag = this.get(language, "buttons", commandId);
		if (frag) {
			htmlButtons += this.convertToHTML(frag);
		}
	}, this);

	var htmlBlocks = "";
	blocks.forEach(function (blockId) {
		var frag = this.get(language, "blocks", blockId);
		if (frag) {
			htmlBlocks += this.convertToHTML(frag);
		}
	}, this);

	return docTemplate
		.replace("BUTTONS", htmlButtons)
		.replace("BLOCKS", htmlBlocks);
};
