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
    <section className="auth-shell">
      <article className="auth-panel auth-panel--form">
        <h2>Log In</h2>

        <form onSubmit={handleSubmit} className="auth-form auth-form--minimal">
          <label>
            <span>Email</span>
            <input type="email" name="email" placeholder="you@example.com" required />
          </label>

          <label>
            <span>Password</span>
            <input type="password" name="password" placeholder="••••••••" required />
          </label>

          <div className="auth-row">
            <label className="inline-check">
              <input type="checkbox" name="remember" />
              <span>Remember me</span>
            </label>
            <button type="button" className="link-btn">
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Log In
          </button>
        </form>
      </article>

      <article className="auth-panel auth-panel--cta">
        <div>
          <h1>Welcome Back!</h1>
          <p>Please enter your details to continue controlling privacy access.</p>
        </div>

        <div className="cta-actions">
          <p>Don&apos;t have an account?</p>
          <button className="btn btn-outline" type="button" onClick={switchToRegister}>
            Sign Up
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

export default LoginPage;