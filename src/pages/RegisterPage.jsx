function RegisterPage({ onRegister, switchToLogin }) {
  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password")
    };

    await onRegister(payload);
  };

  return (
    <section className="auth-shell">
      <article className="auth-panel auth-panel--form">
        <h2>Create Account</h2>

        <form onSubmit={handleSubmit} className="auth-form auth-form--minimal">
          <label>
            <span>Username</span>
            <input type="text" name="name" placeholder="Mayur" required />
          </label>

          <label>
            <span>Password</span>
            <input type="password" name="password" placeholder="Min 6 characters" required />
          </label>

          <label>
            <span>E-mail</span>
            <input type="email" name="email" placeholder="you@example.com" required />
          </label>

          <label className="inline-check">
            <input type="checkbox" required />
            <span>I accept the terms of agreement</span>
          </label>

          <button type="submit" className="btn btn-primary btn-block">
            Sign Up
          </button>
        </form>
      </article>

      <article className="auth-panel auth-panel--cta">
        <div>
          <h1>Get Started</h1>
          <p>Build your intelligent privacy profile in seconds.</p>
        </div>

        <div className="cta-actions">
          <p>Already have an account?</p>
          <button className="btn btn-outline" type="button" onClick={switchToLogin}>
            Log In
          </button>
        </div>

        <div className="auth-dots" aria-hidden="true">
          <span className="active" />
          <span />
          <span />
        </div>
      </article>
    </section>
  );
}

export default RegisterPage;