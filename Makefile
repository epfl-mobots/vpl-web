#	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
#	Miniature Mobile Robots group, Switzerland
#	Author: Yves Piguet

#	Licensed under the 3-Clause BSD License;
#	you may not use this file except in compliance with the License.
#	You may obtain a copy of the License at
#	https://opensource.org/licenses/BSD-3-Clause

.PHONY: main
main:	all

include Makefile-jsmin

.PHONY: all
all: vpl-min.js index-svg.html index-svg-min.html index-classic.html index-classic-min.html

# dependencies
index-classic.html: $(shell python3 inlinersrctool.py --input=index-classic-min-template.html --dep)
index-svg.html: $(shell python3 inlinersrctool.py --input=index-svg-min-template.html --dep)
index-classic-min.html: $(shell python3 inlinersrctool.py --input=index-classic-min-template.html --dep)
index-svg-min.html: $(shell python3 inlinersrctool.py --input=index-svg-min-template.html --dep)

%.html: %-template.html
	python3 inlinersrctool.py --input=$< >$@

.PHONY: doc
doc: $(JS)
	jsdoc -d=doc-js $^

.PHONY: oh
oh:
	ohcount src
