# COM212 web server lab

Ubuntu and Kali already share `veth-peer`. Ubuntu already runs dnsmasq for Kali.

This guide installs Apache on Ubuntu, enables the `example.com` site, adds a DNS record `www`, and points Kali’s `resolv.conf` at Ubuntu.

## Run the guide

```bash
npm install
npm run dev
```

The dev server listens on port **3847**.

## Files the lab writes

| File | Machine |
| --- | --- |
| `/var/www/html/index.html` | Ubuntu |
| `/etc/apache2/sites-available/example.com.conf` | Ubuntu |
| `/etc/dnsmasq.hosts` | Ubuntu |
| `/etc/dnsmasq.d/example.com.conf` | Ubuntu |
| `/etc/resolv.conf` | Kali |

`a2ensite example.com` enables the site. `ServerAlias www.example.com` is that same site. The hosts file is the A record for `example.com`. `cname=www.example.com,example.com` is the www record. The Kali copy uses `192.168.200.1` as its nameserver.

Kali is done when `curl http://www.example.com` prints the page.
