/*
	Copyright 2018-2023 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Code executed to setup the VPL3 web application: decodes options
passed in query string and hash string, instantiates A3a.vpl.Application,
and installs global event listeners.

*/

/** @dict */
A3a.vpl.blockLib = {};

// window-level drag
/** @type {?function(Event,boolean,boolean):void} */
A3a.vpl.dragFun = null;
document.addEventListener("mousemove", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(e, false, false);
		e.preventDefault();
	}
}, false);
document.addEventListener("mouseup", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(e, true, false);
		A3a.vpl.dragFun = null;
		e.preventDefault();
	}
}, false);

// window-level touch drag
A3a.vpl.lastTouch = null;
document.addEventListener("touchmove", function (e) {
	if (A3a.vpl.dragFun !== null) {
		var touches = e.targetTouches;
		A3a.vpl.lastTouch = touches[0];
		A3a.vpl.dragFun(A3a.vpl.lastTouch, false, true);
		e.preventDefault();
	}
	return false;
}, {"capture": false, "passive": false});
document.addEventListener("touchend", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(A3a.vpl.lastTouch, true, true);
		A3a.vpl.dragFun = null;
		e.preventDefault();
	}
	return false;
}, false);

/** Load resources via XMLHttpRequest (requires http(s), x-origin blocking with file)
	@param {string} rootFilename filename of the ui json file
	@param {string} rootDir directory where other files are to be found ("." for scripts)
	@param {function(Object):Array.<string>} getAuxiliaryFilenames get a list of
	filenames of resources referenced in the ui file (svg etc.)
	@param {function(Object,Object):void} onLoad function called asynchronously once
	everything has been loaded; first arg is the parsed ui json file, second arg is an
	object with properties for all resources (key=filename, value=text content)
	@param {function(*):void} onError function called asynchronously upon error
	@return {void}
*/
function vplLoadResourcesWithXHR(rootFilename, rootDir, getAuxiliaryFilenames, onLoad, onError) {
	var path = rootFilename.indexOf("/") >= 0 ? rootFilename.replace(/\/[^/]*$/, "/") : "";
	var rsrc = {};
	var xhr = new XMLHttpRequest();
	xhr.addEventListener("load", function () {
		if (xhr.status === 200) {
			rsrc[rootFilename] = xhr.responseText;
			var gui = /** @type {Object} */(JSON.parse(xhr.responseText));
			var auxFiles = getAuxiliaryFilenames(gui);
			var nRemaining = auxFiles.length;
			var error = false;
			auxFiles.forEach(function (f) {
				var xhr = new XMLHttpRequest();
				xhr.addEventListener("load", function () {
					if (xhr.status === 200) {
						rsrc[f] = xhr.responseText;
						nRemaining--;
						if (!error && nRemaining === 0) {
							onLoad(gui, rsrc);
						}
					} else if (!error) {
						error = true;
						onError("HTTP error " + xhr.status);
					}
				});
				xhr.addEventListener("error", function () {
					if (!error) {
						error = true;
						onError("XMLHttpRequest error for " + rootFilename);
					}
				});
				xhr.open("GET", path + f);
				xhr.send();
			});
		} else {
			onError("HTTP error " + xhr.status);
		}
	});
	xhr.addEventListener("error", onError);
	xhr.open("GET", rootFilename);
	xhr.send();
}

/** Load resources in script elements
	@param {string} rootFilename filename (script id) of the ui json file
	@param {string} rootDir directory where other files are to be found ("." for scripts)
	@param {function(Object):Array.<string>} getAuxiliaryFilenames get a list of
	filenames of resources referenced in the ui file (svg etc.)
	@param {function(Object,Object):void} onLoad function called synchronously once
	everything has been loaded; first arg is the parsed ui json file, second arg is an
	object with properties for all resources (key=filename, value=text content)
	@param {function(*):void} onError function called synchronously upon error
	@return {void}
*/
function vplLoadResourcesInScripts(rootFilename, rootDir, getAuxiliaryFilenames, onLoad, onError) {

	/** Get script element content
		@param {string} id
		@return {string}
	*/
	function getRsrsc(id) {
		var el = document.getElementById(id);
		if (el == null) {
			throw "Missing script element " + id;
		}
		return el.textContent;
	}

	try {
		var txt = getRsrsc(rootFilename);
		var gui = /** @type {Object} */(JSON.parse(txt));
		var rsrc = {};
		if (gui["svgFilenames"]) {
			gui["svgFilenames"].forEach(function (filename) {
				txt = getRsrsc(filename);
				rsrc[filename] = txt;
			});
		}
		if (gui["overlays"]) {
			gui["overlays"].forEach(function (filename) {
				txt = getRsrsc(filename);
				rsrc[filename] = txt;
			});
		}
		if (gui["css"]) {
			gui["css"].forEach(function (filename) {
				txt = getRsrsc(filename).trim();
				rsrc[filename] = txt;
			});
		}
		if (gui["doc"]) {
			for (var key in gui["doc"]) {
				if (gui["doc"].hasOwnProperty(key)) {
					for (var key2 in gui["doc"][key]) {
						if (gui["doc"][key].hasOwnProperty(key2)) {
							txt = getRsrsc(gui["doc"][key][key2]).trim();
							rsrc[gui["doc"][key][key2]] = txt;
						}
					}
				}
			}
		}
		// doc are not embedded in script elements
		onLoad(gui, rsrc);
	} catch (e) {
		onError(e);
	}
}

