/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Methods for class A3a.vpl.Program to support reading from and writing
to AESL files. Compatibility with VPL 1 is obtained if compatible blocks
are defined (A3a.vpl.BlockTemplate instances with the same name and
parameters and compatible code generation).

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

/** Export program as toolsPlugins ThymioVisualProgramming nodes
	@return {string}
*/
A3a.vpl.Program.prototype.toXML = function () {
	var advanced = this.mode === A3a.vpl.mode.advanced;
	return [
		'<toolsPlugins>',
		'<ThymioVisualProgramming>',
		'<vplroot xml-format-version="1">',
		'<program advanced_mode="' + (advanced ? 1 : 0) + '">'
	].concat(this.program.map(function (rule) {
		return rule.toAESLXML(advanced);
	})).concat([
		'</program>',
		'</vplroot>',
		'</ThymioVisualProgramming>',
		'</toolsPlugins>',
		''
	]).join("\n");
};

/** Export program as AESL file
	@return {string} content of the AESL file (xml)
*/
A3a.vpl.Program.prototype.exportAsAESLFile = function () {
	return A3a.vpl.Program.toAESLFile(this.getCode("aseba"),
		this.toXML());
};

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
			});
		this.program.push(rule);
	}
};

/** Roundtrip export to/import from xml file (for tests)
	@return {void}
*/
A3a.vpl.Program.prototype.exportImportAESLFile = function () {
	var xml = this.exportAsAESLFile();
	this.importFromAESLFile(xml);
};

