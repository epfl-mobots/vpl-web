/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Replace hard-coded buttons with buttons defined in uiConfig
	@param {Object} uiConfig
	@return {void}
*/
A3a.vpl.patchUISVG = function (uiConfig) {
	A3a.vpl.Program.uiConfig = uiConfig;
	// ...
};
