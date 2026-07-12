"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    const authenticated = localStorage.getItem("auth") === "true";
    setIsAuth(authenticated);
    if (!authenticated) router.replace("/login");
  }, [router]);

  if (!isAuth) {
    return null;
  }

  return children;
}
