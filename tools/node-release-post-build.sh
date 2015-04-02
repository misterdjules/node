#!/bin/bash

## This is to be used once jenkins has finished building the release

set -e

if [[ ! -e ../node-website/Makefile ]];
then
  echo "node-website must be checked out one level up"
  exit 1
fi

stability="$(python tools/getnodeversion.py --stability)"
NODE_STABC="$(tr '[:lower:]' '[:upper:]' <<< ${stability:0:1})${stability:1}"
NODE_STABL="$stability"

tag="$(python tools/getnodeversion.py --tag)"

echo "Building for $stability"

scp tj@nodejs.org:archive/node/tmp/v$(python tools/getnodeversion.py)/SHASUM* .
FILES="SHASUMS SHASUMS256"
for i in $FILES ; do gpg -s $i.txt; gpg --clearsign $i.txt; done
scp SHASUM* tj@nodejs.org:archive/node/tmp/v$(python tools/getnodeversion.py)/
 
ssh nodejs.org mkdir -p "dist/v$(python tools/getnodeversion.py)/{x64,docs}"
ssh nodejs.org ln -s ../dist/v$(python tools/getnodeversion.py)/docs docs/v$(python tools/getnodeversion.py)

ssh root@nodejs.org mv /home/tj/archive/node/tmp/v$(python tools/getnodeversion.py)/* /home/node/dist/v$(python tools/getnodeversion.py)/
ssh root@nodejs.org chown -R node:other /home/node/dist/v$(python tools/getnodeversion.py)

# tag the release
# should be the same key used to sign the shasums
if [ "$tag" = "" ];
then
  git tag -sm "$(bash tools/changelog-head.sh)" v$(python tools/getnodeversion.py)
else
  git tag -sm "$(python tools/getnodeversion.py)" v$(python tools/getnodeversion.py)
fi

# push to github
git push git@github.com:joyent/node v$(python tools/getnodeversion.py)-release --tags 

# blog post and email
make email.md
( echo ""
  echo "Shasums:"
  echo '```'
  cat SHASUMS.txt.asc
  echo '```' ) >> email.md
( echo -n "date: "
  date
  echo -n "version: "
  python tools/getnodeversion.py
  echo "category: release"
  echo "title: Node v"$(python tools/getnodeversion.py)" ($NODE_STABC)"
  echo "slug: node-v"$(python tools/getnodeversion.py | sed 's|\.|-|g')"-$NODE_STABL"
  echo ""
  cat email.md ) > ../node-website/doc/blog/release/v$(python tools/getnodeversion.py).md

if [ "$stability" = "stable" ];
then
  ## this needs to happen here because the website depends on the current node
  ## node version
  ## this will get the api docs in the right place
  ## Do NOT upload API documentation (or anything related to the website)
  ## for tagged releases (such as release candidates)
  if [ "$tag" = "" ];
  then
    make website-upload
  fi
  BRANCH="v$(python tools/getnodeversion.py | sed -E 's#\.[0-9]+(-[A-Za-z0-9]+)?$##')"
  echo $(python tools/getnodeversion.py) > ../node-website/STABLE
else
  BRANCH="master"
fi

echo "Merging back into $BRANCH"

if [ "$tag" = "" ];
then
  echo "Merging back into $BRANCH"

  # merge back into mainline stable branch
  git checkout $BRANCH
  git merge --no-ff v$(python tools/getnodeversion.py)-release

  # change the version number, set isrelease = 0
  ## TODO automagic.
  vim src/node_version.h
  git commit -am "Now working on "$(python tools/getnodeversion.py)

  git push git@github.com:misterdjules/node $BRANCH
fi

echo "Now go do the website stuff"
