import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './App';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', { username, password });
      login(res.data.token);
    } catch {
      alert('Login failed');
    }
  }

  return (
    <div style={{maxWidth: 400, margin: 'auto', padding: 20}}>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <input required placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{marginTop: 10}} />
        <button type="submit" style={{marginTop: 10}}>Login</button>
      </form>
    </div>
  );
}
