import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Trophy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { friendlyMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content:
          "Register for the EIA Camel vs. Dwarf Racing System to follow race schedules, standings and results.",
      },
      { property: "og:title", content: "Create an account — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Join the Great EIA racing season — schedules, standings and live results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "VIEWER", label: "Viewer", hint: "Follow schedules, results and standings" },
  { value: "RACE_ORGANIZER", label: "Race organizer", hint: "Run heats and record results" },
  { value: "ADMINISTRATOR", label: "Administrator", hint: "Full access to the race office" },
];

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100, "That name is too long"),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirm: z.string().min(1, "Repeat your password"),
    role: z.enum(["ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER"]),
    competitorType: z.enum(["NONE", "CAMEL", "DWARF", "MEDIUM", "OTHER"]),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "The passwords don't match",
  });

type FieldErrors = Partial<Record<"fullName" | "email" | "password" | "confirm", string>>;

function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [competitorType, setCompetitorType] = useState("NONE");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password, confirm, role, competitorType });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result = await signUp(
        parsed.data.email,
        parsed.data.password,
        parsed.data.fullName,
        parsed.data.role,
        parsed.data.competitorType === "NONE" ? null : parsed.data.competitorType,
      );
      if (result.needsEmailConfirmation) {
        toast.success("Check your inbox and confirm your email, then sign in.");
        navigate({ to: "/login", replace: true });
        return;
      }
      toast.success("Account created — welcome to the paddock.");
      navigate({ to: "/", replace: true });
    } catch (error) {
      const message = friendlyMessage(error);
      if (/registered|exists|already/i.test(message)) {
        setErrors({ email: "That email is already registered." });
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-track p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-heat font-black">EIA</div>
          <span className="font-display text-lg font-bold">Camel vs. Dwarf Racing</span>
        </div>
        <div>
          <h2 className="max-w-md font-display text-4xl font-black leading-tight">
            Join the paddock. Pick your lane.
          </h2>
          <p className="mt-4 max-w-md text-sm text-primary-foreground/70">
            Create an account to follow the season, or ask for organizer rights and run the heats
            yourself.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
          <Trophy className="size-4" /> 10 · 7 · 5 · 3 · 1 points for the top five finishers
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserPlus className="size-5 text-accent" /> Create an account
            </CardTitle>
            <CardDescription>It takes less than a minute to get trackside.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  value={fullName}
                  maxLength={100}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName ? (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    maxLength={128}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {errors.password ? (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Repeat password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    maxLength={128}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  {errors.confirm ? (
                    <p className="text-xs text-destructive">{errors.confirm}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Requested role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} — {option.hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitorType">Compete as</Label>
                <Select value={competitorType} onValueChange={setCompetitorType}>
                  <SelectTrigger id="competitorType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">I'm not competing</SelectItem>
                    <SelectItem value="CAMEL">Camel</SelectItem>
                    <SelectItem value="DWARF">Dwarf</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  We'll register you as a competitor with this email.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitting ? "Creating your account…" : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
