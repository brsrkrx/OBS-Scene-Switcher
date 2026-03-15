#!/bin/bash
# ============================================================
#   OBS Scene Switcher - Release Script
# ============================================================

VERSION=$1

if [ -z "$VERSION" ]; then
  echo ""
  echo "  Usage: ./release.sh <version>  (e.g. ./release.sh 1.2.0)"
  echo ""
  exit 1
fi

TAG="v$VERSION"

echo ""
echo "  Creating release $TAG ..."
echo "  This will tag the current commit and push to GitHub,"
echo "  which triggers the automated release workflow."
echo ""
read -p "  Continue? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "  Aborted."
  echo ""
  exit 0
fi

git tag "$TAG" && git push origin "$TAG"

echo ""
echo "  Done! GitHub Actions will now build and publish the release."
echo "  https://github.com/brsrkrx/OBS-Scene-Switcher/releases/tag/$TAG"
echo ""
