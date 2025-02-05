import { PrivyProviderWrapper } from "@/providers/PrivyProvider";
import SubgraphProvider from "@/providers/SubgraphProvider";
import Navigation from "@/components/Navigation";
import type { Metadata } from "next";
import "@fontsource-variable/outfit";
import "@fontsource/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeFi Assistant",
  description: "AI-powered DeFi trading assistant on Arbitrum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <PrivyProviderWrapper>
          <SubgraphProvider>
            <Navigation />
            {children}
          </SubgraphProvider>
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}
