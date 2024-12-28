// frontend/src/pages/SignUpPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignUpPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:8000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          first_name: firstName, 
          last_name: lastName, 
          email, 
          password 
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        setErrorMsg(errData.detail || 'Sign up failed');
        return;
      }

      // On success, navigate to sign-in or auto sign-in
      navigate('/signin');
    } catch (error) {
      console.error('Sign up error:', error);
      setErrorMsg('An error occurred. Please try again.');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form 
        onSubmit={handleSignUp} 
        className="p-6 bg-white rounded shadow-md"
        style={{ width: '300px' }}
      >
        <h2 className="text-xl mb-4">Sign Up</h2>

        {errorMsg && <p className="text-red-500 mb-2">{errorMsg}</p>}

        <label className="block mb-2">First Name</label>
        <input
          type="text"
          className="border p-2 w-full mb-4"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <label className="block mb-2">Last Name</label>
        <input
          type="text"
          className="border p-2 w-full mb-4"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

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
          Sign Up
        </button>

        <p className="mt-4 text-sm">
          Already have an account?{' '}
          <span 
            className="text-blue-500 cursor-pointer"
            onClick={() => navigate('/signin')}
          >
            Sign In
          </span>
        </p>
      </form>
    </div>
  );
}

export default SignUpPage;
