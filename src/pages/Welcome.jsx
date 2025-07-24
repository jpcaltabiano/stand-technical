import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <h1>Welcome to the Mitigation Rules Engine</h1>
      <p>Who are you?</p>
      <button style={{ margin: 10, padding: '1em 2em' }} onClick={() => navigate('/underwriter')}>I am an Underwriter</button>
      <button style={{ margin: 10, padding: '1em 2em' }} onClick={() => navigate('/science')}>I am an Applied Science User</button>
    </div>
  );
} 