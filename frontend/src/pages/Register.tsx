import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthPageLayout from "../layouts/AuthPageLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";

// Password strength helper
function getPasswordStrength(password: string): { label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;

  if (score === 0) return { label: "Very weak", color: "bg-red-400" };
  if (score === 1) return { label: "Weak", color: "bg-orange-400" };
  if (score === 2) return { label: "Fair", color: "bg-yellow-400" };
  if (score === 3) return { label: "Good", color: "bg-green-400" };
  return { label: "Strong", color: "bg-primary" };
}

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [role, setRole] = useState<"STUDENT" | "ORGANIZER">("STUDENT");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    university?: string;
    password?: string;
    confirmPassword?: string;
    submit?: string;
  }>({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(password);

  function validate(): boolean {
    const errs: typeof errors = {};

    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!lastName.trim()) errs.lastName = "Last name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Invalid email format";
    }

    if (!password) {
      errs.password = "Password is required";
    } else {
      if (password.length < 8)
        errs.password = "Password must be at least 8 characters";
      else if (!/[0-9]/.test(password))
        errs.password = "Password must contain at least one number";
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
        errs.password = "Password must contain a special character";
      else if (!/[A-Z]/.test(password))
        errs.password = "Password must contain an uppercase letter";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Please confirm your password";
    } else if (confirmPassword !== password) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        university: university || undefined,
        role,
      });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setErrors({
        submit: err.message || "Failed to register. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout
      title="Sign up"
      subtitle="Create your HuskyTrack account to discover and track campus events."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Global error message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Input
              label="First name"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <Input
              label="Last name"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            {errors.lastName && (
              <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <Input
            label="University"
            placeholder="Enter your university (optional)"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
          />
          {errors.university && (
            <p className="text-xs text-red-500 mt-1">{errors.university}</p>
          )}
        </div>

        <div>
          <label className="font-medium text-gray-700 mb-1 block">Role</label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value === "ORGANIZER" ? "ORGANIZER" : "STUDENT")
            }
            className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary focus:outline-none bg-white"
          >
            <option value="STUDENT">Student</option>
            <option value="ORGANIZER">Organizer</option>
          </select>
        </div>

        {/* Password with toggle */}
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password}</p>
          )}
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            tabIndex={-1}
            className="absolute right-3 top-8 p-1 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.05 0-9.18-3.96-10-8.5a9.977 9.977 0 012.221-4.006m3.312-2.816A9.978 9.978 0 0112 5c5.05 0 9.18 3.96 10 8.5a9.967 9.967 0 01-4.276 6.106M3 3l18 18M9.88 9.88A3.001 3.001 0 0115.12 15.12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
          
          {/* Password Strength Indicator */}
          {password && (
            <div className="mt-1 flex items-center gap-2">
              <div className="w-24 h-2 rounded bg-gray-200 overflow-hidden">
                <div
                  className={`h-2 rounded ${passwordStrength.color} transition-all`}
                  style={{
                    width: `${Math.min(100, (password.length / 12) * 100)}%`,
                  }}
                />
              </div>
              <span className={`text-xs ${passwordStrength.color.replace("bg", "text")}`}>
                {passwordStrength.label}
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pr-10"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">
              {errors.confirmPassword}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowConfirmPassword((p) => !p)}
            tabIndex={-1}
            className="absolute right-3 top-8 p-1 text-gray-400 hover:text-gray-600"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.05 0-9.18-3.96-10-8.5a9.977 9.977 0 012.221-4.006m3.312-2.816A9.978 9.978 0 0112 5c5.05 0 9.18 3.96 10 8.5a9.967 9.967 0 01-4.276 6.106M3 3l18 18M9.88 9.88A3.001 3.001 0 0115.12 15.12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Sign up
        </Button>
      </form>

      <p className="mt-6 text-xs text-center text-gray-500">
        Existing user?{" "}
        <Link to="/auth/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </AuthPageLayout>
  );
}