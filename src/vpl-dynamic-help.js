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
[text](url)
*emphasis* or _emphasis_
**strong** or __strong__

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
A3a.vpl.DynamicHelp.convertToHTML = function (md) {
	var html = "";
	md.forEach(function (line) {
		// isolated ampersands
		line = line.replace(/&\s/g, "&amp; ");

		// titles
		var parEl = "p";
		if (/^##/.test(line)) {
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

		// links
		line = line.replace(/\[([^\]]*)\]\(([^)]*)\)/g, "<a href=\"$2\">$1</a>");

		// add paragraph
		html += "<" + parEl + ">" + line + "</" + parEl + ">\n";
	});

	return html;
};

/** Generate html
	@param {string} language
	@param {Array.<string>} blocks
	@return {string}
*/
A3a.vpl.DynamicHelp.prototype.generate = function (language, blocks) {
	var html = "";
	blocks.forEach(function (blockId) {
		var frag = this.get(language, "blocks", blockId);
		if (frag) {
			html += A3a.vpl.DynamicHelp.convertToHTML(frag);
		}
	}, this);
	return "<html>\n" + (html || "<p>Empty</p>\n") + "</html>\n";
};
