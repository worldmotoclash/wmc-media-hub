
interface LoginFormErrors {
  email?: string;
  password?: string;
}

export const validateLoginForm = (email: string, password: string): { isValid: boolean; errors: LoginFormErrors } => {
  const errors: LoginFormErrors = {};
  let isValid = true;

  // Email validation
  if (!email) {
    errors.email = 'Email is required';
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = 'Email is invalid';
    isValid = false;
  }

  // Password validation
  if (!password) {
    errors.password = 'Password is required';
    isValid = false;
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
    isValid = false;
  }

  return { isValid, errors };
};
