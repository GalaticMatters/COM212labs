# COM212 lab: NFS

Finish the [DHCP lab](dhcp-lab.md) first. `ubuntu##` is the NFS server. `kali##` is the NFS client. They already share `veth-peer`, and Ubuntu's address on that interface is `192.168.200.1`.

Do not export the share on `eth0` or `eth1`. Mount it over `veth-peer`.

These machines are containers. They do not have `systemctl`. Use `service`. The kernel cannot run `nfs-kernel-server`, so this lab uses `unfsd` from `unfs3`. One script installs that program. The lab is the export and the mount.

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

On Ubuntu, export that directory only to the `veth-peer` subnet. `no_root_squash` lets root on Kali write files in the share. `unfsd -d` stays in the foreground. Leave this session open.

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

## 4. Mount it on Kali

On `kali##`:

```bash
ping -c 3 192.168.200.1
sudo apt update
sudo apt install -y nfs-common
showmount -e 192.168.200.1
sudo mkdir -p /mnt/nfs
sudo mount -t nfs -o nfsvers=3,nolock,tcp 192.168.200.1:/srv/nfs/lab /mnt/nfs
mount | grep nfs
cat /mnt/nfs/hello.txt
printf 'hello from kali##\n' | sudo tee /mnt/nfs/from-kali.txt
ls -l /mnt/nfs
```

`ping` should get replies. `showmount` should list `/srv/nfs/lab`. `cat` should print `hello from ubuntu##`. `ls` should show both `hello.txt` and `from-kali.txt`.

Back on Ubuntu, in the second SSH session:

```bash
cat /srv/nfs/lab/from-kali.txt
```

That should print `hello from kali##`.

To disconnect the share on Kali:

```bash
sudo umount /mnt/nfs
```

## Done

You are finished when all of these are true:

- `unfsd` on Ubuntu is serving `/srv/nfs/lab` to `192.168.200.0/24`.
- Kali has that directory mounted at `/mnt/nfs`.
- Kali can read `hello.txt`, and Ubuntu can read `from-kali.txt`.
