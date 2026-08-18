import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { SystemStatusProvider } from "@/app/components/SystemStatusProvider";
import { NavigationProgressBar } from "@/app/components/ui/NavigationProgressBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/logo.png" as="image" type="image/png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <NavigationProgressBar />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <SystemStatusProvider>
            <Header />
            <div className="flex-1 pt-16 flex flex-col">{children}</div>
            <Footer />
          </SystemStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

export { defaultMetadata as metadata } from "@/lib/metadata";