export type Machine = "ubuntu" | "kali" | "either";

export type Block =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | {
      kind: "command";
      machine: Machine;
      title: string;
      code: string;
      note?: string;
    }
  | { kind: "expect"; text: string }
  | {
      kind: "callout";
      tone: "note" | "warning" | "ok";
      title: string;
      text: string;
    }
  | { kind: "files"; keys: "site" | "apache" | "dnsmasq" }
  | { kind: "repair"; title: string; blocks: Exclude<Block, { kind: "repair" }>[] }
  | { kind: "table"; headers: [string, string, string]; rows: [string, string, string][] };

export type Step = {
  id: string;
  n: string | null;
  title: string;
  goal: string;
  layer: string;
  blocks: Block[];
};

export const steps: Step[] = [
  {
    id: "link",
    n: "1",
    title: "Name both ends of veth-peer",
    goal: "Write down each machine’s IPv4 address and prove Kali can ping Ubuntu.",
    layer: "Link",
    blocks: [
      {
        kind: "p",
        text: "The web site is useless until packets can cross. Do this before you install anything. `veth-peer` is the interface the class already attached. Leave its address alone when it already has one.",
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Read Ubuntu’s address",
        code: `ip link show veth-peer
ip -4 addr show veth-peer
UBUNTU_VETH_IP=$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
printf 'Ubuntu veth-peer is %s\\n' "$UBUNTU_VETH_IP"`,
      },
      {
        kind: "expect",
        text: `Ubuntu veth-peer is 10.x.x.x

The address is whatever this host already uses. An empty line means the interface has no IPv4 address. Use the repair below. Do not invent a second address when one is already printed.`,
      },
      {
        kind: "command",
        machine: "kali",
        title: "Read Kali’s address and ping Ubuntu",
        code: `ip link show veth-peer
ip -4 addr show veth-peer
KALI_VETH_IP=$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
printf 'Kali veth-peer is %s\\n' "$KALI_VETH_IP"
# Replace the address with the one Ubuntu just printed.
export UBUNTU_VETH_IP="10.212.0.1"
ping -c 3 -W 2 "$UBUNTU_VETH_IP"`,
        note: "Change 10.212.0.1 before you ping. That number is only the stand-in for a link that had no address yet.",
      },
      {
        kind: "expect",
        text: `3 packets transmitted, 3 received, 0% packet loss

Write both addresses in the bench card at the top of this guide. You will compare Kali’s address with the Apache log at the end.`,
      },
      {
        kind: "repair",
        title: "Only if veth-peer has no IPv4 address",
        blocks: [
          {
            kind: "p",
            text: "Skip this when `ip -4 addr` already showed an address. These commands last until reboot. They use 10.212.0.0/30, which gives Ubuntu .1 and Kali .2.",
          },
          {
            kind: "command",
            machine: "ubuntu",
            title: "Assign the Ubuntu end",
            code: `sudo ip link set veth-peer up
sudo ip addr add 10.212.0.1/30 dev veth-peer
ip -4 addr show veth-peer
UBUNTU_VETH_IP=10.212.0.1`,
          },
          {
            kind: "command",
            machine: "kali",
            title: "Assign the Kali end and ping",
            code: `sudo ip link set veth-peer up
sudo ip addr add 10.212.0.2/30 dev veth-peer
ping -c 3 -W 2 10.212.0.1`,
          },
          {
            kind: "callout",
            tone: "warning",
            title: "Do not stack this on an address the image already set",
            text: "Two subnets on one veth is how a ping “succeeds” on the wrong address and the web site ends up published on an address Kali is not using. If the address disappears after a reboot, show the instructor `ip -br addr` and stop. Do not add a second netplan or NetworkManager profile on top of one you have not read.",
          },
        ],
      },
    ],
  },
  {
    id: "dns-now",
    n: "2",
    title: "Confirm the DNS Kali already uses",
    goal: "Prove dnsmasq on Ubuntu answers Kali, and that ordinary names still resolve, before you add example.com.",
    layer: "DNS",
    blocks: [
      {
        kind: "p",
        text: "Ubuntu is already the resolver for Kali. This step only looks. If ordinary names do not resolve, stop and tell the instructor. Fixing a broken resolver is a different lab, and the later checks will lie to you.",
      },
      {
        kind: "command",
        machine: "either",
        title: "Install dig if the shell cannot find it",
        code: `sudo apt update
sudo apt install -y bind9-dnsutils curl`,
        note: "Skip the install when `dig -v` already runs. Run it on each machine that needs it.",
      },
      {
        kind: "command",
        machine: "kali",
        title: "See who Kali asks",
        code: `dig +short debian.org
printf '--- resolv.conf ---\\n'
grep -E 'nameserver' /etc/resolv.conf || true
printf '--- resolvectl, if this Kali has it ---\\n'
resolvectl status veth-peer 2>/dev/null || true`,
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "See that dnsmasq is the process on port 53",
        code: `systemctl is-active dnsmasq
sudo ss -ulpn | awk 'NR==1 || /:53/'
dig +short debian.org @"$UBUNTU_VETH_IP"`,
      },
      {
        kind: "expect",
        text: `debian.org prints at least one address, both from Kali and from dig @Ubuntu.
systemctl prints: active
ss shows dnsmasq owning port 53.
Kali’s nameserver is Ubuntu’s veth address, or resolvectl lists that address under DNS Servers for veth-peer.

A stub address of 127.0.0.53 is fine when the upstream on that link is still Ubuntu. The dig you run against Ubuntu’s address is the one that must succeed.`,
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Stop here if debian.org does not resolve",
        text: "Do not edit dnsmasq yet. The class DNS path is already down, and adding example.com will not tell you whether you fixed it.",
      },
      {
        kind: "repair",
        title: "Only if dnsmasq.service is inactive",
        blocks: [
          {
            kind: "command",
            machine: "ubuntu",
            title: "Find the dnsmasq that is actually running",
            code: `ps -eo args | grep -E '[d]nsmasq'`,
          },
          {
            kind: "p",
            text: "If a dnsmasq process is running under NetworkManager, its drop-in directory is usually `/etc/NetworkManager/dnsmasq.d/`. In step 8, write the file there and run `sudo systemctl reload NetworkManager` instead of restarting `dnsmasq`. If no dnsmasq process exists, this image is not the one the lab was written for. Stop.",
          },
        ],
      },
    ],
  },
  {
    id: "apache",
    n: "3",
    title: "Install Apache and prove it listens",
    goal: "Have apache2 running on Ubuntu, bound to port 80, before any site file exists.",
    layer: "Listener",
    blocks: [
      {
        kind: "command",
        machine: "ubuntu",
        title: "Install and check the socket",
        code: `sudo apt update
sudo apt install -y apache2
systemctl is-active apache2
sudo ss -ltnp | awk 'NR==1 || /:80/'`,
      },
      {
        kind: "expect",
        text: `active
LISTEN ... 0.0.0.0:80 ... users:(("apache2",...

*:80 or 0.0.0.0:80 both mean every IPv4 address on Ubuntu, including veth-peer. You want that. A socket bound only to 127.0.0.1 would hide the site from Kali.`,
      },
      {
        kind: "callout",
        tone: "note",
        title: "apt on Ubuntu is not the same resolver Kali uses",
        text: "Ubuntu may resolve package mirrors through systemd-resolved. A failure of `apt update` is that path, not veth-peer. Kali can be resolving debian.org through dnsmasq while Ubuntu’s own apt is broken, or the other way around.",
      },
    ],
  },
  {
    id: "files",
    n: "4",
    title: "Put the site on disk",
    goal: "Create /var/www/example.com/public and fill it with North Pier Provisions.",
    layer: "Files",
    blocks: [
      {
        kind: "p",
        text: "The pages are a small chandlery called North Pier Provisions. The string `COM212-EXAMPLE-OK` is on the home page and in `health.txt`. That token is how you prove you reached this directory and not the public example.com.",
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Keep the files under /var/www",
        text: "Ubuntu confines Apache with AppArmor. The default profile can read `/var/www`. The same files in your home directory often produce `Permission denied` in the error log even when `chmod` looks right.",
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Create the document root",
        code: `sudo mkdir -p /var/www/example.com/public/css`,
      },
      {
        kind: "files",
        keys: "site",
      },
      {
        kind: "p",
        text: "Open each file, copy the command, and paste it on Ubuntu. The command is a quoted heredoc, so the shell writes the page exactly. After every file is in place, hand the tree to Apache’s user.",
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Owner and mode",
        code: `sudo chown -R www-data:www-data /var/www/example.com
sudo find /var/www/example.com -type d -exec chmod 755 {} \\;
sudo find /var/www/example.com -type f -exec chmod 644 {} \\;
sudo -u www-data test -r /var/www/example.com/public/index.html && echo 'www-data can read the site'
sudo -u www-data test -r /var/www/example.com/public/css/site.css && echo 'www-data can read the stylesheet'`,
      },
      {
        kind: "expect",
        text: `www-data can read the site
www-data can read the stylesheet`,
      },
    ],
  },
  {
    id: "vhost",
    n: "5",
    title: "Add the example.com virtual host",
    goal: "Teach Apache which directory to use when the Host header is example.com.",
    layer: "Virtual host",
    blocks: [
      {
        kind: "p",
        text: "Apache can serve many sites from one port. It picks the block whose `ServerName` or `ServerAlias` matches the Host header. The default site stays enabled on purpose, so you can see the difference between a request by IP and a request by name.",
      },
      {
        kind: "files",
        keys: "apache",
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Enable the site and reload",
        code: `sudo a2ensite example.com.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
sudo apache2ctl -S`,
      },
      {
        kind: "expect",
        text: `Syntax OK
port 80 namevhost example.com (/etc/apache2/sites-enabled/example.com.conf:1)

The default site is still listed as another namevhost on port 80. That is what you want.`,
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Do not reload a config that failed configtest",
        text: "`Syntax OK` is the line that matters. `AH00558` complaining that it could not determine a fully qualified domain name is a warning. It can sit above Syntax OK. Leave it. Any other error names a line. Fix that line and run configtest again.",
      },
    ],
  },
  {
    id: "host-header",
    n: "6",
    title: "Prove the virtual host on Ubuntu",
    goal: "Show that the Host header, not DNS, chooses the site.",
    layer: "Virtual host",
    blocks: [
      {
        kind: "p",
        text: "DNS is still unchanged. Curl on Ubuntu will send a Host header you type by hand. One request hits the default site. The next hits North Pier Provisions. Same IP, same daemon.",
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Default host, then example.com",
        code: `curl -fsS -H 'Host: example.com' http://127.0.0.1/health.txt
printf '\\n--- raw IP, no Host override ---\\n'
curl -fsS http://127.0.0.1/ | grep -E '<title>|Apache2 Ubuntu Default|North Pier' | head
printf '\\n--- Host: example.com ---\\n'
curl -fsS -H 'Host: example.com' http://127.0.0.1/ | grep -E '<title>|North Pier|COM212-EXAMPLE-OK' | head`,
      },
      {
        kind: "expect",
        text: `COM212-EXAMPLE-OK

The first page grep mentions the Apache2 Ubuntu Default Page.
The second mentions North Pier Provisions and COM212-EXAMPLE-OK.

If 127.0.0.1 refuses the connection, Apache is not listening there. Repeat the health check against the veth address: curl -fsS -H 'Host: example.com' http://$UBUNTU_VETH_IP/health.txt`,
      },
      {
        kind: "callout",
        tone: "ok",
        title: "This is the whole virtual-host idea",
        text: "A browser hides the Host header inside the URL. Curl makes it visible. When Kali later asks for http://example.com, it will send the same header you just set with -H.",
      },
    ],
  },
  {
    id: "across",
    n: "7",
    title: "Cross the veth by IP",
    goal: "From Kali, fetch the lab token using Ubuntu’s address and an explicit Host header.",
    layer: "Path",
    blocks: [
      {
        kind: "p",
        text: "Still no DNS change. Kali connects to the address you recorded and tells Apache the host name. If this works, the link, the listener, the files, and the virtual host are done. Whatever fails after this step is a name, not the web server.",
      },
      {
        kind: "command",
        machine: "kali",
        title: "Fetch health.txt by address",
        note: "UBUNTU_VETH_IP must still be the address you exported in step 1.",
        code: `curl -4 -fsS -H 'Host: example.com' "http://\${UBUNTU_VETH_IP}/health.txt"`,
      },
      {
        kind: "expect",
        text: "COM212-EXAMPLE-OK",
      },
      {
        kind: "repair",
        title: "Only if Kali cannot connect and Ubuntu’s own curl worked",
        blocks: [
          {
            kind: "command",
            machine: "ubuntu",
            title: "Look at the firewall without opening anything new",
            code: `sudo ufw status verbose`,
          },
          {
            kind: "p",
            text: "If the status is `inactive`, do not enable UFW. Go back to `ss` and the address Kali pinged. If the status is `active` and port 80 is not allowed on veth-peer, add one rule scoped to that interface.",
          },
          {
            kind: "command",
            machine: "ubuntu",
            title: "Allow port 80 on veth-peer only",
            code: `sudo ufw allow in on veth-peer to any port 80 proto tcp comment 'COM212 example.com'
sudo ufw status`,
          },
          {
            kind: "callout",
            tone: "warning",
            title: "Do not flush the firewall",
            text: "Do not run `ufw disable`, `iptables -F`, or `nft flush ruleset`. Those commands drop every rule, not just the one in front of port 80. If UFW is inactive and Kali still cannot connect, show the instructor `sudo nft list ruleset` and `sudo ss -ltnp`.",
          },
        ],
      },
    ],
  },
  {
    id: "publish-name",
    n: "8",
    title: "Publish example.com in dnsmasq",
    goal: "Make example.com and www.example.com resolve to Ubuntu, and keep every other name working.",
    layer: "DNS",
    blocks: [
      {
        kind: "p",
        text: "`example.com` is a real name on the public Internet. The famous page titled Example Domain is that site. From dnsmasq 2.86 onward, an `address=` line with an IPv4 answer applies to A queries only. AAAA queries are forwarded upstream unless you also mark the name local. A browser will happily follow a public AAAA and show you the Internet.",
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Confirm the address, then write the drop-in",
        note: "The heredoc is unquoted so the shell inserts your address. If dnsmasq is the NetworkManager process from step 2, change the path to /etc/NetworkManager/dnsmasq.d/example.com.conf.",
        code: `printf 'writing address %s\\n' "$UBUNTU_VETH_IP"
sudo tee /etc/dnsmasq.d/example.com.conf >/dev/null <<EOF
# COM212 — keep example.com inside this dnsmasq.
address=/example.com/\${UBUNTU_VETH_IP}
local=/example.com/
EOF
sudo cat /etc/dnsmasq.d/example.com.conf`,
      },
      {
        kind: "expect",
        text: `The file must contain your veth address, for example:
address=/example.com/10.212.0.1
local=/example.com/

If you can see the characters \${UBUNTU_VETH_IP} in the file, the variable was empty. Set it again and rerun the tee. Do not leave the dollar sign in the file.`,
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Test, restart, and compare A, AAAA, and an unrelated name",
        code: `sudo dnsmasq --test
sudo systemctl restart dnsmasq
systemctl is-active dnsmasq
printf '--- A ---\\n'
dig +short A example.com @"$UBUNTU_VETH_IP"
printf '--- AAAA (must print nothing) ---\\n'
dig +short AAAA example.com @"$UBUNTU_VETH_IP"
printf '--- www ---\\n'
dig +short A www.example.com @"$UBUNTU_VETH_IP"
printf '--- debian.org must still resolve ---\\n'
dig +short debian.org @"$UBUNTU_VETH_IP"`,
        note: "If step 2 found NetworkManager’s dnsmasq, reload that instead: sudo systemctl reload NetworkManager",
      },
      {
        kind: "expect",
        text: `dnsmasq: syntax check OK.
active
A and www print Ubuntu’s veth address.
AAAA prints a blank line.
debian.org still prints at least one address.

A public address such as 93.184.216.34 means the query left the lab. The drop-in is not loaded, or local= is missing.`,
      },
      {
        kind: "callout",
        tone: "warning",
        title: "If debian.org goes empty, undo the drop-in",
        text: "Kali is using this resolver for everything, not only for the lab name. Put the old behavior back before you experiment further: sudo rm -f /etc/dnsmasq.d/example.com.conf && sudo systemctl restart dnsmasq. Then dig debian.org again. Ask the instructor before you try a different recipe.",
      },
      {
        kind: "repair",
        title: "Only if the file is right but dig still returns the public address",
        blocks: [
          {
            kind: "command",
            machine: "ubuntu",
            title: "See whether dnsmasq reads /etc/dnsmasq.d",
            code: `grep -n 'conf-dir=' /etc/dnsmasq.conf || echo 'no conf-dir line'`,
          },
          {
            kind: "p",
            text: "Ubuntu’s package usually has `conf-dir=/etc/dnsmasq.d/,*.conf`. If grep printed `no conf-dir line`, add it once. If a conf-dir line already exists, do not add another. Reread step 2: the running dnsmasq may be using a different directory.",
          },
          {
            kind: "command",
            machine: "ubuntu",
            title: "Add conf-dir only when it is absent",
            code: `printf '\\nconf-dir=/etc/dnsmasq.d/,*.conf\\n' | sudo tee -a /etc/dnsmasq.conf >/dev/null
sudo dnsmasq --test
sudo systemctl restart dnsmasq
dig +short A example.com @"$UBUNTU_VETH_IP"`,
          },
        ],
      },
      {
        kind: "files",
        keys: "dnsmasq",
      },
    ],
  },
  {
    id: "browse",
    n: "9",
    title: "Open http://example.com from Kali",
    goal: "Resolve the name with Kali’s normal resolver, then fetch the site by name.",
    layer: "Name",
    blocks: [
      {
        kind: "command",
        machine: "kali",
        title: "Flush, resolve, then curl by name",
        code: `resolvectl flush-caches 2>/dev/null || true
dig example.com
printf '--- AAAA (must print nothing) ---\\n'
dig +short AAAA example.com
curl -4 -fsS http://example.com/health.txt
curl -fsS http://example.com/ | grep -o 'COM212-EXAMPLE-OK'
curl -fsS -o /dev/null -w '%{http_code} %{url_effective}\\n' http://www.example.com/
curl -fsS -o /dev/null -w 'css %{http_code}\\n' http://example.com/css/site.css
curl -s -o /dev/null -w 'missing %{http_code}\\n' http://example.com/not-a-crate`,
      },
      {
        kind: "expect",
        text: `dig ANSWER is Ubuntu’s veth address.
The SERVER line is Ubuntu’s address, or 127.0.0.53 when a stub resolver sits in front. The answer must still be the veth address, not a public one.
AAAA is empty.
health.txt prints COM212-EXAMPLE-OK.
grep prints COM212-EXAMPLE-OK.
www.example.com prints: 200 http://www.example.com/
css prints: css 200
missing prints: missing 404`,
      },
      {
        kind: "p",
        text: "Then use a browser on Kali. Turn DNS over HTTPS off first, or the browser will ignore the lab resolver.",
      },
      {
        kind: "ul",
        items: [
          "Firefox: Settings → Privacy & Security → DNS over HTTPS → Off.",
          "Chrome or Chromium: Settings → Privacy and security → Security → Use secure DNS → Off.",
          "Open http://example.com, http://www.example.com, and http://example.com/catalog.html.",
          "Open http://example.com/not-a-crate and confirm the North Pier 404, not Apache’s default error font.",
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Three pages people mix up",
        text: "North Pier Provisions is this lab. “Apache2 Ubuntu Default Page” means the Host header missed the virtual host — you probably opened the raw IP. “Example Domain”, with the sentence about illustrative examples, is the public Internet. Curl can be right while the browser is wrong when DNS over HTTPS is still on.",
      },
      {
        kind: "callout",
        tone: "note",
        title: "Do not “fix” this with /etc/hosts on Kali",
        text: "A hosts entry would make one machine work and leave dnsmasq untested. Use it only as a diagnosis: if the hosts entry works and dig does not, the failure is DNS. Remove the hosts entry before you call the lab done.",
      },
    ],
  },
  {
    id: "logs",
    n: "10",
    title: "Find Kali in the access log",
    goal: "Show that the request which printed the token came from Kali’s veth address.",
    layer: "Evidence",
    blocks: [
      {
        kind: "command",
        machine: "ubuntu",
        title: "Read the log before the next request",
        code: `sudo tail -n 5 /var/log/apache2/example.com-access.log`,
      },
      {
        kind: "command",
        machine: "kali",
        title: "Make two requests by name",
        code: `curl -fsS http://example.com/health.txt
curl -fsS -o /dev/null http://example.com/catalog.html`,
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Read the new lines",
        code: `sudo tail -n 5 /var/log/apache2/example.com-access.log`,
      },
      {
        kind: "expect",
        text: `The new lines start with Kali’s veth address from step 1. You should see GET /health.txt and GET /catalog.html, status 200.

127.0.0.1 means the curl ran on Ubuntu. Run it again on Kali.
An empty file means the request never hit this virtual host. The default site logs to /var/log/apache2/access.log instead.`,
      },
    ],
  },
  {
    id: "handin",
    n: "11",
    title: "What to hand in",
    goal: "Collect the four pieces that show the name, the page, and the client address.",
    layer: "Sign-off",
    blocks: [
      {
        kind: "ul",
        items: [
          "From Kali, the full output of `dig example.com`, including the ANSWER and the SERVER line.",
          "A browser screenshot on Kali. The address bar shows http://example.com and the page is North Pier Provisions, with the token COM212-EXAMPLE-OK visible.",
          "One new line from `/var/log/apache2/example.com-access.log` whose first field is Kali’s veth address.",
          "One sentence: Apache chose this directory because the Host header was example.com.",
        ],
      },
      {
        kind: "p",
        text: "The addresses you typed in the bench card should match the dig answer (Ubuntu) and the first field of the log line (Kali). If they do not, the screenshot and the log are from different paths.",
      },
    ],
  },
  {
    id: "trouble",
    n: null,
    title: "If a check does not match",
    goal: "Decide which layer failed before changing another one.",
    layer: "Repair",
    blocks: [
      {
        kind: "p",
        text: "Change one layer at a time, and rerun the check that belongs to that layer. Skipping ahead turns two small mistakes into one long one.",
      },
      {
        kind: "table",
        headers: ["What you see", "Layer", "Do this"],
        rows: [
          [
            "ping across veth-peer fails",
            "Link",
            "Repeat step 1. Do not install or edit anything else.",
          ],
          [
            "debian.org did not resolve before you started",
            "Existing DNS",
            "Stop and ask. Do not add example.com on top of a dead resolver.",
          ],
          [
            "Host-header curl on Ubuntu fails",
            "Apache or files",
            "configtest, apache2ctl -S, and the www-data read test in step 4.",
          ],
          [
            "Ubuntu curl works, Kali curl by IP fails",
            "Firewall or the address",
            "Step 7 repair. Compare the address to the one you pinged.",
          ],
          [
            "dig example.com returns a public address",
            "dnsmasq",
            "Read the drop-in. You need both address= and local=, then a restart.",
          ],
          [
            "AAAA prints an address",
            "dnsmasq",
            "local=/example.com/ is missing or the service was not restarted.",
          ],
          [
            "curl by IP works, curl by name does not",
            "Client resolver",
            "dig, resolv.conf, and flush-caches. Not Apache.",
          ],
          [
            "curl works, the browser shows Example Domain",
            "DNS over HTTPS",
            "Turn secure DNS off. The browser is not using dnsmasq.",
          ],
          [
            "Apache2 Ubuntu Default Page",
            "Host header",
            "The address bar is a raw IP, or ServerName does not match.",
          ],
          [
            "Permission denied in example.com-error.log",
            "Files",
            "Confirm the path is under /var/www and www-data can read it.",
          ],
          [
            "The log line starts with 127.0.0.1",
            "Which host ran curl",
            "Run the curl on Kali again.",
          ],
        ],
      },
    ],
  },
  {
    id: "cleanup",
    n: null,
    title: "Put the bench back",
    goal: "Remove the lab site and the name override so example.com is no longer pointed at Ubuntu.",
    layer: "Cleanup",
    blocks: [
      {
        kind: "p",
        text: "Do this when the instructor says the lab is over. Leave the apache2 package installed. The part that must go is the name override: while it is loaded, this Ubuntu answers example.com for every client using its dnsmasq.",
      },
      {
        kind: "command",
        machine: "ubuntu",
        title: "Disable the site and drop the name",
        code: `sudo a2dissite example.com.conf
sudo systemctl reload apache2
sudo rm -f /etc/dnsmasq.d/example.com.conf
sudo systemctl restart dnsmasq
sudo rm -rf /var/www/example.com
dig +short debian.org @"$UBUNTU_VETH_IP"
dig +short A example.com @"$UBUNTU_VETH_IP"`,
        note: "If you wrote the drop-in under /etc/NetworkManager/dnsmasq.d/, remove that file and run sudo systemctl reload NetworkManager instead of restarting dnsmasq.",
      },
      {
        kind: "expect",
        text: `debian.org still resolves.
example.com no longer returns Ubuntu’s veth address. A public answer, or no local answer, is the cleared state.

Do not delete the address the class image put on veth-peer. Only remove 10.212.0.1/30 if you added it yourself in the step 1 repair, with: sudo ip addr del 10.212.0.1/30 dev veth-peer on Ubuntu and the matching .2 command on Kali.`,
      },
    ],
  },
];
