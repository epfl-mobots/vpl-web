/*
	Copyright 2018-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** Disassemble bytecode and fuse it with original source code
	@param {string} src
	@param {Array.<number>} bytecode
	@param {Array.<A3a.Compiler.SourceToBCMapping>} sourceToBCMapping
	@param {boolean=} loose true to add blank lines between source code and asm
	@return {string}
*/
A3a.vm.disToMixedListing = function (src, bytecode, sourceToBCMapping, loose) {
	var dis = A3a.vm.dis(bytecode, true);
	var lines = src.split("\n");
	var sortedMapping = sourceToBCMapping.slice().sort(function (a, b) {
		return a.addr - b.addr;
	});
	sortedMapping = [new A3a.Compiler.SourceToBCMapping(-1, -1, -1, 0)]
		.concat(sortedMapping)
		.concat(new A3a.Compiler.SourceToBCMapping(Infinity, Infinity, Infinity, bytecode.length));
	var listing = "";

	/** Add dis[k] to listing and remove it
		@param {number} k
		@return {void}
	*/
	function add(k) {
		var addr = dis[k].addr.toString(10);
		addr = "    ".slice(addr.length - 1) + addr;
		var op = dis[k].op.map(function (op1) {
			var str = op1.toString(16);
			return "000".slice(str.length - 1) + str;
		}).join(" ");
		op += "     ".slice(op.length - 4);
		listing += (dis[k].id ? dis[k].id + ":\n" : "") +
			addr + "  " + op + "  " + dis[k].str + "\n";
		dis.splice(k, 1);
	}

	for (var iLine = 0; iLine < lines.length; iLine++) {
		// display all instructions associated with source code before iLine
		var someCode = false;
		for (var i = 0; i < sortedMapping.length - 1; ) {
			if (sortedMapping[i].line <= iLine) {
				for (var j = sortedMapping[i].addr; j < sortedMapping[i + 1].addr; j++) {
					for (var k = 0; k < dis.length; ) {
						if (dis[k].addr === j) {
							if (loose && !someCode && iLine > 0) {
								listing += "\n";
							}
							someCode = true;
							add(k);
						} else {
							k++;
						}
					}
				}
				sortedMapping.splice(i, 1);
			} else {
				i++;
			}
		}
		if (loose && someCode) {
			listing += "\n";
		}

		// display source code
		listing += lines[iLine] + "\n";
	}

	// add remaining instructions
	for (var k = 0; k < dis.length; ) {
		add(k);
	}

	return listing;
}