/** Parse AESL "set" element
	@param {Element} setElement
	@param {boolean} advanced
	@param {?function():void} onPrepareChange
	@return {A3a.vpl.Rule}
*/
A3a.vpl.Rule.parseFromAESLSetElement = function (setElement, advanced, onPrepareChange) {
	var blocks = setElement.getElementsByTagName("block");
	var rule = new A3a.vpl.Rule();
	for (var i = 0; i < blocks.length; i++) {
		var block = A3a.vpl.Block.parseFromAESLBlockElement(blocks[i], advanced);
		rule.setBlock(block, null, onPrepareChange, true);
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
	var vplName = A3a.vpl.Rule.aesl2vpl[aeslName];
	var descr = A3a.vpl.Rule.vpl2aesl[vplName];
	if (descr === undefined) {
		throw "unknown AESL block " + aeslName;
	}
	/** @type {Array.<number|string>} */
	var val = [];
	for (var i = 0; i < 1000; i++) {
		var v = blockElement.getAttribute("value" + i);
		if (v === null) {
			break;
		}
		val.push(descr.stringParam ? v : parseInt(v, 10));
	}
	if (advanced && descr.adv) {
		vplName = descr.adv;
		descr = A3a.vpl.Rule.vpl2aesl[vplName];
	}
	var blockTemplate = A3a.vpl.BlockTemplate.findByName(vplName);
	var block = new A3a.vpl.Block(blockTemplate, null, null);
	var param = descr.valuesToParam ? descr.valuesToParam(val) : val;
	if (blockTemplate.importParam) {
		blockTemplate.importParam(block, param);
	} else {
		block.param = param;
	}
	return block;
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

/** Convert event handler to AESL (xml)
	@param {boolean} advanced
	@return {string}
*/
A3a.vpl.Rule.prototype.toAESLXML = function (advanced) {
	if (this.isEmpty()) {
		return "";
	}
	var str = "";
	this.events.forEach(function (event) {
		str += event.toAESLXML() + "\n";
	});
	this.actions.forEach(function (action) {
		str += action.toAESLXML() + "\n";
	});
	return "<set>\n" + str + "</set>";
};

A3a.vpl.Rule.functionEmpty = function () {
	return [];
};

A3a.vpl.Rule.functionNop = function (v) {
	return v;
};

/** @const */
A3a.vpl.Rule.vpl2aesl = {
	"accelerometer": {
		name: "acc",
		paramToValues: function (param) {
			return [
				[0, 2, 1][param[0]],
				-param[1]
			];
		},
		valuesToParam: function (values) {
			return [
				[0, 2, 1][values[0]],
				-values[1]
			];
		}
	},
	"bottom color": {
		name: "colorbottom",
		paramToValues: function (param) {
			return param.map(function (p) { return Math.round(32 * p); });
		},
		valuesToParam: function (values) {
			return values.map(function (v) { return v / 32; });
		}
	},
	"button": {
		name: "button",
		paramToValues: function (param) {
			return [1, 4, 2, 3, 0]
				.map(function (i) { return param[i] ? 1 : 0; })
				.concat(0, 0);
		},
		valuesToParam: function (values) {
			return [4, 0, 2, 3, 1]
				.map(function (i) { return values[i] !== 0; });
		}
	},
	"clap": {
		name: "clap",
		paramToValues: A3a.vpl.Rule.functionEmpty,
		valuesToParam: A3a.vpl.Rule.functionEmpty
	},
	"color state": {
		name: "colorstate",
		incompatible: true,
		paramToValues: function (param) {
			return param.map(function (p) { return Math.floor(2.99 * p); });
		},
		valuesToParam: function (values) {
			return values.map(function (v) { return v / 2; });
		}
	},
	"counter comparison": {
		name: "countercmp",
		incompatible: true,
		paramToValues: function (param) {
			return param;
		},
		valuesToParam: function (values) {
			return values;
		}
	},
	"ground": {
		name: "proxground",
		adv: "ground adv",
		paramToValues: function (param) {
			return param
				.map(function (p) { return p > 0 ? 1 : p < 0 ? 2 : 0; })
				.concat(400, 450);
		},
		valuesToParam: function (values) {
			return values
				.slice(0, 2)
				.map(function (v) { return v === 2 ? -1 : v; });
		}
	},
	"ground adv": {
		name: "proxground",
		paramToValues: function (param) {
			return param
				.slice(0, 2)
				.map(function (p) { return p > 0 ? 1 : p < 0 ? 2 : 0; })
				.concat(param
					.slice(2)
					.map(function (p) { return Math.round(1000 * p); }));
		},
		valuesToParam: function (values) {
			return values
				.slice(0, 2)
				.map(function (v) { return v === 2 ? -1 : v; })
				.concat(values
					.slice(2)
					.map(function (v) { return Math.max(0, Math.min(1, v / 1000)); }));
		}
	},
	"horiz prox": {
		name: "prox",
		adv: "horiz prox adv",
		paramToValues: function (param) {
			return param
				.map(function (p) { return p > 0 ? 1 : p < 0 ? 2 : 0; })
				.concat(1000, 2000);
		},
		valuesToParam: function (values) {
			return values
				.slice(0, 7)
				.map(function (v) { return v === 2 ? -1 : v; });
		}
	},
	"horiz prox adv": {
		name: "prox",
		paramToValues: function (param) {
			return param
				.slice(0, 7)
				.map(function (p) { return p > 0 ? 1 : p < 0 ? 2 : 0; })
				.concat(param
					.slice(7)
					.map(function (p) { return Math.round(700 + 3300 * p); }));
		},
		valuesToParam: function (values) {
			return values
				.slice(0, 7)
				.map(function (v) { return v === 2 ? -1 : v; })
				.concat(values
					.slice(7)
					.map(function (v) { return Math.max(0, Math.min(1, (v - 700) / 3300)); }));
		}
	},
	"init": {
		name: "init",
		incompatible: true,
		paramToValues: A3a.vpl.Rule.functionEmpty,
		valuesToParam: A3a.vpl.Rule.functionEmpty
	},
	"motor": {
		name: "move",
		paramToValues: function (param) {
			return param.map(function (p) { return Math.round(500 * p); });
		},
		valuesToParam: function (values) {
			return values.map(function (v) { return v / 500; });
		}
	},
	"move": {
		name: "move2"
	},
	"notes": {
		name: "sound",
		paramToValues: function (param) {
			/** @type {Array.<number>} */
			var v = [];
			for (var i = 0; i < 6; i++) {
				v.push(param[2 * i + 1] === 0
					? 517	// pause
					: param[2 * i] + 256 * param[2 * i + 1]);
			}
			return v;
		},
		valuesToParam: function (values) {
			/** @type {Array.<number>} */
			var p = [];
			for (var i = 0; i < 6; i++) {
				p.push(values[i] % 256);
				p.push(values[i] >= 517 ? 0 : Math.floor(values[i] / 256));
			}
			return p;
		}
	},
	"set counter": {
		name: "setcounter",
		incompatible: true,
		paramToValues: function (param) {
			return param;
		},
		valuesToParam: function (values) {
			return values;
		}
	},
	"set state": {
		name: "setstate",
		paramToValues: function (param) {
			return param.map(function (p) { return p > 0 ? 1 : p < 0 ? 2 : 0; });
		},
		valuesToParam: function (values) {
			return values.map(function (v) { return v === 2 ? -1 : v; });
		}
	},
	"set timer": {
		name: "timer",
		paramToValues: function (param) {
			return [Math.round(1000 * param[0])];	// s -> ms
		},
		valuesToParam: function (values) {
			return [values[0] / 1000];	// ms -> s
		}
	},
	"set timer log": {
		name: "timerlog",
		incompatible: true,
		paramToValues: function (param) {
			return [Math.round(1000 * param[0])];	// s -> ms
		},
		valuesToParam: function (values) {
			return [values[0] / 1000];	// ms -> s
		}
	},
	"state": {
		name: "statefilter",
		paramToValues: function (param) {
			return param.map(function (p) { return p > 0 ? 1 : p < 0 ? 2 : 0; });
		},
		valuesToParam: function (values) {
			return values.map(function (v) { return v === 2 ? -1 : v; });
		}
	},
	"top color": {
		name: "colortop",
		paramToValues: function (param) {
			return param.map(function (p) { return Math.round(32 * p); });
		},
		valuesToParam: function (values) {
			return values.map(function (v) { return v / 32; });
		}
	},
	"tap": {
		name: "acc",
		adv: "accelerometer",
		paramToValues: function () {
			return [0, 0];
		},
		valuesToParam: A3a.vpl.Rule.functionEmpty
	},
	"timer": {
		name: "timeout",
		paramToValues: A3a.vpl.Rule.functionEmpty,
		valuesToParam: A3a.vpl.Rule.functionEmpty
	},
	"picture comment": {
		name: "commentpict",
		incompatible: true,
		stringParam: true,
		paramToValues: function (param) {
			return [param[1]];
		},
		valuesToParam: function (values) {
			return [false, values[0]];
		}
	}
};

/** @const */
A3a.vpl.Rule.aesl2vpl = (function () {
	var dict = {};
	for (var entry in A3a.vpl.Rule.vpl2aesl) {
		if (A3a.vpl.Rule.vpl2aesl.hasOwnProperty(entry)) {
			var aeslName = A3a.vpl.Rule.vpl2aesl[entry].name;
			// keep variant with adv property if it exists
			if (!dict[aeslName]
				|| !A3a.vpl.Rule.vpl2aesl[dict[aeslName]].adv) {
				dict[aeslName] = entry;
			}
		}
	}
	return dict;
})();

/** Convert block to AESL (xml)
	@return {string}
*/
A3a.vpl.Block.prototype.toAESLXML = function () {
	var m = A3a.vpl.Rule.vpl2aesl[this.blockTemplate.name];
	return '<block type="' +
		{"e": "event", "a": "action", "s": "state"}[this.blockTemplate.type] +
		'" name="' + (m.name || this.blockTemplate.name) +
		'" ' + (this.param
			? (m.paramToValues ? m.paramToValues(this.param) : this.param).map(function (v, i) {
					return 'value' + i.toString() + '="' + v + '"';
				}).join(" ")
			: "") + '/>';
};
