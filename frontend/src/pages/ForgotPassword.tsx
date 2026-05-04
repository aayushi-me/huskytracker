import { Link } from "react-router-dom";
import AuthPageLayout from "../layouts/AuthPageLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function ForgotPassword() {
  return (
    <AuthPageLayout
      title="Forgot Password"
      subtitle="Enter your registered email and we’ll send you a reset link."
    >
      <form className="space-y-4">
        <Input label="Email" type="email" placeholder="Enter your email" />

        <Button type="submit" className="w-full mt-2">
          Send
        </Button>
      </form>

      <p className="mt-6 text-xs text-center text-gray-500">
        <span className="mr-1">Or</span>
        <Link to="/auth/login" className="text-primary font-medium hover:underline">
          Back to Log in
        </Link>
      </p>
    </AuthPageLayout>
  );
}
