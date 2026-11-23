#!/bin/bash
# Install nfs-ls, nfs-cat, and nfs-cp on Kali containers.
# libnfs-utils is not always in the container's apt cache.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash install-nfs-client.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nfs-common || true

if apt-get install -y libnfs-utils \
  && command -v nfs-ls >/dev/null \
  && command -v nfs-cat >/dev/null \
  && command -v nfs-cp >/dev/null
then
  echo "nfs client tools installed: $(command -v nfs-ls)"
  exit 0
fi

echo "Package libnfs-utils did not provide nfs-ls. Building libnfs 5.0.2."
apt-get install -y build-essential cmake pkg-config curl ca-certificates

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
cd "$workdir"

curl -fsSL -o libnfs.tar.gz https://github.com/sahlberg/libnfs/archive/refs/tags/libnfs-5.0.2.tar.gz
tar -xzf libnfs.tar.gz
cd libnfs-libnfs-5.0.2

cmake -B build -S . \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DENABLE_UTILS=ON \
  -DENABLE_EXAMPLES=OFF \
  -DENABLE_TESTS=OFF \
  -DENABLE_DOCUMENTATION=OFF
cmake --build build -j"$(nproc)" --target nfs-ls nfs-cat nfs-cp

install -m 755 build/utils/nfs-ls build/utils/nfs-cat build/utils/nfs-cp /usr/local/bin/

command -v nfs-ls
command -v nfs-cat
command -v nfs-cp
echo "nfs client tools installed: $(command -v nfs-ls)"
