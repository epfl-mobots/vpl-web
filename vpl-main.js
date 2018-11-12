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
			var uiConfig = /** @type {Object} */(JSON.parse(xhr.responseText));
			var auxFiles = getAuxiliaryFilenames(uiConfig);
			var nRemaining = auxFiles.length;
			var error = false;
			auxFiles.forEach(function (f) {
				var xhr = new XMLHttpRequest();
				xhr.addEventListener("load", function () {
					if (xhr.status === 200) {
						rsrc[f] = xhr.responseText;
						nRemaining--;
						if (!error && nRemaining === 0) {
							onLoad(uiConfig, rsrc);
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
		var uiConfig = /** @type {Object} */(JSON.parse(txt));
		var rsrc = {};
		uiConfig["svgFilenames"].forEach(function (filename) {
			txt = document.getElementById(filename).textContent;
			rsrc[filename] = txt;
		});
		onLoad(uiConfig, rsrc);
	} catch (e) {
		onError();
	}
}

/** Setup everything for vpl
	@param {Object=} uiConfig
	@return {void}
*/
function vplSetup(uiConfig) {
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
	var isClassic = getQueryOption("appearance") === "classic";
	var isL2 = getQueryOption("compiler") === "l2";
	if (!isClassic && uiConfig) {
		try {
			A3a.vpl.patchSVG(uiConfig, isL2);
		} catch (e) {}
	} else if (isL2) {
		A3a.vpl.patchL2Blocks();
	}
	if (isL2) {
		A3a.vpl.patchL2();
	}

	A3a.vpl.Program.resetBlockLib();

	var filterBlur = 0;	// 0.1 px
	var filterGrayscale = 0;	// %
	var opt = getQueryOption("blur").trim() || "";
	if (/^\d+$/.test(opt)) {
		filterBlur = parseInt(opt, 10) / 10;
	}
	opt = getQueryOption("grayscale") || "";
	if (/^\d+$/.test(opt)) {
		filterGrayscale = parseInt(opt, 10) / 100;
	}

	var hasThymio = getQueryOption("robot") === "true";
	if (hasThymio) {
		window["vplRunFunction"] && window["vplRunFunction"]["init"] &&
			window["vplRunFunction"]["init"]();
	} else {
		window["vplRunFunction"] = null;
	}

	window["vplProgram"] = new A3a.vpl.Program();
	window["vplEditor"] = new A3a.vpl.VPLSourceEditor(window["vplProgram"].noVPL, window["vplRunFunction"]);
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
		window["vplEditor"].setCode(window["vplProgram"].getCode());
	};
	window["vplProgram"].addEventHandler(true);

	// apply canvas filters
	if (filterBlur > 0 || filterGrayscale > 0) {
		window["vplCanvas"].canvas["style"]["filter"] =
			"blur(" + filterBlur.toFixed(1) + "px) grayscale(" + filterGrayscale.toFixed(2) + ")";
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
						window["vplProgram"].importFromJSON(data, function () {
							window["vplCanvas"].onUpdate();
						});
					} catch (e) {}
				}
			};
			reader["readAsText"](file);
		}
	}, false);

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
	} else {
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
		window["vplProgram"].setView("src", true);
	} else {
		window["vplProgram"].setView("vpl");
		window["vplProgram"].experimentalFeatures = getQueryOption("exp") === "true";
		window["vplProgram"].setTeacherRole(getQueryOption("role") === "teacher");
		window["vplProgram"].renderToCanvas(window["vplCanvas"]);
		document.getElementById("editor").textContent = window["vplProgram"].getCode();
	}
	window["vplEditor"].toolbarRender();
}

window.addEventListener("load", function () {
	(/^https?:\/\//.test(document.location.href) ? vplLoadResourcesWithXHR : vplLoadResourcesInScripts)(
		"ui.json",
		function (obj) {
			// get subfiles
			return obj["svgFilenames"];
		},
		function (uiConfig, rsrc) {
			// success
			uiConfig.svg = {};
			uiConfig["svgFilenames"].forEach(function (filename) {
				uiConfig.svg[filename] = rsrc[filename];
			});
			vplSetup(uiConfig);
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
}

// remember state across reload
window.addEventListener("unload", function () {
console.info("vplStorageSetFunction");
	var json = window["vplProgram"].exportToJSON();
	try {
		if (window["vplStorageSetFunction"]) {
			window["vplStorageSetFunction"]("vpl.json", json);
		} else {
			window.localStorage.setItem("vpl.json", json);
		}
	} catch (e) {}
}, false);
