import React, { useEffect } from 'react';
import { userManager } from './oidcClient';

const SilentCallback: React.FC = () => {
  useEffect(() => {
    userManager.signinSilentCallback().catch((error) => {
      console.error('Silent authentication failed:', error);
    });
  }, []);

  return <div>Processing...</div>;
};

export default SilentCallback;