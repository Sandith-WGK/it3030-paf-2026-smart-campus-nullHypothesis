import axios from './axios';

export const authService = {
  login: async (email, password) => {
    const response = await axios.post('/auth/login', { email, password });
    return response.data;
  },

  verifyTwoFactor: async (userId, otp) => {
    const response = await axios.post('/auth/verify-2fa', { userId, otp });
    return response.data;
  },

  resendTwoFactor: async (userId) => {
    const response = await axios.post('/auth/resend-2fa', { userId });
    return response.data;
  },

  register: async (userData) => {
    const response = await axios.post('/auth/register', userData);
    return response.data;
  },

  verifyEmail: async (email, code) => {
    console.log(`API Call: Verifying ${email} with code ${code}`);
    try {
      const response = await axios.post('/auth/verify', { email, code });
      console.log('API Success:', response.data);
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw error;
    }
  },

  resendVerification: async (email) => {
    const response = await axios.post('/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await axios.post('/auth/forgot-password', { email });
    return response.data;
  },

  resendResetCode: async (email) => {
    const response = await axios.post('/auth/resend-reset-code', { email });
    return response.data;
  },

  resetPassword: async (email, code, newPassword) => {
    const response = await axios.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  }
};
