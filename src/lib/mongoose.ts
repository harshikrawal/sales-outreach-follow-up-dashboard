import mongoose from 'mongoose';
import dns from 'dns';

// Configure fallback public DNS servers and force IPv4 result order to resolve MongoDB SRV records reliably.
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
  console.warn('Failed to configure custom DNS settings:', e);
}

// Fallback to locally running mongodb instance if .env is missing it, but it should be there.
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function resolveSrvViaDoH(srvUri: string): Promise<string> {
  const match = srvUri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]*)(?:\?(.*))?$/);
  if (!match) return srvUri;

  const [_, user, password, srvHost, database, originalQuery] = match;
  try {
    const srvUrl = `https://dns.google/resolve?name=_mongodb._tcp.${srvHost}&type=SRV`;
    const txtUrl = `https://dns.google/resolve?name=${srvHost}&type=TXT`;

    const [srvRes, txtRes] = await Promise.all([
      fetch(srvUrl).then(r => r.json()),
      fetch(txtUrl).then(r => r.json())
    ]);

    if (!srvRes.Answer || srvRes.Answer.length === 0) {
      throw new Error("No SRV answers returned from DoH");
    }

    const hosts = srvRes.Answer.map((ans: any) => {
      const parts = ans.data.split(/\s+/);
      const port = parts[2];
      let target = parts[3];
      if (target.endsWith(".")) target = target.slice(0, -1);
      return `${target}:${port}`;
    }).join(",");

    let replicaSet = "";
    let authSource = "admin";
    if (txtRes.Answer && txtRes.Answer.length > 0) {
      txtRes.Answer.forEach((ans: any) => {
        const txtData = ans.data;
        const rsMatch = txtData.match(/replicaSet=([^&]+)/);
        if (rsMatch) replicaSet = rsMatch[1];
        const authMatch = txtData.match(/authSource=([^&]+)/);
        if (authMatch) authSource = authMatch[1];
      });
    }

    const newQuery = new URLSearchParams(originalQuery || "");
    if (replicaSet) newQuery.set("replicaSet", replicaSet);
    newQuery.set("authSource", authSource);
    newQuery.set("ssl", "true");

    return `mongodb://${user}:${password}@${hosts}/${database}?${newQuery.toString()}`;
  } catch (err) {
    console.error("Failed to resolve SRV via DoH:", err);
    return srvUri;
  }
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      family: 4,
    };

    cached.promise = (async () => {
      const uri = MONGODB_URI!;
      if (uri.startsWith("mongodb+srv://")) {
        try {
          return await mongoose.connect(uri, opts);
        } catch (connectError: any) {
          const errMsg = connectError.message || "";
          if (errMsg.includes("ECONNREFUSED") || errMsg.includes("querySrv") || errMsg.includes("ENOTFOUND")) {
            console.log("MongoDB SRV resolution failed. Attempting self-healing DNS-over-HTTPS resolution fallback...");
            const resolvedUri = await resolveSrvViaDoH(uri);
            if (resolvedUri !== uri) {
              console.log("Successfully resolved replica set nodes via Google DoH. Reconnecting...");
              return await mongoose.connect(resolvedUri, opts);
            }
          }
          throw connectError;
        }
      } else {
        return await mongoose.connect(uri, opts);
      }
    })();
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