/** Get value corresponding to key in the URI query
	@param {string} key
	@return {string}
*/
function vplGetQueryOption(key) {
	var query = window["vplQueryOptions"] || "";
	var r = /^[^?]*\?([^#]*)/.exec(document.location.href);
	if (r) {
		query = query ? r[1] + "&" + query : r[1];
	}
	if (query) {
		var pairs = query
			.split("&").map(function (p) {
				return p.split("=")
					.map(function (s) {
						return decodeURIComponent(s);
					});
				});
		for (var i = 0; i < pairs.length; i++) {
			if (pairs[i][0] === key) {
				return pairs[i][1];
			}
		}
	}
	return "";
}

/** Get value corresponding to key in the location hash
	@param {string} key
	@return {string}
*/
function vplGetHashOption(key) {
	var dict = (document.location.hash || "#")
		.slice(1)
		.split("&").map(function (p) {
			return p.split("=").map(decodeURIComponent);
		})
		.reduce(function (acc, p) {
			acc[p[0]] = p[1];
			return acc;
		}, {});
	return dict[key] || null;
}

/** Setup everything for vpl
	@param {Object=} gui
	@param {string=} rootDir directory where other files are to be found ("." for scripts)
	@return {void}
*/
function vplSetup(gui, rootDir) {

	// platform-specific options
	if (window["vplTextFieldInputEvents"] === undefined) {
		// true on Android, false elsewhere
		window["vplTextFieldInputEvents"] = navigator.userAgent.indexOf("Android") >= 0;
	}

	// handle overlays in gui
	/** @type {Array.<Object>} */
	var helpFragments = [];
	if (gui && gui["overlays"]) {
		gui["overlays"].forEach(function (filename) {
			try {
				var overlay = JSON.parse(gui.rsrc[filename]);
			} catch (e) {
				console.error(e.message);
			}
			for (var key in overlay) {
				if (overlay.hasOwnProperty(key)) {
					switch (key) {
					case "blocks":
					case "blockList":
					case "aeslImportRules":
					case "buttons":
					case "widgets":
						// concat arrays
						gui[key] = gui[key] ? gui[key].concat(overlay[key]) : overlay[key];
						break;
					case "toolbars":
						// merge objects
						for (var key2 in overlay[key]) {
							if (overlay[key].hasOwnProperty(key2)) {
								gui[key] = gui[key] || {};	// ensure gui[key] exists
								gui[key][key2] = overlay[key][key2];
							}
						}
						break;
					case "i18n":
						// merge objects in objects
						for (var key2 in overlay[key]) {
							if (overlay[key].hasOwnProperty(key2)) {
								gui[key] = gui[key] || {};	// ensure gui[key] exists
								gui[key][key2] = gui[key][key2] || {};	// ensure gui[key][key2] exists
								for (var key3 in overlay[key][key2]) {
									if (overlay[key][key2].hasOwnProperty(key3)) {
										gui[key][key2][key3] = overlay[key][key2][key3];
									}
								}
							}
						}
						break;
					case "help":
						// remember help fragments
						helpFragments.push(overlay[key]);
						break;
					}
				}
			}
		});
	}

	// canvas
	var canvasEl = document.getElementById("programCanvas");

	// application
	var role = vplGetQueryOption("role");
	var keyboardShortcuts = vplGetQueryOption("shortcuts");
	var app = new A3a.vpl.Application(canvasEl);
	if (keyboardShortcuts) {
		app.uiConfig.keyboardShortcutsEnabled = keyboardShortcuts === "true";
	}
	app.uiConfig.keyboardAccessibility = vplGetQueryOption("accessibility").split("+").indexOf("kbd") >= 0;
	app.uiConfig.nodragAccessibility = vplGetQueryOption("accessibility").split("+").indexOf("nodrag") >= 0;
	app.simMaps = window["vplSimMaps"] == undefined
 		? "ground,height,obstacles"
		: window["vplSimMaps"] === "merged"
			? null
			: window["vplSimMaps"].split(",");
	window["vplApp"] = app;
	app.username = vplGetQueryOption("user") || window["vplUsername"] || app.username;
	app.pushVPLKeyShortcuts();

	// validate ui (correct usage of blocks, control elements etc.)
	if (gui && A3a.vpl.validateUI) {
		app.program.message = A3a.vpl.validateUI(gui);
		if (app.program.message) {
			window["console"]["info"](app.program.message);
		}
	}

	// css
	if (gui && gui["css"]) {
		app.css.reset();	// get rid of bad values cached during app creation
		gui["css"].forEach(function (filename) {
			app.css.parse(filename, gui.rsrc[filename]);
		});
		app.css.defineProperties();
	}

	// translations
	if (gui && gui["i18n"]) {
		for (var lang in gui["i18n"]) {
			if (gui["i18n"].hasOwnProperty(lang)) {
				app.i18n.addDictForLanguage(lang, gui["i18n"][lang]);
			}
		}
	}
	var uiLanguage = vplGetQueryOption("uilanguage") || "en";
	app.setUILanguage(uiLanguage);

	// load box
	app.loadBox = new A3a.vpl.Load(app,
		app.uiConfig.keyboardShortcutsEnabled
			? {
				onShow: function () {
					app.keyboard.pushKeyHandler("Escape", function () {
						app.loadBox.hide();
					});
				},
				onHide: function () {
					app.keyboard.popHandler();
				}
			}
			: null
	);

	// save
	if (window["vplStorageSetFunction"]) {
		app.program.saveChanges = function () {
			var json = window["vplApp"].program.exportToJSON();
			window["vplStorageSetFunction"](A3a.vpl.Program.defaultFilename, json);
		};
	}

	// general settings
	var isClassic = gui == undefined || gui["hardcoded-gui"] || vplGetQueryOption("appearance") === "classic";
	app.useLocalStorage = vplGetQueryOption("storage") === "local";
	app.multipleViews = vplGetQueryOption("multiview") !== "false";
	var language = vplGetQueryOption("language");
	CSSParser.VPL.debug = vplGetQueryOption("cssdebug") === "true";
	/** @type {A3a.vpl.ControlBar.drawButton} */
	var drawButton = A3a.vpl.Commands.drawButtonJS;
	/** @type {A3a.vpl.ControlBar.getButtonBounds} */
	var getButtonBounds = A3a.vpl.Commands.getButtonBoundsJS;
	/** @type {Object.<string,A3a.vpl.Canvas.drawWidget>} */
	var widgets = A3a.vpl.widgetsJS;
	if (gui) {
		if (isClassic) {
			if (gui["blocks"] !== null && gui["blocks"].length > 0) {
				// just load block overlays
				(gui["blocks"] || []).forEach(function (b) {
					var name = b["name"];
					var bt = A3a.vpl.BlockTemplate.findByName(name);
					A3a.vpl.BlockTemplate.loadCodeGenFromJSON(b, bt.genCode);
					if (b["typicalParamSet"]) {
						bt.typicalParamSet = b["typicalParamSet"];
					}
				});
			}
		} else {
			if (gui["buttons"] !== null && gui["buttons"].length > 0) {
				drawButton = A3a.vpl.drawButtonSVGFunction(gui);
				getButtonBounds = A3a.vpl.getButtonBoundsSVGFunction(gui);
			}
			if (gui["widgets"] !== null && gui["widgets"].length > 0) {
				widgets = A3a.vpl.makeSVGWidgets(gui);
			}
			if (gui["blocks"] !== null && gui["blocks"].length > 0) {
				try {
					A3a.vpl.patchBlocksSVG(gui);
				} catch (e) {
					window["console"] && window["console"]["error"](e);
				}
			}
		}
		if (gui["blockList"]) {
			// reorder blocks according to list of names
			/** @type{Array.<A3a.vpl.BlockTemplate>} */
			var newLib = [];
			// keep special blocks
			A3a.vpl.BlockTemplate.lib.forEach(function (template) {
				if (template.type === A3a.vpl.blockType.hidden) {
					newLib.push(template);
				}
			});
			// add blocks in the order specified by blockList
			gui["blockList"].forEach(function (name) {
				var template = A3a.vpl.BlockTemplate.findByName(name);
				newLib.push(template);
			});
			// replace original lib
			A3a.vpl.BlockTemplate.lib = newLib;
		}
		if (gui["aeslImportRules"] && gui["aeslImportRules"].length > 0) {
			A3a.vpl.BlockTemplate.aeslImportRules = gui["aeslImportRules"]
				.map(function (aeslImportRule) {
					return {
						aeslName: aeslImportRule["aeslName"],
						condition: aeslImportRule["condition"] || null,
						blockName: aeslImportRule["blockName"],
						parameters: aeslImportRule["parameters"] || null,
						stringParam: aeslImportRule["stringParam"] || false
					}
				});
		}
		if (gui["miscSettings"] && gui["miscSettings"]["advancedModeEnabled"] != undefined) {
			A3a.vpl.Program.advancedModeEnabled = gui["miscSettings"]["advancedModeEnabled"] == true;
		}
		if (gui["miscSettings"] && gui["miscSettings"]["basicMultiEvent"] != undefined) {
			A3a.vpl.Program.basicMultiEvent = gui["miscSettings"]["basicMultiEvent"] == true;
		}
		if (gui["miscSettings"] && gui["miscSettings"]["advancedMultiEvent"] != undefined) {
			A3a.vpl.Program.advancedMultiEvent = gui["miscSettings"]["advancedMultiEvent"] == true;
		}
		if (gui["miscSettings"] && gui["miscSettings"]["viewRelativeSizes"]) {
			var vrs = gui["miscSettings"]["viewRelativeSizes"];
			app.viewRelativeSizes = {
				"vpl": vrs["vpl"] || 1,
				"src": vrs["src"] || 1,
				"sim": vrs["sim"] || 1
			};
		}
	}
	var commandServer = vplGetQueryOption("server");
	var commandSession = vplGetQueryOption("session");
	var advancedFeatures = vplGetQueryOption("adv") === "true";
	var experimentalFeatures = vplGetQueryOption("exp") === "true";

	A3a.vpl.Program.advancedModeEnabled = vplGetQueryOption("advmode") === "true";

	var filterBlur = 0;	// 0.1 px
	var filterGrayscale = 0;	// %
	var filter = "";
	var opt = vplGetQueryOption("blur").trim() || "";
	if (/^\d+$/.test(opt)) {
		filterBlur = parseInt(opt, 10) / 10;
	}
	opt = vplGetQueryOption("grayscale") || "";
	if (/^\d+$/.test(opt)) {
		filterGrayscale = parseInt(opt, 10) / 100;
	}
	if (filterBlur > 0 || filterGrayscale > 0) {
		filter = "blur(" + filterBlur.toFixed(1) + "px) grayscale(" + filterGrayscale.toFixed(2) + ")";
	}

	var scale = 1;
	var rotation = 0;
	var mirror = false;
	/** @type {?Array.<number>} */
	var transform = null;
	opt = vplGetQueryOption("scale").trim() || "";
	if (/^\d+(\.\d*)?$/.test(opt)) {
		scale = parseFloat(opt);
	}
	opt = vplGetQueryOption("rotation").trim() || "";
	if (/^-?\d+(\.\d*)?$/.test(opt)) {
		rotation = parseFloat(opt) * Math.PI / 180;
	}
	opt = vplGetQueryOption("mirror").trim() || "";
	mirror = opt === "true";
	if (scale !== 1 || rotation !== 0 || mirror) {
		transform = [
			scale * Math.cos(rotation) * (mirror ? -1 : 1),
			scale * Math.sin(rotation) * (mirror ? -1 : 1),
			-scale * Math.sin(rotation),
			scale * Math.cos(rotation),
			0,
			0,
		];
	}

	if (!language) {
		language = app.currentRobotIndex >= 0
			? app.robots[app.currentRobotIndex].runGlue.preferredLanguage
			: A3a.vpl.defaultLanguage;
	}

	A3a.vpl.Program.resetBlockLib();
	app.program.new(true);
	app.program.resetUI();

	var view = vplGetQueryOption("view");
	var views = view.length === 0 ? ["vpl"] : view.split("+");
	var robot = vplGetQueryOption("robot");

	if (views.indexOf("sim") >= 0 || robot === "sim") {
		robot = "sim";
	}

	robot.replace(/[+;]/g, ",").split(",").forEach(function (robotName) {
		/** @type {A3a.vpl.RunGlue} */
		var runGlue = null;
		switch (robotName) {
	 	case "thymio":
			runGlue = app.installThymio();
			runGlue.init(language);
			break;
		case "thymio-tdm":
			runGlue = app.installThymioTDM();
			runGlue.init(language);
			break;
		case "thymio-jws":
			runGlue = app.installThymioJSONWebSocketBridge();
			runGlue.init(language);
			break;
	 	case "sim":
			runGlue = app.installRobotSimulator({canvasFilter: filter, canvasTransform: transform});
			runGlue.init(language);
			break;
		default:
			if (window["vplConnections"] && window["vplConnections"].hasOwnProperty(robotName)) {
				runGlue = window["vplConnections"][robotName]();
				runGlue.init(language);
			}
			break;
		}
		if (runGlue) {
			app.robots.push({name: robotName, runGlue: runGlue});
		}
	});
	app.currentRobotIndex = app.robots.length > 0 ? 0 : -1;
	app.program.supportTracing = app.currentRobotIndex >= 0 && app.robots[app.currentRobotIndex].runGlue.supportTracing;

	if (!A3a.vpl.Program.codeGenerator[language]) {
		throw "Unsupported language " + language;
	}

	app.uiConfig.setDisabledFeatures(advancedFeatures ? [] : ["src:language"]);

	app.program.currentLanguage = language;
	app.vplCanvas.widgets = widgets;
	if (app.simCanvas != null) {
		app.simCanvas.widgets = widgets;
	}

	app.addVPLCommands();
	if (!isClassic && gui && gui["toolbars"]) {
		if (gui["toolbars"]["vpl"]) {
			app.vplToolbarConfig = gui["toolbars"]["vpl"];
		}
		if (gui["toolbars"]["vpl2"]) {
			app.vplToolbar2Config = gui["toolbars"]["vpl2"];
		}
	}

	app.program.toolbarDrawButton = drawButton;
	app.program.toolbarGetButtonBounds = getButtonBounds;

	if (A3a.vpl.VPLSourceEditor && document.getElementById("editor")) {
		app.editor = new A3a.vpl.VPLSourceEditor(app,
			app.program.noVPL,
			language);
		app.editor.tbCanvas.setFilter(filter);
		app.program.getEditedSourceCodeFun = function () {
			return app.editor.doesMatchVPL() ? null : app.editor.getCode();
		};
		app.program.setEditedSourceCodeFun = function (code) {
			app.editor.setCode(code);
		};
		app.editor.tbCanvas.widgets = widgets;
		app.addSrcCommands();
		if (!isClassic && gui && gui["toolbars"] && gui["toolbars"]["editor"]) {
			app.editor.toolbarConfig = gui["toolbars"]["editor"];
		}
		app.editor.toolbarDrawButton = drawButton;
		app.editor.toolbarGetButtonBounds = getButtonBounds;
		app.editor.setTeacherRole(role === "teacher");
	}

	if (app.sim2d != null) {
	 	app.addSim2DCommands();
		if (!isClassic && gui && gui["toolbars"] && gui["toolbars"]["simulator"]) {
			app.sim2d.toolbarConfig = gui["toolbars"]["simulator"];
		}
		app.sim2d.toolbarDrawButton = drawButton;
		app.sim2d.toolbarGetButtonBounds = getButtonBounds;
	}

	// apply canvas filters and transforms
	if (filter) {
		app.vplCanvas.setFilter(filter);
	}
	app.vplCanvas.initTransform(transform);

	// accept dropped aesl files
	document.getElementsByTagName("body")[0].addEventListener("dragover", function(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	}, false);
	document.getElementsByTagName("body")[0].addEventListener("drop", function(e) {
		e.stopPropagation();
		e.preventDefault();
		var files = e.dataTransfer.files;
		if (files.length === 1) {
			var file = files[0];
			// try to load file as a program or as an image for the simulator
			app.loadProgramFile(file) || app.loadImageFile(file) || app.loadAudioFile(file);
		}
	}, false);

	// configure simulator
	if (app.sim2d) {
		// shared configuration
		app.sim2d.uiConfig = app.uiConfig;

		// default maps
		var defaultGround = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><defs><linearGradient id="gradient" x1="-1000" y1="0" x2="-800" y2="0" gradientUnits="userSpaceOnUse"><stop style="stop-color:#000;stop-opacity:1;" offset="0" /><stop style="stop-color:#000;stop-opacity:0;" offset="1" /></linearGradient></defs><g transform="translate(0,-308)"><rect style="fill:url(#gradient);stroke:none" width="319" height="687" x="-1027" y="336" transform="scale(-1,1)" /><path style="fill:none;stroke:#000;stroke-width:30;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none" d="M 114,592 C 102,417 750,306 778,532 806,757 674,675 559,622 444,568 259,567 278,664 296,762 726,730 778,808 829,887 725,955 616,936 507,917 144,1083 129,837 Z" /></g></svg>';
		var defaultGroundImg = new Image();
		defaultGroundImg.addEventListener("load", function () {
			app.sim2d.disabledGroundImage = defaultGroundImg;
		});
		defaultGroundImg.src = "data:image/svg+xml;base64," + btoa(defaultGround);
		// gradients currently not supported in SVG
		// app.sim2d.disabledGroundImage = new SVG(defaultGround).toImage();

		var defaultHeight = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><defs><radialGradient id="gradient" cx="400" cy="650" fx="400" fy="650" r="230" gradientTransform="matrix(1.6,0,0,1.16,-113,-75)" gradientUnits="userSpaceOnUse"><stop style="stop-color:#000;stop-opacity:1;" offset="0" /><stop style="stop-color:#000;stop-opacity:0;" offset="1" /></radialGradient></defs><g transform="translate(0,-308)"><rect style="fill:url(#gradient);fill-opacity:1;stroke:none" width="939" height="650" x="54" y="357" /></g></svg>';
		var defaultHeightImg = new Image();
		defaultHeightImg.addEventListener("load", function () {
			app.sim2d.disabledHeightImage = defaultHeightImg;
		});
		defaultHeightImg.src = "data:image/svg+xml;base64," + btoa(defaultHeight);
		// gradients currently not supported in SVG
		// app.sim2d.disabledHeightImage = new SVG(defaultHeight).toImage();

		app.sim2d.disabledObstacleSVG = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><g transform="translate(0,-308)"><path style="fill:none;stroke:#000;stroke-width:6;stroke-linecap:butt;stroke-linejoin:miter" d="M 172,928 137,420 763,371 905,688 708,981 Z" /><path style="fill:none;stroke:#949494;stroke-width:6;stroke-linecap:butt;stroke-linejoin:miter" d="m 402,754 168,91 101,-142" /><circle style="fill:none;stroke:#000;stroke-width:6" cx="531" cy="550" r="59" /></g></svg>';
	}

	// new VPL program to make sure everything is setup correctly
	app.newVPL(true);

	// reload from storage
	if (window["vplStorageGetFunction"]) {
		window["vplStorageGetFunction"](A3a.vpl.Program.defaultFilename,
			function (data, options) {
				try {
					options = options || {};
					if (data) {
						app.program.filename = options["filename"] || A3a.vpl.Program.defaultFilename;
						app.program.readOnly = options["readOnly"] == true;
						app.program.fixedFilename = options["fixedFilename"] != undefined
							? options["fixedFilename"] == true
							: options["readOnly"] == true;
						if (options["customizationMode"] == true) {
							app.uiConfig.blockCustomizationMode = true;
							app.uiConfig.toolbarCustomizationMode = role === "teacher";
						}
						app.program.importFromJSON(data, function () {
							app.setHelpForCurrentAppState();
							app.renderProgramToCanvas();
						});
						if (options["setAsNew"] == true) {
							app.commands.execute("vpl:teacher-setasnew");
						}
						app.restored = true;
					}
				} catch (e) {}
			});
	} else if (app.useLocalStorage) {
		try {
			var vplJson = window.localStorage.getItem(A3a.vpl.Program.defaultFilename);
			if (vplJson) {
				app.program.importFromJSON(vplJson, function () {
					app.setHelpForCurrentAppState();
					app.renderProgramToCanvas();
				});
			}
		} catch (e) {}
	}

	if (vplGetQueryOption("view") === "text") {
		app.setView(["src"], {noVPL: true});
	} else {
		app.setView(["vpl"]);
		app.program.experimentalFeatures = experimentalFeatures;
		app.program.setTeacherRole(role === "teacher" ? A3a.vpl.Program.teacherRoleType.teacher
			: role === "teacher1" ? A3a.vpl.Program.teacherRoleType.customizableBlocks
			: A3a.vpl.Program.teacherRoleType.student);
		app.renderProgramToCanvas();
		if (app.editor) {
			document.getElementById("editor").textContent = app.program.getCode(app.program.currentLanguage);
		}
	}

	/** @const */
	var languageList = ["aseba", "l2", "asm", "js", "python"];
	if (app.editor && languageList.indexOf(language) >= 0) {
		/** @const */
		app.editor.setUpdateCodeLanguageFunction(function () {
			language = languageList[(languageList.indexOf(language) + 1) % languageList.length];
			app.program.currentLanguage = language;
			var code = app.program.getCode(language);
			return {
				language: language,
				code: code
			};
		});
	}

	if (advancedFeatures) {
		if (app.editor) {
			var asebaNode = new A3a.A3aNode(A3a.thymioDescr);
			app.editor.disass = function (language, src) {
				try {
					switch (language) {
					case "aseba":
						var c = new A3a.Compiler(asebaNode, src);
						c.functionLib = A3a.A3aNode.stdMacros;
						var bytecode = c.compile();
						return A3a.vm.disToMixedListing(src, bytecode, c.sourceToBCMapping, true);
					case "l2":
						var c = new A3a.Compiler.L2(asebaNode, src);
						c.functionLib = A3a.A3aNode.stdMacrosL2;
						var bytecode = c.compile();
						return A3a.vm.disToMixedListing(src, bytecode, c.sourceToBCMapping, true);
					case "asm":
						var asm = new A3a.Assembler(asebaNode, src);
						var bytecode = asm.assemble();
						return A3a.vm.disToListing(bytecode);
					default:
						return null;
					}
				} catch (e) {
					return "; " + e;
				}
			};
		}
	}

	// about box
	if (gui && gui["fragments"] && gui["fragments"]["about.html"]) {
		app.setAboutBoxContent(gui["fragments"]["about.html"].replace(/UIROOT/g, rootDir));
	}

	// help box
	if (gui && gui["fragments"] && gui["fragments"]["help.html"]) {
		app.setHelpContent(gui["fragments"]["help.html"].replace(/UIROOT/g, rootDir));
	}
	if (gui && gui["help"] || helpFragments.length > 0) {
		app.dynamicHelp = new A3a.vpl.DynamicHelp();
		if (gui && gui["help"]) {
			app.dynamicHelp.add(gui["help"]);
		}
		app.docTemplates = {};
		if (gui && gui["doc"]) {
			for (var key in gui["doc"]) {
				if (gui["doc"].hasOwnProperty(key) && gui.rsrc[gui["doc"][key]["doctemplate.html"]]) {
					app.docTemplates[key] = gui.rsrc[gui["doc"][key]["doctemplate.html"]];
				}
			}
		}
		helpFragments.forEach(function (h) {
			app.dynamicHelp.add(h);
		});
		app.setHelpForCurrentAppState();
	}

	// css for html output
	if (gui && gui["fragments"] && gui["fragments"]["vpl-export-html.css"]) {
		app.cssForHTMLDocument = gui["fragments"]["vpl-export-html.css"];
	}

	// initial canvas resize
	app.vplResize();
	app.vplCanvas.update();

	// resize canvas
	window.addEventListener("resize", function () { app.vplResize(); }, false);

	app.sim2d && app.sim2d.setTeacherRole(role === "teacher");

	if (view === "text") {
		// special case for source code editor without VPL
		app.setView(["src"], {noVPL: true});
	} else {
		// enforce 1-3 unique views among vpl, src and sim; otherwise just vpl
		/** @const */
		var allowedViews = ["vpl", "src", "sim"];
		if (views.length < 1 || views.length > 3 || view === "") {
			view = "vpl";	// invalid, default to vpl
		} else {
			for (var i = 0; i < views.length; i++) {
				if (!allowedViews.indexOf(views[i]) < 0) {
					view = "vpl";	// invalid, default to vpl
					break;
				}
				for (var j = 0; j < i; j++) {
					if (views[i] === views[j]) {
						view = "vpl";	// invalid, default to vpl
						break;	// inner loop only, don't care
					}
				}
			}
		}
		app.setView(views);
	}
	app.vplResize();

	if (commandServer) {
		window["vplCommandServer"] = new A3a.vpl.Com(app, commandServer, commandSession);
		window["vplCommandServer"].connect();
		window["vplSendToCom"] = function (data) {
			window["vplCommandServer"].ws.send(JSON.stringify({
				"sender": {
					"type": "vpl",
					"sessionid": window["vplCommandServer"].sessionId
				},
				"type": "client",
				"data": data || null
			}));
		};
	}
}

window.addEventListener("load", function () {
	// check that the compiler and the simulator have the same vm definitions
	if (A3a.Device.VirtualThymio && A3a.thymioDescr) {
		var vTh = new A3a.Device.VirtualThymio();
		// variables
		if (vTh.variableSize !== A3a.thymioDescr["maxVarSize"]) {
			throw "internal: vm var size mismatch";
		}
		if (vTh.variables.length !== A3a.thymioDescr["variables"].length) {
			throw "internal: vm var count mismatch";
		}
		for (var i = 0; i < vTh.variables.length; i++) {
			if (vTh.variables[i].name !== A3a.thymioDescr["variables"][i]["name"] ||
				vTh.variables[i].val.length !== A3a.thymioDescr["variables"][i]["size"]) {
				throw "internal: vm var mismatch";
			}
		}
		if (vTh.localEvents.length !== A3a.thymioDescr["localEvents"].length) {
			throw "internal: vm ev count mismatch";
		}
		for (var i = 0; i < vTh.localEvents.length; i++) {
			if (vTh.localEvents[i].name !== A3a.thymioDescr["localEvents"][i]["name"]) {
				throw "internal: vm var mismatch";
			}
		}
		if (vTh.nativeFunctions.length !== A3a.thymioDescr["nativeFunctions"].length) {
			throw "internal: vm nat fun count mismatch";
		}
		for (var i = 0; i < vTh.localEvents.length; i++) {
			if (vTh.nativeFunctions[i].name !== A3a.thymioDescr["nativeFunctions"][i]["name"]) {
				throw "internal: vm nat fun mismatch";
			}
		}
	}

	var uiDoc = vplGetQueryOption("ui") || "ui.json";
	var isInScripts = document.getElementById(uiDoc) != null;
	var uiRoot = window["vplUIRoot"] ? window["vplUIRoot"] : isInScripts ? "." : uiDoc.indexOf("/") >= 0 ? uiDoc.replace(/\/[^/]*$/, "") : ".";
	(isInScripts ? vplLoadResourcesInScripts : vplLoadResourcesWithXHR)(
		uiDoc,
		uiRoot,
		function (obj) {
			// get subfiles
			var subfiles = (obj["svgFilenames"] || [])
				.concat(obj["overlays"] || [])
				.concat(obj["css"] || []);
			if (obj["doc"]) {
				for (var key in obj["doc"]) {
					if (obj["doc"].hasOwnProperty(key)) {
						for (var key2 in obj["doc"][key]) {
							if (obj["doc"][key].hasOwnProperty(key2)) {
								subfiles.push(obj["doc"][key][key2]);
							}
						}
					}
				}
			}
			return subfiles;
		},
		function (gui, rsrc) {
			// success
			gui.rsrc = {};
			gui.svg = {};
			if (gui["svgFilenames"]) {
				gui["svgFilenames"].forEach(function (filename) {
					gui.rsrc[filename] = rsrc[filename];
					gui.svg[filename] = new SVG.Preparsed(rsrc[filename]);
				});
			}
			if (gui["overlays"]) {
				gui["overlays"].forEach(function (filename) {
					gui.rsrc[filename] = rsrc[filename];
				});
			}
			if (gui["css"]) {
				gui["css"].forEach(function (filename) {
					gui.rsrc[filename] = rsrc[filename];
				});
			}
			if (gui["doc"]) {
				for (var key in gui["doc"]) {
					if (gui["doc"].hasOwnProperty(key)) {
						for (var filename in gui["doc"][key]) {
							if (gui["doc"][key].hasOwnProperty(filename)) {
								gui.rsrc[gui["doc"][key][filename]] = rsrc[gui["doc"][key][filename]];
							}
						}
					}
				}
			}
			vplSetup(gui, uiRoot);
		},
		function (e) {
			// error
			window["console"] && window["console"]["error"](e);
			vplSetup();
		}
	);
}, false);

/** Check if the program has been changed since it's been loaded
	@return {boolean}
*/
window["vplIsProgramChanged"] = function () {
	return window["vplApp"].program.undoState.canUndo();
};

/** Get vpl program as json
	@param {boolean} libAndUIOnly
	@return {string}
*/
window["vplGetProgramAsJSON"] = function (libAndUIOnly) {
	return window["vplApp"].program.exportToJSON(libAndUIOnly ? {lib: true, prog: false} : undefined);
};

/** Get vpl UI as json
	@return {string}
*/
window["vplGetUIAsJSON"] = function () {
	return window["vplApp"].program.exportToJSON({lib: true, prog: false});
};

/** Convert .vpl3 or .vpl3ui to html
	@param {string} json
	@param {boolean} isVPL3UI
	@return {string}
*/
window["vplConvertToHTML"] = function (json, isVPL3UI) {
	var app = window["vplApp"];
	var obj = JSON.parse(json);
	app.program.importFromObject(/** @type {Object} */(obj));
	var html = isVPL3UI
	 	? app.uiToHTMLDocument(app.css, true)
		: app.toHTMLDocument(app.css);
	app.program.undo();
	return html;
};

/** Convert .vpl3 or .vpl3ui to html
	@param {string} md
	@return {string}
*/
window["vplConvertMDToHtml"] = function (md) {
	var dynamicHelp = new A3a.vpl.DynamicHelp();
	return dynamicHelp.convertToHTML(md.split("\n"));
};

// remember state across reload
window.addEventListener("unload", function () {
	var json = window["vplApp"].program.exportToJSON();
	try {
		if (window["vplStorageSetFunction"]) {
			window["vplStorageSetFunction"](A3a.vpl.Program.defaultFilename, json);
		} else if (window["vplApp"].useLocalStorage) {
			window.localStorage.setItem(A3a.vpl.Program.defaultFilename, json);
		}
	} catch (e) {}
}, false);
