import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ success: false, error: "Contraseña requerida." }, { status: 400 });
    }

    const masterPassword = process.env.ADMIN_PASSWORD;

    if (password === masterPassword) {
      // Return success. In a real-world system, we would generate a session token or cookie.
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Contraseña incorrecta." }, { status: 401 });
  } catch (error) {
    console.error("Error in admin auth API:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
