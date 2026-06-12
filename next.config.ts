import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the AgentMail SDK out of the bundle. It has an optional dynamic
  // `import("@x402/fetch")` (x402 payments — unused here) that the bundler
  // otherwise tries and fails to resolve. As an external package it's required
  // by Node at runtime, and that import path is never hit.
  serverExternalPackages: ["agentmail"],
};

export default nextConfig;
