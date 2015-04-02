import os,re

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

  rc_match = re.match('#define NODE_TAG (.*)', line)
  if rc_match:
    tag = rc_match.group(1)

version_string = '%(major)s.%(minor)s.%(patch)s'% locals()
if tag:
    version_string += '-%(tag)s'% locals()

print version_string
