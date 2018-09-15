# vpl-web

Prototype of VPL as a web application.

Usage: open index.html in a web browser.

Options: add them as parameters in a query string; e.g.

```
file:///path/index.html?robot=true&role=teacher
```

* ```appearance```: ```new``` for blocks defined in svg (default), ```classic``` for hard-coded drawings
* ```blur```: blur level in tenths of pixels to simulate vision deficiency (default: 0)
* ```compiler```: ```l2``` to generate L2 code, ```aseba``` to generate Aseba code (default)
* ```grayscale```: percentage of conversion to grayscale to simulate vision deficiency (default: 0)
* ```robot```: ```true``` to display buttons to run the code on a local Thymio via ```asebahttp``` (default: false)
* ```role```: ```teacher``` to add a button to customize which blocks and actions are available
