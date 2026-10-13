declare module 'geoip-country' {
  function lookup(ip: string): { country?: string } | null;
}
