export function Topology() {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-card">
      <svg
        viewBox="0 0 760 250"
        role="img"
        aria-labelledby="topo-title topo-desc"
        className="h-auto w-full"
      >
        <title id="topo-title">Kali and Ubuntu joined by veth-peer</title>
        <desc id="topo-desc">
          Kali sends a DNS query to dnsmasq on Ubuntu, receives Ubuntu’s veth
          address, then sends HTTP with Host example.com to Apache.
        </desc>
        <rect width="760" height="250" fill="#f7f1e6" />
        <rect x="28" y="36" width="230" height="176" rx="8" fill="#1d4740" />
        <text x="48" y="68" fill="#f3ecdf" fontFamily="Georgia, serif" fontSize="22">
          Kali
        </text>
        <text x="48" y="96" fill="#d5e4dc" fontFamily="ui-monospace, monospace" fontSize="13">
          client
        </text>
        <text x="48" y="132" fill="#f3ecdf" fontFamily="ui-sans-serif, sans-serif" fontSize="14">
          browser, dig, curl
        </text>
        <text x="48" y="158" fill="#f3ecdf" fontFamily="ui-sans-serif, sans-serif" fontSize="14">
          interface veth-peer
        </text>
        <text x="48" y="184" fill="#e7c7a8" fontFamily="ui-monospace, monospace" fontSize="13">
          your Kali address
        </text>

        <rect x="502" y="36" width="230" height="176" rx="8" fill="#2a241f" />
        <text x="522" y="68" fill="#f3ecdf" fontFamily="Georgia, serif" fontSize="22">
          Ubuntu
        </text>
        <text x="522" y="96" fill="#e7c7a8" fontFamily="ui-monospace, monospace" fontSize="13">
          server
        </text>
        <text x="522" y="128" fill="#f3ecdf" fontFamily="ui-sans-serif, sans-serif" fontSize="14">
          dnsmasq :53
        </text>
        <text x="522" y="152" fill="#f3ecdf" fontFamily="ui-sans-serif, sans-serif" fontSize="14">
          apache :80
        </text>
        <text x="522" y="176" fill="#f3ecdf" fontFamily="ui-sans-serif, sans-serif" fontSize="14">
          example.com vhost
        </text>
        <text x="522" y="198" fill="#e7c7a8" fontFamily="ui-monospace, monospace" fontSize="12">
          veth-peer
        </text>

        <line x1="258" y1="110" x2="502" y2="110" stroke="#a24d2e" strokeWidth="3" />
        <line x1="258" y1="146" x2="502" y2="146" stroke="#1d4740" strokeWidth="3" />
        <text x="292" y="100" fill="#6e3a28" fontFamily="ui-sans-serif, sans-serif" fontSize="13">
          1. DNS query
        </text>
        <text x="292" y="172" fill="#1d4740" fontFamily="ui-sans-serif, sans-serif" fontSize="13">
          2. HTTP Host: example.com
        </text>
      </svg>
      <figcaption className="grid gap-3 border-t border-border px-4 py-3 text-sm sm:grid-cols-2">
        <p>
          <span className="font-medium text-oxide">1. </span>
          Kali asks its resolver for example.com. dnsmasq on Ubuntu answers with Ubuntu’s own veth-peer address, and does not forward that name.
        </p>
        <p>
          <span className="font-medium text-sea">2. </span>
          Kali opens TCP port 80 to that address. The Host header selects the example.com virtual host, which reads /var/www/example.com/public.
        </p>
      </figcaption>
    </figure>
  );
}
