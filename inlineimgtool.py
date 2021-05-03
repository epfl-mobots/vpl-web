#!/usr/bin/python3
# Author: Yves Piguet, EPFL, 2020-2021

"""
In html file, replace relative img urls with "data:" urls or vice versa.
"""

import sys, os, re, base64, mimetypes

def read_file(path, is_binary=False):
    with open(path, "rb" if is_binary else "r") as file:
        return file.read()

def do_inline(filename, html):
    """Return html file content where relative paths in img src attributes
    have been replaced with data: url, i.e. embed references to image files.
    """

    directory = os.path.dirname(filename)
    if directory == "":
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
        type, _ = mimetypes.guess_type(img_filename)
        data_url = "data:" + type + ";base64," + base64.b64encode(img_data).decode("utf-8")
        html = html[0 : src_span[0]] + data_url + html[src_span[1] : ]
    return html

def do_extract(filename, html):
    """Return html file where data: url in img src attributes have been
    replaced with relative urls and corresponding files have been created in
    relative directory img.
    """

    directory = os.path.dirname(filename)
    if len(directory) == 0:
        directory = "."

    try:
        os.mkdir(os.path.join(directory, "img"))
    except FileExistsError:
        pass

    # match img element with src data base64 attribute
    re_img = re.compile(r"""<img\s[^>]*src=['"](data:(image/\w+);base64,([^'"]+))['"]""")

    # replace all matching img src attributes with the reference to a file created in img
    count = 0
    while True:
        r = re_img.search(html)
        if r is None:
            break
        count += 1
        img_type = r.group(2)
        img_ext = mimetypes.guess_extension(img_type)
        img_filename = f"file{count}{img_ext or ''}"
        img_data = base64.b64decode(r.group(3))
        with open(os.path.join(directory, "img", img_filename), "wb") as f:
            f.write(img_data)
        html = html[: r.span(1)[0]] + f"img/{img_filename}" + html[r.span(1)[1] :]
    return html

if __name__ == "__main__":
    extract = sys.argv[1] == "-x"
    filename = sys.argv[2 if extract else 1]
    html = read_file(filename)
    html_processed = do_extract(filename, html) if extract else do_inline(filename, html)
    print(html_processed)
