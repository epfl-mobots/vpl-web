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

Support for file input: VPL3 program files (aesl or json), and image
files for the simulator (native image format handled by the browser,
or SVG for the obstacle map).

*/

/** Load a program file (aesl or json)
	@param {File} file
	@return {boolean} true if file suffix was recognized as a program
*/
A3a.vpl.Application.prototype.loadProgramFile = function (file) {
	var r = /^[^.]+\.(.*)$/.exec(file.name);
	var ext = r ? r[1] : "";
	var reader = new window.FileReader();
	switch (ext.toLowerCase()) {
	case "aesl":
	case "json":
		var app = this;
		reader.onload = function (event) {
			var data = event.target.result;
			var filename = file.name;
			try {
				// try aesl first
				app.program.importFromAESLFile(data);
				app.vplCanvas.onUpdate();
			} catch (e) {
				// then try json
				try {
					app.program.importFromJSON(data, function (view) {
						if (app.views.indexOf(view) < 0) {
							if (app.views.length === 1) {
								app.setView([view]);
							} else {
								// switch vpl to src or src to vpl
								var views = app.views.slice();
								views[views.indexOf("vpl") >= 0 ? views.indexOf("vpl")
									: views.indexOf("src") >= 0 ? views.indexOf("src")
									: 0] = view;
								app.setView(views);
							}
						}
						if (app.views.indexOf("vpl") >= 0) {
							app.vplCanvas.onUpdate();
						}
					});
				} catch (e) {}
			}
		};
		reader["readAsText"](file);
		return true;
	}

	return false;
};

/** Load an image file (svg, png, jpg or gif) into the simulator
	@param {File} file
	@return {boolean} true if file suffix was recognized as an image
*/
A3a.vpl.Application.prototype.loadImageFile = function (file) {
	var r = /^[^.]+\.(.*)$/.exec(file.name);
	var ext = r ? r[1] : "";
	var reader = new window.FileReader();
	switch (ext.toLowerCase()) {
		case "svg":
		case "png":
		case "jpg":
		case "gif":
			var app = this;
			if (this.sim2d) {
				if (this.sim2d.wantsSVG()) {
					reader.onload = function (event) {
						var data = event.target.result;
						app.setSVG(data);
					};
					reader["readAsText"](file);
				} else {
					reader.onload = function (event) {
						var data = event.target.result;
						var img = new Image();
						img.addEventListener("load", function () {
							app.setImage(img);
						});
						img.src = data;
					};
					reader["readAsDataURL"](file);
				}
			}
		return true;
	}

	return false;
};
