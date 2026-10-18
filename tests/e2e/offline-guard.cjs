// Loaded before Next and inherited by build workers; no upstream forwarding exists.
const fs = require('node:fs');
const net = require('node:net');
const dns = require('node:dns');
const allowed = new Set(['127.0.0.1', '::1', 'localhost']);
const allowedPorts = new Set(['4319', '4320', '4321']);
function deny(destination) {
  const message = `OFFLINE_EGRESS_BLOCKED ${String(destination)}`;
  if (process.env.OFFLINE_EGRESS_LOG) fs.appendFileSync(process.env.OFFLINE_EGRESS_LOG, JSON.stringify({ destination: String(destination) }) + '\n');
  throw new Error(message);
}
function check(host) { if (!allowed.has(host)) deny(host); }
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const input = Array.isArray(args[0]) ? args[0] : args;
  const options = typeof input[0] === 'object' ? input[0] : { port: input[0], host: typeof input[1] === 'string' ? input[1] : 'localhost' };
  if (options.path) deny('unix socket');
  check(options.host || 'localhost');
  if (!allowedPorts.has(String(options.port))) deny(`${options.host || 'localhost'}:${options.port}`);
  return connect.apply(this, args);
};
for (const method of ['lookup', 'resolve', 'resolve4', 'resolve6']) {
  const original = dns[method];
  dns[method] = function (host, ...args) { check(host); return original.call(this, host, ...args); };
}
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  check(url.hostname);
  if (!allowedPorts.has(url.port)) deny(url.origin);
  return originalFetch(input, init);
};
for (const name of ['node:http', 'node:https']) {
  const mod = require(name);
  for (const method of ['request', 'get']) {
    const original = mod[method];
    mod[method] = function (input, ...args) {
      const host = typeof input === 'string' || input instanceof URL ? new URL(input).hostname : input.hostname || input.host || 'localhost';
      check(host);
      return original.call(this, input, ...args);
    };
  }
}
require('node:dgram').Socket.prototype.send = function () { deny('UDP'); };
if (process.env.OFFLINE_FIXED_CLOCK) {
  const OriginalDate = Date;
  const instant = new OriginalDate(process.env.OFFLINE_FIXED_CLOCK).valueOf();
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return instant; }
  };
}
