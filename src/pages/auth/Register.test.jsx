// src/pages/auth/Register.test.jsx
/* eslint-disable */

// 1) mock 静态资源（Vite 资源是 default 导出）
vi.mock('../../assets/jobspringt.png', () => ({ default: 'logo.png' }));

// 2) mock 路由：只替换 useNavigate
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom');
  return { ...real, useNavigate: () => navigateMock };
});

// 3) mock 认证服务：register / sendVerificationCode
vi.mock('../../services/authService', () => ({
  register: vi.fn(),
  sendVerificationCode: vi.fn(),
}));

// ---- 正式 imports（必须在 mocks 之后）----
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Register from './Register.jsx';
import { register as registerApi, sendVerificationCode as sendCodeApi } from '../../services/authService';
import { MemoryRouter } from 'react-router-dom';

beforeEach(() => {
  vi.clearAllMocks();
  navigateMock.mockReset();
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

test('click "Send Code" without email shows tip', async () => {
  renderRegister();

  const btn = screen.getByRole('button', { name: /send code/i });
  await userEvent.click(btn);

  expect(await screen.findByText(/please enter email first/i)).toBeInTheDocument();
  expect(sendCodeApi).not.toHaveBeenCalled();
});

test('send code success: calls API, shows success, button enters cooldown', async () => {
  sendCodeApi.mockResolvedValue({});

  renderRegister();

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
  await userEvent.click(screen.getByRole('button', { name: /send code/i }));

  // 1) 调用正确
  expect(sendCodeApi).toHaveBeenCalledWith('test@example.com');

  // 2) 成功提示出现
  expect(
    await screen.findByText(/verification code sent to your email/i)
  ).toBeInTheDocument();

  // 3) 进入冷却：按钮直接变为 Resend (60) 且禁用（无需 fake timers）
  const resendBtn = await screen.findByRole('button', { name: /resend \(60\)/i });
  expect(resendBtn).toBeDisabled();
});

test('send code failure: shows server error message', async () => {
  sendCodeApi.mockRejectedValue({
    response: { data: { message: 'Email not allowed' } },
  });

  renderRegister();

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'bad@example.com');
  await userEvent.click(screen.getByRole('button', { name: /send code/i }));

  expect(await screen.findByText(/email not allowed/i)).toBeInTheDocument();
});

test('register success navigates to /auth/login', async () => {
  registerApi.mockResolvedValue({});

  renderRegister();

  await userEvent.type(screen.getByPlaceholderText(/full name/i), 'Alice');
  await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com');
  await userEvent.type(screen.getByPlaceholderText(/verification code/i), '123456');
  await userEvent.type(screen.getByPlaceholderText(/password/i), 'pass123');

  await userEvent.click(screen.getByRole('button', { name: /^register$/i }));

  // API 被以完整表单调用
  expect(registerApi).toHaveBeenCalledWith({
    fullName: 'Alice',
    email: 'a@b.com',
    password: 'pass123',
    code: '123456',
  });

  // 跳转
  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalledWith('/auth/login');
  });
});

test('register failure shows server message or default', async () => {
  registerApi.mockRejectedValue({
    response: { data: { message: 'User already exists' } },
  });

  renderRegister();

  await userEvent.type(screen.getByPlaceholderText(/full name/i), 'Bob');
  await userEvent.type(screen.getByPlaceholderText(/email/i), 'bob@x.com');
  await userEvent.type(screen.getByPlaceholderText(/verification code/i), '999999');
  await userEvent.type(screen.getByPlaceholderText(/password/i), 'secret');

  await userEvent.click(screen.getByRole('button', { name: /^register$/i }));

  expect(await screen.findByText(/user already exists/i)).toBeInTheDocument();
  expect(navigateMock).not.toHaveBeenCalled();
});
