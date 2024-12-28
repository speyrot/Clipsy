// frontend/src/pages/SignInPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:8000/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        // e.g., 400 or 401 response => show error
        const errData = await response.json();
        setErrorMsg(errData.detail || 'Sign in failed');
        return;
      }

      const data = await response.json();
      // data.access_token => store in localStorage
      localStorage.setItem('access_token', data.access_token);
      
      // redirect to dashboard or wherever
      navigate('/');
    } catch (error) {
      console.error('Sign in error:', error);
      setErrorMsg('An error occurred. Please try again.');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form 
        onSubmit={handleSignIn} 
        className="p-6 bg-white rounded shadow-md"
        style={{ width: '300px' }}
      >
        <h2 className="text-xl mb-4">Sign In</h2>

        {errorMsg && <p className="text-red-500 mb-2">{errorMsg}</p>}

        <label className="block mb-2">Email</label>
        <input
          type="email"
          className="border p-2 w-full mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block mb-2">Password</label>
        <input
          type="password"
          className="border p-2 w-full mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button 
          type="submit" 
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          Sign In
        </button>

        <p className="mt-4 text-sm">
          Don’t have an account?{' '}
          <span 
            className="text-blue-500 cursor-pointer"
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
}

export default SignInPage;
