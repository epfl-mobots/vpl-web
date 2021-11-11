/*
	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

// requires jszip
// based on https://github.com/epfl-mobots/vpl-teacher-tools version, with
// changed namespace, ES6, and hasOwnProperty on files object removed

// fixes for some jszip 3.6.0 issues

A3a.vpl.JSZip = class extends JSZip {

	/**
		@inheritDoc
		@see https://github.com/Stuk/jszip/blob/master/lib/object.js
	*/
	forEach(cb) {
		for (var path in this.files) {
			if (path.slice(0, this.root.length) === this.root) {
				var filename = path.slice(this.root.length);
				if (/^[^\/]+\/?$/.test(filename)) {
	  	  	  	  	  // filename = not empty, no inner slash, possibly trailing slash
					cb(filename, this.files[path]);
				}
			}
		}
	}

	/**
		@return {Array.<Object>}
	*/
	getEntries() {
		var entries = [];
		this.forEach((relativePath, file) => {
			entries.push(file);
		});
		return entries;
	}

	/**
		@return {Array.<string>}
		@see https://github.com/Stuk/jszip/blob/master/lib/object.js
	*/
	getCompleteFileList() {
		var paths = [];
		for (var path in this.files) {
			if (!this.files[path].dir) {
				paths.push(path);
			}
		}
		return paths;
	}
};

A3a.vpl.ZipBundle = class {

	constructor () {
		this.zip = null;
		this.toc = [];
		this.pathPrefix = "";
		this.manifest = new A3a.vpl.ZipBundle.Manifest();
		this.textFileCache = {};
		this.base64FileCache = {};
	}

	load(zipContent, cb) {
		this.zip = new A3a.vpl.JSZip();
		this.toc = [];
		this.pathPrefix = "";
		var self = this;
		this.zip.loadAsync(zipContent)
			.then(() => {

				// check if there is a single root directory
				this.pathPrefix = "";
				var rootEntries = this.zip.getEntries();
				if (rootEntries.length === 1 && rootEntries[0].dir) {
					this.pathPrefix = rootEntries[0].name;
				}

				this.toc = this.zip.getCompleteFileList()
					.map((path) => path.slice(this.pathPrefix.length));

				var manifestFile = self.zip.file(this.pathPrefix +
					A3a.vpl.ZipBundle.manifestFilename);
				if (manifestFile) {
					manifestFile.async("string").then((manifestSrc) => {
						self.manifest.parse(manifestSrc, self.toc);
						if (cb) {
							cb(this);
						}
					});
				} else if (cb) {
					cb(this);
				}
			});
	}

	/**
		@param {string} filename
		@return A3a.vpl.ZipBundle.Manifest.File.Type
	*/
	getType(filename) {
		// use manifest file if it exists
		if (this.manifest.explicitFile) {
			var manifestFile = this.manifest.getEntry(filename);
			return manifestFile ? manifestFile.type : A3a.vpl.ZipBundle.Manifest.File.Type.unknown;
		}

		return A3a.vpl.ZipBundle.mapSuffixToType(filename);
	}

	/**
		@param {string} filename
		@param {boolean} asBase64 true for base64, false for text
		@param {function(string):void} cb
		@return {void}
	*/
	getFile(filename, asBase64, cb) {
		if ((asBase64 ? this.base64FileCache : this.textFileCache)[filename] != undefined) {
			if (cb) {
				cb((asBase64 ? this.base64FileCache : this.textFileCache)[filename]);
			}
			return;
		}
		this.zip.file(this.pathPrefix + filename).async(asBase64 ? "uint8array" : "string").then((data) => {
			if (asBase64) {
				var dataAsString = "";
				for (var i = 0; i < data.length; i++) {
					dataAsString += String.fromCharCode(data[i]);
				}
				data = btoa(dataAsString);
			}
			(asBase64 ? this.base64FileCache : this.textFileCache)[filename] = data;
			cb(data);
		});
	}

	/** Get file synchronously, failing with null if not in cache yet (should be retried later).
		@param {string} filename
		@param {boolean} asBase64 true for base64, false for text
		@param {function(string):void=} cb
		@return {string|null}
	*/
	getFileSync(filename, asBase64, cb) {
		if ((asBase64 ? this.base64FileCache : this.textFileCache)[filename] == undefined) {
			this.getFile(filename, asBase64,
				function (content) {
					if (cb) {
						cb(content);
					}
				});
			return null;
		}
		return (asBase64 ? this.base64FileCache : this.textFileCache)[filename];
	}

	addFile(filename, content) {
		if (this.zip == null) {
			this.zip = new A3a.vpl.JSZip();
		}
		this.zip.file(this.pathPrefix + filename, content);
		if (this.toc.indexOf(filename) < 0) {
			this.toc.push(filename);
		}
	}
};

/**
	@param {string} path
	@return {string}
*/
A3a.vpl.ZipBundle.getSuffix = function (path) {
	return /(\.[^.]*|)$/.exec(path)[0].slice(1);
};

