import AuthForm from "../../components/auth-form";

export const metadata = {
  title: "Create account",
  description: "Create your DukaanLink business page account.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
