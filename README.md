# vpl-web

Prototype of VPL as a web application.

To run VPL as a standalone web application in the browser, open `index.html`.

To run it with a Thymio:

* connect the Thymio
* switch on the Thymio
* start asebahttp with something like
    > asebahttp ser:device=/dev/ttyACM0
* open VPL web with option `robot=true`, e.g.
    > file:///home/foo/vpl-web/index.html?robot=true

