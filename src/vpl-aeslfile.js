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

Methods for class A3a.vpl.Program to support reading from AESL files.
Compatibility with VPL 1 is obtained if compatible blocks
are defined and rules are defined in A3a.vpl.BlockTemplate.aeslImportRules
for all AESL blocks.

*/

/** Export as AESL file
	@param {string} code
	@param {string=} vplProgramXML
	@return {string}
*/
A3a.vpl.Program.toAESLFile = function (code, vplProgramXML) {
	return [
		'<!DOCTYPE aesl-source>',
		'<network>',
		'<keywords flag="true"/>',
		'<node nodeId="1" name="thymio-II">' +
			code
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&apos;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;"),
		vplProgramXML || ""
	].join("\n");
}

/** Import program from AESL file
	@param {string} xml content of the AESL file (xml)
	@return {void}
*/
A3a.vpl.Program.prototype.importFromAESLFile = function (xml) {
	var self = this;
	var domParser = new DOMParser();
	var dom = domParser.parseFromString(xml, "text/xml");
	var el = dom.getElementsByTagName("node");
	if (el.length < 1) {
		throw "empty";
	}
	el = el[0].getElementsByTagName("program");
	if (el.length !== 1) {
		throw "program";
	}
	var advanced = el[0].getAttribute("advanced_mode") !== "0";
	el = el[0].getElementsByTagName("set");
	this.new();
	this.mode = advanced ? A3a.vpl.mode.advanced : A3a.vpl.mode.basic;
	for (var i = 0; i < el.length; i++) {
		var rule = A3a.vpl.Rule.parseFromAESLSetElement(el[i],
			advanced,
			function () {
				self.saveStateBeforeChange();
			},
			function () {
				self.saveStateAfterChange();
			});
		this.program.push(rule);
	}
};

/** Parse AESL "set" element
	@param {Element} setElement
	@param {boolean} advanced
	@param {?function():void} onPrepareChange
	@param {?function():void} onChanged
	@return {A3a.vpl.Rule}
*/
A3a.vpl.Rule.parseFromAESLSetElement = function (setElement, advanced, onPrepareChange, onChanged) {
	var blocks = setElement.getElementsByTagName("block");
	var rule = new A3a.vpl.Rule();
	for (var i = 0; i < blocks.length; i++) {
		var block = A3a.vpl.Block.parseFromAESLBlockElement(blocks[i], advanced);
		if (block) {
			rule.setBlock(block, null, onPrepareChange, onChanged, true);
		}
	}
	return rule;
};

/** Parse AESL "block" element
	@param {Element} blockElement
	@param {boolean} advanced
	@return {A3a.vpl.Block}
*/
A3a.vpl.Block.parseFromAESLBlockElement = function (blockElement, advanced) {
	var type = {
		"event": A3a.vpl.blockType.event,
		"action": A3a.vpl.blockType.action,
		"state": A3a.vpl.blockType.state,
		"comment": A3a.vpl.blockType.comment
	}[blockElement.getAttribute("type")] || A3a.vpl.blockType.action;
	var aeslName = blockElement.getAttribute("name");
	/** @type {Array.<string>} */
	var valStr = [];
	/** @type {Array.<number>} */
	var val = [];
	for (var i = 0; i < 1000; i++) {
		var v = blockElement.getAttribute("value" + i);
		if (v === null) {
			break;
		}
		valStr.push(v);
		val.push(parseFloat(v));
	}
	for (var i = 0; i < A3a.vpl.BlockTemplate.aeslImportRules.length; i++) {
		if (aeslName === A3a.vpl.BlockTemplate.aeslImportRules[i].aeslName) {
			var cond = !A3a.vpl.BlockTemplate.aeslImportRules[i].condition ||
				A3a.vpl.BlockTemplate.substInline(
					/** @type {string} */(A3a.vpl.BlockTemplate.aeslImportRules[i].condition),
					A3a.vpl.BlockTemplate.aeslImportRules[i].stringParam ? valStr : val,
					undefined, true);
			if (cond) {
				var blockName = A3a.vpl.BlockTemplate.aeslImportRules[i].blockName;
				if (blockName == undefined) {
					return null;
				}
				var parameters = A3a.vpl.BlockTemplate.aeslImportRules[i].parameters
					? A3a.vpl.BlockTemplate.substInline(
						/** @type {string} */(A3a.vpl.BlockTemplate.aeslImportRules[i].parameters),
						A3a.vpl.BlockTemplate.aeslImportRules[i].stringParam ? valStr : val,
						undefined, true)
					: null;
				var blockTemplate = A3a.vpl.BlockTemplate.findByName(blockName);
				var block = new A3a.vpl.Block(blockTemplate, null, null);
				if (blockTemplate.importParam) {
					blockTemplate.importParam(block, parameters);
				} else {
					block.param = /** @type {A3a.vpl.BlockTemplate.param} */(parameters);
				}
				return block;
			}
		}
	}

	throw "unknown AESL block " + aeslName;
};

/** Set anchor element so that it downloads text
	@param {Element} anchor "a" element
	@param {string} text
	@param {string=} filename filename of downloaded file (default: "untitled.xml")
	@param {string=} mimetype mime type of downloaded file (default: "application/xml")
	@return {void}
*/
A3a.vpl.Program.setAnchorDownload = function (anchor, text, filename, mimetype) {
	mimetype = mimetype || "application/xml";
	/** @type {string} */
	var url;
	if (typeof window.Blob === "function" && window.URL) {
		// blob URL
		var blob = new window.Blob([text], {"type": mimetype});
		url = window.URL.createObjectURL(blob);
	} else {
		// data URL
		url = "data:" + mimetype + ";base64," + window["btoa"](text);
	}
	anchor.href = url;
	anchor["download"] = filename || "untitled.xml";
};

/** Download file
	@param {string} text
	@param {string=} filename filename of downloaded file (default: "untitled.xml")
	@param {string=} mimetype mime type of downloaded file (default: "application/xml")
	@return {void}
*/
A3a.vpl.Program.downloadText = (function () {
	// add a hidden anchor to document, which will be reused
	/** @type {Element} */
	var anchor = null;

	return function (text, filename, mimetype) {
		if (anchor === null) {
			anchor = document.createElement("a");
			document.body.appendChild(anchor);
			anchor.style.display = "none";
		}

		mimetype = mimetype || "application/xml";

		/** @type {string} */
		var url;
		if (typeof window.Blob === "function" && window.URL) {
			// blob URL
			var blob = new window.Blob([text], {"type": mimetype});
			url = window.URL.createObjectURL(blob);
		} else {
			// data URL
			url = "data:" + mimetype + ";base64," + window["btoa"](text);
		}
		A3a.vpl.Program.setAnchorDownload(anchor, text, filename, mimetype);
		anchor.click();
		if (typeof url !== "string") {
			window.URL.revokeObjectURL(url);
		}
	};
})();
