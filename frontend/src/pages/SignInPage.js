// frontend/src/pages/SignInPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import axiosInstance from '../utils/axios';

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log("Sending to backend:", {
          access_token: session?.access_token
        });

        const response = await fetch('http://127.0.0.1:8000/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session?.access_token
          })
        });

        const responseText = await response.text();
        console.log("Backend response:", {
          status: response.status,
          body: responseText
        });

        if (!response.ok) {
          throw new Error(responseText || 'Backend authentication failed');
        }

        const data = JSON.parse(responseText);
        localStorage.setItem('backend_token', data.token);
        
        // Get user profile for welcome message
        try {
          const userResponse = await axiosInstance.get('/users/me');
          const firstName = userResponse.data.first_name;
          toast.success(`Welcome back, ${firstName}!`, {
            duration: 4000,
            position: 'bottom-right',
          });
        } catch (error) {
          console.error('Error fetching user profile:', error);
          toast.success('Welcome back!'); // Fallback message
        }
        
        navigate('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
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
          disabled={loading}
          required
        />

        <label className="block mb-2">Password</label>
        <input
          type="password"
          className="border p-2 w-full mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />

        <button 
          type="submit" 
          className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600 transition-colors"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="mt-4 text-sm text-center">
          Don't have an account?{' '}
          <span 
            className="text-blue-500 cursor-pointer hover:text-blue-600"
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
