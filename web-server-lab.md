# COM212 lab: web server

Finish the [DHCP lab](dhcp-lab.md) first. Ubuntu is `192.168.200.1/24` on `veth-peer`. dnsmasq is already leasing `192.168.200.50`–`192.168.200.150`, and Kali already uses `192.168.200.1` as its nameserver.

Do not change those addresses. Do not replace `/etc/resolv.conf` on Kali. Do not remove `/etc/dnsmasq.d/dhcp.conf`.

The Apache site you enable is `example.com`. The name `www` is a DNS record on that name, not a second site. When you are done, Kali opens `http://www.example.com` and gets the page served by Apache on Ubuntu.

These machines are containers. They do not have `systemctl`. Use `service`.

## 1. Check the DHCP lab

On Kali:

```bash
ip -4 addr show veth-peer
cat /etc/resolv.conf
ping -c 3 192.168.200.1
```

Stop here if the address is not in `192.168.200.50`–`192.168.200.150`, the nameserver is not `192.168.200.1`, or ping gets no reply. Go back to the DHCP lab.

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

On Ubuntu, add the name to the dnsmasq that is already serving DHCP. `/etc/dnsmasq.hosts` is the address record for `example.com`. The `cname` line is the `www` record.

Keep `/etc/dnsmasq.hosts` out of `/etc/dnsmasq.d`. dnsmasq reads every file in that directory as configuration.

```bash
printf '192.168.200.1 example.com\n' | sudo tee /etc/dnsmasq.hosts
sudo tee /etc/dnsmasq.d/example.com.conf >/dev/null <<'EOF'
addn-hosts=/etc/dnsmasq.hosts
cname=www.example.com,example.com
EOF
cat /etc/dnsmasq.d/dhcp.conf /etc/dnsmasq.hosts /etc/dnsmasq.d/example.com.conf
sudo dnsmasq --test
sudo service dnsmasq stop
if pidof dnsmasq >/dev/null 2>&1; then sudo kill -9 $(pidof dnsmasq); fi
pidof dnsmasq || echo stopped
sudo service dnsmasq start
dig example.com @192.168.200.1
dig www.example.com @192.168.200.1
```

`cat` must still show the DHCP range from the DHCP lab, plus `192.168.200.1 example.com` and the `cname` line.

`echo stopped` must appear before `service dnsmasq start`. A new hosts file or CNAME is read when dnsmasq starts. `kill -HUP` only clears the cache. It does not load this file.

`dig example.com` should return `192.168.200.1`. `dig www.example.com` should show a CNAME to `example.com` and that same address.

## 6. Open the page from Kali

On Kali, the nameserver is already `192.168.200.1` from the DHCP lease. Do not rewrite `/etc/resolv.conf`.

```bash
getent hosts www.example.com
curl -fsS http://www.example.com
```

`getent` should print `192.168.200.1` and `www.example.com`. `curl` should print the heading `www.example.com`.

`dig`, `host`, and `nslookup` on this Kali abort with `uv.c:142` and `RUNTIME_CHECK(fd >= 0)` before they send a query. Skip them. `getent` and `curl` are the checks.

Then open `http://www.example.com` in the Kali browser. If the browser loads a different site, turn DNS over HTTPS off.

## Done

You are finished when all of these are true:

- `/etc/dnsmasq.d/dhcp.conf` is still the DHCP range from the DHCP lab.
- `a2ensite` enabled `example.com` only.
- `dig` on Ubuntu shows `www.example.com` as a CNAME for `example.com`.
- From Kali, `curl http://www.example.com` prints the page.
