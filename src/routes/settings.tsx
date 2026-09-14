import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError, friendlyMessage, unwrapPage, type ProfileResponse } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { labelize } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configuración de la cuenta — Camel vs. Dwarf" },
      {
        name: "description",
        content:
          "Edita tu perfil, cambia tu contraseña y administra los usuarios del sistema de carreras Camel vs. Dwarf.",
      },
      { property: "og:title", content: "Configuración de la cuenta — Camel vs. Dwarf" },
      {
        property: "og:description",
        content: "Edita tu perfil, cambia tu contraseña y administra los usuarios del sistema.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const ROLE_OPTIONS = ["ADMINISTRATOR", "ORGANIZER", "VIEWER"] as const;

function SettingsPage() {
  const { user, isAdmin } = useAuth();

  return (
    <AppShell title="Configuración" subtitle="Administra tu cuenta y, si eres administrador, la de los demás">
      <Tabs defaultValue="profile" className="max-w-4xl space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Mi perfil</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          {isAdmin ? <TabsTrigger value="users">Usuarios</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="profile">
          <ProfileCard key={user?.username ?? "anon"} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityCard />
        </TabsContent>
        {isAdmin ? (
          <TabsContent value="users">
            <UsersCard />
          </TabsContent>
        ) : null}
      </Tabs>
    </AppShell>
  );
}

function ProfileCard() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    // GET /users/me is unreliable on the backend (400 even when the profile
    // exists); POST /users/me is "create or return", so use it as the read.
    api
      .myProfile()
      .catch((error) =>
        error instanceof ApiError && (error.status === 400 || error.status === 404)
          ? api.createProfile("")
          : Promise.reject(error),
      )
      .then((data) => {
        if (!active || !data) return;
        setProfile(data);
        setFullName(data.fullName ?? "");
        setEmail(data.email ?? "");
      })
      .catch((error) => toast.error(friendlyMessage(error)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (!profile?.id) {
      toast.error("No pudimos identificar tu perfil en el servidor.");
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      toast.error("El nombre y el correo son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.users.update(profile.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        role: profile.role ?? "VIEWER",
      });
      setProfile(updated);
      toast.success("Perfil actualizado.");
    } catch (error) {
      toast.error(friendlyMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Cargando tu perfil…" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la cuenta</CardTitle>
        <CardDescription>Actualiza tu nombre y tu correo de contacto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SecurityCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Contraseña actualizada.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>Cambia la contraseña con la que inicias sesión.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Actualizar contraseña"}
        </Button>
      </CardContent>
    </Card>
  );
}

function UsersCard() {
  const [users, setUsers] = useState<ProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.users.list();
      setUsers(unwrapPage<ProfileResponse>(payload));
    } catch (error) {
      toast.error(friendlyMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(target: ProfileResponse, role: string) {
    if (!target.id) return;
    setBusyId(target.id);
    try {
      await api.users.update(target.id, {
        fullName: target.fullName ?? "",
        email: target.email ?? "",
        role,
      });
      toast.success("Rol actualizado.");
      await load();
    } catch (error) {
      toast.error(friendlyMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleEnabled(target: ProfileResponse, enabled: boolean) {
    if (!target.id) return;
    setBusyId(target.id);
    try {
      await api.users.setStatus(target.id, enabled);
      toast.success(enabled ? "Usuario activado." : "Usuario desactivado.");
      await load();
    } catch (error) {
      toast.error(friendlyMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner label="Cargando usuarios…" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios del sistema</CardTitle>
        <CardDescription>Cambia roles y activa o desactiva cuentas.</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay usuarios para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id ?? u.email}>
                    <TableCell className="font-medium">{u.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={(u.role ?? "VIEWER").toUpperCase()}
                        onValueChange={(value) => void changeRole(u, value)}
                        disabled={busyId === u.id}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((role) => (
                            <SelectItem key={role} value={role}>
                              {labelize(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={u.enabled !== false}
                        disabled={busyId === u.id}
                        onCheckedChange={(checked) => void toggleEnabled(u, checked)}
                        aria-label="Activar usuario"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
