function LoginPage({ onLogin, switchToRegister }) {
  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const credentials = {
      email: formData.get("email"),
      password: formData.get("password")
    };

    await onLogin(credentials);
  };

  return (
    <section className="auth-card">
      <h1>PrivSyncro Login</h1>
      <p>Sign in to manage connected apps and consents.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>

      <button className="link-btn" type="button" onClick={switchToRegister}>
        New here? Create an account
      </button>
    </section>
  );
}

export default LoginPage;