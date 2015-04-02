import os,re, sys

node_version_h = os.path.join(os.path.dirname(__file__), '..', 'src',
    'node_version.h')

f = open(node_version_h)

tag = None

for line in f:
  if re.match('#define NODE_MAJOR_VERSION', line):
    major = line.split()[2]
  if re.match('#define NODE_MINOR_VERSION', line):
    minor = line.split()[2]
  if re.match('#define NODE_PATCH_VERSION', line):
    patch = line.split()[2]

  tag_match = re.match('#define NODE_TAG (.*)', line)
  if tag_match:
    tag = tag_match.group(1)

version_string = '%(major)s.%(minor)s.%(patch)s'% locals()
if tag:
    version_string += '-%(tag)s'% locals()

if len(sys.argv) > 1:
    if sys.argv[1] == '--stability':
        if int(minor) % 2 == 0:
          print 'stable'
        else:
          print 'unstable'
    elif sys.argv[1] == '--tag':
        if tag:
            print tag
else:
    print version_string
