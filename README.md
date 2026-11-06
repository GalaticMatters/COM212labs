# COM212 web server lab

Ubuntu and Kali already share `veth-peer`. Ubuntu already runs dnsmasq for Kali.

This guide installs Apache on Ubuntu, serves `db.example.com`, and points Kali’s `resolv.conf` at Ubuntu.

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
| `/etc/apache2/sites-available/db.example.com.conf` | Ubuntu |
| `/etc/dnsmasq.d/db.example.com.conf` | Ubuntu |
| `/etc/resolv.conf` | Kali |

The dnsmasq copy in `lab/` is `address=/db.example.com/192.168.200.1`. The Kali copy uses `10.212.0.1` until you replace it with the address on `veth-peer`.

Kali is done when `curl http://db.example.com` prints the page.
