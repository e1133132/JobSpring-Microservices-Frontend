// src/pages/auth/Login.test.jsx
// 先做必要的 mocks（顺序要在组件 import 之前）
/* eslint-disable */
// 1) 静态资源：logo 图片
vi.mock('../../assets/jobspringt.png', () => ({ default: 'logo.png' }));

// 2) 路由跳转 useNavigate
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom');
  return { ...real, useNavigate: () => navigateMock };
});

// 3) 登录服务
vi.mock('../../services/authService', () => ({
  login: vi.fn(),
}));

// ---- 正式 imports（放 mocks 之后）----
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login.jsx';
import { login } from '../../services/authService';

// 每个用例前清理
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// 小工具：渲染并填写表单、提交
async function renderAndSubmit(email = 'a@b.com', password = 'pw123') {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  await userEvent.type(screen.getByPlaceholderText(/email/i), email);
  await userEvent.type(screen.getByPlaceholderText(/password/i), password);
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
}

test('successful login (role 0) saves token/user and navigates to /home', async () => {
  login.mockResolvedValue({
    token: 't-abc',
    user: { role: 0, id: 1, fullName: 'Alice' },
  });

  await renderAndSubmit('c@example.com', 'secret');

  // 调用了登录接口且参数正确
  expect(login).toHaveBeenCalledWith({ email: 'c@example.com', password: 'secret' });

  // 存储 token & user
  expect(localStorage.getItem('jobspring_token')).toBe('t-abc');
  expect(JSON.parse(localStorage.getItem('jobspring_user'))).toEqual({
    role: 0, id: 1, fullName: 'Alice',
  });

  // 跳转 /home
  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalledWith('/home');
  });
});

test('role 2 (Admin) navigates to /admin/status', async () => {
  login.mockResolvedValue({
    token: 't-admin',
    user: { role: 2, id: 9, fullName: 'Admin' },
  });

  await renderAndSubmit();

  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalledWith('/admin/status');
  });
});

test('shows backend error message on failure', async () => {
  login.mockRejectedValue({
    response: { data: { message: 'Invalid credentials' } },
  });

  await renderAndSubmit();

  // 展示后端返回的 message
  expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  expect(navigateMock).not.toHaveBeenCalled();
});

test('shows default message on generic error', async () => {
  login.mockRejectedValue(new Error('network down'));

  await renderAndSubmit();

  // 展示默认文案
  expect(await screen.findByText(/login failed/i)).toBeInTheDocument();
  expect(navigateMock).not.toHaveBeenCalled();
});
