"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";

const BACKEND_URL = "http://localhost:3001";
// El tenantId es el email de la cuenta que conectó Google Drive (el admin dueño de la empresa)
const TENANT_ID = "danidevcol@gmail.com";

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Registrar o recuperar al usuario del backend para obtener su rol real
          const res = await fetch(`${BACKEND_URL}/usuarios/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantId: TENANT_ID,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setRole(data.rol); // "admin", "operador", "inspector", "director", or "pendiente"
          } else {
            setRole("pendiente");
          }
        } catch {
          // Si falla la conexión al backend, marcamos como pendiente
          setRole("pendiente");
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
