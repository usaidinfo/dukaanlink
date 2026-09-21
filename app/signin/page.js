import AuthForm from "../../components/auth-form";

export const metadata = {
  title: "Sign in",
  description: "Sign in to manage your DukaanLink catalog and requests.",
};

export default function SigninPage() {
  return <AuthForm mode="signin" />;
}
