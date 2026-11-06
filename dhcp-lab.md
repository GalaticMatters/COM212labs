# COM212 lab: DHCP

Ubuntu and Kali already share the interface `veth-peer`. Ubuntu will hand Kali an address with dnsmasq. Kali will use Ubuntu as its DNS server.

These machines are containers. They do not have `systemctl`. Use `service`.

When you are done, Kali has an address in `192.168.200.50`–`192.168.200.150`, can ping `192.168.200.1`, and its nameserver is `192.168.200.1`.

## 1. Ubuntu address

On Ubuntu, `eth0` and `eth1` are other networks. Do not put the lab address on them.

```bash
sudo ip link set veth-peer up
sudo ip addr replace 192.168.200.1/24 dev veth-peer
ip -4 addr show veth-peer
```

`veth-peer` should show `192.168.200.1/24`.

## 2. DHCP server

On Ubuntu, dnsmasq listens only on `veth-peer` and leases `192.168.200.50`–`192.168.200.150` for 12 hours. Kali's nameserver will be `192.168.200.1`.

```bash
sudo tee /etc/dnsmasq.d/dhcp.conf >/dev/null <<'EOF'
interface=veth-peer
bind-interfaces
dhcp-range=192.168.200.50,192.168.200.150,12h
log-dhcp
EOF
sudo dnsmasq --test
sudo service dnsmasq stop
if pidof dnsmasq >/dev/null 2>&1; then sudo kill -9 $(pidof dnsmasq); fi
pidof dnsmasq || echo stopped
sudo service dnsmasq start
```

`echo stopped` must appear before `service dnsmasq start`. One dnsmasq can hold port 53. `service dnsmasq stop` can say `(not running)` while a hand-started `dnsmasq --interface=veth-peer --no-daemon` is still running. That process is not using this file. The `kill` line stops it.

`sudo dnsmasq --test` must say the syntax is OK. If start fails with `Address already in use`, a dnsmasq process is still running. Repeat the stop and kill, confirm `echo stopped`, then start once.

## 3. Kali lease

On Kali, ask Ubuntu for a lease. Do not type a static address on `veth-peer`.

```bash
sudo ip link set veth-peer up
sudo ip addr flush dev veth-peer
sudo dhclient -v veth-peer
ip -4 addr show veth-peer
cat /etc/resolv.conf
ping -c 3 192.168.200.1
```

If `dhclient` is missing:

```bash
sudo apt update
sudo apt install -y isc-dhcp-client
sudo dhclient -v veth-peer
```

The address on `veth-peer` should be between `192.168.200.50` and `192.168.200.150`. `resolv.conf` should contain `nameserver 192.168.200.1`. All three pings should get a reply.

## Done

Leave this network in place. The web server lab adds a name to this same dnsmasq. Do not remove `/etc/dnsmasq.d/dhcp.conf`, and do not replace Kali's `resolv.conf`.
