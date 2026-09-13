import dns from "dns/promises";

/**
 * Checks whether an IPv4 or IPv6 address belongs to private, loopback, link-local, or cloud metadata ranges
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv6 checks
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::" || lower.startsWith("::ffff:127.")) return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc00:") || lower.startsWith("fd00:")) return true;
    // IPv4-mapped IPv6 (::ffff:192.168.1.1)
    if (lower.startsWith("::ffff:")) {
      const v4Part = lower.slice(7);
      return isPrivateOrReservedIp(v4Part);
    }
    return false;
  }

  // IPv4 checks
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid format treated as unsafe
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Validates a target URL against SSRF attacks before any network call
 */
export async function validateSafeUrl(targetUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Only allow HTTP and HTTPS protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Forbidden protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost names
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error(`Access to local or internal host '${hostname}' is forbidden.`);
  }

  // Resolve DNS to verify actual IP addresses
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      throw new Error(`Could not resolve hostname '${hostname}'.`);
    }

    for (const record of lookupResults) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new Error(`Host '${hostname}' resolves to private/reserved IP address '${record.address}'. Access blocked for security.`);
      }
    }
  } catch (err: any) {
    if (err.message.includes("Access blocked for security") || err.message.includes("local or internal")) {
      throw err;
    }
    throw new Error(`DNS lookup failed for host '${hostname}': ${err.message}`);
  }

  return parsed;
}

/**
 * Safely fetches a URL with SSRF validation, redirect inspection, timeout, and max size limits
 */
export async function safeFetch(
  targetUrl: string,
  options: RequestInit = {},
  maxRedirects: number = 3,
  maxSizeBytes: number = 5 * 1024 * 1024 // 5 MB max
): Promise<Response> {
  let currentUrl = targetUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    await validateSafeUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        ...options,
        redirect: "manual", // Inspect redirects manually to prevent open-redirect SSRF
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    // Handle redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect response missing Location header");
      }

      currentUrl = new URL(location, currentUrl).toString();
      redirectsRemaining--;
      continue;
    }

    // Check Content-Length if present
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      throw new Error(`Response exceeds maximum permitted size of ${maxSizeBytes / 1024 / 1024}MB`);
    }

    return response;
  }

  throw new Error("Too many redirects");
}
