# COM212 lab: web server

Ubuntu and Kali already share the interface `veth-peer`. Ubuntu already runs dnsmasq for Kali. Do this lab on those two machines. Read each step and run it there. Do not download this repository.

When you are done, Kali opens `http://www.example.com` and gets the page served by Apache on Ubuntu.

The Apache site you enable is `example.com`. The name `www` is a DNS record on that name, not a second site.

These machines are containers. They do not have `systemctl`. Use `service`.

## 1. Ubuntu address

On Ubuntu, read the IPv4 address on `veth-peer`. `eth0` and `eth1` are other networks. Do not put the lab address on them.

```bash
ip -4 addr show veth-peer
UBUNTU_IP=$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
if [ -z "$UBUNTU_IP" ]; then
  sudo ip addr add 10.212.0.1/30 dev veth-peer
fi
UBUNTU_IP=$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
echo "$UBUNTU_IP"
```

Write down the address `echo` prints. The examples below use `192.168.200.1`, which is the address when `veth-peer` is `192.168.200.1/24`. If `veth-peer` had no IPv4 address, the command above added `10.212.0.1/30`, and that printed address is the one you use instead. `ip addr add` lasts until the container stops.

## 2. Install Apache

On Ubuntu:

```bash
sudo apt update
sudo apt install -y apache2
sudo service apache2 start
```

## 3. Page

On Ubuntu, replace `/var/www/html/index.html`:

```bash
sudo tee /var/www/html/index.html >/dev/null <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>www.example.com</title>
</head>
<body>
  <h1>www.example.com</h1>
  <p>Apache on Ubuntu is serving this page.</p>
</body>
</html>
EOF
```

## 4. Site example.com

On Ubuntu, the only site you enable is `example.com`. `ServerAlias www.example.com` lets that same site answer when the browser asks for `www.example.com`.

```bash
sudo tee /etc/apache2/sites-available/example.com.conf >/dev/null <<'EOF'
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Require all granted
        Options -Indexes
        AllowOverride None
    </Directory>
</VirtualHost>
EOF
sudo a2ensite example.com
sudo apache2ctl configtest
sudo service apache2 restart
curl -fsS -H 'Host: www.example.com' http://127.0.0.1/
```

The curl output should include the heading `www.example.com`. If curl says it failed to connect to port 80, Apache is not running. Run `sudo service apache2 start` and read `sudo tail /var/log/apache2/error.log`.

## 5. DNS record www

On Ubuntu, `/etc/dnsmasq.hosts` is the address record for `example.com`. The `cname` line is the `www` record, so the name Kali opens is `www.example.com`.

Keep `/etc/dnsmasq.hosts` out of `/etc/dnsmasq.d`. dnsmasq reads every file in that directory as configuration.

```bash
UBUNTU_IP=$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
echo "$UBUNTU_IP"
printf '%s example.com\n' "$UBUNTU_IP" | sudo tee /etc/dnsmasq.hosts
sudo tee /etc/dnsmasq.d/example.com.conf >/dev/null <<'EOF'
addn-hosts=/etc/dnsmasq.hosts
cname=www.example.com,example.com
EOF
cat /etc/dnsmasq.hosts /etc/dnsmasq.d/example.com.conf
sudo dnsmasq --test
sudo service dnsmasq stop
if pidof dnsmasq >/dev/null 2>&1; then sudo kill -9 $(pidof dnsmasq); fi
pidof dnsmasq || echo stopped
sudo service dnsmasq start
dig example.com @"$UBUNTU_IP"
dig www.example.com @"$UBUNTU_IP"
```

`echo "$UBUNTU_IP"` must print the veth address before `tee`. `cat /etc/dnsmasq.hosts` must show that address next to `example.com`.

`echo stopped` must appear before `service dnsmasq start`. A new hosts file or CNAME is read when dnsmasq starts. `kill -HUP` only clears the cache. It does not load this file.

`service dnsmasq stop` can say `(not running)` while a hand-started `dnsmasq --interface=veth-peer --no-daemon` still owns port 53. That process does not read `/etc/dnsmasq.d`. The `kill` line stops it.

`dig example.com` should return your veth address. `dig www.example.com` should show a CNAME to `example.com` and that same address.

## 6. Kali

On Kali, put an address on `veth-peer` in Ubuntu's subnet, and point `resolv.conf` at the address Ubuntu printed.

If Ubuntu printed `192.168.200.1`, Kali uses `192.168.200.2/24`. Use `10.212.0.2/30` only when step 1 added `10.212.0.1/30` on Ubuntu. Those two subnets do not reach each other.

```bash
sudo ip addr replace 192.168.200.2/24 dev veth-peer
UBUNTU_IP=192.168.200.1
sudo rm -f /etc/resolv.conf
printf 'nameserver %s\n' "$UBUNTU_IP" | sudo tee /etc/resolv.conf
ping -c 3 "$UBUNTU_IP"
getent hosts www.example.com
curl -fsS http://www.example.com
```

`ping` should get replies. `getent` should print the Ubuntu address and `www.example.com`. `curl` should print the heading `www.example.com`.

`dig`, `host`, and `nslookup` on this Kali abort with `uv.c:142` and `RUNTIME_CHECK(fd >= 0)` before they send a query. Skip them. `getent` and `curl` are the checks.

Then open `http://www.example.com` in the Kali browser. If the browser loads a different site, turn DNS over HTTPS off.

## Done

You are finished when all of these are true:

- `a2ensite` enabled `example.com` only.
- `dig` on Ubuntu shows `www.example.com` as a CNAME for `example.com`.
- From Kali, `curl http://www.example.com` prints the page.
