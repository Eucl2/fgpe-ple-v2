import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { authService } from './oidcClient';
import MainLoading from '../components/MainLoading';

const AuthCallback: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await authService.handleCallback();
        // Redirect to where the user intended to go, or home
        const returnUrl = sessionStorage.getItem('returnUrl') || '/profile';
        sessionStorage.removeItem('returnUrl');
        history.push(returnUrl);
      } catch (error) {
        console.error('Authentication callback failed:', error);
        history.push('/');
      }
    };

    handleCallback();
  }, [history]);

  return <MainLoading />;
};

export default AuthCallback;