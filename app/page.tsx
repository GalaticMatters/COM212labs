import { CopyButton } from "@/components/copy-button";

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>db.example.com</title>
</head>
<body>
  <h1>db.example.com</h1>
  <p>Apache on Ubuntu is serving this page.</p>
</body>
</html>
`;

const vhost = `<VirtualHost *:80>
    ServerName db.example.com
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Require all granted
        Options -Indexes
        AllowOverride None
    </Directory>
</VirtualHost>
`;

function tee(path: string, contents: string) {
  const body = contents.endsWith("\n") ? contents : `${contents}\n`;
  return `sudo tee ${path} >/dev/null <<'EOF'\n${body}EOF`;
}

const commands = {
  address: `ip -4 addr show veth-peer
UBUNTU_IP=\$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
if [ -z "$UBUNTU_IP" ]; then
  sudo ip addr add 10.212.0.1/30 dev veth-peer
fi
UBUNTU_IP=\$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
echo "$UBUNTU_IP"`,
  install: `sudo apt update
sudo apt install -y apache2
sudo service apache2 start`,
  site: tee("/var/www/html/index.html", indexHtml),
  vhost: `${tee("/etc/apache2/sites-available/db.example.com.conf", vhost)}
sudo a2ensite db.example.com.conf
sudo apache2ctl configtest
sudo service apache2 restart
ss -ltn | grep ':80'
curl -fsS -H 'Host: db.example.com' http://127.0.0.1/`,
  dns: `UBUNTU_IP=\$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
if [ -z "$UBUNTU_IP" ]; then
  sudo ip addr add 10.212.0.1/30 dev veth-peer
fi
UBUNTU_IP=\$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
echo "$UBUNTU_IP"
if [ -n "$UBUNTU_IP" ]; then
sudo tee /etc/dnsmasq.d/db.example.com.conf >/dev/null <<EOF
address=/db.example.com/\${UBUNTU_IP}
EOF
cat /etc/dnsmasq.d/db.example.com.conf
sudo dnsmasq --test
sudo service dnsmasq stop
if pidof dnsmasq >/dev/null 2>&1; then sudo kill -9 \$(pidof dnsmasq); fi
pidof dnsmasq || echo stopped
sudo service dnsmasq start
dig db.example.com @"$UBUNTU_IP"
fi`,
  resolv: `# On Kali. Use Ubuntu's subnet. 192.168.200.2/24 matches Ubuntu at 192.168.200.1/24.
# If the guide had to add 10.212.0.1/30 on Ubuntu, use 10.212.0.2/30 here instead.
sudo ip addr replace 192.168.200.2/24 dev veth-peer
# UBUNTU_IP must be the address Ubuntu printed with echo "\$UBUNTU_IP".
UBUNTU_IP=192.168.200.1
sudo rm -f /etc/resolv.conf
printf 'nameserver %s\\n' "\$UBUNTU_IP" | sudo tee /etc/resolv.conf
ping -c 3 "\$UBUNTU_IP"
getent hosts db.example.com
curl -fsS http://db.example.com`,
};

