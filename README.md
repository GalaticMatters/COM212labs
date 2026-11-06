# COM212 web server lab

Ubuntu and Kali already share `veth-peer`. Ubuntu already runs dnsmasq for Kali.

This guide installs Apache on Ubuntu, serves `www.example.com`, and points Kali’s `resolv.conf` at Ubuntu.

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
| `/etc/apache2/sites-available/www.example.com.conf` | Ubuntu |
| `/etc/dnsmasq.d/www.example.com.conf` | Ubuntu |
| `/etc/resolv.conf` | Kali |

The dnsmasq copy in `lab/` is `address=/www.example.com/192.168.200.1`. The Kali copy uses that address as its nameserver.

Kali is done when `curl http://www.example.com` prints the page.
