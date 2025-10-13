/* eslint-disable */

import { vi } from 'vitest';
// ✅ 先 mock 掉 CSS（防止 jsdom 解析 var() 边框炸掉）
vi.mock('../../App.css', () => ({}), { virtual: true });

// ✅ mock 导航栏，避免无关渲染
vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }));

// ✅ mock 路由的 useNavigate，方便断言跳转
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom');
  return { ...real, useNavigate: () => navigateMock };
});

// ✅ 统一 axios 实例（services/api.js）
vi.mock('../../services/api.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

// ✅ 搜索用到原生 axios.get
vi.mock('axios', () => ({ default: { get: vi.fn() } }));

// ✅ 用户信息
vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 0, fullName: 'Alice' }),
}));

// ---- 唯一的一次 import ----
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import Home from './home.jsx';
import api from '../../services/api.js';
import axios from 'axios';

const jobs = [
  { id: 1, title: 'Frontend Dev', company: 'Acme', location: 'Singapore', tags: ['react','js'], employmentType: 'full-time', description: 'Build UI', postedAt: '2025-09-20' },
  { id: 2, title: 'Data Analyst',  company: 'Beta', location: 'Singapore', tags: ['sql'],       employmentType: 'contract',  description: 'Analyze data', postedAt: '2025-09-21' },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('jobspring_token', 'test-token');

  // 首屏：/job_list -> /favorites
  api.get.mockImplementation((url) => {
    if (url === '/api/job_seeker/job_list') return Promise.resolve({ data: { content: jobs } });
    if (url === '/api/favorites')          return Promise.resolve({ data: { content: [{ jobId: 1 }] } });
    return Promise.resolve({ data: {} });
  });

  // 搜索只返回第二条
  axios.get.mockResolvedValue({ data: { content: [jobs[1]] } });

  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

test('loads jobs and favorites on mount', async () => {
  renderHome();

  expect(await screen.findByText(/Frontend Dev/i)).toBeInTheDocument();
  expect(screen.getByText(/Data Analyst/i)).toBeInTheDocument();
  expect(screen.getByText(/Showing 2 results?/i)).toBeInTheDocument();

  // 第一个已收藏 -> 金色
  const first = screen.getByRole('article', { name: /Frontend Dev at Acme/i });
  const fav1 = within(first).getAllByRole('button')[1];
  expect(fav1).toHaveStyle({ color: '#fbbf24' });

  // 第二个未收藏 -> 灰色
  const second = screen.getByRole('article', { name: /Data Analyst at Beta/i });
  const fav2 = within(second).getAllByRole('button')[1];
  expect(fav2).toHaveStyle({ color: '#6b7280' });
});

test('search calls /job_list/search and updates list', async () => {
  renderHome();

  const searchInput = await screen.findByPlaceholderText(/Search jobs, companies, locations, or tags/i);
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, 'data');
  await userEvent.click(screen.getByRole('button', { name: /search/i }));

  expect(axios.get).toHaveBeenCalledWith('/api/job_seeker/job_list/search', {
    params: { keyword: 'data', page: 0, size: 50 },
  });

  expect(await screen.findByText(/Data Analyst/i)).toBeInTheDocument();
  expect(screen.queryByText(/Frontend Dev/i)).not.toBeInTheDocument();
  expect(screen.getByText(/Showing 1 result/i)).toBeInTheDocument();
});

test('clicking Apply navigates to detail page', async () => {
  renderHome();

  const first = await screen.findByRole('article', { name: /Frontend Dev at Acme/i });
  const applyBtn = within(first).getByRole('button', { name: /apply/i });
  await userEvent.click(applyBtn);

  expect(navigateMock).toHaveBeenCalledWith('/jobs/1');
});

test('toggling favorite adds/removes via API and updates UI', async () => {
  renderHome();

  const second = await screen.findByRole('article', { name: /Data Analyst at Beta/i });
  const fav2 = within(second).getAllByRole('button')[1];

  // 收藏
  api.post.mockResolvedValue({ data: {} });
  await userEvent.click(fav2);
  expect(api.post).toHaveBeenCalledWith('/api/favorites/2', {}, {
    headers: { Authorization: 'Bearer test-token' },
  });
  await waitFor(() => expect(fav2).toHaveStyle({ color: '#fbbf24' }));

  // 取消收藏
  api.delete.mockResolvedValue({ data: {} });
  await userEvent.click(fav2);
  expect(api.delete).toHaveBeenCalledWith('/api/favorites/2', {
    headers: { Authorization: 'Bearer test-token' },
  });
  await waitFor(() => expect(fav2).toHaveStyle({ color: '#6b7280' }));
});
