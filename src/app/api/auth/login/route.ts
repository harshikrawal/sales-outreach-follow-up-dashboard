import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const validUser = process.env.ADMIN_USERNAME || 'admin';
    const validPwd = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === validUser && password === validPwd) {
      const cookieStore = await cookies();
      cookieStore.set("auth-token", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }
  } catch (error) {
    console.error("Login Error", error);
    return NextResponse.json({ success: false, error: 'Bad payload' }, { status: 400 });
  }
}
