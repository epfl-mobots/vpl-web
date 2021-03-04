#!/usr/bin/python3
# Author: Yves Piguet, EPFL, 2020

"""
In html file, replace $INCLUDE(path) with the content of the files.
"""

import sys
import os
import re
import getopt


def read_file(path):
    with open(path, "r") as file:
        return file.read()


def process(filename, html):
    """Return tuple with file content where "$INCLUDE(path)" are replaced with
    the content of specified files; and list of paths. The paths can be
    relative or absolute.
    """

    directory = os.path.dirname(filename)
    if directory == "":
        directory = "."

    # match $$INCLUDE(file)
    re_incl = re.compile(r"""\$INCLUDE\(([^)]*)\)""")

    # replace all matches, accumulating dependencies
    dep = []
    while True:
        r = re_incl.search(html)
        if r is None:
            break
        path = r.group(1)
        if path[0] != "/":
            path = os.path.join(directory, path)
        dep.append(path)
        span = r.span(0)
        data = read_file(path)
        html = html[0:span[0]] + data + html[span[1]:]
    return html, dep


def help():
    print(f"""Usage: python3 {sys.argv[0]} [options]

Arguments:
  -d, --dep              produce dependencies, one per line
  -h, --help             display this usage message and exit
  -i file, --input=file  input file
""")


if __name__ == "__main__":
    filename = None
    produce_dep = False
    try:
        args, values = getopt.getopt(sys.argv[1:],
                                     "dhi:",
                                     ["dep", "help", "input="])
    except getopt.GetoptError:
        print("Unknown option.\n")
        help()
        sys.exit(1)
    for arg, val in args:
        if arg in {"-d", "--dep"}:
            produce_dep = True
        elif arg in {"-h", "--help"}:
            help()
            sys.exit(0)
        elif arg in {"-i", "--input"}:
            filename = val

    if filename is None:
        print("Missing input file.")
        sys.exit(1)

    html = read_file(filename)
    html_processed, dep = process(filename, html)
    print("\n".join(dep) if produce_dep else html_processed)
