/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Translation support.

*/


/** Support for text translation
	@constructor
*/
A3a.vpl.Translation = function () {
	this.dict = {};
	this.language = "en";
};

A3a.vpl.Translation.prototype.addDictForLanguage = function (lang, dict) {
	if (!this.dict[lang]) {
		this.dict[lang] = {};
	}
	var d = this.dict[lang];
	for (var key in dict) {
		if (dict.hasOwnProperty(key)) {
			d[key] = dict[key];
		}
	}
};

A3a.vpl.Translation.prototype.getLanguage = function () {
	return this.language;
};

A3a.vpl.Translation.prototype.setLanguage = function (language) {
	this.language = language;
};

/** Translate a message, defaulting to the untranslated message
	@param {string} msg
	@param {string=} language target language (default: as set by setLanguage)
	@return {string}
*/
A3a.vpl.Translation.prototype.translate = function (msg, language) {
	var dict = this.dict[language || this.language];
	return dict && dict[msg] || msg;
};
