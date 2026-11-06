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
    DocumentRoot /var/www/db.example.com

    <Directory /var/www/db.example.com>
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
UBUNTU_IP=$(ip -4 -o addr show dev veth-peer | awk '{print $4}' | cut -d/ -f1)
echo "$UBUNTU_IP"`,
  install: `sudo apt update
sudo apt install -y apache2`,
  site: `sudo mkdir -p /var/www/db.example.com
${tee("/var/www/db.example.com/index.html", indexHtml)}`,
  vhost: `${tee("/etc/apache2/sites-available/db.example.com.conf", vhost)}
sudo a2ensite db.example.com.conf
sudo systemctl reload apache2
curl -fsS -H 'Host: db.example.com' http://127.0.0.1/`,
  dns: `sudo tee /etc/dnsmasq.d/db.example.com.conf >/dev/null <<EOF
address=/db.example.com/\${UBUNTU_IP}
local=/db.example.com/
EOF
sudo systemctl restart dnsmasq
dig +short db.example.com @"$UBUNTU_IP"`,
  resolv: `# On Kali. Paste the Ubuntu address.
UBUNTU_IP=10.212.0.1
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
        Use the address this prints everywhere below. <code className="font-mono">10.212.0.1</code> is only a stand-in.
      </p>

      <Block title="2. Install Apache" where="Ubuntu" text={commands.install} />

      <Block
        title="3. Page"
        where="/var/www/db.example.com/index.html"
        text={commands.site}
      />

      <Block
        title="4. Virtual host"
        where="/etc/apache2/sites-available/db.example.com.conf"
        text={commands.vhost}
      />
      <p className="text-sm leading-6 text-muted-foreground">
        The curl should print the heading <code className="font-mono">db.example.com</code>.
      </p>

      <Block
        title="5. Name in dnsmasq"
        where="/etc/dnsmasq.d/db.example.com.conf"
        text={commands.dns}
      />
      <p className="text-sm leading-6 text-muted-foreground">
        <code className="font-mono">dig</code> should print the veth address.{" "}
        <code className="font-mono">local=</code> keeps <code className="font-mono">db.example.com</code> from being looked up on the Internet.
      </p>

      <Block title="6. resolv.conf" where="Kali · /etc/resolv.conf" text={commands.resolv} />
      <p className="text-sm leading-6 text-muted-foreground">
        Change <code className="font-mono">10.212.0.1</code> to the address from step 1 before you run it.
        The curl should print the same page. Then open <code className="font-mono">http://db.example.com</code> in the Kali browser.
        If the browser loads a different site, turn DNS over HTTPS off.
      </p>

      <section className="rounded-lg border border-border px-4 py-3 text-sm leading-6">
        <h2 className="font-heading text-xl">Files</h2>
        <ul className="mt-2 list-disc pl-5">
          <li><code className="font-mono">/var/www/db.example.com/index.html</code> on Ubuntu</li>
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