/**
	@param {string} filename
	@return A3a.vpl.ZipBundle.Manifest.File.Type
*/
A3a.vpl.ZipBundle.mapSuffixToType = function (filename) {
	var suffix = /(\.[^.]*|)$/.exec(filename)[0].slice(1).toLowerCase();
	return {
		"aseba": A3a.vpl.ZipBundle.Manifest.File.Type.program,
		"html": A3a.vpl.ZipBundle.Manifest.File.Type.statement,
		"jpg": A3a.vpl.ZipBundle.Manifest.File.Type.attention,
		"md": A3a.vpl.ZipBundle.Manifest.File.Type.statement,
		"png": A3a.vpl.ZipBundle.Manifest.File.Type.attention,
		"txt": A3a.vpl.ZipBundle.Manifest.File.Type.statement,
		"vpl3": A3a.vpl.ZipBundle.Manifest.File.Type.vpl3,
		"vpl3ui": A3a.vpl.ZipBundle.Manifest.File.Type.ui
	}[suffix] || A3a.vpl.ZipBundle.Manifest.File.Type.unknown;
};

A3a.vpl.ZipBundle.Manifest = class {

	constructor() {
		this.explicitFile = false;
		this.src = "";
		/** @type {Array.<A3a.vpl.ZipBundle.Manifest.File>} */
		this.files = [];
	}

	/**
		@param {string} src
		@param {Array.<string>} filenames
		@return {void}
	*/
	parse(src, filenames) {
		this.files = [];
		var lines = src.split("\n").map((line) => line.trim());
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].slice(-1) === ":") {
				var type = A3a.vpl.ZipBundle.Manifest.File.Type.unknown;
				switch (lines[i].slice(0, -1).trim().toLowerCase()) {
				case "vpl3":
					type = A3a.vpl.ZipBundle.Manifest.File.Type.vpl3;
					break;
				case "ui":
					type = A3a.vpl.ZipBundle.Manifest.File.Type.ui;
					break;
				case "program":
					type = A3a.vpl.ZipBundle.Manifest.File.Type.program;
					break;
				case "attention":
					type = A3a.vpl.ZipBundle.Manifest.File.Type.attention;
					break;
				case "doc":
					type = A3a.vpl.ZipBundle.Manifest.File.Type.doc;
					break;
				case "statement":
					type = A3a.vpl.ZipBundle.Manifest.File.Type.statement;
					break;
				}
				if (type !== A3a.vpl.ZipBundle.Manifest.File.Type.unknown) {
					var re = /([-_\/.\p{Letter}0-9]+)(\s+\([^)]*\))?$/u;	// filename, accents allowed
					for (; i + 1 < lines.length; i++) {
						var line = lines[i + 1];
						if (line != "") {
							var r = re.exec(line);
							if (r == null) {
								break;
							}
							var filename = r[1];
							if (filenames.indexOf(filename) >= 0) {
								this.files.push(new A3a.vpl.ZipBundle.Manifest.File(filename, type));
							}
						}
					}
				}
			}
		}
		this.explicitFile = true;
	}

	/**
		@param {string} filename
		@return A3a.vpl.ZipBundle.Manifest.File
	*/
	getEntry(filename) {
		for (var i = 0; i < this.files.length; i++) {
			if (this.files[i].filename === filename) {
				return this.files[i];
			}
		}
		return null;
	}

	/**
		@param {A3a.vpl.ZipBundle.Manifest.File} type
		@return {Array.<A3a.vpl.ZipBundle.Manifest.File>}
	*/
	getFilesForType(type) {
		return this.files.filter((file) => {
			return file.type === type;
		});
	}

	/** Convert manifest type to string
		@param {A3a.vpl.ZipBundle.Manifest.File.Type} type
		@return {string}
	*/
	typeToString(type) {
		switch (type) {
		case A3a.vpl.ZipBundle.Manifest.File.Type.vpl3:
			return "vpl";
		case A3a.vpl.ZipBundle.Manifest.File.Type.ui:
			return "ui";
		case A3a.vpl.ZipBundle.Manifest.File.Type.program:
			return "program";
		case A3a.vpl.ZipBundle.Manifest.File.Type.attention:
			return "attention";
		case A3a.vpl.ZipBundle.Manifest.File.Type.doc:
			return "doc";
		case A3a.vpl.ZipBundle.Manifest.File.Type.statement:
			return "statement";
		default:
			return "";
		}
	}

};

A3a.vpl.ZipBundle.Manifest.File = class {
	/**
		@param {string} filename
		@param {A3a.vpl.ZipBundle.Manifest.File.Type} type
	*/
	constructor(filename, type) {
		this.filename = filename;
		this.type = type;
	}
};

/** @enum {number} */
A3a.vpl.ZipBundle.Manifest.File.Type = {
	unknown: 0,
	vpl3: 1,
	ui: 2,
	program: 3,
	attention: 4,
	doc: 5,
	statement: 6
};

A3a.vpl.ZipBundle.manifestFilename = "manifest.txt";
