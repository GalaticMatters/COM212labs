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
local=/db.example.com/
EOF
cat /etc/dnsmasq.d/db.example.com.conf
sudo dnsmasq --test
sudo service dnsmasq stop
sudo kill \$(pidof dnsmasq) 2>/dev/null || true
pidof dnsmasq || echo stopped
sudo service dnsmasq start
dig +short db.example.com @"$UBUNTU_IP"
fi`,
  resolv: `# On Kali. Skip the add if ip -4 addr show veth-peer already shows an address.
if ! ip -4 -o addr show dev veth-peer | grep -q .; then
  sudo ip addr add 10.212.0.2/30 dev veth-peer
fi
# Set UBUNTU_IP to the address Ubuntu printed (echo "$UBUNTU_IP").
# 10.212.0.1 is only correct when Ubuntu had no address and the guide added 10.212.0.1/30.
UBUNTU_IP=
sudo rm -f /etc/resolv.conf
printf 'nameserver %s\\n' "$UBUNTU_IP" | sudo tee /etc/resolv.conf
ping -c 3 "$UBUNTU_IP"
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
        HUP does not load a new address= line.{" "}
        <code className="font-mono">echo stopped</code> must appear before{" "}
        <code className="font-mono">sudo service dnsmasq start</code>.
        If start says port 53 is in use, kill the pid that{" "}
        <code className="font-mono">pidof dnsmasq</code> prints and start once more.
        Do not use force-reload.{" "}
        <code className="font-mono">sudo dnsmasq --test</code> prints a syntax error before the stop.
        A bad file usually contains a blank address or the literal characters <code className="font-mono">{"${UBUNTU_IP}"}</code>.{" "}
        If veth-peer has no IPv4, the block adds <code className="font-mono">10.212.0.1/30</code> and reads it again.
        <code className="font-mono">{'echo "$UBUNTU_IP"'}</code> must print the veth address before tee.
        The file is written only when that value is non-empty.
        Then <code className="font-mono">cat /etc/dnsmasq.d/db.example.com.conf</code> must show{" "}
        <code className="font-mono">address=/db.example.com/</code> followed by that numeric address.{" "}
        <code className="font-mono">dig</code> should print the veth address.{" "}
        <code className="font-mono">local=</code> keeps <code className="font-mono">db.example.com</code> from being looked up on the Internet.
      </p>

      <Block title="6. resolv.conf" where="Kali · /etc/resolv.conf" text={commands.resolv} />
      <p className="text-sm leading-6 text-muted-foreground">
        Skip the add if <code className="font-mono">ip -4 addr show veth-peer</code> already shows an address.
        Set <code className="font-mono">UBUNTU_IP</code> to the address Ubuntu printed with{" "}
        <code className="font-mono">{'echo "$UBUNTU_IP"'}</code>.{" "}
        <code className="font-mono">10.212.0.1</code> is only correct when Ubuntu had no address and the guide added{" "}
        <code className="font-mono">10.212.0.1/30</code>.
        That printed address is the nameserver in <code className="font-mono">/etc/resolv.conf</code>.
        The curl should print the same page. Then open <code className="font-mono">http://db.example.com</code> in the Kali browser.
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
          The same files are in this repo under <code className="font-mono">lab/</code>. The copies there use <code className="font-mono">10.212.0.1</code>. The commands above write your real address into dnsmasq and resolv.conf.
        </p>
      </section>
    </main>
  );
}
