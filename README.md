# COM212 web server lab

A bench guide for serving **example.com** from Apache on Ubuntu and opening it from Kali.

Ubuntu and Kali already share the interface `veth-peer`. Ubuntu already answers DNS for Kali with dnsmasq. The lab adds a name-based virtual host and one local DNS record so Kali can open `http://example.com`.

The guide runs in the browser. The commands run on the two Linux machines. This app does not log into them.

## Run the guide

```bash
npm install
npm run dev
```

The dev server listens on port **3847**. Open the guide, follow the steps in order, and use **Site preview** to see North Pier Provisions before you copy it.

Checks and the two addresses you type stay in that browser’s local storage.

## What you copy onto Ubuntu

| Path in this repo | Where it goes |
| --- | --- |
| `lab/site/` | `/var/www/example.com/public/` |
| `lab/apache/example.com.conf` | `/etc/apache2/sites-available/example.com.conf` |
| `lab/dnsmasq/example.com.conf` | Reference only. The guide writes `/etc/dnsmasq.d/example.com.conf` with the veth address you measured. The copy in the repo uses `10.212.0.1`. |

`example.com` is a real public name. The dnsmasq drop-in uses both `address=` and `local=` so AAAA queries are not forwarded to the Internet. Without `local=`, a browser can open the public Example Domain page instead of the lab site.

## Done when

On Kali:

- `dig example.com` answers with Ubuntu’s veth-peer address
- `curl -fsS http://example.com/health.txt` prints `COM212-EXAMPLE-OK`
- The browser shows North Pier Provisions, not the Apache default page and not the public Example Domain page

On Ubuntu, `/var/log/apache2/example.com-access.log` shows Kali’s veth address.