function Block({
  title,
  where,
  text,
}: {
  title: string;
  where: string;
  text: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <h2 className="font-heading text-xl leading-tight">{title}</h2>
          <p className="font-mono text-xs text-muted-foreground">{where}</p>
        </div>
        <CopyButton text={text} />
      </div>
      <pre className="overflow-x-auto px-3 py-3 font-mono text-sm leading-6 whitespace-pre-wrap">
        {text}
      </pre>
    </section>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header>
        <p className="text-sm font-semibold tracking-[0.16em] text-oxide uppercase">
          COM212
        </p>
        <h1 className="mt-1 font-heading text-4xl leading-tight">Web server</h1>
        <p className="mt-3 text-lg leading-7">
          Ubuntu and Kali already share <code className="font-mono">veth-peer</code>.
          Ubuntu already runs dnsmasq for Kali. Install Apache, serve{" "}
          <code className="font-mono">db.example.com</code>, and point Kali’s{" "}
          <code className="font-mono">resolv.conf</code> at Ubuntu.
        </p>
      </header>

      <Block title="1. Ubuntu address" where="Ubuntu" text={commands.address} />
      <p className="text-sm leading-6 text-muted-foreground">
        Use the address this prints everywhere below. eth0 and eth1 are other networks. Do not put the lab address on them. <code className="font-mono">ip addr add</code> lasts until the container stops.
      </p>

      <Block title="2. Install Apache" where="Ubuntu" text={commands.install} />

      <Block
        title="3. Page"
        where="/var/www/html/index.html"
        text={commands.site}
      />

      <Block
        title="4. Virtual host"
        where="/etc/apache2/sites-available/db.example.com.conf"
        text={commands.vhost}
      />
      <p className="text-sm leading-6 text-muted-foreground">
        The curl should print the heading <code className="font-mono">db.example.com</code>.
        If it says it failed to connect to port 80, Apache is not running. Run{" "}
        <code className="font-mono">sudo service apache2 start</code> and read{" "}
        <code className="font-mono">sudo tail /var/log/apache2/error.log</code>.
      </p>

      <Block
        title="5. Name in dnsmasq"
        where="/etc/dnsmasq.d/db.example.com.conf"
        text={commands.dns}
      />
      <p className="text-sm leading-6 text-muted-foreground">
        The file is one line: <code className="font-mono">address=/db.example.com/</code> followed by the veth address.{" "}
        <code className="font-mono">{'echo "$UBUNTU_IP"'}</code> must print that address before tee.
        If veth-peer has no IPv4, the block adds <code className="font-mono">10.212.0.1/30</code> and reads it again.
        <code className="font-mono">cat</code> must show that numeric address, never the literal characters <code className="font-mono">{"${UBUNTU_IP}"}</code>.{" "}
        <code className="font-mono">service dnsmasq stop</code> can say {'"(not running)"'} while a hand-started{" "}
        <code className="font-mono">dnsmasq --interface=veth-peer --bind-interfaces --no-daemon</code> still owns port 53.
        That process does not read <code className="font-mono">/etc/dnsmasq.d</code>, so queries come back NXDOMAIN and{" "}
        <code className="font-mono">dig +short</code> prints nothing.{" "}
        <code className="font-mono">sudo kill -9 $(pidof dnsmasq)</code> stops that shell job.
        Then <code className="font-mono">service dnsmasq start</code> reads the drop-in.{" "}
        <code className="font-mono">echo stopped</code> must appear before that start.
        Success is full dig status NOERROR, flag aa, and the A record equal to the veth address: flags{" "}
        <code className="font-mono">qr aa rd ra</code> and{" "}
        <code className="font-mono">db.example.com. 0 IN A 192.168.200.1</code>.
        An empty <code className="font-mono">dig +short</code> means there is still no A record.
      </p>

      <Block title="6. resolv.conf" where="Kali · /etc/resolv.conf" text={commands.resolv} />
      <p className="text-sm leading-6 text-muted-foreground">
        Ubuntu’s address is <code className="font-mono">192.168.200.1/24</code>. Kali needs an address in that subnet, such as{" "}
        <code className="font-mono">192.168.200.2/24</code>.{" "}
        <code className="font-mono">10.212.0.2/30</code> is only correct when Ubuntu had no IPv4 and the guide added{" "}
        <code className="font-mono">10.212.0.1/30</code>. Those two subnets do not reach each other.{" "}
        <code className="font-mono">UBUNTU_IP</code> must be the address Ubuntu printed with{" "}
        <code className="font-mono">{'echo "$UBUNTU_IP"'}</code>.{" "}
        <code className="font-mono">dig</code>, <code className="font-mono">host</code>, and <code className="font-mono">nslookup</code> abort on this Kali with{" "}
        <code className="font-mono">uv.c:142</code> and <code className="font-mono">RUNTIME_CHECK(fd &gt;= 0)</code>, including when{" "}
        <code className="font-mono">UV_USE_IO_URING=0</code> is set. That is libuv failing before any query. Skip them.{" "}
        <code className="font-mono">getent hosts db.example.com</code> should print{" "}
        <code className="font-mono">192.168.200.1</code> and curl should print the page.
        Then open <code className="font-mono">http://db.example.com</code> in the Kali browser.
        If the browser loads a different site, turn DNS over HTTPS off.
      </p>

      <section className="rounded-lg border border-border px-4 py-3 text-sm leading-6">
        <h2 className="font-heading text-xl">Files</h2>
        <ul className="mt-2 list-disc pl-5">
          <li><code className="font-mono">/var/www/html/index.html</code> on Ubuntu</li>
          <li><code className="font-mono">/etc/apache2/sites-available/db.example.com.conf</code> on Ubuntu</li>
          <li><code className="font-mono">/etc/dnsmasq.d/db.example.com.conf</code> on Ubuntu</li>
          <li><code className="font-mono">/etc/resolv.conf</code> on Kali</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          The same files are in this repo under <code className="font-mono">lab/</code>. The dnsmasq copy is one <code className="font-mono">address=/db.example.com/192.168.200.1</code> line. The Kali copy uses that same address as its nameserver.
        </p>
      </section>
    </main>
  );
}
