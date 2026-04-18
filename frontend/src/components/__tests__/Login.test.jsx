import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from '../Login';
import { AuthProvider } from '../../context/AuthContext';

const mockUseAuth = vi.fn();

// Mock the AuthContext hook
vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

// Wrap component with AuthProvider for context
const renderWithAuth = (ui) => {
  return render(ui);
};

describe('Login Component', () => {
  it('renders login form by default', () => {
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      register: vi.fn(),
      user: null,
      loading: false,
    });

    renderWithAuth(<Login />);
    expect(screen.getByText(/Welcome back/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Log In/i })).toBeDefined();
  });

  it('switches to registration form when clicking Sign up', () => {
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      register: vi.fn(),
      user: null,
      loading: false,
    });

    renderWithAuth(<Login />);
    const signUpButton = screen.getByRole('button', { name: /Sign up/i });
    fireEvent.click(signUpButton);
    
    expect(screen.getByText(/Create account/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Your Name/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeDefined();
  });

  it('shows error message on failed login', async () => {
    const mockLogin = vi.fn().mockRejectedValue({ error: 'Invalid credentials' });
    
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      register: vi.fn(),
      user: null,
      loading: false,
    });

    renderWithAuth(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeDefined();
    });
  });

  it('shows success message on successful registration', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true });
    
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      register: mockRegister,
      user: null,
      loading: false,
    });

    renderWithAuth(<Login />);
    
    // Switch to register
    fireEvent.click(screen.getByRole('button', { name: /Sign up/i }));
    
    fireEvent.change(screen.getByPlaceholderText(/Your Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(screen.getByText(/Account created! Please log in./i)).toBeDefined();
    });
  });

  it('shows error if user already exists', async () => {
    const mockRegister = vi.fn().mockRejectedValue({ error: 'User already exists' });
    
    mockUseAuth.mockReturnValue({
      login: vi.fn(),
      register: mockRegister,
      user: null,
      loading: false,
    });

    renderWithAuth(<Login />);
    
    // Switch to register
    const signUpToggle = screen.getByRole('button', { name: /Sign up/i });
    fireEvent.click(signUpToggle);
    
    // Fill in name since it is required in register mode
    fireEvent.change(screen.getByPlaceholderText(/Your Name/i), { target: { value: 'Existing User' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'existing@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password' } });
    
    const submitButton = screen.getByRole('button', { name: /Sign Up/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/User already exists/i)).toBeDefined();
    });
  });
});
