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
    <section className="auth-card">
      <h1>Create PrivSyncro Account</h1>
      <p>Register to start controlling app-level data sharing.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <input type="text" name="name" placeholder="Full Name" required />
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password (min 6 chars)" required />
        <button type="submit">Register</button>
      </form>

      <button className="link-btn" type="button" onClick={switchToLogin}>
        Already have an account? Login
      </button>
    </section>
  );
}

export default RegisterPage;