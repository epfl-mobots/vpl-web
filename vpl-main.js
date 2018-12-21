/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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
	@param {function():void} onError function called asynchronously upon error
	@return {void}
*/
function vplLoadResourcesWithXHR(rootFilename, getAuxiliaryFilenames, onLoad, onError) {
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
						onError();
					}
				});
				xhr.addEventListener("error", function () {
					if (!error) {
						error = true;
						onError();
					}
				});
				xhr.open("GET", f);
				xhr.send();
			});
		} else {
			onError();
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
	@param {function():void} onError function called synchronously upon error
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
		onLoad(gui, rsrc);
	} catch (e) {
		onError();
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

	// general settings
	var isClassic = gui == undefined || getQueryOption("appearance") === "classic";
	window["vplUseLocalStorage"] = getQueryOption("storage") === "local";
	var language = getQueryOption("language");
	if (isClassic) {
	 	if (A3a.vpl.patchL2Blocks) {
			A3a.vpl.patchL2Blocks();
		}
	 	if (A3a.vpl.patchJSBlocks) {
			A3a.vpl.patchJSBlocks();
		}
	} else if (gui) {
		try {
			A3a.vpl.patchSVG(gui);
		} catch (e) {}
	}
	var advancedFeatures = getQueryOption("adv") === "true";
	var experimentalFeatures = getQueryOption("exp") === "true";

	A3a.vpl.Program.resetBlockLib();

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
		language = window["vplRun"]
			? window["vplRun"].preferredLanguage
			: A3a.vpl.defaultLanguage;
	}

	switch (getQueryOption("robot")) {
 	case "thymio":
		window["installThymio"]();
		window["vplRun"] && window["vplRun"].init(language);
		break;
 	case "sim":
		window["installRobotSimulator"]({canvasFilter: filter, canvasTransform: transform});
		window["vplRun"] && window["vplRun"].init(language);
		break;
	default:
		window["vplRun"] = null;
	}

	if (!A3a.vpl.Program.codeGenerator[language]) {
		throw "Unsupported language " + language;
	}

	var uiConfig = new A3a.vpl.UIConfig();
	uiConfig.setDisabledFeatures(advancedFeatures ? [] : ["src:language"]);

	window["vplProgram"] = new A3a.vpl.Program(A3a.vpl.mode.basic, uiConfig);
	window["vplProgram"].currentLanguage = language;
	window["vplEditor"] = new A3a.vpl.VPLSourceEditor(window["vplProgram"].noVPL,
		language,
		uiConfig,
		window["vplRun"]);
	window["vplEditor"].tbCanvas.setFilter(filter);
	window["vplProgram"].getEditedSourceCodeFun = function () {
		return window["vplEditor"].doesMatchVPL() ? null : window["vplEditor"].getCode();
	};
	window["vplProgram"].setEditedSourceCodeFun = function (code) {
		window["vplEditor"].setCode(code);
	};
	var canvas = document.getElementById("programCanvas");
	window["vplCanvas"] = new A3a.vpl.Canvas(canvas);
	window["vplCanvas"].wheel = function (dx, dy) {
		window["vplProgram"].scrollCanvas(window["vplCanvas"], dy);
		window["vplCanvas"].onUpdate();
	};
	window["vplCanvas"].state = new A3a.vpl.Program.CanvasRenderingState();
	window["vplCanvas"].onUpdate = function () {
		window["vplProgram"].invalidateCode();
		window["vplProgram"].enforceSingleTrailingEmptyEventHandler();
		window["vplProgram"].renderToCanvas(window["vplCanvas"]);
		window["vplEditor"].setCode(window["vplProgram"].getCode(window["vplProgram"].currentLanguage));
	};
	window["vplProgram"].addEventHandler(true);

	if (window["vplRun"]) {
		var stopBlock = A3a.vpl.BlockTemplate.findByName("!stop");
		var stopGenCode = stopBlock && stopBlock.genCode[language];
		if (stopGenCode) {
			window["vplRun"].setStopCode(stopGenCode(null).statement, language);
		}
	}

	// apply canvas filters and transforms
	if (filter) {
		window["vplCanvas"].setFilter(filter);
	}
	if (transform) {
		window["vplCanvas"].transform = transform;
	}

	// accept dropped aesl files
	document.getElementsByTagName("body")[0].addEventListener('dragover', function(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	}, false);
	document.getElementsByTagName("body")[0].addEventListener('drop', function(e) {
		e.stopPropagation();
		e.preventDefault();
		var files = e.dataTransfer.files;
		if (files.length === 1) {
			var file = files[0];
			var reader = new window.FileReader();
			reader.onload = function (event) {
				var data = event.target.result;
				var filename = file.name;
				try {
					// try aesl first
					window["vplProgram"].importFromAESLFile(data);
					window["vplCanvas"].onUpdate();
				} catch (e) {
					// then try json
					try {
						window["vplProgram"].importFromJSON(data, function (view) {
							window["vplProgram"].setView(view);
							if (view === "vpl") {
								window["vplCanvas"].onUpdate();
							}
						});
					} catch (e) {}
				}
			};
			reader["readAsText"](file);
		}
	}, false);

	// configure simulator
	if (window["vplSim"]) {
		// shared configuration
		window["vplSim"].uiConfig = uiConfig;

		// accept dropped ground files in simulator
		document.getElementById("sim-view").addEventListener('dragover', function(e) {
			e.stopPropagation();
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
		}, false);
		document.getElementById("sim-view").addEventListener('drop', function(e) {
			e.stopPropagation();
			e.preventDefault();
			var files = e.dataTransfer.files;
			if (files.length === 1) {
				var file = files[0];
				var reader = new window.FileReader();
				if (window["vplSim"].sim.wantsSVG()) {
					reader.onload = function (event) {
						var data = event.target.result;
						window["vplSim"].sim.setSVG(data);
					};
					reader["readAsText"](file);
				} else {
					reader.onload = function (event) {
						var data = event.target.result;
						var img = new Image();
						img.addEventListener("load", function () {
							window["vplSim"].sim.setImage(img);
						});
						img.src = data;
					};
					reader["readAsDataURL"](file);
				}
			}
		}, false);
	}

	// reload from storage
	if (window["vplStorageGetFunction"]) {
		window["vplStorageGetFunction"]("vpl.json",
			function (data) {
				try {
					if (data) {
						window["vplProgram"].importFromJSON(data, function () {
							window["vplProgram"].renderToCanvas(window["vplCanvas"]);
						});
					}
				} catch (e) {}
			});
	} else if (window["vplUseLocalStorage"]) {
		try {
			var vplJson = window.localStorage.getItem("vpl.json");
			if (vplJson) {
				window["vplProgram"].importFromJSON(vplJson, function () {
					window["vplProgram"].renderToCanvas(window["vplCanvas"]);
				});
			}
		} catch (e) {}
	}

	// initial canvas resize
	vplResize();
	window["vplCanvas"].onUpdate();

	// resize canvas
	window.addEventListener("resize", vplResize, false);

	if (getQueryOption("view") === "text") {
		window["vplProgram"].setView("src", {noVpl: true});
	} else {
		window["vplProgram"].setView("vpl");
		window["vplProgram"].experimentalFeatures = experimentalFeatures;
		window["vplProgram"].setTeacherRole(getQueryOption("role") === "teacher");
		window["vplProgram"].renderToCanvas(window["vplCanvas"]);
		document.getElementById("editor").textContent = window["vplProgram"].getCode(window["vplProgram"].currentLanguage);
	}

	window["vplEditor"].setTeacherRole(getQueryOption("role") === "teacher");
	/** @const */
	var languageList = ["aseba", "l2", "js"];
	if (languageList.indexOf(language) >= 0) {
		/** @const */
		window["vplEditor"].changeLanguage = function () {
			language = languageList[(languageList.indexOf(language) + 1) % languageList.length];
			var code = window["vplProgram"].getCode(language);
			return {
				language: language,
				code: code
			};
		};
	}
	window["vplEditor"].toolbarRender();

	window["vplSim"] && window["vplSim"].sim.setTeacherRole(getQueryOption("role") === "teacher");
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
			if (gui["svgFilenames"]) {
				gui["svgFilenames"].forEach(function (filename) {
					gui.rsrc[filename] = rsrc[filename];
				});
			}
			if (gui["overlays"]) {
				gui["overlays"].forEach(function (filename) {
					gui.rsrc[filename] = rsrc[filename];
				});
			}
			vplSetup(gui);
		},
		function () {
			// error
			vplSetup();
		}
	);
}, false);

function vplResize() {
	var width = window.innerWidth;
	var height = window.innerHeight;
	if (window["vplDisableResize"]) {
		var bnd = window["vplCanvas"].canvas.getBoundingClientRect();
		width = bnd.width;
		height = bnd.height;
	}

	// vpl
	window["vplCanvas"].resize(width, height);
	window["vplProgram"].renderToCanvas(window["vplCanvas"]);

	// editor
	window["vplEditor"].resize();

	// sim
	if (window["vplSim"]) {
		window["vplSim"].sim.simCanvas.resize(width, height);
		window["vplSim"].sim.render();
	}
}

// remember state across reload
window.addEventListener("unload", function () {
console.info("vplStorageSetFunction");
	var json = window["vplProgram"].exportToJSON();
	try {
		if (window["vplStorageSetFunction"]) {
			window["vplStorageSetFunction"]("vpl.json", json);
		} else if (window["vplUseLocalStorage"]) {
			window.localStorage.setItem("vpl.json", json);
		}
	} catch (e) {}
}, false);
