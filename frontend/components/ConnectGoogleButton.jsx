// frontend/src/components/ConnectGoogleButton.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Button, Alert, CircularProgress } from '@mui/material';

const ConnectGoogleButton = ({ teacherEmail }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleConnectGoogle = async () => {
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token'); // or your token key

      const res = await axios.get(
        'http://localhost:5000/api/v1/google/auth/url',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { teacherEmail: teacherEmail || '' }
        }
      );

      if (res.data.success && res.data.url) {
        // Open Google login in new tab
        window.open(res.data.url, '_blank');
        setMessage('Google login opened in new tab. Please complete the process.');
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to connect Google account');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        variant="contained"
        color="primary"
        onClick={handleConnectGoogle}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
        size="large"
      >
        {loading ? 'Connecting...' : '🔗 Connect Google Account'}
      </Button>

      {message && (
        <Alert 
          severity={success ? "success" : "error"} 
          sx={{ mt: 2 }}
        >
          {message}
        </Alert>
      )}

      <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
        Connect your Google account to become host of live classes
      </p>
    </div>
  );
};

export default ConnectGoogleButton;