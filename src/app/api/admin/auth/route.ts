import { NextResponse } from "next/server";
import { createAdminToken } from "@/lib/adminAuth";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ success: false, error: "Contraseña requerida." }, { status: 400 });
    }

    const masterPassword = process.env.ADMIN_PASSWORD;

    if (masterPassword && password === masterPassword) {
      // Emitir un token de sesión firmado con expiración (ver lib/adminAuth)
      return NextResponse.json({ success: true, token: createAdminToken() });
    }

    return NextResponse.json({ success: false, error: "Contraseña incorrecta." }, { status: 401 });
  } catch (error) {
    console.error("Error in admin auth API:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
