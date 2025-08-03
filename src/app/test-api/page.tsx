'use client';

import { useState } from 'react';

export default function TestApiPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    try {
      console.log('Making request to:', 'http://localhost:8080/api/auth/login');
      
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'skhamis',
          password: 'password123'
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error);
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testWithCredentials = async () => {
    setLoading(true);
    try {
      console.log('Making request WITH credentials to:', 'http://localhost:8080/api/auth/login');
      
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: 'skhamis',
          password: 'password123'
        })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      setResult(`WITH CREDENTIALS: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('Error with credentials:', error);
      setResult(`Error with credentials: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Connection Test</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testLogin}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Login (No Credentials)'}
        </button>
        
        <button 
          onClick={testWithCredentials}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-4"
        >
          {loading ? 'Testing...' : 'Test Login (With Credentials)'}
        </button>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Result:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {result || 'No result yet'}
        </pre>
      </div>
    </div>
  );
}