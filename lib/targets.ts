export const LAB_FILE_KEYS = [
  "site/index.html",
  "site/about.html",
  "site/catalog.html",
  "site/visit.html",
  "site/404.html",
  "site/health.txt",
  "site/css/site.css",
  "apache/example.com.conf",
  "dnsmasq/example.com.conf",
] as const;

export type LabFileKey = (typeof LAB_FILE_KEYS)[number];

export const FILE_TARGETS: Record<LabFileKey, string> = {
  "site/index.html": "/var/www/example.com/public/index.html",
  "site/about.html": "/var/www/example.com/public/about.html",
  "site/catalog.html": "/var/www/example.com/public/catalog.html",
  "site/visit.html": "/var/www/example.com/public/visit.html",
  "site/404.html": "/var/www/example.com/public/404.html",
  "site/health.txt": "/var/www/example.com/public/health.txt",
  "site/css/site.css": "/var/www/example.com/public/css/site.css",
  "apache/example.com.conf": "/etc/apache2/sites-available/example.com.conf",
  "dnsmasq/example.com.conf": "/etc/dnsmasq.d/example.com.conf",
};

export const SITE_FILE_KEYS = [
  "site/index.html",
  "site/about.html",
  "site/catalog.html",
  "site/visit.html",
  "site/404.html",
  "site/health.txt",
  "site/css/site.css",
] as const satisfies readonly LabFileKey[];

export function teeCommand(destination: string, contents: string): string {
  const body = contents.endsWith("\n") ? contents : `${contents}\n`;
  return `sudo tee ${destination} >/dev/null <<'LABEOF'\n${body}LABEOF`;
}
