/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** @dict */
A3a.vpl.blockLib = {};

// window-level drag
/** @type {?function(Event,boolean):void} */
A3a.vpl.dragFun = null;
document.addEventListener("mousemove", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(e, false);
		e.preventDefault();
	}
}, false);
document.addEventListener("mouseup", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(e, true);
		A3a.vpl.dragFun = null;
		e.preventDefault();
	}
}, false);

// window-level touch drag
A3a.vpl.lastTouch = null;
document.addEventListener("touchmove", function (e) {
	e.preventDefault();
	if (A3a.vpl.dragFun !== null) {
		var touches = e.targetTouches;
		A3a.vpl.lastTouch = touches[0];
		A3a.vpl.dragFun(A3a.vpl.lastTouch, false);
	}
	return false;
}, {"capture": false, "passive": false});
document.addEventListener("touchend", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(A3a.vpl.lastTouch, true);
		A3a.vpl.dragFun = null;
		e.preventDefault();
	}
	return false;
}, false);

/** Load resources via XMLHttpRequest (requires http(s), x-origin blocking with file)
	@param {string} rootFilename filename of the ui json file
	@param {function(Object):Array.<string>} getAuxiliaryFilenames get a list of
	filenames of resources referenced in the ui file (svg etc.)
	@param {function(Object,Object):void} onLoad function called asynchronously once
	everything has been loaded; first arg is the parsed ui json file, second arg is an
	object with properties for all resources (key=filename, value=text content)
	@param {function(*):void} onError function called asynchronously upon error
	@return {void}
*/
function vplLoadResourcesWithXHR(rootFilename, getAuxiliaryFilenames, onLoad, onError) {
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
	@param {function(Object):Array.<string>} getAuxiliaryFilenames get a list of
	filenames of resources referenced in the ui file (svg etc.)
	@param {function(Object,Object):void} onLoad function called synchronously once
	everything has been loaded; first arg is the parsed ui json file, second arg is an
	object with properties for all resources (key=filename, value=text content)
	@param {function(*):void} onError function called synchronously upon error
	@return {void}
*/
function vplLoadResourcesInScripts(rootFilename, getAuxiliaryFilenames, onLoad, onError) {
	try {
		var txt = document.getElementById(rootFilename).textContent;
		var gui = /** @type {Object} */(JSON.parse(txt));
		var rsrc = {};
		if (gui["svgFilenames"]) {
			gui["svgFilenames"].forEach(function (filename) {
				txt = document.getElementById(filename).textContent;
				rsrc[filename] = txt;
			});
		}
		if (gui["overlays"]) {
			gui["overlays"].forEach(function (filename) {
				txt = document.getElementById(filename).textContent;
				rsrc[filename] = txt;
			});
		}
		if (gui["css"]) {
			gui["css"].forEach(function (filename) {
				txt = document.getElementById(filename).textContent.trim();
				rsrc[filename] = txt;
			});
		}
		onLoad(gui, rsrc);
	} catch (e) {
		onError(e);
	}
}

/** Setup everything for vpl
	@param {Object=} gui
	@return {void}
*/
function vplSetup(gui) {
	/** Get value corresponding to key in the URI query
		@param {string} key
		@return {string}
	*/
	function getQueryOption(key) {
		var q = document.location.href.indexOf("?");
		if (q >= 0) {
			var pairs = document.location.href
				.slice(q + 1)
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

	// handle overlays in gui
	if (gui && gui["overlays"]) {
		gui["blocks"] = gui["blocks"] || [];
		gui["buttons"] = gui["buttons"] || [];
		gui["widgets"] = gui["widgets"] || [];
		gui["overlays"].forEach(function (filename) {
			var overlay = JSON.parse(gui.rsrc[filename]);
			for (var key in overlay) {
				if (overlay.hasOwnProperty(key)) {
					switch (key) {
					case "blocks":
					case "buttons":
					case "widgets":
						// concat arrays
						gui[key] = gui[key].concat(overlay[key]);
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
					}
				}
			}
		});
	}

	// canvas
	var canvasEl = document.getElementById("programCanvas");

	// application
	var app = new A3a.vpl.Application(canvasEl);
	window["vplApp"] = app;

	// css
	if (gui && gui["css"]) {
		gui["css"].forEach(function (filename) {
			app.css.parse(filename, gui.rsrc[filename]);
		});
		app.css.defineProperties();
	}

	// about box
	if (gui && gui["html"] && gui["html"]["about"]) {
		app.aboutBox = new A3a.vpl.About(gui["html"]["about"]);
	}

	// load box
	app.loadBox = new A3a.vpl.Load(app);

	// general settings
	var isClassic = gui == undefined || getQueryOption("appearance") === "classic";
	app.useLocalStorage = getQueryOption("storage") === "local";
	app.multipleViews = getQueryOption("multiview") === "true";
	var language = getQueryOption("language");
	/** @type {A3a.vpl.ControlBar.drawButton} */
	var drawButton = A3a.vpl.Commands.drawButtonJS;
	/** @type {A3a.vpl.ControlBar.getButtonBounds} */
	var getButtonBounds = A3a.vpl.Commands.getButtonBoundsJS;
	/** @type {Object.<string,A3a.vpl.Canvas.Widget>} */
	var widgets = A3a.vpl.widgetsJS;
 	if (A3a.vpl.patchL2Blocks) {
		A3a.vpl.patchL2Blocks();
	}
 	if (A3a.vpl.patchJSBlocks) {
		A3a.vpl.patchJSBlocks();
	}
 	if (A3a.vpl.patchPythonBlocks) {
		A3a.vpl.patchPythonBlocks();
	}
	if (gui && !isClassic) {
		if (gui["buttons"] !== null) {
			drawButton = A3a.vpl.drawButtonSVGFunction(gui);
			getButtonBounds = A3a.vpl.getButtonBoundsSVGFunction(gui);
		}
		if (gui["widgets"] !== null) {
			widgets = A3a.vpl.makeSVGWidgets(gui);
		}
		if (gui["blocks"] !== null) {
			try {
				A3a.vpl.patchBlocksSVG(gui);
			} catch (e) {
				window["console"] && window["console"]["error"](e);
			}
		}
	}
	var advancedFeatures = getQueryOption("adv") === "true";
	var experimentalFeatures = getQueryOption("exp") === "true";

	var filterBlur = 0;	// 0.1 px
	var filterGrayscale = 0;	// %
	var filter = "";
	var opt = getQueryOption("blur").trim() || "";
	if (/^\d+$/.test(opt)) {
		filterBlur = parseInt(opt, 10) / 10;
	}
	opt = getQueryOption("grayscale") || "";
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
	opt = getQueryOption("scale").trim() || "";
	if (/^\d+(\.\d*)?$/.test(opt)) {
		scale = parseFloat(opt);
	}
	opt = getQueryOption("rotation").trim() || "";
	if (/^-?\d+(\.\d*)?$/.test(opt)) {
		rotation = parseFloat(opt) * Math.PI / 180;
	}
	opt = getQueryOption("mirror").trim() || "";
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
		language = app.runGlue
			? app.runGlue.preferredLanguage
			: A3a.vpl.defaultLanguage;
	}

	A3a.vpl.Program.resetBlockLib();
	app.program.new();
	app.program.resetUI();

	var view = getQueryOption("view");
	var views = view.length === 0 ? ["vpl"] : view.split("+");
	var robot = getQueryOption("robot");

	if (views.indexOf("sim") >= 0 || robot === "sim") {
		robot = "sim";
	}

	switch (robot) {
 	case "thymio":
		app.installThymio();
		app.runGlue && app.runGlue.init(language);
		break;
	case "thymio-tdm":
		app.installThymioTDM();
		app.runGlue && app.runGlue.init(language);
		break;
 	case "sim":
		app.installRobotSimulator({canvasFilter: filter, canvasTransform: transform});
		app.runGlue && app.runGlue.init(language);
		break;
	default:
		app.runGlue = null;
	}

	if (!A3a.vpl.Program.codeGenerator[language]) {
		throw "Unsupported language " + language;
	}

	app.uiConfig.setDisabledFeatures(advancedFeatures ? [] : ["src:language"]);

	app.program.currentLanguage = language;
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
	app.vplCanvas.state.vpl = new A3a.vpl.Program.CanvasRenderingState();
	app.vplCanvas.widgets = widgets;
	app.program.addEventHandler(true);
	if (app.simCanvas != null) {
		app.simCanvas.widgets = widgets;
	}
	app.editor.tbCanvas.widgets = widgets;

	app.addVPLCommands();
	if (!isClassic && gui && gui["toolbars"]) {
		if (gui["toolbars"]["vpl"]) {
			app.program.toolbarConfig = gui["toolbars"]["vpl"];
		}
		if (gui["toolbars"]["vpl2"]) {
			app.program.toolbar2Config = gui["toolbars"]["vpl2"];
		}
	}
	app.addSrcCommands();
	if (!isClassic && gui && gui["toolbars"] && gui["toolbars"]["editor"]) {
		app.editor.toolbarConfig = gui["toolbars"]["editor"];
	}
	app.program.toolbarDrawButton = drawButton;
	app.program.toolbarGetButtonBounds = getButtonBounds;
	app.editor.toolbarDrawButton = drawButton;
	app.editor.toolbarGetButtonBounds = getButtonBounds;
	if (app.sim2d != null) {
	 	app.addSim2DCommands();
		if (!isClassic && gui && gui["toolbars"] && gui["toolbars"]["simulator"]) {
			app.sim2d.toolbarConfig = gui["toolbars"]["simulator"];
		}
		app.sim2d.toolbarDrawButton = drawButton;
		app.sim2d.toolbarGetButtonBounds = getButtonBounds;
	}

	if (app.runGlue) {
		var stopBlock = A3a.vpl.BlockTemplate.findByName("!stop");
		var stopGenCode = stopBlock && stopBlock.genCode[language];
		if (stopGenCode) {
			app.runGlue.setStopCode(stopGenCode(null).statement, language);
		}
	}

	// apply canvas filters and transforms
	if (filter) {
		app.vplCanvas.setFilter(filter);
	}
	if (transform) {
		app.vplCanvas.transform = transform;
	}

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
			app.loadProgramFile(file) || app.loadImageFile(file);
		}
	}, false);

	// configure simulator
	if (app.sim2d) {
		// shared configuration
		app.sim2d.uiConfig = app.uiConfig;

		// default maps
		app.sim2d.disabledGroundImage = new SVG('<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><defs><linearGradient id="gradient" x1="-1000" y1="0" x2="-800" y2="0" gradientUnits="userSpaceOnUse"><stop style="stop-color:#000;stop-opacity:1;" offset="0" /><stop style="stop-color:#000;stop-opacity:0;" offset="1" /></linearGradient></defs><g transform="translate(0,-308)"><rect style="fill:url(#gradient);stroke:none" width="319" height="687" x="-1027" y="336" transform="scale(-1,1)" /><path style="fill:none;stroke:#000;stroke-width:30;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none" d="M 114,592 C 102,417 750,306 778,532 806,757 674,675 559,622 444,568 259,567 278,664 296,762 726,730 778,808 829,887 725,955 616,936 507,917 144,1083 129,837 Z" /></g></svg>')
			.toImage();
		app.sim2d.disabledHeightImage = new SVG('<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><defs><radialGradient id="gradient" cx="400" cy="650" fx="400" fy="650" r="230" gradientTransform="matrix(1.6,0,0,1.16,-113,-75)" gradientUnits="userSpaceOnUse"><stop style="stop-color:#000;stop-opacity:1;" offset="0" /><stop style="stop-color:#000;stop-opacity:0;" offset="1" /></radialGradient></defs><g transform="translate(0,-308)"><rect style="fill:url(#gradient);fill-opacity:1;stroke:none" width="939" height="650" x="54" y="357" /></g></svg>')
			.toImage();
		app.sim2d.disabledObstacleSVG = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 1052 744" version="1.1"><g transform="translate(0,-308)"><path style="fill:none;stroke:#000;stroke-width:6;stroke-linecap:butt;stroke-linejoin:miter" d="M 172,928 137,420 763,371 905,688 708,981 Z" /><path style="fill:none;stroke:#949494;stroke-width:6;stroke-linecap:butt;stroke-linejoin:miter" d="m 402,754 168,91 101,-142" /><circle style="fill:none;stroke:#000;stroke-width:6" cx="531" cy="550" r="59" /></g></svg>';
	}

	// reload from storage
	if (window["vplStorageGetFunction"]) {
		window["vplStorageGetFunction"]("vpl.json",
			function (data) {
				try {
					if (data) {
						app.program.importFromJSON(data, function () {
							app.renderProgramToCanvas();
						});
					}
				} catch (e) {}
			});
	} else if (app.useLocalStorage) {
		try {
			var vplJson = window.localStorage.getItem("vpl.json");
			if (vplJson) {
				app.program.importFromJSON(vplJson, function () {
					app.renderProgramToCanvas();
				});
			}
		} catch (e) {}
	}

	if (getQueryOption("view") === "text") {
		app.setView(["src"], {noVPL: true});
	} else {
		app.setView(["vpl"]);
		app.program.experimentalFeatures = experimentalFeatures;
		app.program.setTeacherRole(getQueryOption("role") === "teacher");
		app.renderProgramToCanvas();
		document.getElementById("editor").textContent = app.program.getCode(app.program.currentLanguage);
	}

	app.editor.setTeacherRole(getQueryOption("role") === "teacher");
	/** @const */
	var languageList = ["aseba", "l2", "js", "python"];
	if (languageList.indexOf(language) >= 0) {
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

	var asebaNode = new A3a.A3aNode(A3a.thymioDescr);
	if (advancedFeatures) {
		app.editor.disass = function (language, src) {
			/** @type {A3a.Compiler}*/
			var c;
			try {
				switch (language) {
				case "aseba":
					c = new A3a.Compiler(asebaNode, src);
					c.functionLib = A3a.A3aNode.stdMacros;
					break;
				case "l2":
					c = new A3a.Compiler.L2(asebaNode, src);
					c.functionLib = A3a.A3aNode.stdMacrosL2;
					break;
				default:
					return null;
				}
				var bytecode = c.compile();
				return A3a.vm.disToListing(bytecode);
			} catch (e) {
				return "; " + e;
			}
		};
	}

	// initial canvas resize
	app.vplResize();
	app.vplCanvas.update();

	// resize canvas
	window.addEventListener("resize", function () { app.vplResize(); }, false);

	app.sim2d && app.sim2d.setTeacherRole(getQueryOption("role") === "teacher");

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
}

window.addEventListener("load", function () {
	(/^https?:\/\//.test(document.location.href) ? vplLoadResourcesWithXHR : vplLoadResourcesInScripts)(
		"ui.json",
		function (obj) {
			// get subfiles
			return obj["svgFilenames"].concat(obj["overlays"] || []);
		},
		function (gui, rsrc) {
			// success
			gui.rsrc = {};
			gui.svg = {};
			if (gui["svgFilenames"]) {
				gui["svgFilenames"].forEach(function (filename) {
					gui.rsrc[filename] = rsrc[filename];
					gui.svg[filename] = new SVG(rsrc[filename]);
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
			vplSetup(gui);
		},
		function (e) {
			// error
			window["console"] && window["console"]["error"](e);
			vplSetup();
		}
	);
}, false);

// remember state across reload
window.addEventListener("unload", function () {
console.info("vplStorageSetFunction");
	var json = window["vplApp"].program.exportToJSON();
	try {
		if (window["vplStorageSetFunction"]) {
			window["vplStorageSetFunction"]("vpl.json", json);
		} else if (window["vplApp"].useLocalStorage) {
			window.localStorage.setItem("vpl.json", json);
		}
	} catch (e) {}
}, false);
