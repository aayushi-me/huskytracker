import { Link } from "react-router-dom";
import AuthPageLayout from "../layouts/AuthPageLayout";
import Button from "../components/ui/Button";

export default function ResetSuccess() {
  return (
    <AuthPageLayout
      title="Reset Password"
      subtitle="Your password has been reset successfully."
    >
      <div className="space-y-6">

        {/* Success box */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-6 py-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-1">
            Your password was reset successfully!
          </p>
          <p>
            You can now log in using your new password and continue exploring
            events on HuskyTrack.
          </p>
        </div>

        {/* Back to login button */}
        <Button className="w-full">
          <Link to="/auth/login" className="w-full block text-center text-white">
            Back to Login
          </Link>
        </Button>

      </div>
    </AuthPageLayout>
  );
}
