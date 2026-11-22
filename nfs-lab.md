# COM212 lab: NFS

Finish the [DHCP lab](dhcp-lab.md) first. `ubuntu111` is the NFS server. `kali111` is the NFS client. They already share `veth-peer`, and Ubuntu's address on that interface is `192.168.200.1`.

Do not export the share on `eth0` or `eth1`. Mount it over `veth-peer`.

These machines are containers. They do not have `systemctl`. Use `service`. The kernel has no NFS server (`modprobe` is not installed, and `nfs-kernel-server` reports `no support in current kernel`). `nfs-ganesha` crashes with `Floating point exception`. This Ubuntu release has no `unfs3` package, so build `unfs3` 0.9.23 from source.

When you are done, Kali reads a file written on Ubuntu and writes a file that Ubuntu can read.

## 1. Reach Ubuntu from Kali

On `kali111`, log in to `ubuntu111`. The username is `student` and the password is `student`.

```bash
ssh student@ubuntu111
```

The first time SSH asks to continue, type `yes`. Steps 2 through 4 run in that Ubuntu session. Step 5 runs back on Kali. Step 4 leaves `unfsd` running, so open a second SSH session for any later Ubuntu command.

## 2. Directory to export

On Ubuntu:

```bash
sudo mkdir -p /srv/nfs/lab
sudo chmod 777 /srv/nfs/lab
printf 'hello from ubuntu111\n' | sudo tee /srv/nfs/lab/hello.txt
```

`/srv/nfs/lab` is the directory Kali will see. `hello.txt` is the file used to prove the mount.

## 3. Build unfs3

On Ubuntu, install the compiler and the RPC headers, then download `unfs3` 0.9.23. Do not pass `--with-tirpc`. This release does not recognize that option. Point the compiler at `/usr/include/tirpc` instead.

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libtirpc-dev flex bison rpcsvc-proto
cd /tmp
curl -fsSL -o unfs3.tar.gz https://github.com/unfs3/unfs3/releases/download/unfs3-0.9.23/unfs3-0.9.23.tar.gz
tar -xzf unfs3.tar.gz
cd unfs3-0.9.23
./configure CFLAGS="-g -O2 -I/usr/include/tirpc" LIBS="-ltirpc"
```

`./configure` must finish without `error:`. A warning about an unrecognized option means `--with-tirpc` was used. Run the `./configure` line above again.

`libtirpc` returns an IPv6 socket address. This old source still reads the IPv4 field names `sin_addr` and `sin_port`. Patch `daemon.c`:

```bash
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
    raise SystemExit("daemon.c does not contain the expected lines")
if "#include <string.h>" not in text:
    text = text.replace("#include <rpc/rpc.h>", "#include <rpc/rpc.h>\n#include <string.h>", 1)
p.write_text(text.replace(old_addr, new_addr, 1).replace(old_port, new_port, 1))
print("patched")
PY
```

The script must print `patched`. Current `gcc` also rejects an old call in `locate.c` that has no declaration, and the generated link line contains the Solaris option `-R`. Fix both, then build and install:

```bash
sed -i 's/ *-L=\/usr\/ucblib//g; s/ *-R\/usr\/ucblib//g; s/ *-L\/usr\/ucblib//g' Makefile
make CFLAGS="-g -O2 -I/usr/include/tirpc -Wall -W -D_GNU_SOURCE -Wno-error=implicit-function-declaration -Wno-error=implicit-int -Wno-error=int-conversion -Wno-error=incompatible-pointer-types"
sudo make install
command -v unfsd
```

`make` must finish without `Error 1`. `command -v unfsd` must print a path, usually `/usr/local/sbin/unfsd`.

## 4. Export and serve

On Ubuntu, export the directory only to the `veth-peer` subnet. `no_root_squash` lets root on Kali write files in the share. `unfsd -d` stays in the foreground. Leave this session open.

```bash
sudo tee /etc/exports >/dev/null <<'EOF'
/srv/nfs/lab 192.168.200.0/24(rw,no_root_squash)
EOF
sudo service rpcbind start || true
sudo unfsd -e /etc/exports -d
```

The rpcbind line `another rpcbind is already running` means the port mapper is already up. `unfsd` should then print:

```text
/srv/nfs/lab: ip 192.168.200.0 mask 255.255.255.0
```

In a second SSH session on Ubuntu:

```bash
showmount -e 127.0.0.1
```

`showmount` should list `/srv/nfs/lab`. `Program not registered` means `unfsd` is not running.

## 5. Mount it on Kali

On `kali111`:

```bash
ping -c 3 192.168.200.1
sudo apt update
sudo apt install -y nfs-common
showmount -e 192.168.200.1
sudo mkdir -p /mnt/nfs
sudo mount -t nfs -o nfsvers=3,nolock,tcp 192.168.200.1:/srv/nfs/lab /mnt/nfs
mount | grep nfs
cat /mnt/nfs/hello.txt
printf 'hello from kali111\n' | sudo tee /mnt/nfs/from-kali.txt
ls -l /mnt/nfs
```

`ping` should get replies. `showmount` should list `/srv/nfs/lab`. `cat` should print `hello from ubuntu111`. `ls` should show both `hello.txt` and `from-kali.txt`.

Back on Ubuntu, in the second SSH session:

```bash
cat /srv/nfs/lab/from-kali.txt
```

That should print `hello from kali111`.

To disconnect the share on Kali:

```bash
sudo umount /mnt/nfs
```

## Done

You are finished when all of these are true:

- `unfsd` on Ubuntu is serving `/srv/nfs/lab` to `192.168.200.0/24`.
- Kali has that directory mounted at `/mnt/nfs`.
- Kali can read `hello.txt`, and Ubuntu can read `from-kali.txt`.
