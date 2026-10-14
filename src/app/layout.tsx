import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Receptes és Matektankönyv", description: "Intelligens multimédiás tudástár, Gasztro Stúdió és matematikai tankönyv." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="hu"><body>{children}</body></html> }
