#!/usr/bin/python3
# Author: Yves Piguet, EPFL, 2020

"""
In html file, replace relative urls with "data:" urls.
"""

import sys, os, re, base64

def read_file(path, is_binary=False):
    with open(path, "rb" if is_binary else "r") as file:
        return file.read()

def process(filename, html):
    """Return html file content where relative paths in img src attributes
    have been replaced with data: url, i.e. embed references to image files.
    """

    directory = os.path.dirname(filename)
    if len(directory) == 0:
        directory = "."

    # match img element with src attribute which doesn't begin with method
    re_img = re.compile(r"""<img\s[^>]*src=['"](?!\w+:)([^'"]+)['"]""")

    # replace all matching img src attributes with the base64-encoded file content
    while True:
        r = re_img.search(html)
        if r is None:
            break
        img_filename = os.path.join(directory, r.group(1))
        src_span = r.span(1)
        img_data = read_file(img_filename, True)
        data_url = "data:image/png;base64," + base64.b64encode(img_data).decode("utf-8")
        html = html[0 : src_span[0]] + data_url + html[src_span[1] : ]
    return html

if __name__ == "__main__":
    filename = sys.argv[1]
    html = read_file(filename)
    html_processed = process(filename, html)
    print(html_processed)
