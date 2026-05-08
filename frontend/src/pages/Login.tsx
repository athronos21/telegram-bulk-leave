import LoginForm from "../components/LoginForm";

interface Props {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: Props) {
  return (
    <main className="page-login">
      <h1>📤 Telegram Bulk Leave</h1>
      <p>Log in with your Telegram account to get started.</p>
      <LoginForm onSuccess={onSuccess} />
    </main>
  );
}
