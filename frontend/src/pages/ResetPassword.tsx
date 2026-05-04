import { Link, useNavigate } from "react-router-dom";
import AuthPageLayout from "../layouts/AuthPageLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function ResetPassword() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // After API succeeds → navigate to reset success screen
    navigate("/auth/reset-success");
  };

  return (
    <AuthPageLayout
      title="Reset Password"
      subtitle="Please enter a new password for your account."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="New Password"
          type="password"
          placeholder="Enter new password"
        />

        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter new password"
        />

        <Button type="submit" className="w-full mt-2">
          Reset Password
        </Button>
      </form>

      {/* Footer Link */}
      <p className="mt-6 text-xs text-center text-gray-500">
        <span className="mr-1">Or</span>
        <Link
          to="/auth/login"
          className="text-primary font-medium hover:underline"
        >
          Back to Log in
        </Link>
      </p>
    </AuthPageLayout>
  );
}
