# COM212 lab: NFS

Finish the [DHCP lab](dhcp-lab.md) first. `ubuntu##` is the NFS server. `kali##` is the NFS client. They already share `veth-peer`, and Ubuntu's address on that interface is `192.168.200.1`.

Do not export the share on `eth0` or `eth1`. Use the `veth-peer` network.

These machines are containers. They do not have `systemctl`. Use `service`. The kernel cannot run `nfs-kernel-server`, so this lab uses `unfsd` from `unfs3`. One script installs that program. The same container blocks `mount -t nfs` with `operation not permitted`, so Kali reads and writes the share with `nfs-cat` and `nfs-cp`.

When you are done, Kali reads a file written on Ubuntu and writes a file that Ubuntu can read.

## 1. Reach Ubuntu from Kali

On `kali##`, log in to `ubuntu##`. The `##` is the number in your hostname. `kali03` logs in to `ubuntu03` and writes `hello from ubuntu03`. Use your number everywhere `##` appears, including the SSH command and the hello lines. The username is `student` and the password is `student`.

```bash
ssh student@ubuntu##
```

The first time SSH asks to continue, type `yes`. Steps 2 and 3 run in that Ubuntu session. Step 3 leaves `unfsd` running, so open a second SSH session for any later Ubuntu command. Step 4 runs back on Kali.

## 2. Install unfsd and create the directory

On Ubuntu, download the installer and run it. Then create the directory Kali will see.

```bash
curl -fsSL -o /tmp/install-unfs3.sh https://raw.githubusercontent.com/GalaticMatters/COM212labs/main/install-unfs3.sh
sudo bash /tmp/install-unfs3.sh
sudo mkdir -p /srv/nfs/lab
sudo chmod 777 /srv/nfs/lab
printf 'hello from ubuntu##\n' | sudo tee /srv/nfs/lab/hello.txt
```

The script must end with `unfs3 installed:` and a path such as `/usr/local/sbin/unfsd`. `hello.txt` is the file used to prove the mount.

## 3. Export and serve

On Ubuntu, export that directory only to the `veth-peer` subnet. `no_root_squash` lets root on Kali write files in the share. `insecure` lets Kali's userspace client use a normal source port. `unfsd -d` stays in the foreground. Leave this session open. If `unfsd` is already running from an earlier attempt, press Ctrl+C in that session before starting it again.

```bash
sudo tee /etc/exports >/dev/null <<'EOF'
/srv/nfs/lab 192.168.200.0/24(rw,no_root_squash,insecure)
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

## 4. Read and write the share from Kali

`sudo mount -t nfs` fails in this container with `operation not permitted`. Root inside the container is still not allowed to create a kernel NFS mount. `nfs-ls`, `nfs-cat`, and `nfs-cp` speak NFSv3 to `unfsd` and do not call `mount`. `/mnt/nfs` is only a local directory, so a file written there stays on Kali.

On `kali##`:

```bash
ping -c 3 192.168.200.1
curl -fsSL -o /tmp/install-nfs-client.sh https://raw.githubusercontent.com/GalaticMatters/COM212labs/main/install-nfs-client.sh
sudo bash /tmp/install-nfs-client.sh
showmount -e 192.168.200.1
sudo nfs-ls 'nfs://192.168.200.1/srv/nfs/lab?version=3'
sudo nfs-cat 'nfs://192.168.200.1/srv/nfs/lab/hello.txt?version=3'
printf 'hello from kali##\n' > /tmp/from-kali.txt
sudo nfs-cp /tmp/from-kali.txt 'nfs://192.168.200.1/srv/nfs/lab/from-kali.txt?version=3'
```

The script must end with `nfs client tools installed:` and a path such as `/usr/local/bin/nfs-ls`. `ping` should get replies. `showmount` should list `/srv/nfs/lab`. `nfs-ls` should list `hello.txt`. `nfs-cat` should print `hello from ubuntu##`.

Back on Ubuntu, in the second SSH session:

```bash
cat /srv/nfs/lab/from-kali.txt
```

That should print `hello from kali##`.

## Done

You are finished when all of these are true:

- `unfsd` on Ubuntu is serving `/srv/nfs/lab` to `192.168.200.0/24`.
- `nfs-cat` on Kali prints `hello from ubuntu##`.
- Ubuntu can read `/srv/nfs/lab/from-kali.txt`.
