#!/usr/bin/python3
# Author: Yves Piguet, EPFL, 2020

"""
In html file, replace $INCLUDE(path) with the content of the files.
"""

import sys, os, re, base64, mimetypes

def read_file(path):
    with open(path, "r") as file:
        return file.read()

def process(filename, html):
    """Return file content where "$INCLUDE(path)" are replaced with the
    content of specified files. The paths can be relative or absolute.
    """

    directory = os.path.dirname(filename)
    if directory == "":
        directory = "."

    # match $$INCLUDE(file)
    re_incl = re.compile(r"""\$INCLUDE\(([^)]*)\)""")

    # replace all matches
    while True:
        r = re_incl.search(html)
        if r is None:
            break
        path = r.group(1)
        if path[0] != "/":
            path = os.path.join(directory, path)
        span = r.span(0)
        data = read_file(path)
        html = html[0 : span[0]] + data + html[span[1] : ]
    return html

if __name__ == "__main__":
    filename = sys.argv[1]
    html = read_file(filename)
    html_processed = process(filename, html)
    print(html_processed)
