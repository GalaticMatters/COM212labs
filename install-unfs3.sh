#!/bin/bash
# Install unfs3 0.9.23 on Ubuntu containers that have no packaged NFS server.
# The container kernel has no nfsd, nfs-ganesha crashes, and apt has no unfs3.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash install-unfs3.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y build-essential pkg-config libtirpc-dev flex bison rpcsvc-proto curl ca-certificates python3

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
cd "$workdir"

curl -fsSL -o unfs3.tar.gz https://github.com/unfs3/unfs3/releases/download/unfs3-0.9.23/unfs3-0.9.23.tar.gz
tar -xzf unfs3.tar.gz
cd unfs3-0.9.23

./configure CFLAGS="-g -O2 -I/usr/include/tirpc" LIBS="-ltirpc"

python3 << 'PY'
from pathlib import Path
p = Path("daemon.c")
text = p.read_text()
old_addr = "return (svc_getcaller(rqstp->rq_xprt))->sin_addr;"
new_addr = """return ({
        struct sockaddr_in6 *_a = (struct sockaddr_in6 *)svc_getcaller(rqstp->rq_xprt);
        struct in_addr _ip;
        if (_a->sin6_family == AF_INET)
            _ip = ((struct sockaddr_in *)_a)->sin_addr;
        else
            memcpy(&_ip, &_a->sin6_addr.s6_addr[12], sizeof(_ip));
        _ip;
    });"""
old_port = "return (svc_getcaller(rqstp->rq_xprt))->sin_port;"
new_port = """return ({
        struct sockaddr_in6 *_a = (struct sockaddr_in6 *)svc_getcaller(rqstp->rq_xprt);
        _a->sin6_family == AF_INET ? ((struct sockaddr_in *)_a)->sin_port : _a->sin6_port;
    });"""
if old_addr not in text or old_port not in text:
    if "sin6_addr" not in text:
        raise SystemExit("daemon.c does not contain the expected lines")
    print("already patched")
else:
    if "#include <string.h>" not in text:
        text = text.replace("#include <rpc/rpc.h>", "#include <rpc/rpc.h>\n#include <string.h>", 1)
    p.write_text(text.replace(old_addr, new_addr, 1).replace(old_port, new_port, 1))
    print("patched")
PY

sed -i 's/ *-L=\/usr\/ucblib//g; s/ *-R\/usr\/ucblib//g; s/ *-L\/usr\/ucblib//g' Makefile
make CFLAGS="-g -O2 -I/usr/include/tirpc -Wall -W -D_GNU_SOURCE -Wno-error=implicit-function-declaration -Wno-error=implicit-int -Wno-error=int-conversion -Wno-error=incompatible-pointer-types"
make install

command -v unfsd
echo "unfs3 installed: $(command -v unfsd)"
