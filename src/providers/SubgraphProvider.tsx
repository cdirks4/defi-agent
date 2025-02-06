"use client";

import { createClient, Provider } from "urql";
import { cacheExchange, fetchExchange } from "@urql/core";
import { SUBGRAPH_URLS } from "@/lib/constants";
import React from "react";

const client = createClient({
  url: SUBGRAPH_URLS[
    (process.env.NEXT_PUBLIC_CHAIN as keyof typeof SUBGRAPH_URLS) || "arbitrum-sepolia"
  ],
  exchanges: [cacheExchange, fetchExchange],
});

export default function SubgraphProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider value={client}>{children}</Provider>;
}
