#!/usr/bin/env python3

# I am embarrased I even have to write this script
# But figma doesn't like the export {}; appearing at the end of the compiled js

import sys

filename = sys.argv[1]

fd = open(filename, "r")

content = fd.read()

content = content.replace("export {};", "")

fd.close()

fd = open(filename, "w")


fd.write(content)

fd.close()